// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-service-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ATACADO_SYNC_URL = Deno.env.get("ATACADO_SYNC_URL") ?? "";
const ATACADO_SYNC_SECRET = Deno.env.get("ATACADO_SYNC_SECRET") ?? "";

const FLAG_KEY = "atacado_variacao_sync_enabled";
const HTTP_TIMEOUT_MS = 10_000;

type Action = "upsert" | "delete";
type Kind = "ficha_variacao" | "custom_option";

interface SyncBody {
  kind: Kind;
  action: Action;
  source_id: string;
  payload?: Record<string, any>;
  log_id?: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function isAdminMaster(admin: any, uid: string): Promise<boolean> {
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .eq("role", "admin_master")
    .maybeSingle();
  return !!data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Auth: aceita header X-Service-Token=SUPABASE_SERVICE_ROLE_KEY (chamada interna) OU JWT admin_master
  const internalToken = req.headers.get("X-Service-Token") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";

  if (internalToken && internalToken === SUPABASE_SERVICE_ROLE_KEY) {
    // ok
  } else {
    if (!authHeader.startsWith("Bearer ")) return jsonResponse({ error: "unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.slice("Bearer ".length);
    const { data: claimsRes, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsRes?.claims?.sub) return jsonResponse({ error: "unauthorized" }, 401);
    const uid = claimsRes.claims.sub as string;
    if (!(await isAdminMaster(admin, uid))) return jsonResponse({ error: "forbidden" }, 403);
  }

  let body: SyncBody;
  try { body = await req.json(); } catch { return jsonResponse({ error: "invalid_json" }, 400); }

  const { kind, action, source_id, payload, log_id } = body ?? ({} as SyncBody);
  if (
    !kind || !["ficha_variacao", "custom_option"].includes(kind) ||
    !action || !["upsert", "delete"].includes(action) ||
    !source_id || typeof source_id !== "string"
  ) {
    return jsonResponse({ error: "invalid_body" }, 400);
  }

  // Flag
  const { data: flagRow } = await admin
    .from("system_flags").select("value").eq("key", FLAG_KEY).maybeSingle();
  const enabled = flagRow?.value !== false; // padrão true se ausente

  // Log: cria ou reaproveita
  let logId = log_id ?? null;
  let tentativasAtual = 0;
  if (logId) {
    const { data: existing } = await admin
      .from("atacado_variacao_sync_log")
      .select("tentativas").eq("id", logId).maybeSingle();
    tentativasAtual = Number(existing?.tentativas ?? 0);
  } else {
    const { data: ins, error: insErr } = await admin
      .from("atacado_variacao_sync_log")
      .insert({
        source_kind: kind,
        source_id,
        action,
        payload: payload ?? {},
        status: "pendente",
      })
      .select("id").single();
    if (insErr) return jsonResponse({ error: "log_insert_failed", detail: insErr.message }, 500);
    logId = ins.id;
  }

  if (!enabled) {
    await admin.from("atacado_variacao_sync_log").update({
      status: "pendente",
      erro: "sincronização desligada (flag)",
      finished_at: new Date().toISOString(),
    }).eq("id", logId);
    return jsonResponse({ skipped: true, reason: "sync_disabled", log_id: logId });
  }

  if (!ATACADO_SYNC_URL || !ATACADO_SYNC_SECRET) {
    await admin.from("atacado_variacao_sync_log").update({
      status: "erro",
      erro: "ATACADO_SYNC_URL/SECRET não configurados",
      tentativas: tentativasAtual + 1,
      finished_at: new Date().toISOString(),
    }).eq("id", logId);
    return jsonResponse({ error: "missing_secrets", log_id: logId }, 500);
  }

  const base = ATACADO_SYNC_URL.replace(/\/+$/, "");
  const targetUrl = `${base}/${kind}/${action}`;
  const outboundBody = { source_id, source_origin: "portal", ...(payload ?? {}) };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), HTTP_TIMEOUT_MS);

  let httpStatus: number | null = null;
  let responseText = "";
  let errMsg: string | null = null;

  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Sync-Secret": ATACADO_SYNC_SECRET,
      },
      body: JSON.stringify(outboundBody),
    });
    httpStatus = res.status;
    try { responseText = (await res.text()).slice(0, 4000); } catch { /* ignore */ }
    if (!res.ok) errMsg = `HTTP ${res.status}`;
  } catch (e: any) {
    errMsg = e?.name === "AbortError" ? "timeout (10s)" : (e?.message ?? "fetch_failed");
  } finally {
    clearTimeout(t);
  }

  const finalStatus = errMsg ? "erro" : "ok";

  await admin.from("atacado_variacao_sync_log").update({
    status: finalStatus,
    http_status: httpStatus,
    response_body: responseText || null,
    erro: errMsg,
    tentativas: tentativasAtual + 1,
    finished_at: new Date().toISOString(),
  }).eq("id", logId);

  return jsonResponse({
    ok: finalStatus === "ok",
    status: finalStatus,
    http_status: httpStatus,
    log_id: logId,
    error: errMsg,
  });
});
