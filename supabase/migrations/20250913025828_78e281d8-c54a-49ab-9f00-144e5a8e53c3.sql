-- Critical Security Fixes Migration

-- 1. Fix balance_transactions INSERT protection - only allow system functions
CREATE POLICY "Only system can insert balance transactions" 
ON public.balance_transactions 
FOR INSERT 
WITH CHECK (false); -- No direct inserts allowed

-- 2. Add withdrawal amount limits and validation
ALTER TABLE public.withdrawal_requests 
ADD COLUMN IF NOT EXISTS daily_limit_check boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0;

-- 3. Create secure game data function that hides sensitive info
CREATE OR REPLACE FUNCTION public.get_game_public_data(game_id uuid)
RETURNS TABLE (
  id uuid,
  nome text,
  imagem_url text,
  premio numeric,
  ativo boolean
) AS $$
BEGIN
  -- Only return public game data, hide chances from regular users
  RETURN QUERY
  SELECT 
    r.id,
    r.nome,
    r.imagem_url,
    r.premio,
    r.ativo
  FROM public.raspadinhas r
  WHERE r.id = game_id AND r.ativo = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Create secure withdrawal request function with validation
CREATE OR REPLACE FUNCTION public.create_withdrawal_request_secure(
  amount_param numeric,
  pix_key_param text
) RETURNS uuid AS $$
DECLARE
  user_balance numeric;
  daily_total numeric;
  request_id uuid;
  current_user_id uuid := auth.uid();
BEGIN
  -- Validate user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check minimum withdrawal amount
  IF amount_param < 1.00 THEN
    RAISE EXCEPTION 'Minimum withdrawal amount is R$ 1.00';
  END IF;

  -- Check user balance
  SELECT saldo INTO user_balance 
  FROM public.profiles 
  WHERE user_id = current_user_id;
  
  IF user_balance IS NULL OR user_balance < amount_param THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Check daily withdrawal limit (R$ 1000 per day)
  SELECT COALESCE(SUM(amount), 0) INTO daily_total
  FROM public.withdrawal_requests
  WHERE user_id = current_user_id 
    AND requested_at::date = CURRENT_DATE
    AND status != 'rejected';
    
  IF daily_total + amount_param > 1000.00 THEN
    RAISE EXCEPTION 'Daily withdrawal limit exceeded (R$ 1000)';
  END IF;

  -- Validate PIX key format (basic validation)
  IF pix_key_param IS NULL OR LENGTH(pix_key_param) < 5 THEN
    RAISE EXCEPTION 'Invalid PIX key format';
  END IF;

  -- Create withdrawal request
  INSERT INTO public.withdrawal_requests (
    user_id, 
    amount, 
    payment_method, 
    payment_details,
    risk_score
  ) VALUES (
    current_user_id,
    amount_param,
    'PIX',
    jsonb_build_object('pix_key', pix_key_param),
    CASE 
      WHEN amount_param > 500 THEN 2
      WHEN amount_param > 100 THEN 1
      ELSE 0
    END
  ) RETURNING id INTO request_id;

  -- Log the withdrawal request in audit_log
  INSERT INTO public.audit_log (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    current_user_id,
    'withdrawal_request',
    'withdrawal_requests',
    request_id,
    jsonb_build_object('balance', user_balance),
    jsonb_build_object('amount', amount_param, 'pix_key', pix_key_param)
  );

  RETURN request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Create function to get safe game chances for authenticated users only
CREATE OR REPLACE FUNCTION public.get_game_chances(game_id uuid)
RETURNS numeric AS $$
DECLARE
  game_chances numeric;
BEGIN
  -- Only authenticated users can see chances
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT chances INTO game_chances
  FROM public.raspadinhas
  WHERE id = game_id AND ativo = true;
  
  RETURN COALESCE(game_chances, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Add rate limiting for financial operations
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  operation_type text NOT NULL,
  operation_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits" 
ON public.rate_limits 
FOR SELECT 
USING (auth.uid() = user_id);

-- 7. Enhanced balance update function with rate limiting
CREATE OR REPLACE FUNCTION public.update_user_balance_secure_v2(
  user_uuid uuid, 
  amount numeric, 
  transaction_type text, 
  reference_id uuid DEFAULT NULL::uuid, 
  metadata jsonb DEFAULT NULL::jsonb
) RETURNS void AS $$
DECLARE
  current_balance numeric;
  new_balance numeric;
  operation_count integer;
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
  
  -- Log transaction
  INSERT INTO public.balance_transactions (
    user_id, transaction_type, amount, previous_balance, new_balance, reference_id, metadata
  ) VALUES (
    user_uuid, transaction_type, amount, current_balance, new_balance, reference_id, metadata
  );

  -- Log in audit trail
  INSERT INTO public.audit_log (
    user_id, action, table_name, old_values, new_values
  ) VALUES (
    user_uuid, 'balance_update', 'profiles',
    jsonb_build_object('balance', current_balance),
    jsonb_build_object('balance', new_balance, 'transaction_type', transaction_type)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;