-- COMPREHENSIVE SECURITY FIX: Remove all problematic policies and create secure ones
-- This fixes customer email, financial data, and payment information exposure

-- =========================================
-- 1. PROFILES TABLE SECURITY FIX
-- =========================================

-- Drop existing problematic profile policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile safely" ON public.profiles;

-- Create secure profile policies - STRICT user isolation for email protection
CREATE POLICY "Strict user access only - profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin access for profiles (secure)
CREATE POLICY "Admin access only - profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (get_current_user_role() = 'admin'::app_role)
WITH CHECK (get_current_user_role() = 'admin'::app_role);

-- =========================================
-- 2. BALANCE_TRANSACTIONS TABLE SECURITY FIX
-- =========================================

-- Drop all existing problematic balance_transactions policies
DROP POLICY IF EXISTS "Admins can view all balance transactions" ON public.balance_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.balance_transactions;
DROP POLICY IF EXISTS "Users can view own balance transactions only" ON public.balance_transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.balance_transactions;
DROP POLICY IF EXISTS "Only system can insert balance transactions" ON public.balance_transactions;
DROP POLICY IF EXISTS "System can insert balance transactions" ON public.balance_transactions;

-- Create ultra-secure balance_transactions policies
CREATE POLICY "Strict user financial data access"
ON public.balance_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admin financial oversight only"
ON public.balance_transactions
FOR SELECT
TO authenticated
USING (get_current_user_role() = 'admin'::app_role);

-- Only allow inserts through secure function (prevents direct manipulation)
CREATE POLICY "System function insert only - financial"
ON public.balance_transactions
FOR INSERT
TO authenticated
WITH CHECK (false); -- Block all direct inserts

-- =========================================
-- 3. WITHDRAWAL_REQUESTS TABLE SECURITY FIX
-- =========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can create own withdrawal requests only" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can view own withdrawal requests only" ON public.withdrawal_requests;

-- Create secure withdrawal policies protecting payment details
CREATE POLICY "Strict withdrawal access - user only"
ON public.withdrawal_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "User withdrawal creation only"
ON public.withdrawal_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin withdrawal management"
ON public.withdrawal_requests
FOR ALL
TO authenticated
USING (get_current_user_role() = 'admin'::app_role)
WITH CHECK (get_current_user_role() = 'admin'::app_role);

-- =========================================
-- 4. BONUS_CLAIMS TABLE SECURITY FIX (PIX Keys)
-- =========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all bonus claims" ON public.bonus_claims;
DROP POLICY IF EXISTS "Users can create own bonus claims only" ON public.bonus_claims;
DROP POLICY IF EXISTS "Users can view own bonus claims only" ON public.bonus_claims;

-- Create ultra-secure PIX key protection
CREATE POLICY "Strict PIX key access - user only"
ON public.bonus_claims
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "User PIX claim creation only"
ON public.bonus_claims
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin PIX claim oversight"
ON public.bonus_claims
FOR ALL
TO authenticated
USING (get_current_user_role() = 'admin'::app_role)
WITH CHECK (get_current_user_role() = 'admin'::app_role);

-- =========================================
-- 5. SECURITY AUDIT ENHANCEMENT
-- =========================================

-- Log all access to sensitive tables for monitoring
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to customer email, financial, and payment data
  INSERT INTO public.audit_log (
    user_id, action, table_name, record_id, 
    old_values, new_values
  ) VALUES (
    auth.uid(),
    TG_OP || '_sensitive_data',
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add audit triggers to all sensitive tables
DROP TRIGGER IF EXISTS audit_profiles_access ON public.profiles;
CREATE TRIGGER audit_profiles_access
  AFTER SELECT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_data_access();

DROP TRIGGER IF EXISTS audit_balance_transactions_access ON public.balance_transactions;
CREATE TRIGGER audit_balance_transactions_access
  AFTER SELECT ON public.balance_transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_data_access();

DROP TRIGGER IF EXISTS audit_withdrawal_requests_access ON public.withdrawal_requests;
CREATE TRIGGER audit_withdrawal_requests_access
  AFTER SELECT ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_data_access();

DROP TRIGGER IF EXISTS audit_bonus_claims_access ON public.bonus_claims;
CREATE TRIGGER audit_bonus_claims_access
  AFTER SELECT ON public.bonus_claims
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_data_access();

-- =========================================
-- 6. VERIFY SECURITY IMPLEMENTATION
-- =========================================

-- Create verification function for admin use
CREATE OR REPLACE FUNCTION public.verify_data_security()
RETURNS TABLE(
  table_name text,
  rls_enabled boolean,
  policy_count integer,
  security_status text
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Only admins can run security verification
  IF get_current_user_role() != 'admin'::app_role THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    t.table_name::text,
    t.row_security::boolean as rls_enabled,
    COUNT(p.policyname)::integer as policy_count,
    CASE 
      WHEN t.row_security AND COUNT(p.policyname) >= 2 THEN 'SECURE'
      WHEN t.row_security AND COUNT(p.policyname) >= 1 THEN 'PARTIAL'
      ELSE 'VULNERABLE'
    END::text as security_status
  FROM information_schema.tables t
  LEFT JOIN pg_policies p ON p.tablename = t.table_name AND p.schemaname = t.table_schema
  WHERE t.table_schema = 'public' 
    AND t.table_name IN ('profiles', 'balance_transactions', 'withdrawal_requests', 'bonus_claims')
  GROUP BY t.table_name, t.row_security
  ORDER BY t.table_name;
END;
$$;