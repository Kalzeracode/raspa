import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePixRequest {
  amount: number;
}

interface WooviChargeResponse {
  charge: {
    status: string;
    customer: any;
    value: number;
    comment: string;
    correlationID: string;
    paymentLinkID: string;
    createdAt: string;
    updatedAt: string;
    brCode: string;
    expiresIn: number;
    pixKey: string;
    paymentLinkUrl: string;
    qrCodeImage: string;
    globalID: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    // Inicializar Supabase client para verificar usuário
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verificar usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    console.log('Authenticated user:', user.id);

    // Parse request
    const { amount }: CreatePixRequest = await req.json();

    // Validações
    if (!amount || amount <= 0) {
      return new Response('Invalid amount', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    if (amount < 1) {
      return new Response('Minimum amount is R$ 1.00', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    if (amount > 10000) {
      return new Response('Maximum amount is R$ 10,000.00', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log('Creating PIX for amount:', amount);

    // Pegar credenciais do Woovi
    const appId = Deno.env.get('WOOVI_APP_ID')?.trim();
    const clientId = Deno.env.get('WOOVI_CLIENT_ID')?.trim();
    const clientSecret = Deno.env.get('WOOVI_CLIENT_SECRET')?.trim();

    // Montar Authorization header: use WOOVI_APP_ID como está (token),
    // ou faça fallback para "Basic base64(clientId:clientSecret)" quando não houver APP_ID
    let authorizationHeader: string | null = null;
    if (appId && appId.length > 0) {
      authorizationHeader = appId; // usar exatamente o valor salvo no secret
    }
    if (!authorizationHeader && clientId && clientSecret) {
      const token = btoa(`${clientId}:${clientSecret}`);
      authorizationHeader = `Basic ${token}`;
    }

    if (!authorizationHeader) {
      console.error('Woovi credentials not configured');
      return new Response('Server configuration error', {
        status: 500,
        headers: corsHeaders
      });
    }

    // Selecionar ambiente da Woovi (default: sandbox)
    const wooviBase = (Deno.env.get('WOOVI_API_BASE')?.trim() || 'https://api.woovi-sandbox.com/api/v1');
    const wooviUrl = `${wooviBase}/charge`;

    console.log('Using Woovi base URL:', wooviBase);
    console.log('Final charge URL:', wooviUrl);

    // Gerar ID único para correlação
    const correlationID = `dep_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('Correlation ID:', correlationID);

    // Criar cobrança no Woovi
    const wooviPayload = {
      correlationID,
      value: Math.round(amount * 100), // Woovi trabalha com centavos
      comment: `Depósito de R$ ${amount.toFixed(2)}`,
      customer: {
        name: user.email?.split('@')[0] || 'Cliente',
        email: user.email || ''
      },
      expiresIn: 3600 // 1 hora para expirar
    };

    console.log('Woovi payload:', JSON.stringify(wooviPayload, null, 2));

    const wooviResponse = await fetch(wooviUrl, {
      method: 'POST',
      headers: {
        'Authorization': authorizationHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(wooviPayload),
    });

    console.log('Woovi response status:', wooviResponse.status);

    if (!wooviResponse.ok) {
      const errorText = await wooviResponse.text();
      console.error('Woovi API error:', errorText);
      return new Response('Payment service error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    const wooviData: WooviChargeResponse = await wooviResponse.json();
    console.log('Woovi response data:', JSON.stringify(wooviData, null, 2));

    // Usar cliente com service role para inserir dados
    const supabaseAdmin = createClient(
      supabaseUrl, 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Salvar transação no banco como pendente
    const { data: creditPurchase, error: insertError } = await supabaseAdmin
      .from('credit_purchases')
      .insert({
        user_id: user.id,
        amount: amount,
        status: 'pending',
        method: 'PIX',
        external_ref: correlationID,
        is_simulated: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving credit purchase:', insertError);
      return new Response('Database error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log('Credit purchase saved:', creditPurchase);

    // Retornar dados do PIX
    const pixData = {
      correlationId: correlationID,
      pixCode: wooviData.charge.brCode,
      qrCodeImage: wooviData.charge.qrCodeImage,
      pixKey: wooviData.charge.pixKey,
      amount: amount,
      expiresIn: wooviData.charge.expiresIn,
      expiresAt: new Date(Date.now() + (wooviData.charge.expiresIn * 1000)).toISOString(),
      paymentLinkUrl: wooviData.charge.paymentLinkUrl,
      globalID: wooviData.charge.globalID,
      purchaseId: creditPurchase.id
    };

    console.log('Returning PIX data:', pixData);

    return new Response(JSON.stringify(pixData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Create PIX error:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});