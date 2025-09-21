-- Security Enhancement Migration V2: Fix Customer Data Exposure Issues
-- Drop and recreate all RLS policies with enhanced security

-- 1. Drop ALL existing policies on sensitive tables first
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on profiles table
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.profiles';
    END LOOP;
    
    -- Drop all policies on withdrawal_requests table
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'withdrawal_requests'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.withdrawal_requests';
    END LOOP;
    
    -- Drop all policies on bonus_claims table
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'bonus_claims'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.bonus_claims';
    END LOOP;
END $$;

-- 2. Create enhanced security function (replace existing)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$function$;

-- 3. Create secure RLS policies for profiles table
-- Users can ONLY view their own profile data (no other users' emails, balances, etc.)
CREATE POLICY "Users can view own profile only" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all profiles (for admin dashboard)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (get_current_user_role() = 'admin'::app_role);

-- Users can update only their own profile (role changes restricted)
CREATE POLICY "Users can update own profile safely" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND 
  role = (SELECT role FROM public.profiles WHERE user_id = auth.uid())
);

-- Only admins can update any profile (including roles)
CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (get_current_user_role() = 'admin'::app_role)
WITH CHECK (get_current_user_role() = 'admin'::app_role);

-- 4. Enhanced withdrawal_requests policies (prevent PIX key exposure)
CREATE POLICY "Users can view own withdrawal requests only" 
ON public.withdrawal_requests 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own withdrawal requests only" 
ON public.withdrawal_requests 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all withdrawal requests" 
ON public.withdrawal_requests 
FOR ALL 
TO authenticated
USING (get_current_user_role() = 'admin'::app_role);

-- 5. Enhanced bonus_claims policies (prevent PIX key exposure)
CREATE POLICY "Users can view own bonus claims only" 
ON public.bonus_claims 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bonus claims only" 
ON public.bonus_claims 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all bonus claims" 
ON public.bonus_claims 
FOR ALL 
TO authenticated
USING (get_current_user_role() = 'admin'::app_role);

-- 6. Add helper function for admin checks
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  );
$function$;

-- 7. Add performance indexes for security checks
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON public.withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_bonus_claims_user_id ON public.bonus_claims(user_id);

-- 8. Update existing get_user_role function to use the new secure approach
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT role FROM public.profiles WHERE user_id = user_uuid LIMIT 1;
$function$;

-- 9. Add security documentation
COMMENT ON FUNCTION public.get_current_user_role() IS 'Enhanced security function - gets current user role without RLS recursion';
COMMENT ON FUNCTION public.is_admin() IS 'Security helper - checks if current user is admin safely';
COMMENT ON POLICY "Users can view own profile only" ON public.profiles IS 'Critical security policy - users can ONLY see their own email, balance, and personal data';
COMMENT ON POLICY "Users can view own withdrawal requests only" ON public.withdrawal_requests IS 'Prevents exposure of PIX keys and payment details between users';
COMMENT ON POLICY "Users can view own bonus claims only" ON public.bonus_claims IS 'Prevents exposure of PIX keys in bonus claims between users';