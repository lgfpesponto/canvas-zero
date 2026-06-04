// Edge function interna chamada pelo trigger notify_atacado_progress.
// Envia POST pro webhook do site atacado e atualiza extra_detalhes.atacado_etapas_enviadas.
// Autenticação: header x-internal-secret deve bater com internal_config.internal_dispatch_secret.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ATACADO_URL = "https://atacado.7estrivos.com.br/api/public/producao-callback";

const BodySchema = z.object({
  order_id: z.string().uuid(),
  etapa: z.enum(["corte", "montagem", "acabamento", "expedicao", "baixa_site"]),
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Valida secret interno (vem do trigger). Single source of truth: tabela internal_config.
  const provided = req.headers.get("x-internal-secret") ?? "";
  const { data: cfg, error: cfgErr } = await supabase
    .from("internal_config")
    .select("value")
    .eq("key", "internal_dispatch_secret")
    .maybeSingle();
  if (cfgErr || !cfg?.value || cfg.value === "PLACEHOLDER_TROCAR") {
    console.error("[atacado-dispatch] secret não configurado", cfgErr);
    return json(500, { error: "secret_not_configured" });
  }
  if (provided !== cfg.value) {
    console.warn("[atacado-dispatch] unauthorized: secret não bate");
    return json(401, { error: "unauthorized" });
  }

  let parsed;
  try {
    parsed = BodySchema.safeParse(await req.json());
  } catch {
    return json(400, { error: "invalid_json" });
  }
  if (!parsed.success) return json(400, { error: parsed.error.flatten() });

  const { order_id, etapa } = parsed.data;

  const { data: order, error: ordErr } = await supabase
    .from("orders")
    .select("id, numero, extra_detalhes")
    .eq("id", order_id)
    .maybeSingle();
  if (ordErr || !order) {
    console.error("[atacado-dispatch] pedido não encontrado", order_id, ordErr);
    return json(404, { error: "order_not_found" });
  }

  const outboundToken = Deno.env.get("ATACADO_OUTBOUND_TOKEN");
  if (!outboundToken) {
    await supabase.from("atacado_progress_log").insert({
      order_id, numero: order.numero, etapa,
      erro: "ATACADO_OUTBOUND_TOKEN ausente",
    });
    return json(500, { error: "outbound_token_missing" });
  }

  let httpStatus = 0;
  let responseBody = "";
  let erro: string | null = null;
  try {
    const resp = await fetch(ATACADO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${outboundToken}`,
      },
      body: JSON.stringify({
        numero_portal: order.numero,
        etapa,
      }),
    });
    httpStatus = resp.status;
    responseBody = (await resp.text()).slice(0, 4000);
  } catch (e) {
    erro = String((e as Error).message ?? e);
    console.error("[atacado-dispatch] fetch falhou", erro);
  }

  await supabase.from("atacado_progress_log").insert({
    order_id, numero: order.numero, etapa,
    http_status: httpStatus || null,
    response_body: responseBody || null,
    erro,
  });

  const sucesso = httpStatus >= 200 && httpStatus < 300;
  const extra = (order.extra_detalhes ?? {}) as Record<string, any>;

  if (sucesso) {
    const enviadas = Array.isArray(extra.atacado_etapas_enviadas) ? extra.atacado_etapas_enviadas : [];
    enviadas.push({ etapa, sent_at: new Date().toISOString(), http_status: httpStatus });
    extra.atacado_etapas_enviadas = enviadas;
  } else {
    const falhas = Array.isArray(extra.atacado_etapas_falhas) ? extra.atacado_etapas_falhas : [];
    falhas.push({ etapa, at: new Date().toISOString(), http_status: httpStatus || null, erro });
    extra.atacado_etapas_falhas = falhas;
  }

  await supabase
    .from("orders")
    .update({ extra_detalhes: extra })
    .eq("id", order_id);

  console.log(`[atacado-dispatch] ${order.numero} -> ${etapa} | http=${httpStatus} sucesso=${sucesso}`);

  return json(sucesso ? 200 : 502, {
    ok: sucesso,
    http_status: httpStatus,
    erro,
  });
});
