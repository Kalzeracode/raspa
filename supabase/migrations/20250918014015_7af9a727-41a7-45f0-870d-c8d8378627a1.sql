-- SCRATCH 3x3 com pesos no Admin + seed 150 (R$500)
-- Adapted for existing project structure

-- 1) Tabela de prêmios (editável no Admin): valor, fundo, peso, ativo
CREATE TABLE IF NOT EXISTS public.prize_tiers_9 (
  amount numeric(14,2) PRIMARY KEY,          -- 10..250000
  fund text NOT NULL CHECK (fund IN ('PP','JF')),
  weight numeric NOT NULL CHECK (weight >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Valores padrão (pode editar pesos no painel depois)
INSERT INTO public.prize_tiers_9 (amount, fund, weight) VALUES
  (10,      'PP', 40),
  (20,      'PP', 25),
  (50,      'PP', 15),
  (100,     'PP', 10),
  (500,     'PP',  2),
  (1000,    'JF',  4),
  (5000,    'JF',  2),
  (25000,   'JF',  1),
  (250000,  'JF', 0.3)
ON CONFLICT (amount) DO NOTHING;

-- 2) Inventário de bilhetes (resultado já decidido)
CREATE TABLE IF NOT EXISTS public.scratch9_inventory (
  id bigserial PRIMARY KEY,
  prize_amount numeric(14,2) NOT NULL DEFAULT 0, -- 0 = sem prêmio cash
  fund text NOT NULL DEFAULT 'PP',               -- 'PP' (cash) ou 'JF' (jackpot entry)
  jackpot_amount numeric(14,2),                  -- se fund='JF', valor do jackpot daquela entrada
  claimed boolean NOT NULL DEFAULT false,
  claimed_by uuid,
  claimed_at timestamptz,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scratch9_inventory_idx ON public.scratch9_inventory (claimed, fund);

-- 3) Registro de entradas no Jackpot (se quiser sortear depois)
CREATE TABLE IF NOT EXISTS public.jackpot_entries_9 (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric(14,2) NOT NULL,
  inventory_id bigint NOT NULL REFERENCES public.scratch9_inventory(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.prize_tiers_9 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scratch9_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jackpot_entries_9 ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prize_tiers_9
CREATE POLICY "Admins can manage prize tiers" ON public.prize_tiers_9
  FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Users can view active prize tiers" ON public.prize_tiers_9
  FOR SELECT USING (active = true);

-- RLS Policies for scratch9_inventory  
CREATE POLICY "Admins can view all inventory" ON public.scratch9_inventory
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "System can update inventory" ON public.scratch9_inventory
  FOR UPDATE USING (auth.role() = 'authenticated'::text);

-- RLS Policies for jackpot_entries_9
CREATE POLICY "Users can view own jackpot entries" ON public.jackpot_entries_9
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all jackpot entries" ON public.jackpot_entries_9
  FOR ALL USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "System can insert jackpot entries" ON public.jackpot_entries_9
  FOR INSERT WITH CHECK (auth.role() = 'authenticated'::text);

-- 4) Visão para o Admin ver probabilidades normalizadas
CREATE OR REPLACE VIEW public.prize_probs_9 AS
SELECT
  amount, fund, weight,
  weight / NULLIF(SUM(weight) OVER (),0) AS prob_normalized
FROM public.prize_tiers_9
WHERE active = true;

-- 5) Função utilitária: escolhe um prêmio por peso (entre todos ativos)
CREATE OR REPLACE FUNCTION public.pick_weighted_prize_9(OUT o_amount numeric, OUT o_fund text)
RETURNS record 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH t AS (
    SELECT amount, fund, weight,
           SUM(weight) OVER () AS total,
           SUM(weight) OVER (ORDER BY amount) AS cum
    FROM prize_tiers_9
    WHERE active = true AND weight > 0
  )
  SELECT amount, fund
  FROM t
  WHERE cum >= (random() * total)
  ORDER BY cum
  LIMIT 1;
$$;

-- 6) Seed: gera N bilhetes, limitando payout cash ao orçamento (ex.: R$500)
CREATE OR REPLACE FUNCTION public.seed_scratch9_inventory(p_tickets int, p_cash_budget numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  i int := 0;
  rem numeric := p_cash_budget;
  pa numeric; fu text;
  used_cash numeric := 0;
  cnt_pp int := 0;
  cnt_jf int := 0;
BEGIN
  -- Only admins can seed inventory
  IF get_user_role(auth.uid()) != 'admin'::app_role THEN
    RAISE EXCEPTION 'Only administrators can seed inventory';
  END IF;

  WHILE i < p_tickets LOOP
    SELECT * INTO pa, fu FROM pick_weighted_prize_9();

    IF fu = 'PP' AND pa <= rem THEN
      INSERT INTO scratch9_inventory (prize_amount, fund, jackpot_amount)
      VALUES (pa, 'PP', null);
      rem := rem - pa;
      used_cash := used_cash + pa;
      cnt_pp := cnt_pp + 1;
    ELSE
      -- sem caixa para pagar cash agora → vira entrada de jackpot (chance real)
      -- escolhe um valor JF por peso (pode ser o próprio se já for JF)
      IF fu <> 'JF' THEN
        SELECT amount, fund INTO pa, fu FROM (
          SELECT amount, fund
          FROM prize_tiers_9 WHERE active = true AND fund='JF' AND weight>0
        ) jf ORDER BY random() LIMIT 1;
      END IF;

      INSERT INTO scratch9_inventory (prize_amount, fund, jackpot_amount)
      VALUES (0, 'JF', pa);
      cnt_jf := cnt_jf + 1;
    END IF;

    i := i + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'tickets', p_tickets,
    'cash_budget_used', used_cash,
    'cash_budget_left', rem,
    'pp_tickets', cnt_pp,
    'jf_tickets', cnt_jf
  );
