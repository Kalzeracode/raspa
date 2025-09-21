-- Create function to purchase and play scratch card
CREATE OR REPLACE FUNCTION public.purchase_and_play_scratch_card(
  card_id uuid,
  use_simulated_balance boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  user_balance NUMERIC;
  card_prize NUMERIC;
  card_chances NUMERIC;
  card_price NUMERIC := 1.00; -- Fixed price for all cards
  is_admin BOOLEAN;
  win_result BOOLEAN;
  prize_won NUMERIC := 0;
  user_role app_role;
BEGIN
  -- Validate user is authenticated
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'User must be authenticated'
    );
  END IF;

  -- Get user role and card info
  SELECT role INTO user_role FROM profiles WHERE user_id = current_user_id;
  SELECT premio, chances INTO card_prize, card_chances
  FROM raspadinhas 
  WHERE id = card_id AND ativo = true;
  
  IF card_prize IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Raspadinha não encontrada'
    );
  END IF;

  is_admin := (user_role = 'admin');

  -- Get user balance
  SELECT saldo INTO user_balance 
  FROM profiles 
  WHERE user_id = current_user_id;
  
  -- Check if user has sufficient balance (unless admin)
  IF NOT is_admin AND user_balance < card_price THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Saldo insuficiente'
    );
  END IF;

  -- Determine win result
  IF is_admin THEN
    -- Admin always wins
    win_result := true;
    prize_won := card_prize;
  ELSE
    -- Regular users: random chance based on card chances
    win_result := random() < card_chances;
    IF win_result THEN
      prize_won := card_prize;
    END IF;
  END IF;

  -- Update user balance (deduct cost, add prize if won)
  -- Only deduct cost if not admin or if admin wants to use balance
  IF NOT is_admin OR (is_admin AND user_balance >= card_price) THEN
    PERFORM update_user_balance_secure_v3(
      current_user_id,
      -card_price + prize_won,
      'scratch_card_purchase',
      card_id,
      jsonb_build_object(
        'card_id', card_id,
        'card_name', (SELECT nome FROM raspadinhas WHERE id = card_id),
        'cost', card_price,
        'win', win_result,
        'prize', prize_won,
        'is_admin', is_admin,
        'is_simulated', use_simulated_balance
      )
    );
  ELSE
    -- Admin playing without balance deduction, just add prize
    IF prize_won > 0 THEN
      PERFORM update_user_balance_secure_v3(
        current_user_id,
        prize_won,
        'admin_scratch_prize',
        card_id,
        jsonb_build_object(
          'card_id', card_id,
          'card_name', (SELECT nome FROM raspadinhas WHERE id = card_id),
          'prize', prize_won,
          'is_admin', is_admin,
          'free_play', true
        )
      );
    END IF;
  END IF;

  -- Record the game
  INSERT INTO jogadas (user_id, raspadinha_id, resultado, premio_ganho, is_simulated)
  VALUES (current_user_id, card_id, win_result, prize_won, use_simulated_balance);

  -- Get updated balance
  SELECT saldo INTO user_balance FROM profiles WHERE user_id = current_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'win', win_result,
    'prize', prize_won,
    'new_balance', user_balance,
    'message', CASE 
      WHEN win_result THEN 'Parabéns! Você ganhou ' || prize_won::text || '!'
      ELSE 'Que pena! Tente novamente!'
    END
  );
END;
$$;