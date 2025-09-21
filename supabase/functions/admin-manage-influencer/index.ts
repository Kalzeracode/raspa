import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Mode = "create_new" | "attach_existing";

const normalizeCode = (value?: string) =>
  (value ?? "")
    .toString()
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();

const generateCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

async function ensureUniqueCode(
  supabaseAdmin: ReturnType<typeof createClient>,
  desiredCode: string,
  ignoreId?: string | null,
) {
  let code = desiredCode;
  while (true) {
    let query = supabaseAdmin
      .from("influencers")
      .select("id")
      .eq("code", code);

    if (ignoreId) {
      query = query.neq("id", ignoreId);
    }

    const { data } = await query.maybeSingle();
    if (!data) {
      return code;
    }
    code = generateCode();
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Service configuration missing");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      throw new Error("Admin access required");
    }

    const body = await req.json();
    const mode: Mode = body?.mode ?? "create_new";
    const rawEmail: string = (body?.email ?? "").toString().trim();
    const password: string | undefined = body?.password;
    const commissionRatePercent = Number(body?.commission_rate ?? 10);
    const requestedCode = normalizeCode(body?.code);
    const requestedStatus = (body?.status ?? "active").toString();
    const startingBalance = Number(body?.starting_balance ?? 0);

    if (!rawEmail) {
      throw new Error("Email é obrigatório");
    }

    if (!["create_new", "attach_existing"].includes(mode)) {
      throw new Error("Modo inválido");
    }

    if (mode === "create_new" && (!password || password.length < 6)) {
      throw new Error("Senha mínima de 6 caracteres");
    }

    if (!Number.isFinite(commissionRatePercent) || commissionRatePercent < 0) {
      throw new Error("Comissão inválida");
    }

    if (!["active", "inactive", "suspended"].includes(requestedStatus)) {
      throw new Error("Status inválido");
    }

    const email = rawEmail.toLowerCase();

    let userId: string | null = null;
    let createdUser = false;

    if (mode === "create_new") {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          created_by_admin: true,
          role: "influencer",
        },
      });

      if (createError || !created?.user) {
        throw createError ?? new Error("Falha ao criar usuário");
      }

      userId = created.user.id;
      createdUser = true;

      // aguarda profile trigger
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      const { data: existingProfile, error: existingError } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .single();

      if (existingError || !existingProfile?.user_id) {
        throw new Error("Usuário não encontrado");
      }

      userId = existingProfile.user_id;
    }

    if (!userId) {
      throw new Error("ID do usuário não disponível");
    }

    const { data: existingInfluencer } = await supabaseAdmin
      .from("influencers")
      .select("id, code")
      .eq("user_id", userId)
      .maybeSingle();

    if (mode === "create_new" && existingInfluencer) {
      throw new Error("Usuário já possui vínculo de influenciador");
    }

    let finalCode = requestedCode;
    if (finalCode) {
      if (finalCode.length < 3) {
        throw new Error("Código deve ter pelo menos 3 caracteres");
      }
      finalCode = await ensureUniqueCode(supabaseAdmin, finalCode, existingInfluencer?.id ?? null);
    } else {
      finalCode = await ensureUniqueCode(supabaseAdmin, generateCode(), existingInfluencer?.id ?? null);
    }

    const commissionRate = commissionRatePercent / 100;

    const { error: roleUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({ role: "influencer" })
      .eq("user_id", userId);

    if (roleUpdateError) {
      throw roleUpdateError;
    }

    let influencerRecord;

    if (existingInfluencer) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("influencers")
        .update({
          commission_rate: commissionRate,
          code: finalCode,
          status: requestedStatus,
        })
        .eq("id", existingInfluencer.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      influencerRecord = updated;
    } else {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("influencers")
        .insert({
          user_id: userId,
          code: finalCode,
          commission_rate: commissionRate,
          status: requestedStatus,
        })
        .select()
        .single();

      if (insertError) {
        if (createdUser) {
          await supabaseAdmin.auth.admin.deleteUser(userId);
        }
        throw insertError;
      }

      influencerRecord = inserted;
    }

    if (Number.isFinite(startingBalance) && startingBalance > 0) {
      const { error: balanceError } = await supabaseAdmin.rpc("update_user_balance_secure_v3", {
        user_uuid: userId,
        amount: startingBalance,
        transaction_type: "admin_initial_credit",
        metadata: {
          source: "admin-manage-influencer",
        },
      });

      if (balanceError) {
        console.error("Erro ao aplicar saldo inicial:", balanceError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user_id: userId,
          code: influencerRecord.code,
          commission_rate: influencerRecord.commission_rate,
          status: influencerRecord.status,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("admin-manage-influencer error:", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
