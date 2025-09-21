-- Add simulated flags to key tables
ALTER TABLE public.balance_transactions ADD COLUMN IF NOT EXISTS is_simulated boolean NOT NULL DEFAULT false;
ALTER TABLE public.credit_purchases    ADD COLUMN IF NOT EXISTS is_simulated boolean NOT NULL DEFAULT false;
ALTER TABLE public.jogadas             ADD COLUMN IF NOT EXISTS is_simulated boolean NOT NULL DEFAULT false;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS is_simulated boolean NOT NULL DEFAULT false;

-- Update secure balance function to persist is_simulated based on metadata
CREATE OR REPLACE FUNCTION public.update_user_balance_secure_v2(
  user_uuid uuid,
  amount numeric,
  transaction_type text,
  reference_id uuid DEFAULT NULL::uuid,
  metadata jsonb DEFAULT NULL::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_balance numeric;
  new_balance numeric;
  operation_count integer;
  is_sim boolean := COALESCE((metadata->>'is_simulated')::boolean, (metadata->>'simulated')::boolean, false);
BEGIN
  -- Rate limiting check for financial operations
  SELECT COUNT(*) INTO operation_count
  FROM public.rate_limits
  WHERE user_id = user_uuid 
    AND operation_type = transaction_type
    AND window_start > now() - interval '1 hour';
    
  -- Allow max 10 financial operations per hour
  IF operation_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded for operation type: %', transaction_type;
  END IF;

  -- Update rate limiting counter
  INSERT INTO public.rate_limits (user_id, operation_type)
  VALUES (user_uuid, transaction_type)
  ON CONFLICT DO NOTHING;

  -- Get current balance
  SELECT saldo INTO current_balance 
  FROM public.profiles 
  WHERE user_id = user_uuid;
  
  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Calculate new balance
  new_balance := COALESCE(current_balance, 0) + amount;
  
  -- Prevent negative balance for debits
  IF new_balance < 0 AND amount < 0 THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  -- Update balance
  UPDATE public.profiles 
  SET saldo = new_balance, updated_at = now()
  WHERE user_id = user_uuid;
  
  -- Log transaction with simulation flag
  INSERT INTO public.balance_transactions (
    user_id, transaction_type, amount, previous_balance, new_balance, reference_id, metadata, is_simulated
  ) VALUES (
    user_uuid, transaction_type, amount, current_balance, new_balance, reference_id, metadata, is_sim
  );

  -- Log in audit trail
  INSERT INTO public.audit_log (
    user_id, action, table_name, old_values, new_values
  ) VALUES (
    user_uuid, 'balance_update', 'profiles',
    jsonb_build_object('balance', current_balance),
    jsonb_build_object('balance', new_balance, 'transaction_type', transaction_type, 'is_simulated', is_sim)
  );
END;
$$;

-- New admin stats function with real vs simulated revenue
CREATE OR REPLACE FUNCTION public.get_admin_stats_v2()
RETURNS TABLE(
  total_users integer,
  total_deposits_amount numeric,
  total_bets_count integer,
  daily_data jsonb,
  recent_activity jsonb,
  revenue_real numeric,
  revenue_simulated numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  daily_stats JSONB[];
  activity_data JSONB[];
BEGIN
  -- Only admins can access this function
  IF get_user_role(auth.uid()) != 'admin'::app_role THEN
    RAISE EXCEPTION 'Only administrators can access stats';
  END IF;

  -- Totals
  SELECT COUNT(*)::INTEGER INTO total_users FROM profiles;

  SELECT COALESCE(SUM(amount), 0) INTO total_deposits_amount 
  FROM credit_purchases WHERE status = 'completed';

  SELECT COUNT(*)::INTEGER INTO total_bets_count FROM jogadas;

  -- Revenue split
  SELECT COALESCE(SUM(amount), 0) INTO revenue_real
  FROM credit_purchases WHERE status = 'completed' AND is_simulated = false;

  SELECT COALESCE(SUM(amount), 0) INTO revenue_simulated
  FROM credit_purchases WHERE status = 'completed' AND is_simulated = true;

  -- Daily data (last 7 days) with real vs simulated revenue
  SELECT array_agg(
    jsonb_build_object(
      'date', date_series.day::TEXT,
      'users', COALESCE(day_users.count, 0),
      'games', COALESCE(day_games.count, 0),
      'revenue', COALESCE(day_revenue.amount, 0),
      'revenue_simulated', COALESCE(day_revenue_sim.amount, 0)
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
    WHERE created_at >= CURRENT_DATE - INTERVAL '6 days' AND status = 'completed' AND is_simulated = false
    GROUP BY DATE(created_at)
  ) day_revenue ON date_series.day = day_revenue.day
  LEFT JOIN (
    SELECT DATE(created_at) as day, SUM(amount) as amount
    FROM credit_purchases 
    WHERE created_at >= CURRENT_DATE - INTERVAL '6 days' AND status = 'completed' AND is_simulated = true
    GROUP BY DATE(created_at)
  ) day_revenue_sim ON date_series.day = day_revenue_sim.day;

  -- Recent activity
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
    array_to_json(activity_data)::JSONB as recent_activity,
    revenue_real,
    revenue_simulated;
END;
$$;