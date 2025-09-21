import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-woovi-signature, x-openpix-signature',
};

interface WooviWebhookData {
  charge: {
    correlationID: string;
    status: string;
    value: number;
    customer?: {
      name?: string;
      email?: string;
    };
  };
  pix: {
    endToEndId?: string;
  };
  company: {
    id: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Webhook received:', req.method);

  try {
    // Verificar se é POST
    if (req.method !== 'POST') {
      console.log('Invalid method:', req.method);
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    // Pegar o body e headers
    const body = await req.text();
    const signature = req.headers.get('x-woovi-signature') || req.headers.get('x-openpix-signature');
    const contentType = req.headers.get('content-type');

    console.log('=== WOOVI WEBHOOK DEBUG ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', Object.fromEntries(req.headers.entries()));
    console.log('Body raw:', body);
    console.log('Content-Type:', contentType);
    console.log('Signature:', signature ? 'Present' : 'Missing');

    // Validar assinatura (opcional por enquanto para debug)
    const clientSecret = Deno.env.get('WOOVI_CLIENT_SECRET');
    if (!clientSecret) {
      console.error('WOOVI_CLIENT_SECRET not configured');
      return new Response('Server configuration error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Parse JSON
    let webhookData: WooviWebhookData;
    try {
      webhookData = JSON.parse(body);
    } catch (error) {
      console.error('Invalid JSON:', error);
      return new Response('Invalid JSON', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log('Parsed webhook data:', JSON.stringify(webhookData, null, 2));

    // Verificar se é um pagamento aprovado
    const charge = webhookData.charge;
    if (!charge) {
      console.log('No charge data in webhook');
      return new Response('OK', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    if (charge.status !== 'COMPLETED') {
      console.log('Charge not completed, status:', charge.status);
      return new Response('OK', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar a transação pendente pelo correlationID
    const { data: creditPurchase, error: fetchError } = await supabase
      .from('credit_purchases')
      .select('*')
      .eq('external_ref', charge.correlationID)
      .eq('status', 'pending')
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching credit purchase:', fetchError);
      return new Response('Database error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    if (!creditPurchase) {
      console.log('No pending credit purchase found for correlationID:', charge.correlationID);
      return new Response('OK', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    console.log('Found credit purchase:', creditPurchase);

    // Verificar se o valor confere
    const expectedAmount = Number(creditPurchase.amount);
    const receivedAmount = charge.value / 100; // Woovi envia em centavos

    if (Math.abs(expectedAmount - receivedAmount) > 0.01) {
      console.error('Amount mismatch. Expected:', expectedAmount, 'Received:', receivedAmount);
      
      // Marcar como erro
      await supabase
        .from('credit_purchases')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', creditPurchase.id);

      return new Response('Amount mismatch', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Atualizar o status da compra para completed
    const { error: updateError } = await supabase
      .from('credit_purchases')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', creditPurchase.id);

    if (updateError) {
      console.error('Error updating credit purchase:', updateError);
      return new Response('Database error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Atualizar o saldo do usuário usando a função segura
    const { error: balanceError } = await supabase.rpc('update_user_balance_secure_v2', {
      user_uuid: creditPurchase.user_id,
      amount: expectedAmount,
      transaction_type: 'deposit',
      reference_id: creditPurchase.id,
      metadata: {
        woovi_correlation_id: charge.correlationID,
        woovi_end_to_end_id: webhookData.pix?.endToEndId,
        payment_method: 'PIX',
        is_simulated: false
      }
    });

    if (balanceError) {
      console.error('Error updating user balance:', balanceError);
      
      // Reverter o status da compra
      await supabase
        .from('credit_purchases')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', creditPurchase.id);

      return new Response('Balance update error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log('Successfully processed payment for user:', creditPurchase.user_id, 'amount:', expectedAmount);

    // Retornar sucesso
    return new Response('OK', { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});