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
const BAGY_TOKEN = Deno.env.get("BAGY_API_TOKEN") || "";
const BAGY_BASE = (Deno.env.get("BAGY_API_BASE") || "https://api.dooca.store")
  .replace(/\/$/, "");

const MAX_TENTATIVAS = 5;

async function pushToBagy(bagyOrderId: string, status: string): Promise<{ ok: boolean; error?: string }> {
  if (!BAGY_TOKEN) return { ok: false, error: "BAGY_API_TOKEN ausente" };
  try {
    const res = await fetch(`${BAGY_BASE}/orders/${encodeURIComponent(bagyOrderId)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BAGY_TOKEN}`,
        Accept: "application/json",
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${t.slice(0, 400)}` };
    }
    await res.text().catch(() => {});
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  let limit = 50;
  try {
    const body = await req.json().catch(() => null);
    if (body && typeof body.limit === "number") limit = Math.min(Math.max(body.limit, 1), 200);
  } catch { /* ignore */ }

  const { data: pendentes, error } = await admin
    .from("bagy_status_sync_queue")
    .select("id, bagy_order_id, target_status, tentativas")
    .is("processado_em", null)
    .lt("tentativas", MAX_TENTATIVAS)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];
  for (const row of pendentes || []) {
    const r = await pushToBagy(row.bagy_order_id, row.target_status);
    const nowIso = new Date().toISOString();
    const novasTentativas = (row.tentativas || 0) + 1;
    if (r.ok) {
      await admin.from("bagy_status_sync_queue").update({
        processado_em: nowIso,
        tentativas: novasTentativas,
        erro: null,
      } as any).eq("id", row.id);

      // Atualiza pedido portal correspondente
      const { data: ords } = await admin
        .from("orders").select("id").eq("bagy_order_id", row.bagy_order_id);
      for (const o of ords || []) {
        await admin.from("orders").update({
          bagy_last_sync_at: nowIso,
          bagy_last_sync_status: row.target_status,
          bagy_last_sync_error: null,
        } as any).eq("id", o.id);
      }
      // Atualiza bagy_pedidos.status_bagy local
      await admin.from("bagy_pedidos").update({
        status_bagy: row.target_status,
        updated_at: nowIso,
      } as any).eq("bagy_order_id", row.bagy_order_id);

      results.push({ id: row.id, ok: true, status: row.target_status });
    } else {
      const isFinal = novasTentativas >= MAX_TENTATIVAS;
      await admin.from("bagy_status_sync_queue").update({
        tentativas: novasTentativas,
        erro: r.error,
        processado_em: isFinal ? nowIso : null,
      } as any).eq("id", row.id);

      const { data: ords } = await admin
        .from("orders").select("id").eq("bagy_order_id", row.bagy_order_id);
      for (const o of ords || []) {
        await admin.from("orders").update({
          bagy_last_sync_at: nowIso,
          bagy_last_sync_error: r.error,
          bagy_last_sync_status: row.target_status,
        } as any).eq("id", o.id);
      }
      results.push({ id: row.id, ok: false, status: row.target_status, error: r.error, final: isFinal });
    }
  }

  return new Response(
    JSON.stringify({ ok: true, processed: results.length, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
