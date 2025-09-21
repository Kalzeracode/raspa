-- Create missing update_user_balance function
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

-- Add foreign key constraint between jogadas and profiles
ALTER TABLE public.jogadas 
ADD CONSTRAINT jogadas_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;