END;
$$;

-- 7) RPC principal: joga 1 bilhete, monta a grade 3x3 e integra com saldo
CREATE OR REPLACE FUNCTION public.play_scratch9()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  user_balance numeric;
  inv record;
  grid_amounts numeric[] := ARRAY[10,20,50,100,500,1000,5000,25000,250000];
  grid_shuffled numeric[];
  win_index int := null;
  new_balance numeric;
  ticket_cost numeric := 1.00;
BEGIN
  -- Validate user is authenticated
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User must be authenticated');
  END IF;

  -- Check user balance
  SELECT saldo INTO user_balance FROM profiles WHERE user_id = current_user_id;
  
  IF user_balance < ticket_cost THEN
    RETURN jsonb_build_object('error', 'Insufficient balance');
  END IF;

  -- pega 1 bilhete não reclamado e trava
  SELECT * INTO inv
  FROM scratch9_inventory
  WHERE claimed = false
  ORDER BY id
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error','inventory_exhausted');
  END IF;

  -- embaralha a grade
  SELECT array_agg(val) INTO grid_shuffled
  FROM (
    SELECT unnest(grid_amounts) AS val
    ORDER BY random()
  ) x;

  -- garante que o valor do bilhete esteja na grade e capture o índice
  IF inv.fund = 'PP' AND inv.prize_amount > 0 THEN
    -- acha índice do prêmio cash
    FOR i IN 1..9 LOOP
      IF grid_shuffled[i] = inv.prize_amount THEN
        win_index := i; EXIT;
      END IF;
    END LOOP;
    -- se por qualquer razão não achar (não deveria), troca a primeira posição
    IF win_index IS NULL THEN
      grid_shuffled[1] := inv.prize_amount;
      win_index := 1;
    END IF;
  ELSIF inv.fund = 'JF' AND inv.jackpot_amount IS NOT NULL THEN
    -- marca a casa do jackpot (só sinaliza; não paga agora)
    FOR i IN 1..9 LOOP
      IF grid_shuffled[i] = inv.jackpot_amount THEN
        win_index := i; EXIT;
      END IF;
    END LOOP;
    IF win_index IS NULL THEN
      grid_shuffled[1] := inv.jackpot_amount;
      win_index := 1;
    END IF;
  END IF;

  -- marca como claimado
  UPDATE scratch9_inventory
     SET claimed = true, claimed_by = current_user_id, claimed_at = now()
   WHERE id = inv.id;

  -- Update user balance (deduct cost, add prize if any)
  PERFORM update_user_balance_secure_v3(
    current_user_id,
    -ticket_cost + COALESCE(inv.prize_amount, 0),
    'scratch9_play',
    inv.id::uuid,
    jsonb_build_object(
      'inventory_id', inv.id,
      'cost', ticket_cost,
      'prize_amount', COALESCE(inv.prize_amount, 0),
      'fund', inv.fund,
      'jackpot_amount', inv.jackpot_amount
    )
  );

  -- registra entrada no jackpot
  IF inv.fund = 'JF' AND inv.jackpot_amount IS NOT NULL THEN
    INSERT INTO jackpot_entries_9 (user_id, amount, inventory_id)
    VALUES (current_user_id, inv.jackpot_amount, inv.id);
  END IF;

  -- Get updated balance
  SELECT saldo INTO new_balance FROM profiles WHERE user_id = current_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', inv.id,
    'grid', grid_shuffled,            -- [9] com 10..250000
    'win_index', win_index,           -- 1..9 (base-1) ou null
    'payout_cash', COALESCE(inv.prize_amount,0),
    'jackpot_entry', CASE WHEN inv.fund='JF' THEN inv.jackpot_amount ELSE null END,
    'new_balance', new_balance
  );
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_prize_tiers_9_updated_at
  BEFORE UPDATE ON public.prize_tiers_9
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- SEED inicial: 150 bilhetes com orçamento cash de R$500
-- (Para executar depois via Admin panel)