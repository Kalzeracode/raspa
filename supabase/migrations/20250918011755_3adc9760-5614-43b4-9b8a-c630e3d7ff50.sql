-- FASE 0 & 1: Estrutura básica para sistema de bilhetes com números da sorte
-- Criar tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS public.system_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Inserir configurações padrão
INSERT INTO public.system_config (key, value, description) VALUES
('SCRATCH_ENABLED', 'true', 'Habilita sistema de raspadinhas'),
('PP_BUFFER_PERCENTAGE', '25', 'Percentual de buffer do Prize Pool'),
('JF_BUFFER_PERCENTAGE', '50', 'Percentual de buffer do Jackpot Fund'),
('MIN_WITHDRAWAL_AMOUNT', '10', 'Valor mínimo para saque sem taxa'),
('PIX_FEE', '0.85', 'Taxa PIX para saques pequenos')
ON CONFLICT (key) DO NOTHING;

-- Criar tabela de fundos (Prize Pool e Jackpot Fund)
CREATE TABLE IF NOT EXISTS public.prize_funds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fund_type text NOT NULL CHECK (fund_type IN ('prize_pool', 'jackpot_fund')),
  balance numeric NOT NULL DEFAULT 0,
  buffer_percentage numeric NOT NULL DEFAULT 25,
  claimable_amount numeric NOT NULL DEFAULT 0,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Inserir fundos padrão
INSERT INTO public.prize_funds (fund_type, balance, buffer_percentage) VALUES
('prize_pool', 1000.00, 25),
('jackpot_fund', 5000.00, 50)
ON CONFLICT DO NOTHING;

-- Criar tabela de bilhetes com números da sorte
CREATE TABLE IF NOT EXISTS public.scratch_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  lucky_numbers integer[] NOT NULL, -- 2 números da sorte
  user_numbers integer[] NOT NULL, -- 10 números do usuário
  winning_cells integer[] NOT NULL DEFAULT '{}', -- células vencedoras
  prize_amount numeric NOT NULL DEFAULT 0,
  ticket_cost numeric NOT NULL DEFAULT 1.00,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revealed', 'expired')),
  revealed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scratch_tickets ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para system_config
CREATE POLICY "Admins can manage system config" ON public.system_config
  FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Everyone can read system config" ON public.system_config
  FOR SELECT USING (true);

-- Políticas RLS para prize_funds
CREATE POLICY "Admins can manage prize funds" ON public.prize_funds
  FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Users can read prize funds" ON public.prize_funds
  FOR SELECT USING (true);

-- Políticas RLS para scratch_tickets
CREATE POLICY "Users can view own tickets" ON public.scratch_tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tickets" ON public.scratch_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets" ON public.scratch_tickets
  FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- Função para gerar bilhete com números da sorte
CREATE OR REPLACE FUNCTION public.generate_lucky_ticket(ticket_cost_param numeric DEFAULT 1.00)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
  user_balance numeric;
  lucky_nums integer[];
  user_nums integer[];
  winning_cells integer[];
  prize_amount numeric := 0;
  ticket_id uuid;
  available_numbers integer[] := ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
  temp_numbers integer[];
  i integer;
  win_count integer := 0;
BEGIN
  -- Validar usuário autenticado
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Usuário deve estar autenticado'
    );
  END IF;

  -- Verificar saldo do usuário
  SELECT saldo INTO user_balance FROM profiles WHERE user_id = current_user_id;
  
  IF user_balance < ticket_cost_param THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Saldo insuficiente'
    );
  END IF;

  -- Gerar 2 números da sorte (1-20)
  lucky_nums := ARRAY[
    (random() * 19 + 1)::integer,
    (random() * 19 + 1)::integer
  ];
  
  -- Garantir que os números da sorte sejam diferentes
  WHILE lucky_nums[1] = lucky_nums[2] LOOP
    lucky_nums[2] := (random() * 19 + 1)::integer;
  END LOOP;

  -- Gerar 10 números do usuário
  temp_numbers := available_numbers;
  user_nums := '{}';
  
  FOR i IN 1..10 LOOP
    DECLARE
      rand_index integer := (random() * array_length(temp_numbers, 1))::integer + 1;
      selected_num integer := temp_numbers[rand_index];
    BEGIN
      user_nums := user_nums || selected_num;
      temp_numbers := array_remove(temp_numbers, selected_num);
    END;
  END LOOP;

  -- Determinar células vencedoras (onde user_nums contém lucky_nums)
  FOR i IN 1..10 LOOP
    IF user_nums[i] = ANY(lucky_nums) THEN
      winning_cells := winning_cells || i;
      win_count := win_count + 1;
    END IF;
  END LOOP;

  -- Calcular prêmio baseado no número de acertos
  CASE win_count
    WHEN 1 THEN prize_amount := 2.00;
    WHEN 2 THEN prize_amount := 10.00;
    WHEN 3 THEN prize_amount := 50.00;
    WHEN 4 THEN prize_amount := 200.00;
    ELSE prize_amount := 0;
  END CASE;

  -- Criar o bilhete
  INSERT INTO scratch_tickets (
    user_id, lucky_numbers, user_numbers, winning_cells, 
    prize_amount, ticket_cost
  ) VALUES (
    current_user_id, lucky_nums, user_nums, winning_cells,
    prize_amount, ticket_cost_param
  ) RETURNING id INTO ticket_id;

  -- Atualizar saldo do usuário
  PERFORM update_user_balance_secure_v3(
    current_user_id,
    -ticket_cost_param + prize_amount,
    'lucky_ticket_purchase',
    ticket_id,
    jsonb_build_object(
      'ticket_id', ticket_id,
      'cost', ticket_cost_param,
      'prize', prize_amount,
      'win_count', win_count
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
      WHEN win_count > 0 THEN 'Parabéns! Você ganhou R$ ' || prize_amount::text || '!'
      ELSE 'Não foi desta vez! Tente novamente.'
    END
  );
END;
$function$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON system_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prize_funds_updated_at
  BEFORE UPDATE ON prize_funds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();