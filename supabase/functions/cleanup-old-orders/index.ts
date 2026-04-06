import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    // Calculate cutoff date (90 days ago)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    // Find orders to prune: status Pago only, older than 90 days
    // data_criacao is stored as text like "DD/MM/YYYY"
    const { data: oldOrders, error: fetchError } = await adminClient
      .from("orders")
      .select("id, data_criacao, status")
      .eq("status", "Pago");

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter by date (data_criacao is DD/MM/YYYY)
    const ordersToPrune = (oldOrders || []).filter((o) => {
      if (!o.data_criacao) return false;
      const parts = o.data_criacao.split("/");
      if (parts.length !== 3) return false;
      const orderDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      return orderDate < cutoff;
    });

    let ordersCleaned = 0;

    // Prune in batches of 50 — clear everything except id, vendedor, quantidade, preco, data_criacao, status, user_id, cliente, tipo_extra
    for (let i = 0; i < ordersToPrune.length; i += 50) {
      const batch = ordersToPrune.slice(i, i + 50).map((o) => o.id);
      const { error: updateError } = await adminClient
        .from("orders")
        .update({
          numero: "",
          modelo: "",
          tamanho: "",
          numero_pedido_bota: null,
          genero: null,
          solado: "",
          formato_bico: "",
          cor_vira: "",
          couro_gaspea: "",
          couro_cano: "",
          couro_taloneira: "",
          cor_couro_gaspea: null,
          cor_couro_cano: null,
          cor_couro_taloneira: null,
          bordado_cano: "",
          bordado_gaspea: "",
          bordado_taloneira: "",
          cor_bordado_cano: null,
          cor_bordado_gaspea: null,
          cor_bordado_taloneira: null,
          bordado_variado_desc_cano: null,
          bordado_variado_desc_gaspea: null,
          bordado_variado_desc_taloneira: null,
          personalizacao_nome: "",
          personalizacao_bordado: "",
          nome_bordado_desc: null,
          cor_linha: "",
          cor_borrachinha: "",
          trisce: "Não",
          trice_desc: null,
          tiras: "Não",
          tiras_desc: null,
          metais: "",
          tipo_metal: null,
          cor_metal: null,
          strass_qtd: null,
          cruz_metal_qtd: null,
          bridao_metal_qtd: null,
          acessorios: "",
          desenvolvimento: "",
          sob_medida: false,
          sob_medida_desc: null,
          forma: null,
          fotos: [],
          historico: [],
          alteracoes: [],
          extra_detalhes: null,
          observacao: "",
          tem_laser: false,
          laser_cano: null,
          laser_gaspea: null,
          laser_taloneira: null,
          cor_glitter_cano: null,
          cor_glitter_gaspea: null,
          cor_glitter_taloneira: null,
          estampa: null,
          estampa_desc: null,
          pintura: null,
          pintura_desc: null,
          costura_atras: null,
          cor_sola: null,
          carimbo: null,
          carimbo_desc: null,
          cor_vivo: null,
          adicional_desc: null,
          desconto: null,
          desconto_justificativa: null,
        })
        .in("id", batch);

      if (!updateError) {
        ordersCleaned += batch.length;
      }
    }

    // Clean dismissed deleted_orders
    const { count: deletedRemoved } = await adminClient
      .from("deleted_orders")
      .delete()
      .eq("dismissed", true)
      .select("*", { count: "exact", head: true });

    return new Response(
      JSON.stringify({
        orders_cleaned: ordersCleaned,
        deleted_orders_removed: deletedRemoved || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
