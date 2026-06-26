// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_TOKEN = Deno.env.get("BAGY_WEBHOOK_TOKEN") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!WEBHOOK_TOKEN) {
    return new Response(
      JSON.stringify({ error: "BAGY_WEBHOOK_TOKEN não configurado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* */ }
  const pedidoIds: string[] = Array.isArray(body?.pedido_ids) ? body.pedido_ids : [];
  const webhookLogIds: string[] = Array.isArray(body?.webhook_log_ids) ? body.webhook_log_ids : [];
  if (pedidoIds.length === 0 && webhookLogIds.length === 0) {
    return new Response(JSON.stringify({ error: "pedido_ids ou webhook_log_ids vazio" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const sources: Array<{ key: string; label: string; payload: any }> = [];

  if (pedidoIds.length > 0) {
    const { data: pedidos, error } = await supabase
      .from("bagy_pedidos")
      .select("id, numero_bagy, payload")
      .in("id", pedidoIds);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    for (const p of (pedidos || [])) {
      sources.push({ key: p.id, label: p.numero_bagy, payload: p.payload });
    }
  }

  if (webhookLogIds.length > 0) {
    const { data: logs, error } = await supabase
      .from("bagy_webhook_log")
      .select("id, bagy_order_id, payload")
      .in("id", webhookLogIds);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    for (const l of (logs || [])) {
      sources.push({ key: l.id, label: l.bagy_order_id || l.id, payload: l.payload });
    }
  }

  const webhookUrl = `${SUPABASE_URL}/functions/v1/bagy-webhook?token=${encodeURIComponent(WEBHOOK_TOKEN)}&force=1`;

  const results: Array<{ key: string; label: string; ok: boolean; message: string }> = [];

  for (const s of sources) {
    if (!s.payload) {
      results.push({ key: s.key, label: s.label, ok: false, message: "sem payload salvo" });
      continue;
    }
    try {
      const resp = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s.payload),
      });
      const txt = await resp.text();
      let parsed: any = null;
      try { parsed = JSON.parse(txt); } catch { /* */ }
      if (resp.ok) {
        results.push({
          key: s.key,
          label: s.label,
          ok: true,
          message: parsed?.flag || parsed?.skipped || "ok",
        });
      } else {
        results.push({
          key: s.key,
          label: s.label,
          ok: false,
          message: parsed?.error || txt.slice(0, 200) || `HTTP ${resp.status}`,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ key: s.key, label: s.label, ok: false, message: msg });
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
