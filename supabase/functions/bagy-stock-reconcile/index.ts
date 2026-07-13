// deno-lint-ignore-file no-explicit-any
// Reconcilia saldo Portal ↔ Bagy.
// - Se saldo local > saldo Bagy: puxa local pra baixo (Bagy vendeu algo que ainda não chegou por webhook).
// - Se saldo local < saldo Bagy: PUT balance = local (Bagy espelha portal para vendas internas).
// - Se iguais: nada.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BAGY_TOKEN = Deno.env.get("BAGY_API_TOKEN") || "";
const BAGY_BASE = (Deno.env.get("BAGY_API_BASE") || "https://api.dooca.store").replace(/\/$/, "");

const MAX_BATCH = 100;

function pickBalance(json: any): number | null {
  const variants = [json, json?.data, json?.result];
  for (const v of variants) {
    if (v && typeof v === "object") {
      const b = v.balance ?? v.stock ?? v.quantity ?? v.qty;
      if (typeof b === "number") return b;
      if (typeof b === "string" && b.trim() !== "" && !isNaN(Number(b))) return Number(b);
    }
  }
  return null;
}

async function bagyGetBalance(variationId: string): Promise<{ balance: number | null; error?: string; notFound?: boolean }> {
  const urls = [
    `${BAGY_BASE}/variations/${encodeURIComponent(variationId)}`,
    `${BAGY_BASE}/products/variations/${encodeURIComponent(variationId)}`,
  ];
  let all404 = true;
  let lastError = "";
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${BAGY_TOKEN}`, Accept: "application/json" },
      });
      if (res.status !== 404) all404 = false;
      if (!res.ok) { lastError = `GET ${url.replace(BAGY_BASE, "")} HTTP ${res.status}`; continue; }
      const json = await res.json();
      const b = pickBalance(json);
      if (b !== null) return { balance: b };
      lastError = "balance_ausente_na_resposta";
    } catch (e) {
      all404 = false;
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  if (all404) return { balance: null, notFound: true };
  return { balance: null, error: lastError };
}

async function bagyPutBalance(variationId: string, balance: number): Promise<{ ok: boolean; error?: string }> {
  const urls = [
    `${BAGY_BASE}/variations/${encodeURIComponent(variationId)}`,
    `${BAGY_BASE}/products/variations/${encodeURIComponent(variationId)}`,
  ];
  let lastError = "";
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BAGY_TOKEN}`,
          Accept: "application/json",
        },
        body: JSON.stringify({ balance }),
      });
      if (res.ok) return { ok: true };
      const t = await res.text();
      lastError = `PUT ${url.replace(BAGY_BASE, "")} HTTP ${res.status}: ${t.slice(0, 200)}`;
      if (res.status !== 404) break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  return { ok: false, error: lastError };
}

