// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  BAGY_STATUS_CODE,
  type BagyTargetStatus,
  mapPortalStatusToBagy,
} from "./status-map.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BAGY_TOKEN = Deno.env.get("BAGY_API_TOKEN") || "";
const BAGY_BASE = (Deno.env.get("BAGY_API_BASE") || "https://api.dooca.store")
  .replace(/\/$/, "");

type Result = { order_id: string; ok: boolean; status?: string; error?: string };

function isAlreadyExistsError(httpStatus: number, body: string): boolean {
  if (httpStatus === 409 || httpStatus === 422) return true;
  const t = body.toLowerCase();
  return t.includes("already") || t.includes("já existe") || t.includes("ja existe");
}

async function bagyReq(
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

async function pushToBagy(
  bagyOrderId: string,
  target: BagyTargetStatus,
  extras: { tracking_code?: string | null; tracking_url?: string | null; nf_numero?: string | null },
): Promise<{ ok: boolean; error?: string }> {
  if (!BAGY_TOKEN) return { ok: false, error: "BAGY_API_TOKEN ausente" };
  const id = encodeURIComponent(bagyOrderId);
  try {
    if (target === "production" || target === "separated") {
      const r = await bagyReq("POST", `/orders/${id}/fulfillment`);
      if (!r.ok && !isAlreadyExistsError(r.status, r.text)) {
        return { ok: false, error: `POST fulfillment HTTP ${r.status}: ${r.text.slice(0, 400)}` };
      }
      if (target === "production") {
        const p = await bagyReq("PUT", `/orders/${id}/fulfillment/production`);
        if (!p.ok) return { ok: false, error: `PUT /production HTTP ${p.status}: ${p.text.slice(0, 400)}` };
      }
      return { ok: true };
    }

    if (target === "invoiced") {
      const cre = await bagyReq("POST", `/orders/${id}/fulfillment`);
      if (!cre.ok && !isAlreadyExistsError(cre.status, cre.text)) {
        return { ok: false, error: `pré-fulfillment HTTP ${cre.status}: ${cre.text.slice(0, 200)}` };
      }
      const nfBody: Record<string, unknown> = {};
      if (extras.nf_numero) {
        const parts = String(extras.nf_numero).split("/");
        nfBody.nfe_number = parts[0];
        if (parts[1]) nfBody.nfe_series = parts[1];
      }
      const r = await bagyReq("PUT", `/orders/${id}/fulfillment/invoiced`, nfBody);
      if (r.ok) return { ok: true };
      return { ok: false, error: `HTTP ${r.status}: ${r.text.slice(0, 400)}` };
    }
    if (target === "shipped") {
      const cre = await bagyReq("POST", `/orders/${id}/fulfillment`);
      if (!cre.ok && !isAlreadyExistsError(cre.status, cre.text)) {
        return { ok: false, error: `pré-fulfillment HTTP ${cre.status}: ${cre.text.slice(0, 200)}` };
      }
      const shipBody: Record<string, unknown> = {};
      if (extras.tracking_code) shipBody.shipping_code = extras.tracking_code;
      if (extras.tracking_url) shipBody.shipping_track_url = extras.tracking_url;
      const r = await bagyReq("PUT", `/orders/${id}/fulfillment/shipped`, shipBody);
      if (r.ok) return { ok: true };
      return { ok: false, error: `HTTP ${r.status}: ${r.text.slice(0, 400)}` };
    }
    if (target === "delivered") {
      const r = await bagyReq("PUT", `/orders/${id}/fulfillment/delivered`);
      if (r.ok) return { ok: true };
      return { ok: false, error: `HTTP ${r.status}: ${r.text.slice(0, 400)}` };
    }
    if (target === "canceled") {
      const r = await bagyReq("PUT", `/orders/${id}`, { status: "canceled" });
      if (r.ok) return { ok: true };
      return { ok: false, error: `HTTP ${r.status}: ${r.text.slice(0, 400)}` };
    }
    // approved não tem ação na Bagy (já está aprovado quando webhook chega)
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth: precisa de um usuário logado (qualquer role; verificação fina via has_role)
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
  if (authErr || !claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claims.claims.sub as string;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // Restringe a admin_master, admin_producao ou vendedor_comissao
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roleSet = new Set((roles || []).map((r: any) => r.role));
  const allowed = roleSet.has("admin_master") ||
    roleSet.has("admin_producao") ||
    roleSet.has("vendedor_comissao");
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: any = {};
  try { payload = await req.json(); } catch { /* ignore */ }
  const orderIds: string[] = Array.isArray(payload?.order_ids)
    ? payload.order_ids.filter((x: unknown) => typeof x === "string")
    : [];
  if (orderIds.length === 0) {
    return new Response(JSON.stringify({ error: "order_ids vazio" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Carrega pedidos do portal
  const { data: orders, error: ordErr } = await admin
    .from("orders")
    .select("id, status, bagy_order_id")
    .in("id", orderIds);
  if (ordErr) {
    return new Response(JSON.stringify({ error: ordErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Carrega bagy_pedidos (tracking) pelos bagy_order_id
  const bagyOrderIds = (orders || [])
    .map((o: any) => o.bagy_order_id)
    .filter(Boolean);
  const trackingByBagy: Record<string, { code: string | null; url: string | null }> = {};
  if (bagyOrderIds.length > 0) {
    const { data: bagyPeds } = await admin
      .from("bagy_pedidos")
      .select("bagy_order_id, tracking_code, tracking_url")
      .in("bagy_order_id", bagyOrderIds);
    (bagyPeds || []).forEach((b: any) => {
      trackingByBagy[b.bagy_order_id] = {
        code: b.tracking_code || null,
        url: b.tracking_url || null,
      };
    });
  }

  // Carrega NFs autorizadas dos pedidos
  const { data: nfs } = await admin
    .from("nfe_notas")
    .select("pedido_id, numero, serie, status")
    .in("pedido_id", orderIds)
    .eq("status", "autorizada")
    .order("numero", { ascending: false });
  const nfByOrder: Record<string, string> = {};
  (nfs || []).forEach((n: any) => {
    if (!nfByOrder[n.pedido_id]) {
      nfByOrder[n.pedido_id] = `${n.numero}/${n.serie}`;
    }
  });

  const results: Result[] = [];
  for (const o of orders || []) {
    if (!o.bagy_order_id) {
      results.push({ order_id: o.id, ok: false, error: "Pedido sem bagy_order_id" });
      continue;
    }
    let target = mapPortalStatusToBagy(o.status);
    const tracking = trackingByBagy[o.bagy_order_id];
    const nfNumero = nfByOrder[o.id] || null;

    // Promoções automáticas:
    //  - Se tem tracking → shipped tem prioridade.
    //  - Se tem NF e o portal não chegou em despachado → invoiced.
    if (tracking?.code) {
      target = "shipped";
    } else if (nfNumero && target !== "shipped" && target !== "delivered" && target !== "canceled") {
      target = "invoiced";
    }
    if (!target) {
      results.push({ order_id: o.id, ok: false, error: `Status do portal "${o.status}" não mapeado` });
      await admin.from("orders").update({
        bagy_last_sync_error: `Status "${o.status}" sem mapeamento Bagy`,
        bagy_last_sync_at: new Date().toISOString(),
      } as any).eq("id", o.id);
      continue;
    }

    const r = await pushToBagy(o.bagy_order_id, target, {
      tracking_code: tracking?.code || null,
      tracking_url: tracking?.url || null,
      nf_numero: nfNumero,
    });
    const nowIso = new Date().toISOString();
    if (r.ok) {
      await admin.from("orders").update({
        bagy_last_sync_at: nowIso,
        bagy_last_sync_error: null,
        bagy_last_sync_status: target,
      } as any).eq("id", o.id);
      // Registra na fila também (auditoria)
      await admin.from("bagy_status_sync_queue").insert({
        bagy_order_id: o.bagy_order_id,
        target_status: target,
        tracking_code: tracking?.code || null,
        tracking_url: tracking?.url || null,
        nf_numero: nfNumero,
        processado_em: nowIso,
        tentativas: 1,
      });
      results.push({ order_id: o.id, ok: true, status: target });
    } else {
      await admin.from("orders").update({
        bagy_last_sync_at: nowIso,
        bagy_last_sync_error: r.error || "erro",
        bagy_last_sync_status: target,
      } as any).eq("id", o.id);
      results.push({ order_id: o.id, ok: false, status: target, error: r.error });
    }
  }

  return new Response(
    JSON.stringify({ ok: true, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
