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

type Row = {
  id: string;
  bagy_order_id: string;
  target_status: string;
  tracking_code: string | null;
  tracking_url: string | null;
  nf_numero: string | null;
  tentativas: number;
};

function isAlreadyExistsError(httpStatus: number, body: string): boolean {
  if (httpStatus === 409 || httpStatus === 422) return true;
  const t = body.toLowerCase();
  return t.includes("already") || t.includes("já existe") || t.includes("ja existe");
}

async function bagyRequest(
  method: string,
  path: string,
  body?: any,
): Promise<{ ok: boolean; status: number; text: string }> {
  const res = await fetch(`${BAGY_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BAGY_TOKEN}`,
      Accept: "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, text };
}

async function pushToBagy(row: Row): Promise<{ ok: boolean; error?: string }> {
  if (!BAGY_TOKEN) return { ok: false, error: "BAGY_API_TOKEN ausente" };
  const id = encodeURIComponent(row.bagy_order_id);
  const target = (row.target_status || "").toLowerCase();
  try {
    if (target === "production" || target === "separated" || target === "attended") {
      // Cria fulfillment (passo "Separar ou Produzir"). Idempotente.
      const r = await bagyRequest("POST", `/orders/${id}/fulfillment`);
      if (r.ok) return { ok: true };
      if (isAlreadyExistsError(r.status, r.text)) return { ok: true };
      return { ok: false, error: `HTTP ${r.status}: ${r.text.slice(0, 400)}` };
    }
    if (target === "invoiced") {
      // Garante que o fulfillment exista (POST é idempotente)
      const cre = await bagyRequest("POST", `/orders/${id}/fulfillment`);
      if (!cre.ok && !isAlreadyExistsError(cre.status, cre.text)) {
        return { ok: false, error: `pré-fulfillment HTTP ${cre.status}: ${cre.text.slice(0, 200)}` };
      }
      const nfBody: Record<string, unknown> = {};
      if (row.nf_numero) {
        // formato esperado "numero/serie" — separa se vier composto
        const parts = String(row.nf_numero).split("/");
        nfBody.nfe_number = parts[0];
        if (parts[1]) nfBody.nfe_series = parts[1];
      }
      const r = await bagyRequest("PUT", `/orders/${id}/fulfillment/invoiced`, nfBody);
      if (r.ok) return { ok: true };
      return { ok: false, error: `HTTP ${r.status}: ${r.text.slice(0, 400)}` };
    }
    if (target === "shipped") {
      const cre = await bagyRequest("POST", `/orders/${id}/fulfillment`);
      if (!cre.ok && !isAlreadyExistsError(cre.status, cre.text)) {
        return { ok: false, error: `pré-fulfillment HTTP ${cre.status}: ${cre.text.slice(0, 200)}` };
      }
      const shipBody: Record<string, unknown> = {};
      if (row.tracking_code) {
        shipBody.shipping_code = row.tracking_code;
      }
      if (row.tracking_url) shipBody.shipping_track_url = row.tracking_url;
      const r = await bagyRequest("PUT", `/orders/${id}/fulfillment/shipped`, shipBody);
      if (r.ok) return { ok: true };
      return { ok: false, error: `HTTP ${r.status}: ${r.text.slice(0, 400)}` };
    }
    if (target === "delivered") {
      const r = await bagyRequest("PUT", `/orders/${id}/fulfillment/delivered`);
      if (r.ok) return { ok: true };
      return { ok: false, error: `HTTP ${r.status}: ${r.text.slice(0, 400)}` };
    }
    if (target === "canceled" || target === "cancelled") {
      const r = await bagyRequest("PUT", `/orders/${id}`, { status: "canceled" });
      if (r.ok) return { ok: true };
      return { ok: false, error: `HTTP ${r.status}: ${r.text.slice(0, 400)}` };
    }
    return { ok: false, error: `target_status não suportado: ${row.target_status}` };
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
    if (body && typeof body.limit === "number") {
      limit = Math.min(Math.max(body.limit, 1), 200);
    }
  } catch { /* ignore */ }

  const { data: pendentes, error } = await admin
    .from("bagy_status_sync_queue")
    .select("id, bagy_order_id, target_status, tracking_code, tracking_url, nf_numero, tentativas")
    .is("processado_em", null)
    .lt("tentativas", MAX_TENTATIVAS)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];
  for (const row of (pendentes || []) as Row[]) {
    const r = await pushToBagy(row);
    const nowIso = new Date().toISOString();
    const novasTentativas = (row.tentativas || 0) + 1;
    if (r.ok) {
      await admin.from("bagy_status_sync_queue").update({
        processado_em: nowIso,
        tentativas: novasTentativas,
        ultimo_erro: null,
      } as any).eq("id", row.id);

      const { data: ords } = await admin
        .from("orders").select("id").eq("bagy_order_id", row.bagy_order_id);
      for (const o of ords || []) {
        await admin.from("orders").update({
          bagy_last_sync_at: nowIso,
          bagy_last_sync_status: row.target_status,
          bagy_last_sync_error: null,
        } as any).eq("id", o.id);
      }
      await admin.from("bagy_pedidos").update({
        status_bagy: row.target_status,
        updated_at: nowIso,
      } as any).eq("bagy_order_id", row.bagy_order_id);

      results.push({ id: row.id, ok: true, status: row.target_status });
    } else {
      const isFinal = novasTentativas >= MAX_TENTATIVAS;
      await admin.from("bagy_status_sync_queue").update({
        tentativas: novasTentativas,
        ultimo_erro: r.error,
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