async function authorize(req: Request, admin: any): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (token === SERVICE_ROLE) return null;

  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: claimsData, error: claimsError } = await anon.auth.getClaims(token);
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId).in("role", ["admin_master"]);
  if (!roles || roles.length === 0) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!BAGY_TOKEN) return new Response(JSON.stringify({ error: "BAGY_API_TOKEN ausente" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const authResp = await authorize(req, admin);
  if (authResp) return authResp;

  let body: any = {};
  try { body = await req.json(); } catch { /* ok */ }
  const soProduto: string | undefined = body?.produto_id;
  const dryRun: boolean = !!body?.dry_run;

  // Limpa reservas expiradas de brinde
  await admin.rpc("purge_reservas_expiradas").catch(() => {});

  let q = admin
    .from("estoque_produtos")
    .select("id, sku_base, quantidade, bagy_variation_id")
    .eq("ativo", true)
    .not("bagy_variation_id", "is", null)
    .limit(MAX_BATCH);
  if (soProduto) q = q.eq("id", soProduto);

  const { data: produtos, error } = await q;
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const results: any[] = [];
  let ajustesLocal = 0, ajustesBagy = 0, iguais = 0, erros = 0;

  for (const p of produtos || []) {
    const variationId = String(p.bagy_variation_id);
    const localAntes = p.quantidade ?? 0;
    const r = await bagyGetBalance(variationId);
    if (r.error || r.balance === null) {
      erros++;
      await admin.from("bagy_stock_reconcile_log").insert({
        produto_id: p.id, sku: p.sku_base, variation_id: variationId,
        saldo_local_antes: localAntes, saldo_bagy_antes: null,
        acao: "erro", saldo_final: null, erro: r.error || (r.notFound ? "variacao_nao_encontrada_na_bagy" : "sem_balance"),
      });
      results.push({ sku: p.sku_base, acao: "erro", erro: r.error || "sem_balance" });
      continue;
    }

    const bagyAntes = r.balance;
    if (localAntes === bagyAntes) {
      iguais++;
      // Só loga divergências pra não poluir. (Iguais não vão pra tabela.)
      results.push({ sku: p.sku_base, acao: "sem_diferenca", saldo: localAntes });
      continue;
    }

    if (localAntes > bagyAntes) {
      // Portal ficou pra trás; Bagy é fonte de verdade — puxa local pra baixo (SEM enfileirar push).
      if (!dryRun) {
        const { error: upErr } = await admin.from("estoque_produtos").update({ quantidade: bagyAntes, updated_at: new Date().toISOString() }).eq("id", p.id);
        if (upErr) { erros++; results.push({ sku: p.sku_base, acao: "erro", erro: upErr.message }); continue; }
        // O trigger AFTER UPDATE de quantidade cria uma linha em bagy_stock_sync_queue mandando o mesmo saldo de volta.
        // Remove imediatamente pra evitar eco Bagy→Portal→Bagy.
        await admin.from("bagy_stock_sync_queue").delete().eq("estoque_produto_id", p.id).is("processado_em", null);
        await admin.from("estoque_produtos").update({ bagy_sync_status: "ok", bagy_sync_erro: null, bagy_sync_at: new Date().toISOString() }).eq("id", p.id);
      }

      ajustesLocal++;
      await admin.from("bagy_stock_reconcile_log").insert({
        produto_id: p.id, sku: p.sku_base, variation_id: variationId,
        saldo_local_antes: localAntes, saldo_bagy_antes: bagyAntes,
        acao: dryRun ? "seria_ajusta_local" : "ajustou_local", saldo_final: bagyAntes,
      });
      results.push({ sku: p.sku_base, acao: "ajustou_local", de: localAntes, para: bagyAntes });
      continue;
    }

    // localAntes < bagyAntes: portal vendeu, Bagy não sabe. PUT balance = local.
    if (!dryRun) {
      const put = await bagyPutBalance(variationId, localAntes);
      if (!put.ok) {
        erros++;
        await admin.from("bagy_stock_reconcile_log").insert({
          produto_id: p.id, sku: p.sku_base, variation_id: variationId,
          saldo_local_antes: localAntes, saldo_bagy_antes: bagyAntes,
          acao: "erro", saldo_final: null, erro: put.error,
        });
        results.push({ sku: p.sku_base, acao: "erro", erro: put.error });
        continue;
      }
      await admin.from("estoque_produtos").update({ bagy_sync_status: "ok", bagy_sync_erro: null, bagy_sync_at: new Date().toISOString() }).eq("id", p.id);
    }
    ajustesBagy++;
    await admin.from("bagy_stock_reconcile_log").insert({
      produto_id: p.id, sku: p.sku_base, variation_id: variationId,
      saldo_local_antes: localAntes, saldo_bagy_antes: bagyAntes,
      acao: dryRun ? "seria_ajusta_bagy" : "ajustou_bagy", saldo_final: localAntes,
    });
    results.push({ sku: p.sku_base, acao: "ajustou_bagy", de: bagyAntes, para: localAntes });
  }

  return new Response(JSON.stringify({
    ok: true,
    total: (produtos || []).length,
    iguais, ajustes_local: ajustesLocal, ajustes_bagy: ajustesBagy, erros,
    dry_run: dryRun,
    results,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
