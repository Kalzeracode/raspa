import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { referred_user_id, referrer_user_id } = await req.json()

    console.log('Processing referral:', { referred_user_id, referrer_user_id })

    // Validate that both users exist
    const { data: referrer } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('user_id', referrer_user_id)
      .single()

    const { data: referred } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('user_id', referred_user_id)
      .single()

    if (!referrer || !referred) {
      throw new Error('Invalid user IDs')
    }

    // Check if referral already exists
    const { data: existingReferral } = await supabaseClient
      .from('user_referrals')
      .select('id')
      .eq('referrer_user_id', referrer_user_id)
      .eq('referred_user_id', referred_user_id)
      .single()

    if (existingReferral) {
      return new Response(
        JSON.stringify({ success: false, message: 'Referral already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the referral record
    const { error: insertError } = await supabaseClient
      .from('user_referrals')
      .insert({
        referrer_user_id,
        referred_user_id,
      })

    if (insertError) {
      throw insertError
    }

    console.log('Referral created successfully')

    return new Response(
      JSON.stringify({ success: true, message: 'Referral recorded successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing referral:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})