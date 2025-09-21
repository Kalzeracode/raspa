-- Add missing fields to referrals table for proper commission tracking
ALTER TABLE public.referrals 
ADD COLUMN first_deposit_id uuid REFERENCES public.credit_purchases(id),
ADD COLUMN first_deposit_value numeric DEFAULT 0.00,
ADD COLUMN first_deposit_at timestamp with time zone,
ADD COLUMN commission_value numeric DEFAULT 0.00,
ADD COLUMN commission_paid boolean DEFAULT false,
ADD COLUMN commission_paid_at timestamp with time zone,
ADD COLUMN commission_notes text;

-- Add unique constraint to prevent duplicate commissions per user
ALTER TABLE public.referrals 
ADD CONSTRAINT unique_user_referral UNIQUE (referred_user_id);

-- Create trigger function to calculate commission on first deposit
CREATE OR REPLACE FUNCTION public.handle_first_deposit_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  referral_record RECORD;
  deposit_count INTEGER;
BEGIN
  -- Only process completed deposits
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Check if this user has a referral record
    SELECT * INTO referral_record
    FROM public.referrals 
    WHERE referred_user_id = NEW.user_id;
    
    IF FOUND AND referral_record.first_deposit_id IS NULL THEN
      -- Count existing completed deposits for this user
      SELECT COUNT(*) INTO deposit_count
      FROM public.credit_purchases
      WHERE user_id = NEW.user_id 
        AND status = 'completed'
        AND id != NEW.id;
      
      -- If this is the first deposit, record commission
      IF deposit_count = 0 THEN
        UPDATE public.referrals 
        SET 
          first_deposit_id = NEW.id,
          first_deposit_value = NEW.amount,
          first_deposit_at = NEW.updated_at,
          commission_value = NEW.amount * 0.50,
          commission_paid = false
        WHERE referred_user_id = NEW.user_id;
        
        -- Update influencer total earnings
        UPDATE public.influencers 
        SET total_earnings = total_earnings + (NEW.amount * 0.50)
        WHERE id = referral_record.influencer_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for first deposit commission
DROP TRIGGER IF EXISTS trigger_first_deposit_commission ON public.credit_purchases;
CREATE TRIGGER trigger_first_deposit_commission
  AFTER UPDATE ON public.credit_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_first_deposit_commission();

-- Update existing referrals to calculate retroactive commissions
DO $$
DECLARE
  ref_record RECORD;
  first_deposit RECORD;
BEGIN
  FOR ref_record IN 
    SELECT * FROM public.referrals 
    WHERE first_deposit_id IS NULL
  LOOP
    -- Find the first completed deposit for this referred user
    SELECT * INTO first_deposit
    FROM public.credit_purchases
    WHERE user_id = ref_record.referred_user_id 
      AND status = 'completed'
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF FOUND THEN
      -- Update the referral with first deposit info
      UPDATE public.referrals 
      SET 
        first_deposit_id = first_deposit.id,
        first_deposit_value = first_deposit.amount,
        first_deposit_at = first_deposit.updated_at,
        commission_value = first_deposit.amount * 0.50
      WHERE id = ref_record.id;
      
      -- Update influencer earnings
      UPDATE public.influencers 
      SET total_earnings = total_earnings + (first_deposit.amount * 0.50)
      WHERE id = ref_record.influencer_id;
    END IF;
  END LOOP;
END $$;