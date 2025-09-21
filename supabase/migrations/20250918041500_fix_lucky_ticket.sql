-- Ajusta a função generate_lucky_ticket para inicializar arrays e garantir
-- registros consistentes de vitórias/perdas.
CREATE OR REPLACE FUNCTION public.generate_lucky_ticket(ticket_cost_param numeric DEFAULT 1.00)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
  user_balance numeric;
  lucky_nums integer[] := ARRAY[]::integer[];
  user_nums integer[] := ARRAY[]::integer[];
  winning_cells integer[] := ARRAY[]::integer[];
  prize_amount numeric := 0;
  ticket_id uuid;
  available_numbers integer[] := ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
  temp_numbers integer[] := available_numbers;
  i integer;
  win_count integer := 0;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Usuário deve estar autenticado'
    );
  END IF;

  SELECT saldo INTO user_balance FROM profiles WHERE user_id = current_user_id;

  IF user_balance < ticket_cost_param THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Saldo insuficiente'
    );
  END IF;

  WHILE array_length(lucky_nums, 1) < 2 LOOP
    i := (random() * 19 + 1)::integer;
    IF NOT (i = ANY (lucky_nums)) THEN
      lucky_nums := lucky_nums || i;
    END IF;
  END LOOP;

  FOR i IN 1..10 LOOP
    DECLARE
      rand_index integer := (random() * array_length(temp_numbers, 1))::integer + 1;
      selected_num integer := temp_numbers[rand_index];
    BEGIN
      user_nums := user_nums || selected_num;
      temp_numbers := array_remove(temp_numbers, selected_num);
    END;
  END LOOP;

  FOR i IN 1..10 LOOP
    IF user_nums[i] = ANY (lucky_nums) THEN
      winning_cells := winning_cells || i;
      win_count := win_count + 1;
    END IF;
  END LOOP;

  CASE win_count
    WHEN 1 THEN prize_amount := 2.00;
    WHEN 2 THEN prize_amount := 10.00;
    WHEN 3 THEN prize_amount := 50.00;
    WHEN 4 THEN prize_amount := 200.00;
    ELSE prize_amount := 0;
  END CASE;

  INSERT INTO scratch_tickets (
    user_id, lucky_numbers, user_numbers, winning_cells,
    prize_amount, ticket_cost
  ) VALUES (
    current_user_id, lucky_nums, user_nums, winning_cells,
    prize_amount, ticket_cost_param
  ) RETURNING id INTO ticket_id;

  PERFORM update_user_balance_secure_v3(
    current_user_id,
    -ticket_cost_param + prize_amount,
    'lucky_ticket_purchase',
    ticket_id,
    jsonb_build_object(
      'ticket_id', ticket_id,
      'cost', ticket_cost_param,
      'prize', prize_amount,
      'win_count', win_count,
      'is_simulated', false
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', ticket_id,
    'lucky_numbers', lucky_nums,
    'user_numbers', user_nums,
    'winning_cells', winning_cells,
    'prize_amount', prize_amount,
    'win_count', win_count,
    'message', CASE
      WHEN win_count > 0 THEN 'Parabéns! Você ganhou ' ||
        to_char(prize_amount, '"R$" FM999G999D00')
      ELSE 'Não foi desta vez! Tente novamente.'
    END
  );
END;
$function$;
