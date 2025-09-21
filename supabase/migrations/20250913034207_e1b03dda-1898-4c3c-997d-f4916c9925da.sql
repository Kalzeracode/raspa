-- Create promotions table for banner promotions
CREATE TABLE public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  banner_url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CARD_DISCOUNT', 'BONUS', 'GENERAL')),
  discount_percentage NUMERIC DEFAULT 0,
  bonus_amount NUMERIC DEFAULT 0,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  target_card_ids UUID[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Policies for promotions
CREATE POLICY "Everyone can view active promotions" 
ON public.promotions 
FOR SELECT 
USING (is_active = true AND ends_at > now());

CREATE POLICY "Admins can manage all promotions" 
ON public.promotions 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- Add trigger for updated_at
CREATE TRIGGER update_promotions_updated_at
BEFORE UPDATE ON public.promotions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create admin stats function
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE (
  total_users INTEGER,
  total_deposits_amount NUMERIC,
  total_bets_count INTEGER,
  daily_data JSONB,
  recent_activity JSONB
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $function$
DECLARE
  daily_stats JSONB[];
  activity_data JSONB[];
BEGIN
  -- Only admins can access this function
  IF get_user_role(auth.uid()) != 'admin'::app_role THEN
    RAISE EXCEPTION 'Only administrators can access stats';
  END IF;

  -- Get total users
  SELECT COUNT(*)::INTEGER INTO total_users FROM profiles;
  
  -- Get total deposits
  SELECT COALESCE(SUM(amount), 0) INTO total_deposits_amount 
  FROM credit_purchases WHERE status = 'completed';
  
  -- Get total bets/games
  SELECT COUNT(*)::INTEGER INTO total_bets_count FROM jogadas;
  
  -- Get daily data for last 7 days
  SELECT array_agg(
    jsonb_build_object(
      'date', date_series.day::TEXT,
      'users', COALESCE(day_users.count, 0),
      'games', COALESCE(day_games.count, 0),
      'revenue', COALESCE(day_revenue.amount, 0)
    )
  ) INTO daily_stats
  FROM (
    SELECT generate_series(
      CURRENT_DATE - INTERVAL '6 days',
      CURRENT_DATE,
      INTERVAL '1 day'
    )::DATE as day
  ) date_series
  LEFT JOIN (
    SELECT DATE(created_at) as day, COUNT(*) as count
    FROM profiles 
    WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
    GROUP BY DATE(created_at)
  ) day_users ON date_series.day = day_users.day
  LEFT JOIN (
    SELECT DATE(created_at) as day, COUNT(*) as count
    FROM jogadas 
    WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
    GROUP BY DATE(created_at)
  ) day_games ON date_series.day = day_games.day
  LEFT JOIN (
    SELECT DATE(created_at) as day, SUM(amount) as amount
    FROM credit_purchases 
    WHERE created_at >= CURRENT_DATE - INTERVAL '6 days' AND status = 'completed'
    GROUP BY DATE(created_at)
  ) day_revenue ON date_series.day = day_revenue.day;
  
  -- Get recent activity
  SELECT array_agg(
    jsonb_build_object(
      'type', activity_type,
      'description', description,
      'amount', amount,
      'timestamp', timestamp
    )
  ) INTO activity_data
  FROM (
    SELECT 'game' as activity_type, 
           'Jogada realizada' as description,
           premio_ganho as amount,
           created_at as timestamp
    FROM jogadas 
    ORDER BY created_at DESC 
    LIMIT 10
  ) recent;
  
  RETURN QUERY SELECT 
    total_users,
    total_deposits_amount,
    total_bets_count,
    array_to_json(daily_stats)::JSONB as daily_data,
    array_to_json(activity_data)::JSONB as recent_activity;
END;
$function$;

-- Create purchase game function
CREATE OR REPLACE FUNCTION public.purchase_game(
  card_id UUID,
  promotion_id UUID DEFAULT NULL
) 
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_balance NUMERIC,
  game_result BOOLEAN,
  prize_amount NUMERIC
)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $function$
DECLARE
  current_user_id UUID := auth.uid();
  user_balance NUMERIC;
  card_prize NUMERIC;
  card_chances NUMERIC;
  final_price NUMERIC;
  promo_discount NUMERIC := 0;
  win_result BOOLEAN;
  prize_won NUMERIC := 0;
BEGIN
  -- Validate user is authenticated
  IF current_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User must be authenticated', 0::NUMERIC, false, 0::NUMERIC;
    RETURN;
  END IF;

  -- Get card info
  SELECT premio, chances INTO card_prize, card_chances
  FROM raspadinhas 
  WHERE id = card_id AND ativo = true;
  
  IF card_prize IS NULL THEN
    RETURN QUERY SELECT false, 'Raspadinha não encontrada', 0::NUMERIC, false, 0::NUMERIC;
    RETURN;
  END IF;

  -- Calculate final price (base price is 1.00)
  final_price := 1.00;
  
  -- Apply promotion discount if applicable
  IF promotion_id IS NOT NULL THEN
    SELECT discount_percentage INTO promo_discount
    FROM promotions 
    WHERE id = promotion_id 
      AND is_active = true 
      AND ends_at > now()
      AND (target_card_ids IS NULL OR card_id = ANY(target_card_ids));
    
    IF promo_discount > 0 THEN
      final_price := final_price * (1 - promo_discount / 100);
    END IF;
  END IF;

  -- Get user balance
  SELECT saldo INTO user_balance 
  FROM profiles 
  WHERE user_id = current_user_id;
  
  IF user_balance < final_price THEN
    RETURN QUERY SELECT false, 'Saldo insuficiente', user_balance, false, 0::NUMERIC;
    RETURN;
  END IF;

  -- Determine if user wins (basic random based on chances)
  win_result := random() < (card_chances / 100);
  
  IF win_result THEN
    prize_won := card_prize;
  END IF;

  -- Update user balance
  PERFORM update_user_balance_secure_v2(
    current_user_id,
    -final_price + prize_won,
    'game_purchase',
    card_id,
    jsonb_build_object(
      'card_id', card_id,
      'promotion_id', promotion_id,
      'original_price', 1.00,
      'final_price', final_price,
      'discount', promo_discount,
      'win', win_result,
      'prize', prize_won
    )
  );

  -- Record the game
  INSERT INTO jogadas (user_id, raspadinha_id, resultado, premio_ganho)
  VALUES (current_user_id, card_id, win_result, prize_won);

  -- Get updated balance
  SELECT saldo INTO user_balance FROM profiles WHERE user_id = current_user_id;

  RETURN QUERY SELECT 
    true, 
    CASE WHEN win_result THEN 'Parabéns! Você ganhou!' ELSE 'Que pena! Tente novamente!' END,
    user_balance,
    win_result,
    prize_won;
END;
$function$;