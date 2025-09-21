import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Price calculation function - must match frontend logic
function calculateCardPrice(cardName: string, prizeAmount: number): number {
  const name = cardName.toLowerCase();
  
  // Casa e Onix - 10 reais
  if (name.includes('casa') || name.includes('onix')) {
    return 10.00;
  }
  
  // High value cards (50 mil, Moto, Casa PrÃ³pria) - 5 reais
  if (prizeAmount >= 15000 || name.includes('moto') || name.includes('prÃ³pria')) {
    return 5.00;
  }
  
  // Small prizes (100-500) - 50 centavos
  if (prizeAmount <= 500) {
    return 0.50;
  }
  
  // iPhone 17, 10 mil, 5 mil, 1 mil - 1 real (default)
  return 1.00;
}

function randomIntInRange(min: number, max: number): number {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return 0;
  }
  const lower = Math.floor(Math.min(min, max));
  const upper = Math.floor(Math.max(min, max));
  if (upper <= 0) {
    return 0;
  }
  const safeLower = Math.max(0, lower);
  return Math.floor(Math.random() * (upper - safeLower + 1)) + safeLower;
}

function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildScratchGrid(
  isWinner: boolean,
  winDisplayValue: number,
  basePool: number[],
): { grid: number[]; winningCells: number[] } {
  const pool = basePool.length ? [...basePool] : [10, 20, 50, 100, 500, 1000];
  const grid = new Array<number>(9);
  let winningCells: number[] = [];

  if (isWinner) {
    const winValue = winDisplayValue || pool[0];
    const positions = shuffleArray([...Array(9).keys()]);
    winningCells = positions.slice(0, 3).map((idx) => idx + 1);

    for (const pos of winningCells) {
      grid[pos - 1] = winValue;
    }

    const counts = new Map<number, number>();
    for (let i = 0; i < 9; i++) {
      if (grid[i] !== undefined) continue;
      const available = shuffleArray(pool);
      let chosen = available[0];
      for (const candidate of available) {
        const currentCount = counts.get(candidate) ?? 0;
        if (candidate === winValue) continue;
        if (currentCount < 2) {
          chosen = candidate;
          break;
        }
      }
      grid[i] = chosen;
      counts.set(chosen, (counts.get(chosen) ?? 0) + 1);
    }
  } else {
    const counts = new Map<number, number>();
    for (let i = 0; i < 9; i++) {
      const shuffled = shuffleArray(pool);
      let chosen = shuffled[0];
      for (const candidate of shuffled) {
        const currentCount = counts.get(candidate) ?? 0;
        if (currentCount < 2) {
          chosen = candidate;
          break;
        }
      }
      grid[i] = chosen;
      counts.set(chosen, (counts.get(chosen) ?? 0) + 1);
    }
  }

  return { grid, winningCells };
}


