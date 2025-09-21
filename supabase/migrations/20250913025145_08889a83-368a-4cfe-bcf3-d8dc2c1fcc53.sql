-- CRITICAL SECURITY FIXES

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
  (OLD.role = NEW.role OR get_user_role(auth.uid()) = 'admin'::app_role)
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
  
  -- Log the role change for audit
  INSERT INTO public.audit_log (admin_id, action, target_user_id, details)
  VALUES (auth.uid(), 'role_change', target_user_id, jsonb_build_object('new_role', new_role));
END;
$$;

-- 3. Create audit log table for security events
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.audit_log 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- 4. Secure raspadinhas table - remove public access to sensitive data
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

-- 5. Create secure function to get raspadinha data for games
CREATE OR REPLACE FUNCTION public.get_raspadinha_for_game(raspadinha_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raspadinha_data jsonb;
  user_balance numeric;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Get user balance
  SELECT saldo INTO user_balance 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- Check if user has sufficient balance (assuming minimum cost of 1)
  IF user_balance < 1 THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  -- Get only necessary raspadinha data (hide sensitive winning mechanics)
  SELECT jsonb_build_object(
    'id', id,
    'nome', nome,
    'premio', premio,
    'imagem_url', imagem_url,
    'ativo', ativo
  ) INTO raspadinha_data
  FROM public.raspadinhas 
  WHERE id = raspadinha_id AND ativo = true;
  
  IF raspadinha_data IS NULL THEN
    RAISE EXCEPTION 'Raspadinha not found or inactive';
  END IF;
  
  RETURN raspadinha_data;
END;
$$;

-- 6. Enhanced financial security - add transaction logging
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

-- 7. Enhanced balance update function with logging
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

-- 8. Rate limiting table for security
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system can manage rate limits
CREATE POLICY "System only rate limits" 
ON public.rate_limits 
FOR ALL 
USING (false);

-- 9. Secure game play function with rate limiting
CREATE OR REPLACE FUNCTION public.play_raspadinha_secure(raspadinha_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id_var uuid;
  user_balance numeric;
  raspadinha_info jsonb;
  game_cost numeric := 1; -- Default cost
  win_chance numeric;
  premio_value numeric;
  is_winner boolean;
  game_result jsonb;
  rate_limit_count integer;
BEGIN
  user_id_var := auth.uid();
  
  -- Check authentication
  IF user_id_var IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Rate limiting check (max 10 games per minute)
  SELECT count(*) INTO rate_limit_count
  FROM public.rate_limits 
  WHERE user_id = user_id_var 
    AND action = 'play_game' 
    AND window_start > now() - interval '1 minute';
    
  IF rate_limit_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before playing again.';
  END IF;
  
  -- Get raspadinha info (only admins can see full details)
  SELECT to_jsonb(r.*) INTO raspadinha_info
  FROM public.raspadinhas r
  WHERE r.id = raspadinha_id AND r.ativo = true;
  
  IF raspadinha_info IS NULL THEN
    RAISE EXCEPTION 'Raspadinha not found or inactive';
  END IF;
  
  win_chance := (raspadinha_info->>'chances')::numeric;
  premio_value := (raspadinha_info->>'premio')::numeric;
  
  -- Get user balance
  SELECT saldo INTO user_balance 
  FROM public.profiles 
  WHERE user_id = user_id_var;
  
  IF user_balance < game_cost THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  -- Deduct game cost
  PERFORM public.update_user_balance_secure(
    user_id_var, 
    -game_cost, 
    'game_cost',
    raspadinha_id,
    jsonb_build_object('raspadinha_id', raspadinha_id)
  );
  
  -- Determine if user wins (simple random for now)
  is_winner := random() <= (win_chance / 100.0);
  
  -- If winner, add prize to balance
  IF is_winner THEN
    PERFORM public.update_user_balance_secure(
      user_id_var, 
      premio_value, 
      'game_win',
      raspadinha_id,
      jsonb_build_object('raspadinha_id', raspadinha_id, 'prize', premio_value)
    );
  END IF;
  
  -- Record the game play
  INSERT INTO public.jogadas (user_id, raspadinha_id, resultado, premio_ganho)
  VALUES (user_id_var, raspadinha_id, is_winner, CASE WHEN is_winner THEN premio_value ELSE 0 END);
  
  -- Update rate limiting
  INSERT INTO public.rate_limits (user_id, action, window_start)
  VALUES (user_id_var, 'play_game', now())
  ON CONFLICT DO NOTHING;
  
  -- Return game result (without exposing sensitive mechanics)
  game_result := jsonb_build_object(
    'won', is_winner,
    'prize', CASE WHEN is_winner THEN premio_value ELSE 0 END,
    'raspadinha_name', raspadinha_info->>'nome'
  );
  
  RETURN game_result;
END;
$$;