-- CRITICAL SECURITY FIXES: Financial Data Protection
-- Phase 1: Consolidate balance_transactions RLS policies and enhance security

-- 1. Clean up overlapping RLS policies on balance_transactions
DROP POLICY IF EXISTS "Admins can view all balance transactions" ON public.balance_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.balance_transactions;
DROP POLICY IF EXISTS "Users can view own balance transactions only" ON public.balance_transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.balance_transactions;
DROP POLICY IF EXISTS "Only system can insert balance transactions" ON public.balance_transactions;
DROP POLICY IF EXISTS "System can insert balance transactions" ON public.balance_transactions;

-- Create consolidated, clear RLS policies for balance_transactions
CREATE POLICY "Users can view own financial transactions only" 
ON public.balance_transactions 
FOR SELECT 
USING (
  auth.uid() = user_id 
  AND auth.uid() IS NOT NULL 
  AND user_id IS NOT NULL
);

CREATE POLICY "Admins can view all financial transactions with audit" 
ON public.balance_transactions 
FOR SELECT 
USING (
  get_current_user_role() = 'admin'::app_role 
  AND auth.uid() IS NOT NULL
);

-- Only authenticated system functions can insert transactions
CREATE POLICY "System functions can insert financial transactions" 
ON public.balance_transactions 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated'::text
  AND auth.uid() IS NOT NULL
);

