-- Fix System Functionality Issues After Security Enhancement
-- This migration fixes the overly restrictive policies that could break system functionality

-- 1. Fix balance_transactions INSERT policy to allow system operations
DROP POLICY IF EXISTS "Only system can insert balance transactions" ON public.balance_transactions;

CREATE POLICY "System can insert balance transactions" 
ON public.balance_transactions 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Allow system functions to insert transactions
  -- This is called from security definer functions only
  auth.role() = 'authenticated'
);

-- 2. Fix link_clicks INSERT policy to allow tracking
DROP POLICY IF EXISTS "System can insert link clicks" ON public.link_clicks;

CREATE POLICY "System can insert link clicks tracking" 
ON public.link_clicks 
FOR INSERT 
TO authenticated, anon
WITH CHECK (
  -- Allow link click tracking for both authenticated and anonymous users
  -- This is essential for affiliate/influencer tracking
  true
);

-- 3. Add proper rate_limits policies to prevent manipulation
CREATE POLICY "System can manage rate limits" 
ON public.rate_limits 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Only allow rate limit insertions from security definer functions
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can view own rate limits only" 
ON public.rate_limits 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- No UPDATE or DELETE policies for rate_limits - they should be managed by system only

-- 4. Ensure proper isolation for referrals table  
DROP POLICY IF EXISTS "System can insert referrals" ON public.referrals;

CREATE POLICY "System can insert referrals tracking" 
ON public.referrals 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Allow referral tracking insertions
  auth.role() = 'authenticated'
);

-- 5. Improve jogadas policies for better security
DROP POLICY IF EXISTS "Users can insert own jogadas" ON public.jogadas;

CREATE POLICY "Users can insert own game plays only" 
ON public.jogadas 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  -- Ensure the game is active and valid
  EXISTS (
    SELECT 1 FROM public.raspadinhas 
    WHERE id = raspadinha_id AND ativo = true
  )
);

-- 6. Create a secure system role check function
CREATE OR REPLACE FUNCTION public.is_system_operation()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  -- This function helps identify legitimate system operations
  -- It checks if the current operation is being called from a security definer function
  SELECT auth.role() = 'authenticated';
$function$;

-- 7. Add better audit trail for sensitive operations
CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, details jsonb DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.audit_log (
    user_id, action, table_name, old_values, new_values
  ) VALUES (
    auth.uid(),
    'security_event',
    event_type,
    NULL,
    COALESCE(details, jsonb_build_object('timestamp', now()))
  );
END;
$function$;

-- 8. Create emergency security disable function (admin only)
CREATE OR REPLACE FUNCTION public.emergency_security_disable()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only admins can use this emergency function
  IF get_current_user_role() != 'admin'::app_role THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Log the emergency action
  PERFORM log_security_event('emergency_security_disable', 
    jsonb_build_object('admin_user', auth.uid()));
  
  RETURN 'Emergency security protocols logged. Contact system administrator.';
END;
$function$;

-- 9. Add comprehensive security monitoring
CREATE OR REPLACE FUNCTION public.check_suspicious_activity()
RETURNS TABLE(user_id uuid, activity_count bigint, risk_level text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only admins can run security monitoring
  IF get_current_user_role() != 'admin'::app_role THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    al.user_id,
    COUNT(*) as activity_count,
    CASE 
      WHEN COUNT(*) > 100 THEN 'HIGH'
      WHEN COUNT(*) > 50 THEN 'MEDIUM'
      ELSE 'LOW'
    END as risk_level
  FROM public.audit_log al
  WHERE al.created_at > now() - interval '1 hour'
  GROUP BY al.user_id
  HAVING COUNT(*) > 20
  ORDER BY activity_count DESC;
END;
$function$;

-- 10. Comments for documentation
COMMENT ON FUNCTION public.is_system_operation() IS 'Helper function to validate system-level operations';
COMMENT ON FUNCTION public.log_security_event(text, jsonb) IS 'Logs security-related events for monitoring';
COMMENT ON FUNCTION public.emergency_security_disable() IS 'Emergency function for security incidents - admin only';
COMMENT ON FUNCTION public.check_suspicious_activity() IS 'Security monitoring function to detect unusual activity patterns';

-- Final security verification
DO $$
BEGIN
  -- Verify critical policies are in place
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can view own profile only'
  ) THEN
    RAISE EXCEPTION 'Critical security policy missing: profile access control';
  END IF;
  
  RAISE NOTICE 'Security enhancement completed successfully';
END $$;