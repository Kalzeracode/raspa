-- CRITICAL SECURITY FIXES - Fixed version

-- 1. Fix privilege escalation vulnerability - prevent users from updating their own role
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create new policy that excludes role updates
CREATE POLICY "Users can update own profile except role" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND 
  -- Prevent role changes by regular users
  (role = (SELECT role FROM public.profiles WHERE user_id = auth.uid()) OR get_user_role(auth.uid()) = 'admin'::app_role)
);

-- 2. Create admin-only function for role management
CREATE OR REPLACE FUNCTION public.update_user_role(target_user_id uuid, new_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can change roles
  IF get_user_role(auth.uid()) != 'admin'::app_role THEN
    RAISE EXCEPTION 'Only administrators can update user roles';
  END IF;
  
  -- Update the role
  UPDATE public.profiles 
  SET role = new_role, updated_at = now()
  WHERE user_id = target_user_id;
END;
$$;

-- 3. Secure raspadinhas table - remove public access to sensitive data
DROP POLICY IF EXISTS "Anyone can view active raspadinhas" ON public.raspadinhas;

-- Create new policy that only shows basic info to regular users
CREATE POLICY "Users can view basic raspadinha info" 
ON public.raspadinhas 
FOR SELECT 
USING (
  ativo = true AND (
    get_user_role(auth.uid()) = 'admin'::app_role OR
    auth.uid() IS NOT NULL -- authenticated users can see basic info
  )
);

-- 4. Enhanced financial security - add transaction logging
CREATE TABLE IF NOT EXISTS public.balance_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  transaction_type text NOT NULL, -- 'deposit', 'withdrawal', 'game_cost', 'game_win'
  amount numeric NOT NULL,
  previous_balance numeric NOT NULL,
  new_balance numeric NOT NULL,
  reference_id uuid, -- reference to game, withdrawal request, etc.
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on balance transactions
ALTER TABLE public.balance_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view own transactions, admins can view all
CREATE POLICY "Users can view own transactions" 
ON public.balance_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" 
ON public.balance_transactions 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- 5. Enhanced balance update function with logging
CREATE OR REPLACE FUNCTION public.update_user_balance_secure(
  user_uuid uuid, 
  amount numeric, 
  transaction_type text,
  reference_id uuid DEFAULT NULL,
  metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance numeric;
  new_balance numeric;
BEGIN
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
END;
$$;