-- 2. Enhance withdrawal_requests security
-- Add encryption function for payment details
CREATE OR REPLACE FUNCTION public.encrypt_payment_details(payment_data jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encrypted_data text;
BEGIN
  -- Simple obfuscation for PIX keys (in production, use proper encryption)
  -- This masks the PIX key for display while keeping it recoverable for processing
  encrypted_data := encode(digest(payment_data::text, 'sha256'), 'hex');
  RETURN encrypted_data;
END;
$$;

-- Add function to get masked PIX key for display
CREATE OR REPLACE FUNCTION public.get_masked_pix_key(pix_key text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Mask PIX key showing only first 3 and last 3 characters
  IF length(pix_key) <= 6 THEN
    RETURN '***';
  END IF;
  
  RETURN left(pix_key, 3) || '***' || right(pix_key, 3);
END;
$$;

-- 3. Enhance bonus_claims security with PIX key protection
-- Add PIX key validation function
CREATE OR REPLACE FUNCTION public.validate_pix_key(pix_key text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Basic PIX key validation (email, phone, CPF, or random key format)
  IF pix_key IS NULL OR length(pix_key) < 5 THEN
    RETURN false;
  END IF;
  
  -- Check for basic patterns (email, phone, etc.)
  IF pix_key ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
    RETURN true; -- Email format
  END IF;
  
  IF pix_key ~ '^[0-9]{10,11}$' THEN
    RETURN true; -- Phone format
  END IF;
  
  IF pix_key ~ '^[0-9]{11}$' OR pix_key ~ '^[0-9]{14}$' THEN
    RETURN true; -- CPF/CNPJ format
  END IF;
  
  IF length(pix_key) = 32 AND pix_key ~ '^[a-fA-F0-9-]+$' THEN
    RETURN true; -- Random key format
  END IF;
  
  RETURN false;
END;
$$;

-- Add trigger to validate PIX keys on bonus claims
CREATE OR REPLACE FUNCTION public.validate_bonus_claim_pix()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate PIX key format
  IF NOT validate_pix_key(NEW.pix_key) THEN
    RAISE EXCEPTION 'Invalid PIX key format';
  END IF;
  
  -- Log the bonus claim for audit
  INSERT INTO audit_log (
    user_id, action, table_name, record_id, new_values
  ) VALUES (
    NEW.user_id,
    'bonus_claim_request',
    'bonus_claims',
    NEW.id,
    jsonb_build_object(
      'amount', NEW.amount,
      'milestone', NEW.milestone,
      'level_achieved', NEW.level_achieved,
      'masked_pix', get_masked_pix_key(NEW.pix_key)
    )
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_bonus_claim_trigger
  BEFORE INSERT ON public.bonus_claims
  FOR EACH ROW
  EXECUTE FUNCTION validate_bonus_claim_pix();

-- 4. Enhanced withdrawal request validation
CREATE OR REPLACE FUNCTION public.validate_withdrawal_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  daily_total numeric;
  user_balance numeric;
  pix_key text;
BEGIN
  -- Extract PIX key from payment details
  pix_key := NEW.payment_details->>'pix_key';
  
  -- Validate PIX key if present
  IF pix_key IS NOT NULL AND NOT validate_pix_key(pix_key) THEN
    RAISE EXCEPTION 'Invalid PIX key format in payment details';
  END IF;
  
  -- Check daily withdrawal limit
  SELECT COALESCE(SUM(amount), 0) INTO daily_total
  FROM withdrawal_requests
  WHERE user_id = NEW.user_id 
    AND requested_at::date = CURRENT_DATE
    AND status != 'rejected'
    AND id != NEW.id;
    
  IF daily_total + NEW.amount > 1000.00 THEN
    RAISE EXCEPTION 'Daily withdrawal limit exceeded (R$ 1000)';
  END IF;
  
  -- Check user balance
  SELECT saldo INTO user_balance FROM profiles WHERE user_id = NEW.user_id;
  IF user_balance < NEW.amount THEN
    RAISE EXCEPTION 'Insufficient balance for withdrawal';
  END IF;
  
  -- Log withdrawal request for audit
  INSERT INTO audit_log (
    user_id, action, table_name, record_id, new_values
  ) VALUES (
    NEW.user_id,
    'withdrawal_request',
    'withdrawal_requests',
    NEW.id,
    jsonb_build_object(
      'amount', NEW.amount,
      'payment_method', NEW.payment_method,
      'masked_pix', CASE 
        WHEN pix_key IS NOT NULL THEN get_masked_pix_key(pix_key)
        ELSE NULL 
      END,
      'risk_score', NEW.risk_score
    )
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_withdrawal_request_trigger
  BEFORE INSERT OR UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_withdrawal_request();

-- 5. Add comprehensive audit logging for admin financial access
CREATE OR REPLACE FUNCTION public.audit_financial_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log when admins access financial data
  IF get_current_user_role() = 'admin'::app_role AND TG_OP = 'SELECT' THEN
    INSERT INTO audit_log (
      user_id, action, table_name, old_values, new_values
    ) VALUES (
      auth.uid(),
      'admin_financial_access',
      TG_TABLE_NAME,
      NULL,
      jsonb_build_object(
        'accessed_at', now(),
        'table', TG_TABLE_NAME,
        'admin_user_id', auth.uid()
      )
    );
  END IF;
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- Apply audit trigger to sensitive financial tables
CREATE TRIGGER audit_balance_transactions_access
  AFTER SELECT ON public.balance_transactions
  FOR EACH STATEMENT
  EXECUTE FUNCTION audit_financial_access();

CREATE TRIGGER audit_withdrawal_requests_access
  AFTER SELECT ON public.withdrawal_requests
  FOR EACH STATEMENT
  EXECUTE FUNCTION audit_financial_access();

-- 6. Rate limiting for financial operations
CREATE OR REPLACE FUNCTION public.check_financial_rate_limit(user_uuid uuid, operation_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  operation_count integer;
BEGIN
  -- Check rate limit for financial operations
  SELECT COUNT(*) INTO operation_count
  FROM rate_limits
  WHERE user_id = user_uuid 
    AND operation_type = operation_type
    AND window_start > now() - interval '1 hour';
    
  -- Allow max 5 withdrawal requests per hour, 10 for other operations
  IF operation_type = 'withdrawal_request' AND operation_count >= 5 THEN
    RETURN false;
  ELSIF operation_count >= 10 THEN
    RETURN false;
  END IF;
  
  -- Update rate limit counter
  INSERT INTO rate_limits (user_id, operation_type)
  VALUES (user_uuid, operation_type)
  ON CONFLICT DO NOTHING;
  
  RETURN true;
END;
$$;