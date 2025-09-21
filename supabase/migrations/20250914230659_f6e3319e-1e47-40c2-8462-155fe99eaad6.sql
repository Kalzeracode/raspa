-- Enhanced security for profiles table - Fixed version
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

-- Create a secure function for getting user's own email
CREATE OR REPLACE FUNCTION public.get_own_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email 
  FROM profiles 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Create audit function for admin profile access
CREATE OR REPLACE FUNCTION public.audit_admin_profile_access(accessed_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log when admin accesses another user's profile
  IF get_current_user_role() = 'admin'::app_role AND auth.uid() != accessed_user_id THEN
    INSERT INTO audit_log (
      user_id, 
      action, 
      table_name, 
      old_values,
      new_values
    ) VALUES (
      auth.uid(),
      'admin_profile_access',
      'profiles',
      NULL,
      jsonb_build_object(
        'accessed_user_id', accessed_user_id,
        'timestamp', now(),
        'admin_user_id', auth.uid()
      )
    );
  END IF;
END;
$$;