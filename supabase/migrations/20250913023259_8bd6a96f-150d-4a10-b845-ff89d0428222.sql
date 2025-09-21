-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_referral_signup()
RETURNS TRIGGER
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referral_code_param TEXT;
  influencer_record RECORD;
BEGIN
  -- Get referral code from user metadata
  referral_code_param := NEW.raw_user_meta_data->>'referral_code';
  
  IF referral_code_param IS NOT NULL THEN
    -- Find the influencer with this code
    SELECT * INTO influencer_record 
    FROM public.influencers 
    WHERE code = referral_code_param AND status = 'active';
    
    IF FOUND THEN
      -- Update the profiles table with the referral info
      UPDATE public.profiles 
      SET afiliado_id = influencer_record.user_id,
          referral_code = referral_code_param
      WHERE user_id = NEW.id;
      
      -- Create referral record
      INSERT INTO public.referrals (influencer_id, referred_user_id)
      VALUES (influencer_record.id, NEW.id);
      
      -- Update influencer stats
      UPDATE public.influencers 
      SET total_referrals = total_referrals + 1
      WHERE id = influencer_record.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;