import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AppRole = "admin" | "user" | "influencer";

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
    const rawEmail: string = (body?.email ?? "").toString().trim();
    const password: string = (body?.password ?? "").toString();
    const role: AppRole = body?.role ?? "user";
    const startingBalance = Number(body?.starting_balance ?? 0);

    if (!rawEmail) {
      throw new Error("Email é obrigatório");
    }

    if (!password || password.length < 6) {
      throw new Error("Senha mínima de 6 caracteres");
    }

    if (!["admin", "user", "influencer"].includes(role)) {
      throw new Error("Role inválida");
    }

    if (role === "influencer") {
      throw new Error("Use o fluxo específico para criar influenciadores");
    }

    const email = rawEmail.toLowerCase();

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        created_by_admin: true,
        role,
      },
    });

    if (createError || !created?.user) {
      throw createError ?? new Error("Falha ao criar usuário");
    }

    const userId = created.user.id;

    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (role !== "user") {
      const { error: roleError } = await supabaseAdmin
        .from("profiles")
        .update({ role })
        .eq("user_id", userId);

      if (roleError) {
        throw roleError;
      }
    }

    if (Number.isFinite(startingBalance) && startingBalance > 0) {
      const { error: balanceError } = await supabaseAdmin.rpc("update_user_balance_secure_v3", {
        user_uuid: userId,
        amount: startingBalance,
        transaction_type: "admin_initial_credit",
        metadata: {
          source: "admin-create-user",
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
          email,
          role,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("admin-create-user error:", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
