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
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BAGY_TOKEN = Deno.env.get("BAGY_API_TOKEN") || "";
const BAGY_BASE = (Deno.env.get("BAGY_API_BASE") || "https://api.dooca.store")
  .replace(/\/$/, "");

const MAX_BATCH = 50;
const MAX_TENTATIVAS = 5;

async function enqueueStockSync(admin: any, produtoId: string, sku: string, saldo: number) {
  const payload = {
    sku,
    novo_saldo: saldo,
    tentativas: 0,
    ultimo_erro: null,
    processado_em: null,
    criado_em: new Date().toISOString(),
  };

  const { data: updated, error: updateError } = await admin
    .from("bagy_stock_sync_queue")
    .update(payload as any)
    .eq("estoque_produto_id", produtoId)
    .is("processado_em", null)
    .select("id");

  if (updateError) return { error: updateError };
  if (updated && updated.length > 0) return { error: null };

  const { error: insertError } = await admin
    .from("bagy_stock_sync_queue")
    .insert({ estoque_produto_id: produtoId, ...payload } as any);

  return { error: insertError };
}

async function authorizeRequest(req: Request, admin: any, body: any): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (token === SERVICE_ROLE) return null;

  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: claimsData, error: claimsError } = await anon.auth.getClaims(token);
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const needsPrivilegedAccess = Boolean(body?.retry_produto_id || body?.retry_all_errors || body?.force_all_active || body?.retry_unsynced || body?.force_rediscover);
  if (!needsPrivilegedAccess) return null;

  const { data: roles, error: rolesError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin_master", "admin_producao", "vendedor_comissao"]);

  if (rolesError || !roles || roles.length === 0) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return null;
}

async function bagyGetVariationIdBySku(sku: string): Promise<{ id: string | null; raw?: any; error?: string }> {
  // Tenta múltiplos caminhos da API Dooca/Bagy
  const candidates = [
    `${BAGY_BASE}/variations?sku=${encodeURIComponent(sku)}`,
    `${BAGY_BASE}/products/variations?sku=${encodeURIComponent(sku)}`,
    `${BAGY_BASE}/variations?reference=${encodeURIComponent(sku)}`,
    `${BAGY_BASE}/products/variations?reference=${encodeURIComponent(sku)}`,
    `${BAGY_BASE}/variations?q=${encodeURIComponent(sku)}`,
  ];
  let lastError = "";
  const skuLower = sku.toLowerCase();

  for (const url of candidates) {
    try {
      console.log("bagy-stock-sync lookup", { sku, path: url.replace(BAGY_BASE, "") });
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${BAGY_TOKEN}`,
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        lastError = `GET ${url.replace(BAGY_BASE, "")} HTTP ${res.status}`;
        console.error("bagy-stock-sync lookup failed", { sku, error: lastError });
        continue;
      }
      const json = await res.json();
      const arr = collectArrayCandidates(json);
      if (!Array.isArray(arr) || arr.length === 0) {
        lastError = "sku_nao_encontrado_na_bagy";
        continue;
      }
      const hit = arr.find((v: any) =>
        String(v.sku || v.code || v.reference || "").toLowerCase() === skuLower
      );
      if (!hit) {
        lastError = "sku_nao_encontrado_na_bagy";
        continue;
      }
      const id = hit?.id ?? hit?.variation_id ?? null;
      console.log("bagy-stock-sync lookup ok", { sku, variationId: id });
      return { id: id ? String(id) : null, raw: hit };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  if (lastError === "sku_nao_encontrado_na_bagy") return { id: null };
  return { id: null, error: lastError || "no endpoint matched" };
}

function collectArrayCandidates(json: any): any[] {
  const candidates = [
    json,
    json?.data,
    json?.items,
    json?.result,
    json?.results,
    json?.data?.items,
    json?.data?.variations,
    json?.data?.data,
    json?.result?.items,
    json?.result?.variations,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }

  const single = json?.data && !Array.isArray(json.data) ? json.data : json;
  if (single && typeof single === "object") return [single];
  return [];
}

function pickSkuFromVariation(json: any): string | null {
  const variants = [json, json?.data, json?.result];
  for (const v of variants) {
    const sku = v?.sku || v?.reference || v?.code;
    if (sku && String(sku).trim()) return String(sku).trim();
  }
  return null;
}

async function bagyGetSkuByVariationId(variationId: string): Promise<{ sku: string | null; notFound: boolean }> {
  const candidates = [
    `${BAGY_BASE}/variations/${encodeURIComponent(variationId)}`,
    `${BAGY_BASE}/products/variations/${encodeURIComponent(variationId)}`,
  ];

  let all404 = true;
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${BAGY_TOKEN}`,
          Accept: "application/json",
        },
      });
      if (res.status !== 404) all404 = false;
      if (!res.ok) continue;
      const json = await res.json();
      const sku = pickSkuFromVariation(json);
      if (sku) return { sku, notFound: false };
    } catch (_e) {
      all404 = false; // network err ≠ inexistente
    }
  }
  return { sku: null, notFound: all404 };
}

