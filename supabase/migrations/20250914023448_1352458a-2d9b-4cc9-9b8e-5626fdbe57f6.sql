-- Final Security Hardening Migration: Address Remaining Vulnerabilities
-- This fixes the remaining security issues detected by the scanner

-- 1. Fix link_clicks table policies to prevent unauthorized access to IP addresses and tracking data
DROP POLICY IF EXISTS "System can insert link clicks" ON public.link_clicks;
DROP POLICY IF EXISTS "System can insert link clicks tracking" ON public.link_clicks;

-- Create more secure policy for link clicks - only allow system/admin insertion
CREATE POLICY "Only admins can insert link clicks" 
ON public.link_clicks 
FOR INSERT 
TO authenticated
WITH CHECK (get_current_user_role() = 'admin'::app_role);

-- Create policy for function-based insertion (for tracking system)
CREATE POLICY "System functions can insert link clicks" 
ON public.link_clicks 
FOR INSERT 
TO authenticated
WITH CHECK (false); -- This will be handled by SECURITY DEFINER functions only

-- 2. Add missing policies for balance_transactions to prevent financial data exposure
-- Users can only view their own transactions
CREATE POLICY "Users can view own balance transactions only" 
ON public.balance_transactions 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all transactions
CREATE POLICY "Admins can view all balance transactions" 
ON public.balance_transactions 
FOR SELECT 
TO authenticated
USING (get_current_user_role() = 'admin'::app_role);

-- Only system functions can insert transactions (no direct user access)
CREATE POLICY "Only system can insert balance transactions" 
ON public.balance_transactions 
FOR INSERT 
TO authenticated
WITH CHECK (false); -- Will be handled by SECURITY DEFINER functions only

-- 3. Update the link click tracking function to work with new policies
CREATE OR REPLACE FUNCTION public.track_link_click_secure(influencer_code text, user_agent_param text DEFAULT NULL::text, ip_address_param inet DEFAULT NULL::inet)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  influencer_record RECORD;
  click_id uuid;
BEGIN
  -- Find the influencer with this code
  SELECT id INTO influencer_record
  FROM public.influencers 
  WHERE code = influencer_code AND status = 'active';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid influencer code';
  END IF;
  
  -- Insert link click record using SECURITY DEFINER privileges
  INSERT INTO public.link_clicks (
    influencer_id, 
    user_agent, 
    ip_address
  ) VALUES (
    influencer_record.id,
    user_agent_param,
    ip_address_param
  ) RETURNING id INTO click_id;
  
  RETURN click_id;
END;
$function$;

-- 4. Create a function for secure balance transaction insertion
CREATE OR REPLACE FUNCTION public.insert_balance_transaction_secure(
  user_uuid uuid, 
  transaction_type_param text, 
  amount_param numeric, 
  previous_balance_param numeric, 
  new_balance_param numeric, 
  reference_id_param uuid DEFAULT NULL, 
  metadata_param jsonb DEFAULT NULL,
  is_simulated_param boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  transaction_id uuid;
BEGIN
  -- Only allow insertion through this secure function
  INSERT INTO public.balance_transactions (
    user_id, transaction_type, amount, previous_balance, new_balance, 
    reference_id, metadata, is_simulated
  ) VALUES (
    user_uuid, transaction_type_param, amount_param, previous_balance_param, 
    new_balance_param, reference_id_param, metadata_param, is_simulated_param
  ) RETURNING id INTO transaction_id;
  
  RETURN transaction_id;
END;
$function$;

-- 5. Update the balance update function to use the new secure insert
CREATE OR REPLACE FUNCTION public.update_user_balance_secure_v3(
  user_uuid uuid, 
  amount numeric, 
  transaction_type text, 
  reference_id uuid DEFAULT NULL::uuid, 
  metadata jsonb DEFAULT NULL::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_balance numeric;
  new_balance numeric;
  operation_count integer;
  is_sim boolean := COALESCE((metadata->>'is_simulated')::boolean, (metadata->>'simulated')::boolean, false);
BEGIN
  -- Rate limiting check for financial operations
  SELECT COUNT(*) INTO operation_count
  FROM public.rate_limits
  WHERE user_id = user_uuid 
    AND operation_type = transaction_type
    AND window_start > now() - interval '1 hour';
    
  -- Allow max 10 financial operations per hour
  IF operation_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded for operation type: %', transaction_type;
  END IF;

  -- Update rate limiting counter
  INSERT INTO public.rate_limits (user_id, operation_type)
  VALUES (user_uuid, transaction_type)
  ON CONFLICT DO NOTHING;

  -- Get current balance
  SELECT saldo INTO current_balance 
  FROM public.profiles 
  WHERE user_id = user_uuid;
  
  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Calculate new balance
  new_balance := COALESCE(current_balance, 0) + amount;
  
  -- Prevent negative balance for debits
  IF new_balance < 0 AND amount < 0 THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  -- Update balance
  UPDATE public.profiles 
  SET saldo = new_balance, updated_at = now()
  WHERE user_id = user_uuid;
  
  -- Log transaction using secure function
  PERFORM insert_balance_transaction_secure(
    user_uuid, transaction_type, amount, current_balance, new_balance, 
    reference_id, metadata, is_sim
  );

  -- Log in audit trail
  INSERT INTO public.audit_log (
    user_id, action, table_name, old_values, new_values
  ) VALUES (
    user_uuid, 'balance_update', 'profiles',
    jsonb_build_object('balance', current_balance),
    jsonb_build_object('balance', new_balance, 'transaction_type', transaction_type, 'is_simulated', is_sim)
  );
END;
$function$;

-- 6. Add additional security comments for documentation
COMMENT ON POLICY "Users can view own profile only" ON public.profiles IS 'CRITICAL SECURITY: Prevents users from accessing other users emails, balances, and personal data. Each user can ONLY see their own profile.';
COMMENT ON POLICY "Users can view own withdrawal requests only" ON public.withdrawal_requests IS 'CRITICAL SECURITY: Prevents exposure of PIX keys and payment details. Users can ONLY see their own payment information.';
COMMENT ON POLICY "Users can view own bonus claims only" ON public.bonus_claims IS 'CRITICAL SECURITY: Prevents exposure of PIX keys in bonus claims. Users can ONLY see their own bonus claim data.';
COMMENT ON POLICY "Users can view own balance transactions only" ON public.balance_transactions IS 'CRITICAL SECURITY: Prevents exposure of financial transaction history. Users can ONLY see their own transaction data.';
COMMENT ON FUNCTION public.track_link_click_secure(text, text, inet) IS 'Secure function for tracking link clicks without exposing user IP addresses to unauthorized users';
COMMENT ON FUNCTION public.insert_balance_transaction_secure(uuid, text, numeric, numeric, numeric, uuid, jsonb, boolean) IS 'Secure function for inserting balance transactions - prevents direct user manipulation of financial records';