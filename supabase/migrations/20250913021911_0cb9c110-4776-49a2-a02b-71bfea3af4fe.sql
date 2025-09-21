-- Create influencers management tables
CREATE TABLE public.influencers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  commission_rate NUMERIC NOT NULL DEFAULT 0.10,
  total_referrals INTEGER DEFAULT 0,
  total_earnings NUMERIC DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referral tracking table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  influencer_id UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commission_earned NUMERIC DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create withdrawal requests table  
CREATE TABLE public.withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  payment_method TEXT NOT NULL DEFAULT 'PIX',
  payment_details JSONB,
  admin_notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create click tracking table for influencer links
CREATE TABLE public.link_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  influencer_id UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  converted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for influencers table
CREATE POLICY "Admins can manage all influencers" 
ON public.influencers 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Influencers can view own data" 
ON public.influencers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Influencers can update own data" 
ON public.influencers 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for referrals table
CREATE POLICY "Admins can view all referrals" 
ON public.referrals 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Influencers can view own referrals" 
ON public.referrals 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.influencers 
  WHERE influencers.id = referrals.influencer_id 
  AND influencers.user_id = auth.uid()
));

-- RLS Policies for withdrawal_requests table
CREATE POLICY "Admins can manage all withdrawal requests" 
ON public.withdrawal_requests 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Users can view own withdrawal requests" 
ON public.withdrawal_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own withdrawal requests" 
ON public.withdrawal_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for link_clicks table
CREATE POLICY "Admins can view all link clicks" 
ON public.link_clicks 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Influencers can view own link clicks" 
ON public.link_clicks 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.influencers 
  WHERE influencers.id = link_clicks.influencer_id 
  AND influencers.user_id = auth.uid()
));

CREATE POLICY "Anyone can insert link clicks" 
ON public.link_clicks 
FOR INSERT 
WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_influencers_updated_at
BEFORE UPDATE ON public.influencers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add referral_code to profiles table if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- Create function to generate unique referral codes
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Create function to handle user registration with referral
CREATE OR REPLACE FUNCTION public.handle_referral_signup()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for referral handling
CREATE TRIGGER on_auth_user_referral_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_referral_signup();