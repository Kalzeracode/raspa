-- Add cash_payout column to separate saldo credit value from display prize
ALTER TABLE public.raspadinhas
ADD COLUMN IF NOT EXISTS cash_payout numeric(14,2) DEFAULT 0;

-- Backfill: use the existing prize value only for cards com prêmios em dinheiro
UPDATE public.raspadinhas
SET cash_payout = premio
WHERE cash_payout IS NULL OR cash_payout = 0
  AND (
    nome ILIKE '%R$%'
    OR nome ILIKE '%PIX%'
    OR nome ILIKE '%REAL%'
    OR nome ILIKE '%REAIS%'
  );

-- Ensure column is not null (default is 0 for itens físicos)
ALTER TABLE public.raspadinhas
ALTER COLUMN cash_payout SET NOT NULL;
