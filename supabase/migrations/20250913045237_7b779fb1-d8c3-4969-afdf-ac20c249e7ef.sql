-- Update purchase_game to use chances stored as 0-1 (not 0-100)
CREATE OR REPLACE FUNCTION public.purchase_game(
  card_id uuid,
  promotion_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  success boolean,
  message text,
  new_balance numeric,
  game_result boolean,
  prize_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- Determine if user wins: chances in DB are stored as 0-1, so compare directly
  win_result := random() < card_chances;
  
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