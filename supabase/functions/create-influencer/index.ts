import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the request is from an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      throw new Error('Unauthorized - admin access required');
    }

    const { email, password, commission_rate } = await req.json();

    if (!email || !password || !commission_rate) {
      throw new Error('Missing required fields');
    }

    // Generate unique referral code
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    let code = generateCode();
    
    // Ensure code is unique
    let { data: existing } = await supabaseAdmin
      .from('influencers')
      .select('code')
      .eq('code', code)
      .single();
      
    while (existing) {
      code = generateCode();
      const { data: newCheck } = await supabaseAdmin
        .from('influencers')
        .select('code')
        .eq('code', code)
        .single();
      existing = newCheck;
    }

    // Create user with service role key (bypasses RLS)
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        created_by_admin: true,
        role: 'influencer'
      }
    });

    if (createError || !authData.user) {
      throw createError || new Error('Failed to create user');
    }

    // Wait for profile trigger
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update user role to influencer
    const { error: roleError } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'influencer' })
      .eq('user_id', authData.user.id);

    if (roleError) {
      console.error('Role update error:', roleError);
    }

    // Create influencer record
    const { data: influencerData, error: influencerError } = await supabaseAdmin
      .from('influencers')
      .insert({
        user_id: authData.user.id,
        code,
        commission_rate: parseFloat(commission_rate) / 100,
        status: 'active'
      })
      .select()
      .single();

    if (influencerError) {
      // Cleanup: delete the user if influencer creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw influencerError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user_id: authData.user.id,
          email: authData.user.email,
          code,
          commission_rate: parseFloat(commission_rate),
          influencer_id: influencerData.id
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Create influencer error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});