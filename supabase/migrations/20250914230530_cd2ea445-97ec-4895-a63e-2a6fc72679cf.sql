-- Enhanced security for profiles table
-- Add additional RLS policies for better protection against potential email harvesting

-- Drop existing policies to recreate with enhanced security
DROP POLICY IF EXISTS "Users can view own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile safely" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Enhanced SELECT policies with additional security checks
CREATE POLICY "Users can view own profile only - enhanced" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  AND auth.uid() IS NOT NULL 
  AND user_id IS NOT NULL
);

-- Admin access with additional validation
CREATE POLICY "Admins can view all profiles - verified" 
ON public.profiles 
FOR SELECT 
USING (
  get_current_user_role() = 'admin'::app_role 
  AND auth.uid() IS NOT NULL
);

-- Enhanced UPDATE policies with role protection
CREATE POLICY "Users can update own profile safely - enhanced" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND auth.uid() IS NOT NULL 
  AND user_id IS NOT NULL
)
WITH CHECK (
  auth.uid() = user_id 
  AND auth.uid() IS NOT NULL 
  AND user_id IS NOT NULL
  -- Prevent role escalation - users cannot change their own role
  AND role = (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- Admin update access with enhanced checks
CREATE POLICY "Admins can update any profile - verified" 
ON public.profiles 
FOR UPDATE 
USING (
  get_current_user_role() = 'admin'::app_role 
  AND auth.uid() IS NOT NULL
)
WITH CHECK (
  get_current_user_role() = 'admin'::app_role 
  AND auth.uid() IS NOT NULL
);

-- Prevent INSERT operations except through the trigger
-- Users should not be able to manually insert profile records
CREATE POLICY "Prevent manual profile creation" 
ON public.profiles 
FOR INSERT 
WITH CHECK (false);

-- Prevent DELETE operations to maintain data integrity
CREATE POLICY "Prevent profile deletion" 
ON public.profiles 
FOR DELETE 
USING (false);

-- Create a function to safely view profile summary without exposing emails
CREATE OR REPLACE FUNCTION public.get_profile_summary(profile_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  role app_role,
  created_at timestamp with time zone,
  saldo numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Only return profile summary if the user is viewing their own profile
  -- or if the current user is an admin
  SELECT 
    p.user_id,
    p.role,
    p.created_at,
    p.saldo
  FROM profiles p
  WHERE p.user_id = profile_user_id
    AND (
      auth.uid() = profile_user_id 
      OR get_current_user_role() = 'admin'::app_role
    );
$$;

-- Log profile access for security monitoring
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log profile access for security monitoring
  -- Only log if someone other than the profile owner is accessing
  IF auth.uid() != OLD.user_id AND get_current_user_role() = 'admin'::app_role THEN
    INSERT INTO audit_log (
      user_id, 
      action, 
      table_name, 
      record_id,
      old_values
    ) VALUES (
      auth.uid(),
      'profile_access',
      'profiles',
      OLD.id,
      jsonb_build_object('accessed_profile_user_id', OLD.user_id)
    );
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create trigger for profile access logging
DROP TRIGGER IF EXISTS log_profile_access_trigger ON public.profiles;
CREATE TRIGGER log_profile_access_trigger
  AFTER SELECT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_access();