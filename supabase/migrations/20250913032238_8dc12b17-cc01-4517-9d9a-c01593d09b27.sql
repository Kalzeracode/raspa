-- Add missing audit_log table for security
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Admin can view all audit logs
CREATE POLICY "Admins can view all audit logs" 
ON public.audit_log 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- Create enhanced influencer creation function that can create users
CREATE OR REPLACE FUNCTION public.create_influencer_with_user(
  email_param text,
  password_param text,
  commission_rate_param numeric DEFAULT 0.10
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
  influencer_code text;
  result jsonb;
BEGIN
  -- Only admins can create influencers
  IF get_user_role(auth.uid()) != 'admin'::app_role THEN
    RAISE EXCEPTION 'Only administrators can create influencers';
  END IF;

  -- Generate unique referral code
  influencer_code := generate_referral_code();
  
  -- Check if code already exists (unlikely but possible)
  WHILE EXISTS (SELECT 1 FROM influencers WHERE code = influencer_code) LOOP
    influencer_code := generate_referral_code();
  END LOOP;

  -- Create user account via Supabase Auth (this would typically be done via API)
  -- For now, we'll return the necessary information for manual creation
  
  result := jsonb_build_object(
    'email', email_param,
    'password', password_param,
    'code', influencer_code,
    'commission_rate', commission_rate_param,
    'action', 'create_user_then_influencer'
  );

  RETURN result;
END;
$$;