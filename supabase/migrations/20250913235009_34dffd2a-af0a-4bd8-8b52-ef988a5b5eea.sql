-- Create referral system for regular users (separate from influencers)
CREATE TABLE public.user_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  has_qualified BOOLEAN DEFAULT false,
  qualified_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referrer_user_id, referred_user_id)
);

-- Create user levels and bonuses tracking
CREATE TABLE public.user_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE UNIQUE,
  level TEXT NOT NULL DEFAULT 'bronze' CHECK (level IN ('bronze', 'prata', 'ouro', 'diamante')),
  qualified_referrals INTEGER DEFAULT 0,
  bonuses_claimed INTEGER DEFAULT 0,
  total_bonus_earned NUMERIC DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create bonus claims tracking
CREATE TABLE public.bonus_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 50.00,
  milestone INTEGER NOT NULL, -- 25, 50, 75
  level_achieved TEXT NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  pix_key TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_referrals
CREATE POLICY "Users can view own referrals" ON public.user_referrals
  FOR SELECT USING (auth.uid() = referrer_user_id);

CREATE POLICY "System can insert referrals" ON public.user_referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_user_id);

CREATE POLICY "Admins can view all referrals" ON public.user_referrals
  FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- RLS Policies for user_levels
CREATE POLICY "Users can view own level" ON public.user_levels
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own level data" ON public.user_levels
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own level" ON public.user_levels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all levels" ON public.user_levels
  FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- RLS Policies for bonus_claims
CREATE POLICY "Users can view own bonus claims" ON public.bonus_claims
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bonus claims" ON public.bonus_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all bonus claims" ON public.bonus_claims
  FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- Function to check if a deposit qualifies for referral bonus (R$10 minimum)
CREATE OR REPLACE FUNCTION public.check_referral_qualification()
RETURNS TRIGGER AS $$
DECLARE
  referrer_id UUID;
BEGIN
  -- Only process completed purchases of R$10 or more
  IF NEW.status = 'completed' AND NEW.amount >= 10.00 AND OLD.status != 'completed' THEN
    
    -- Check if this user was referred by someone
    SELECT referrer_user_id INTO referrer_id
    FROM public.user_referrals 
    WHERE referred_user_id = NEW.user_id AND has_qualified = false;
    
    IF referrer_id IS NOT NULL THEN
      -- Mark this referral as qualified
      UPDATE public.user_referrals 
      SET has_qualified = true, qualified_at = now()
      WHERE referrer_user_id = referrer_id AND referred_user_id = NEW.user_id;
      
      -- Update or create user level record
      INSERT INTO public.user_levels (user_id, qualified_referrals)
      VALUES (referrer_id, 1)
      ON CONFLICT (user_id) DO UPDATE SET
        qualified_referrals = user_levels.qualified_referrals + 1,
        updated_at = now();
        
      -- Update level based on qualified referrals
      UPDATE public.user_levels
      SET level = CASE 
        WHEN qualified_referrals >= 75 THEN 'diamante'
        WHEN qualified_referrals >= 50 THEN 'ouro'  
        WHEN qualified_referrals >= 25 THEN 'prata'
        ELSE 'bronze'
      END,
      updated_at = now()
      WHERE user_id = referrer_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for credit purchases
CREATE TRIGGER check_referral_qualification_trigger
  AFTER UPDATE ON public.credit_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.check_referral_qualification();

-- Function to claim bonus (R$50 every 25 qualified referrals, max 3 times)
CREATE OR REPLACE FUNCTION public.claim_referral_bonus(pix_key_param TEXT)
RETURNS JSONB AS $$
DECLARE
  current_user_id UUID := auth.uid();
  user_level_record RECORD;
  next_milestone INTEGER;
  bonus_amount NUMERIC := 50.00;
  level_name TEXT;
BEGIN
  -- Get user level data
  SELECT * INTO user_level_record
  FROM public.user_levels
  WHERE user_id = current_user_id;
  
  IF user_level_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Você ainda não possui indicações qualificadas');
  END IF;
  
  -- Check if user has reached a new milestone and hasn't claimed it yet
  next_milestone := (user_level_record.bonuses_claimed + 1) * 25;
  
  IF user_level_record.qualified_referrals < next_milestone THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Você precisa de ' || (next_milestone - user_level_record.qualified_referrals) || ' indicações qualificadas para o próximo bônus'
    );
  END IF;
  
  IF user_level_record.bonuses_claimed >= 3 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Você já resgatou todos os bônus disponíveis');
  END IF;
  
  -- Determine level name
  level_name := CASE 
    WHEN next_milestone = 25 THEN 'prata'
    WHEN next_milestone = 50 THEN 'ouro'
    WHEN next_milestone = 75 THEN 'diamante'
    ELSE 'bronze'
  END;
  
  -- Create bonus claim record
  INSERT INTO public.bonus_claims (user_id, amount, milestone, level_achieved, pix_key)
  VALUES (current_user_id, bonus_amount, next_milestone, level_name, pix_key_param);
  
  -- Update user levels
  UPDATE public.user_levels
  SET bonuses_claimed = bonuses_claimed + 1,
      total_bonus_earned = total_bonus_earned + bonus_amount,
      updated_at = now()
  WHERE user_id = current_user_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Bônus de R$50,00 solicitado com sucesso! Será processado em até 24h.',
    'amount', bonus_amount,
    'level', level_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;