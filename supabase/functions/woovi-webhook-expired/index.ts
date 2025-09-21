import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-woovi-signature, x-openpix-signature',
};

interface WooviExpiredWebhookData {
  event: string;
  charge?: {
    correlationID: string;
    status: string;
    customer: any;
    value: number;
    comment: string;
    identifier: string;
    transactionID: string;
    additionalInfo: any[];
    fee: number;
    discount: number;
    valueWithDiscount: number;
    expiresDate: string;
    type: string;
    paymentLinkID: string;
    createdAt: string;
    updatedAt: string;
    paidAt?: string;
    payer?: any;
    ensureSameTaxID: boolean;
    brCode: string;
    expiresIn: number;
    pixKey: string;
    paymentLinkUrl: string;
    qrCodeImage: string;
    globalID: string;
    paymentMethods?: any;
  };
  pix?: any;
  company?: any;
  account?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== WOOVI EXPIRED WEBHOOK DEBUG ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', Object.fromEntries(req.headers.entries()));

    // Validar método
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

    console.log('Body raw:', body);
    console.log('Content-Type:', contentType);
    console.log('Signature:', signature ? 'Present' : 'Missing');

    // Validar assinatura (opcional por enquanto para debug)
    const clientSecret = Deno.env.get('WOOVI_CLIENT_SECRET');
    if (!clientSecret) {
      console.error('WOOVI_CLIENT_SECRET not configured');
    }

    // Parse JSON
    let webhookData: WooviExpiredWebhookData;
    try {
      webhookData = JSON.parse(body);
      console.log('Parsed webhook data:', JSON.stringify(webhookData, null, 2));
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response('Invalid JSON', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Verificar se é um evento de expiração
    const isExpiredEvent = webhookData.event === 'OPENPIX:CHARGE_EXPIRED' || 
                          webhookData.event === 'charge.expired' ||
                          (webhookData.charge && webhookData.charge.status === 'EXPIRED');

    if (!isExpiredEvent) {
      console.log('Not an expiration event:', webhookData.event);
      return new Response('Not an expiration event', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    // Verificar se há dados de charge
    if (!webhookData.charge || !webhookData.charge.correlationID) {
      console.log('No charge data or correlationID in webhook');
      return new Response('No charge data or correlationID', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Inicializar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const correlationID = webhookData.charge.correlationID;
    
    // Buscar compra de crédito pendente
    const { data: creditPurchases, error: fetchError } = await supabase
      .from('credit_purchases')
      .select('*')
      .eq('external_ref', correlationID)
      .eq('status', 'pending');

    if (fetchError) {
      console.error('Error fetching credit purchase:', fetchError);
      return new Response('Database error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    if (!creditPurchases || creditPurchases.length === 0) {
      console.log('No pending credit purchase found for correlationID:', correlationID);
      return new Response('No pending purchase found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    const creditPurchase = creditPurchases[0];
    console.log('Found credit purchase:', creditPurchase);

    // Atualizar status para expirado
    const { error: updateError } = await supabase
      .from('credit_purchases')
      .update({ 
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('id', creditPurchase.id);

    if (updateError) {
      console.error('Error updating credit purchase status:', updateError);
      return new Response('Failed to update status', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Log da expiração no audit log
    const { error: auditError } = await supabase
      .from('audit_log')
      .insert({
        user_id: creditPurchase.user_id,
        action: 'payment_expired',
        table_name: 'credit_purchases',
        record_id: creditPurchase.id,
        old_values: { status: 'pending' },
        new_values: { 
          status: 'expired',
          webhook_data: webhookData,
          expired_at: new Date().toISOString()
        }
      });

    if (auditError) {
      console.error('Error logging to audit:', auditError);
    }

    console.log(`Payment expired for user: ${creditPurchase.user_id}, amount: ${creditPurchase.amount}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Payment expiration processed successfully',
      correlationID: correlationID,
      status: 'expired'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});