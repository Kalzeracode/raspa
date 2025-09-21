-- Create just the update_user_balance function
CREATE OR REPLACE FUNCTION public.update_user_balance(user_uuid uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET saldo = COALESCE(saldo, 0) + amount
  WHERE user_id = user_uuid;
END;
$$;