async function bagyPutBalance(variationId: string, balance: number): Promise<{ ok: boolean; error?: string }> {
  // Tenta /variations/{id} primeiro (Dooca atual); fallback /products/variations/{id}
  const candidates = [
    `${BAGY_BASE}/variations/${encodeURIComponent(variationId)}`,
    `${BAGY_BASE}/products/variations/${encodeURIComponent(variationId)}`,
  ];
  let lastError = "";
  for (const url of candidates) {
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
      if (res.ok) {
        console.log("bagy-stock-sync put ok", { variationId, balance, path: url.replace(BAGY_BASE, "") });
        return { ok: true };
      }
      const t = await res.text();
      lastError = `PUT ${url.replace(BAGY_BASE, "")} HTTP ${res.status}: ${t.slice(0, 300)}`;
      console.error("bagy-stock-sync put failed", { variationId, balance, error: lastError });
      if (res.status !== 404) break; // só faz fallback em 404
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  return { ok: false, error: lastError };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!BAGY_TOKEN) {
    return new Response(JSON.stringify({ error: "BAGY_API_TOKEN ausente" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // Optional body: { retry_produto_id?: string, retry_all_errors?: boolean, force_all_active?: boolean, retry_unsynced?: boolean }
  let body: any = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  const authResponse = await authorizeRequest(req, admin, body);
  if (authResponse) return authResponse;

  // Retry: reenfileira itens específicos
  if (body?.retry_produto_id || body?.retry_all_errors || body?.force_all_active || body?.retry_unsynced) {
    let q = admin.from("estoque_produtos").select("id, sku_base, quantidade").eq("ativo", true);
    if (body.retry_produto_id) {
      q = q.eq("id", body.retry_produto_id);
    } else if (body.retry_all_errors) {
      q = q.in("bagy_sync_status", ["nao_encontrado_na_bagy", "erro"]);
    } else if (body.retry_unsynced) {
      q = q.or("bagy_sync_status.is.null,bagy_sync_status.in.(pendente,erro,nao_encontrado_na_bagy),bagy_sync_at.is.null");
    }
    const { data: prods, error } = await q;
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    for (const p of prods || []) {
      if (!p.sku_base) continue;
      // Se force_rediscover, limpa o cache do variation_id antes de enfileirar
      if (body?.force_rediscover) {
        await admin.from("estoque_produtos").update({ bagy_variation_id: null }).eq("id", p.id);
      }
      // limpa pendente anterior do mesmo produto + reseta status
      const queued = await enqueueStockSync(admin, p.id, p.sku_base, p.quantidade ?? 0);
      if (queued.error) {
        console.error("Erro ao reenfileirar estoque Bagy", p.id, queued.error.message);
        continue;
      }
      await admin.from("estoque_produtos")
        .update({ bagy_sync_status: "pendente", bagy_sync_erro: null, bagy_sync_at: null })
        .eq("id", p.id);
    }
  }

  // Pega pendentes
  const { data: pending, error: pendErr } = await admin
    .from("bagy_stock_sync_queue")
    .select("id, estoque_produto_id, sku, novo_saldo, tentativas")
    .is("processado_em", null)
    .order("criado_em", { ascending: true })
    .limit(MAX_BATCH);

  if (pendErr) {
    return new Response(JSON.stringify({ error: pendErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];

  for (const item of pending || []) {
    if (!item.estoque_produto_id) {
      const nowIso = new Date().toISOString();
      await admin.from("bagy_stock_sync_queue").update({
        tentativas: (item.tentativas || 0) + 1,
        ultimo_erro: "produto_excluido_antes_do_processamento",
        processado_em: nowIso,
      }).eq("id", item.id);
      results.push({ sku: item.sku, ok: false, stage: "skip", error: "produto_excluido_antes_do_processamento" });
      continue;
    }

    // Lê produto pra pegar bagy_variation_id cacheado
    const { data: prod } = await admin
      .from("estoque_produtos")
      .select("id, bagy_variation_id")
      .eq("id", item.estoque_produto_id)
      .maybeSingle();

    let variationId: string | null = prod?.bagy_variation_id || null;
    const nowIso = new Date().toISOString();

    console.log("bagy-stock-sync processing", {
      queueId: item.id,
      produtoId: item.estoque_produto_id,
      sku: item.sku,
      novoSaldo: item.novo_saldo,
      cachedVariationId: variationId,
    });

    if (variationId) {
      const cachedSku = await bagyGetSkuByVariationId(variationId);
      if (cachedSku && cachedSku.toLowerCase() !== String(item.sku).toLowerCase()) {
        console.warn("bagy-stock-sync cached variation mismatch", {
          sku: item.sku,
          cachedVariationId: variationId,
          cachedSku,
        });
        variationId = null;
        await admin.from("estoque_produtos").update({ bagy_variation_id: null }).eq("id", item.estoque_produto_id);
      }
    }

    // Descobre o id se não tiver cache
    if (!variationId) {
      const r = await bagyGetVariationIdBySku(item.sku);
      if (r.error) {
        const novasTentativas = (item.tentativas || 0) + 1;
        const desistir = novasTentativas >= MAX_TENTATIVAS;
        await admin.from("bagy_stock_sync_queue").update({
          tentativas: novasTentativas,
          ultimo_erro: r.error,
          processado_em: desistir ? nowIso : null,
        }).eq("id", item.id);
        if (desistir) {
          await admin.from("estoque_produtos").update({
            bagy_sync_status: "erro",
            bagy_sync_erro: r.error,
            bagy_sync_at: nowIso,
          }).eq("id", item.estoque_produto_id);
        }
        results.push({ sku: item.sku, ok: false, stage: "lookup", error: r.error });
        continue;
      }
      if (!r.id) {
        // SKU não existe na Bagy → para de tentar
        await admin.from("bagy_stock_sync_queue").update({
          tentativas: (item.tentativas || 0) + 1,
          ultimo_erro: "sku_nao_encontrado_na_bagy",
          processado_em: nowIso,
        }).eq("id", item.id);
        await admin.from("estoque_produtos").update({
          bagy_sync_status: "nao_encontrado_na_bagy",
          bagy_sync_erro: `SKU "${item.sku}" não encontrado na Bagy. Cadastre o produto na Bagy com esse SKU e clique em Tentar novamente.`,
          bagy_sync_at: nowIso,
        }).eq("id", item.estoque_produto_id);
        results.push({ sku: item.sku, ok: false, stage: "lookup", error: "sku_nao_encontrado_na_bagy" });
        continue;
      }
      variationId = r.id;
      await admin.from("estoque_produtos").update({
        bagy_variation_id: variationId,
      }).eq("id", item.estoque_produto_id);
    }

    // PUT do saldo
    const put = await bagyPutBalance(variationId!, item.novo_saldo);
    if (put.ok) {
      await admin.from("bagy_stock_sync_queue").update({
        tentativas: (item.tentativas || 0) + 1,
        ultimo_erro: null,
        processado_em: nowIso,
      }).eq("id", item.id);
      await admin.from("estoque_produtos").update({
        bagy_sync_status: "ok",
        bagy_sync_erro: null,
        bagy_sync_at: nowIso,
      }).eq("id", item.estoque_produto_id);
      results.push({ sku: item.sku, ok: true, balance: item.novo_saldo });
    } else {
      if ((put.error || "").includes("HTTP 404")) {
        await admin.from("estoque_produtos").update({ bagy_variation_id: null }).eq("id", item.estoque_produto_id);
      }
      const novasTentativas = (item.tentativas || 0) + 1;
      const desistir = novasTentativas >= MAX_TENTATIVAS;
      await admin.from("bagy_stock_sync_queue").update({
        tentativas: novasTentativas,
        ultimo_erro: put.error || "erro",
        processado_em: desistir ? nowIso : null,
      }).eq("id", item.id);
      if (desistir) {
        await admin.from("estoque_produtos").update({
          bagy_sync_status: "erro",
          bagy_sync_erro: put.error || "erro",
          bagy_sync_at: nowIso,
        }).eq("id", item.estoque_produto_id);
      }
      results.push({ sku: item.sku, ok: false, stage: "put", error: put.error });
    }
  }

  return new Response(
    JSON.stringify({ ok: true, processados: results.length, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
