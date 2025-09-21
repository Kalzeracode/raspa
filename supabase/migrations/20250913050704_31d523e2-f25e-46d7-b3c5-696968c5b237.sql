-- Fix marketing analytics security issues

-- Update promotions table policy to require authentication
DROP POLICY IF EXISTS "Everyone can view active promotions" ON public.promotions;

CREATE POLICY "Authenticated users can view active promotions" 
ON public.promotions 
FOR SELECT 
TO authenticated
USING ((is_active = true) AND (ends_at > now()));

-- Update link_clicks policy to require proper authentication for influencer tracking
DROP POLICY IF EXISTS "Anyone can insert link clicks" ON public.link_clicks;

CREATE POLICY "System can insert link clicks" 
ON public.link_clicks 
FOR INSERT 
WITH CHECK (false); -- Only allow through edge functions/triggers

-- Add a secure function for tracking link clicks
CREATE OR REPLACE FUNCTION public.track_link_click(
  influencer_code text,
  user_agent_param text DEFAULT NULL,
  ip_address_param inet DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  influencer_record RECORD;
  click_id uuid;
BEGIN
  -- Find the influencer with this code
  SELECT id INTO influencer_record
  FROM public.influencers 
  WHERE code = influencer_code AND status = 'active';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid influencer code';
  END IF;
  
  -- Insert link click record
  INSERT INTO public.link_clicks (
    influencer_id, 
    user_agent, 
    ip_address
  ) VALUES (
    influencer_record.id,
    user_agent_param,
    ip_address_param
  ) RETURNING id INTO click_id;
  
  RETURN click_id;
END;
$function$;