Deno.serve(async (req) => {
  console.log('Processing game request...');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { scratch_card_id, user_id, card_price } = await req.json();
    console.log('Processing game for user:', user_id, 'card:', scratch_card_id, 'price:', card_price);

    if (!scratch_card_id || !user_id || card_price === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get scratch card details
    const { data: scratchCard, error: cardError } = await supabase
      .from('raspadinhas')
      .select('id, nome, imagem_url, premio, chances, ativo, cash_payout')
      .eq('id', scratch_card_id)
      .eq('ativo', true)
      .single();

    if (cardError || !scratchCard) {
      console.error('Card not found:', cardError);
      return new Response(
        JSON.stringify({ error: 'Scratch card not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate card price - security check
    const expectedPrice = calculateCardPrice(scratchCard.nome, scratchCard.premio);
    if (Math.abs(expectedPrice - card_price) > 0.01) {
      console.error('Price validation failed:', { expected: expectedPrice, provided: card_price });
      return new Response(
        JSON.stringify({ error: 'Invalid card price' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gamePrice = card_price;
    const displayPrizeValue = Number(scratchCard.premio) || 0;
    const rawCashPayout = Number(scratchCard.cash_payout);
    const baseCashPayout = Number.isFinite(rawCashPayout) && rawCashPayout > 0 ? rawCashPayout : 0;
    const fallbackCashPayout = displayPrizeValue > 0 ? Math.min(displayPrizeValue, 1000) : 100;
    const cardCashPayout = baseCashPayout > 0 ? baseCashPayout : fallbackCashPayout;
    const rawChance = Number(scratchCard.chances);
    const effectiveWinChance = (() => {
      if (!Number.isFinite(rawChance) || rawChance <= 0) return 0.25;
      if (rawChance > 0.95) return 0.95;
      return rawChance;
    })();
    const winDisplayValue = displayPrizeValue > 0 ? displayPrizeValue : Math.max(cardCashPayout, 100);
    const gridPool = Array.from(new Set([
      5, 10, 20, 50, 100, 200, 500, 800, 1000, 1500, 2000,
      5000, 10000, 15000, 25000, 50000, winDisplayValue,
      cardCashPayout,
    ])) as number[];
    
    // Always allow purchase - no balance check or limits
    console.log('Game allowed for all users - no limits applied, price:', gamePrice);

    // Determine if user wins
    let isWinner = false;
    let prizeAmount = 0;

    if (profile.role === 'admin' || profile.role === 'influencer') {
      isWinner = Math.random() < 0.2;
      if (isWinner) {
        prizeAmount = cardCashPayout;
      }
    } else {
      const randomValue = Math.random();
      isWinner = randomValue < effectiveWinChance;
      if (isWinner) {
        prizeAmount = cardCashPayout;
      }
      console.log(`Win check: chance=${effectiveWinChance}, random=${randomValue}, winner=${isWinner}`);
    }

    if (!isWinner) { gridPool.push(cardCashPayout); }
    const { grid: gridValues, winningCells } = buildScratchGrid(isWinner, winDisplayValue, gridPool);

    // Record the game play
    const { error: gameError } = await supabase
      .from('jogadas')
      .insert({
        user_id: user_id,
        raspadinha_id: scratch_card_id,
        resultado: isWinner,
        premio_ganho: prizeAmount,
        is_simulated: true
      });

    if (gameError) {
      console.error('Error recording game:', gameError);
      return new Response(
        JSON.stringify({ error: 'Failed to record game' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate new balance (deduct game cost, add prize if won)
    let balanceChange = -gamePrice + (isWinner ? prizeAmount : 0);
    if (profile.role === 'influencer') {
      balanceChange = isWinner ? prizeAmount : 0;
    }

    const previousBalance = parseFloat(profile.saldo?.toString() || '0') || 0;
    const newBalance = Math.max(0, previousBalance + balanceChange);

    // Update user balance
    const { error: balanceUpdateError } = await supabase
      .from('profiles')
      .update({ saldo: newBalance })
      .eq('user_id', user_id);

    if (balanceUpdateError) {
      console.error('Error updating balance:', balanceUpdateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record balance transaction
    const { error: transactionError } = await supabase
      .from('balance_transactions')
      .insert({
        user_id: user_id,
        transaction_type: isWinner ? 'prize_win' : 'game_purchase',
        amount: balanceChange,
        previous_balance: previousBalance,
        new_balance: newBalance,
        reference_id: scratch_card_id,
        is_simulated: true,
        metadata: {
          scratch_card_id: scratch_card_id,
          scratch_card_name: scratchCard.nome,
          game_result: isWinner ? 'win' : 'loss',
          prize_amount: prizeAmount,
          prize_display_value: displayPrizeValue,
          forced_small_win: false,
          influencer_simulated: profile.role === 'influencer',
        }
      });

    if (transactionError) {
      console.error('Error recording transaction:', transactionError);
    }

    // Get user's recent wins for display
    const { data: recentWins } = await supabase
      .from('jogadas')
      .select(`
        *,
        raspadinhas (nome, imagem_url)
      `)
      .eq('user_id', user_id)
      .eq('resultado', true)
      .order('created_at', { ascending: false })
      .limit(5);

    const result = {
      success: true,
      is_winner: isWinner,
      prize_amount: prizeAmount,
      new_balance: newBalance,
      message: isWinner
        ? (prizeAmount > 0
          ? `Parabens! Voce ganhou ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prizeAmount)}!`
          : `Parabens! Voce desbloqueou o premio: ${scratchCard.nome}`)
        : 'Nao foi desta vez! Tente novamente.',
      recent_wins: recentWins || [],
      grid: gridValues,
      winning_cells: winningCells,
      win: isWinner,
      prize: prizeAmount
    };

    console.log('Game result:', result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});















