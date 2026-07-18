// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-bagy-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_TOKEN = Deno.env.get("BAGY_WEBHOOK_TOKEN") || "";
const BAGY_TOKEN = Deno.env.get("BAGY_API_TOKEN") || "";
const BAGY_BASE = (Deno.env.get("BAGY_API_BASE") || "https://api.dooca.store").replace(/\/+$/, "");

// Cache de SKU por id (variation/product) escopado à execução
const skuCache = new Map<string, string | null>();

function collectArrayCandidates(json: any): any[] {
  const candidates = [
    json,
    json?.data,
    json?.items,
    json?.variations,
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

function pickSkuFromAny(obj: any): string | null {
  const candidates = [
    obj,
    obj?.data,
    obj?.result,
    obj?.variation,
    obj?.variant,
  ];

  for (const c of candidates) {
    const sku = c?.sku || c?.reference || c?.code;
    if (sku && String(sku).trim()) return String(sku).trim();
  }
  return null;
}

async function bagyGetJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${BAGY_TOKEN}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchBagySku(opts: { variationId?: string | number | null; productId?: string | number | null }): Promise<string | null> {
  if (!BAGY_TOKEN) return null;
  const varId = opts.variationId ? String(opts.variationId) : "";
  const prodId = opts.productId ? String(opts.productId) : "";
  const cacheKey = `v:${varId}|p:${prodId}`;
  if (skuCache.has(cacheKey)) return skuCache.get(cacheKey) || null;

  let sku: string | null = null;
  if (varId) {
    const candidates = [
      `${BAGY_BASE}/variations/${encodeURIComponent(varId)}`,
      `${BAGY_BASE}/products/variations/${encodeURIComponent(varId)}`,
      prodId ? `${BAGY_BASE}/products/${encodeURIComponent(prodId)}/variations/${encodeURIComponent(varId)}` : null,
    ];
    for (const url of candidates.filter(Boolean) as string[]) {
      const data = await bagyGetJson(url);
      const s = pickSkuFromAny(data);
      if (s) { sku = s; break; }
    }
  }
  if (!sku && prodId) {
    const data = await bagyGetJson(`${BAGY_BASE}/products/${encodeURIComponent(prodId)}`);
    const s = pickSkuFromAny(data);
    if (s) sku = s;
    if (!sku) {
      const vars = collectArrayCandidates(data);
      const match = vars.find((v) => String(v?.id ?? v?.variation_id ?? "") === String(varId));
      const vs = pickSkuFromAny(match);
      if (vs) sku = vs;
    }
  }
  if (!sku) {
    console.warn("bagy-webhook: não conseguiu resolver SKU pela API", { variationId: varId || null, productId: prodId || null });
  } else {
    console.log("bagy-webhook: SKU resolvido pela API", { variationId: varId || null, productId: prodId || null, sku });
  }
  skuCache.set(cacheKey, sku);
  return sku;
}

// status Bagy/Dooca que disparam baixa de estoque + criação do pedido no portal
const APPROVED_STATUSES = new Set([
  "paid",
  "approved",
  "production",
  "separated",
  "shipped",
  "delivered",
  "completed",
]);
const REFUND_STATUSES = new Set([
  "canceled",
  "cancelled",
  "refunded",
  "returned",
]);

function sha256Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  return crypto.subtle.digest("SHA-256", buf).then((h) =>
    Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

function pick<T = any>(obj: any, ...keys: string[]): T | undefined {
  for (const k of keys) {
    const v = k.split(".").reduce((o, p) => o?.[p], obj);
    if (v !== undefined && v !== null && v !== "") return v as T;
  }
  return undefined;
}

function parseTamanhoFromSku(sku: string | undefined): {
  base: string;
  tamanho: string | null;
} {
  if (!sku) return { base: "", tamanho: null };
  // padrões aceitos: BASE-34, BASE_34, BASE34 (último número)
  const m1 = sku.match(/^(.+?)[-_ ]+(\d{2})$/);
  if (m1) return { base: m1[1], tamanho: m1[2] };
  return { base: sku, tamanho: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Token aceito via query (?token=XYZ), header (x-webhook-token) ou Authorization Bearer
  const url = new URL(req.url);
  const tokenQuery = url.searchParams.get("token") || "";
  const tokenHeader = req.headers.get("x-webhook-token") || "";
  const authHeader = req.headers.get("authorization") || "";
  const tokenBearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const tokenProvided = tokenQuery || tokenHeader || tokenBearer;
  const forceReprocess = url.searchParams.get("force") === "1";


  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // Lê body uma vez (pra logar mesmo se token inválido)
  let rawBody = "";
  let payload: any = {};
  try {
    rawBody = await req.text();
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch (_e) {
    // segue: payload fica {} e rawBody fica como veio
  }

  // Log sempre — útil pra debugar webhook não chegando ou com token errado
  try {
    await supabase.from("bagy_webhook_log").insert({
      event: "incoming",
      bagy_order_id: String(payload?.id ?? payload?.data?.id ?? "") || null,
      signature: `query_token_len=${tokenQuery.length} header_token_len=${tokenHeader.length} bearer_len=${tokenBearer.length} ua=${(req.headers.get("user-agent") || "").slice(0, 80)}`,
      payload_hash: await sha256Hex(rawBody || ""),
      payload: payload || {},
      erro: !tokenProvided
        ? "sem_token"
        : (tokenProvided !== WEBHOOK_TOKEN ? "token_invalido" : null),
    });
  } catch (_e) {
    // não bloqueia
  }

  if (!WEBHOOK_TOKEN || tokenProvided !== WEBHOOK_TOKEN) {
    return new Response(JSON.stringify({
      error: "invalid_token",
      hint: "Inclua ?token=SEU_TOKEN na URL do webhook (ou header x-webhook-token). Use 'Copiar URL do Webhook' no portal.",
    }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!payload || typeof payload !== "object") {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }



  // A Bagy/Dooca tipicamente envia { event, data: {... order ...} } ou direto o order
  const event = pick<string>(payload, "event", "type") || "order";
  const order = payload?.data && typeof payload.data === "object"
    ? payload.data
    : payload;

  const bagyOrderId = String(
    pick(order, "id", "order_id", "uuid") ?? "",
  );

  const statusBagyRaw = String(
    pick(order, "status", "status_name", "current_status") ?? "unknown",
  ).toLowerCase();
  const paymentStatusRaw = String(
    pick(order, "payment_status", "financial_status", "payment.status") ?? "",
  ).toLowerCase();
  const eventLower = String(event || "").toLowerCase();

  // Eventos que, por si só, indicam que o pedido foi aprovado/avançou
  const APPROVED_EVENTS = new Set([
    "order.approved",
    "order.paid",
    "order.invoiced",
    "order.production",
    "order.separated",
    "order.shipped",
    "order.delivered",
    "order.completed",
  ]);

  const eventApproved = APPROVED_EVENTS.has(eventLower);
  const statusApproved = APPROVED_STATUSES.has(statusBagyRaw);
  const paymentApproved = !!paymentStatusRaw && APPROVED_STATUSES.has(paymentStatusRaw);

  // statusBagyEarly = melhor representação do estado real (privilegia status logístico se aprovado,
  // senão usa o status de pagamento aprovado, senão o evento, senão o bruto)
  const statusBagyEarly = statusApproved
    ? statusBagyRaw
    : paymentApproved
    ? paymentStatusRaw
    : eventApproved
    ? "approved"
    : statusBagyRaw;

  // POLÍTICA: SEMPRE ingerimos o pedido (mesmo não aprovado) para que apareça no portal.
  // As ações que disparam efeitos colaterais (criar pedido portal, baixar estoque, enfileirar
  // "separated" na Bagy) só rodam quando `isApproved` (calculado abaixo).

  // Idempotência por hash do payload
  const payloadHash = await sha256Hex(rawBody);

  // log primeiro (sem bloquear se duplicar)
  const { data: existingLog } = await supabase
    .from("bagy_webhook_log")
    .select("id, processed_em")
    .eq("payload_hash", payloadHash)
    .maybeSingle();

  if (existingLog?.processed_em && !forceReprocess) {
    return new Response(
      JSON.stringify({ ok: true, duplicate: true, log_id: existingLog.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }


  const { data: logRow } = await supabase
    .from("bagy_webhook_log")
    .insert({
      event,
      bagy_order_id: bagyOrderId || null,
      payload_hash: payloadHash,
      payload,
    })
    .select("id")
    .single();

  if (!bagyOrderId) {
    await supabase.from("bagy_webhook_log").update({
      erro: "missing_order_id",
      processed_em: new Date().toISOString(),
    }).eq("id", logRow!.id);
    return new Response(
      JSON.stringify({ ok: true, skipped: "missing_order_id" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }


  try {
    // === Extrai campos do pedido ===
    const numeroBagy = String(
      pick(order, "code", "number", "numero", "id") ?? bagyOrderId,
    );
    // Usa o status normalizado (statusBagyEarly considera payment_status + evento de aprovação)
    const statusBagy = statusBagyEarly;

    const customer = order.customer || order.client || {};
    const shippingAddr = order.shipping_address || order.address || order.shipping || null;

    const firstLast = [
      pick<string>(customer, "first_name"),
      pick<string>(customer, "last_name"),
    ].filter(Boolean).join(" ").trim();
    const clienteNome =
      pick<string>(customer, "name", "full_name") ||
      (firstLast || null) ||
      pick<string>(shippingAddr || {}, "recipient", "name", "receiver") ||
      pick<string>(order, "customer_name") ||
      null;
    const clienteDoc = pick<string>(customer, "cpf", "document", "cnpj") || null;
    const clienteEmail = pick<string>(customer, "email") || null;
    const clienteWhats = pick<string>(
      customer,
      "phone",
      "mobile_phone",
      "cellphone",
      "whatsapp",
    ) || pick<string>(shippingAddr || {}, "phone") || null;

    const total = Number(pick(order, "total", "amount_total", "amount") || 0);
    const frete = Number(pick(order, "shipping_amount", "freight", "shipping") || 0);
    const desconto = Number(
      pick(order, "discount", "discount_amount", "coupon_value") || 0,
    );
    const pagamentoRaw = pick<string>(
      order,
      "payment_method",
      "payment.method",
      "payment.payment_method",
      "payments.0.method",
      "payments.0.payment_method",
      "payment_method_name",
      "gateway",
    ) || null;
    const PAGAMENTO_MAP: Record<string, string> = {
      pix: "Pix",
      credit_card: "Cartão de Crédito",
      creditcard: "Cartão de Crédito",
      credit: "Cartão de Crédito",
      debit_card: "Cartão de Débito",
      debit: "Cartão de Débito",
      boleto: "Boleto",
      billet: "Boleto",
      bank_slip: "Boleto",
      money: "Dinheiro",
      cash: "Dinheiro",
    };
    const pagamento = pagamentoRaw
      ? (PAGAMENTO_MAP[pagamentoRaw.toLowerCase()] || pagamentoRaw)
      : null;

    // Método de envio escolhido pelo cliente
    const metodoEnvio = pick<string>(
      order,
      "shipping_method",
      "shipping.name",
      "shipping.method",
      "shipping.service_name",
      "shipping.title",
      "freight_name",
      "selected_shipping.name",
      "shippings.0.name",
      "shippings.0.service_name",
    ) || null;


    // Data/hora real do pedido na Bagy
    const bagyCreatedRaw = pick<string>(
      order, "created_at", "created", "date", "purchased_at", "order_date",
    ) || null;
    const bagyCreatedAt = bagyCreatedRaw ? new Date(bagyCreatedRaw).toISOString() : null;

    // Status anterior pra detectar transições
    const { data: pedidoExistente } = await supabase
      .from("bagy_pedidos")
      .select("id, status_bagy, order_id_portal")
      .eq("bagy_order_id", bagyOrderId)
      .maybeSingle();

    // Nunca rebaixa o status: se já estávamos aprovados/cancelados, não volta para "open"/"pending"
    const previousApproved = pedidoExistente?.status_bagy
      ? APPROVED_STATUSES.has(pedidoExistente.status_bagy) || REFUND_STATUSES.has(pedidoExistente.status_bagy)
      : false;
    const incomingApproved = APPROVED_STATUSES.has(statusBagy) || REFUND_STATUSES.has(statusBagy);
    const finalStatusBagy = previousApproved && !incomingApproved
      ? pedidoExistente!.status_bagy!
      : statusBagy;

    const upsertData: any = {
      bagy_order_id: bagyOrderId,
      numero_bagy: numeroBagy,
      status_bagy: finalStatusBagy,
      status_bagy_anterior: pedidoExistente?.status_bagy || null,
      cliente_nome: clienteNome,
      cliente_doc: clienteDoc,
      cliente_email: clienteEmail,
      cliente_whats: clienteWhats,
      endereco: shippingAddr,
      total,
      frete,
      desconto,
      pagamento,
      metodo_envio: metodoEnvio,
      bagy_created_at: bagyCreatedAt,
      payload: order,
    };


    const { data: pedidoRow, error: upErr } = await supabase
      .from("bagy_pedidos")
      .upsert(upsertData, { onConflict: "bagy_order_id" })
      .select("id, order_id_portal")
      .single();

    if (upErr) throw upErr;

    // === Itens ===
    const rawItems: any[] = order.items || order.products || order.order_items ||
      [];

    // Remove itens antigos e insere os novos (mais simples que diff)
    await supabase.from("bagy_pedido_itens").delete().eq("pedido_id", pedidoRow.id);

    const isApproved = APPROVED_STATUSES.has(finalStatusBagy);
    const isRefund = REFUND_STATUSES.has(finalStatusBagy);
    const isFirstTimeApproved = isApproved && !pedidoExistente?.order_id_portal;

    // Resolve user_id do vendedor "site"/Rancho Chique
    let siteUserId: string | null = null;
    let siteVendedorNome = "Rancho Chique";
    {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, nome_completo")
        .eq("nome_usuario", "site")
        .maybeSingle();
      if (prof) {
        siteUserId = prof.id;
        siteVendedorNome = prof.nome_completo || siteVendedorNome;
      }
    }

    const numeroPortal = `RC-${numeroBagy}`;

    // Coleta itens classificados
    type ItemRow = {
      sku: string | null;
      nome_produto: string | null;
      variacao_nome: string | null;
      tamanho: string | null;
      cor: string | null;
      quantidade: number;
      preco_unit: number;
      foto_url: string | null;
      estoque_produto_id: string | null;
      template_id: string | null;
      status: string;
      ncm: string | null;
      payload: any;
    };


    const classifiedItems: ItemRow[] = [];
    const estoqueParaComprar: Array<
      { produto_id: string; quantidade: number; preco_unit: number; descricao: string }
    > = [];
    let hasTemplateMatch = false;
    let hasMissingMap = false;

    for (const it of rawItems) {
      let skuRaw = String(
        pick(it, "sku", "reference", "code", "variation.sku", "variation.reference", "variation.code", "variant.sku", "variant.reference", "variant.code", "variation_sku") ?? "",
      ).trim();
      const nomeProd = pick<string>(it, "name", "product.name", "product_name") ||
        null;
      const variacaoNome = pick<string>(
        it,
        "variation.name",
        "variant.name",
        "variation_name",
      ) || null;
      const qty = Number(pick(it, "quantity", "qty") || 1);
      const precoUnit = Number(
        pick(it, "price", "unit_price", "amount", "price_compare") || 0,
      );
      const foto = pick<string>(
        it,
        "image",
        "product.image",
        "variation.image",
        "image_url",
      ) || null;
      const ncm = pick<string>(
        it, "ncm", "product.ncm", "variation.ncm", "tax.ncm", "product.tax.ncm",
      ) || null;

      // SKU pode ter sido cadastrado na Bagy DEPOIS do pedido — busca ao vivo se vier vazio
      if (!skuRaw) {
        const variationId = pick(it, "variation_id", "variation.id", "variant_id", "variant.id");
        const productId = pick(it, "product_id", "product.id");
        const live = await fetchBagySku({ variationId, productId });
        if (live) skuRaw = live;
      }

      const { base, tamanho: tamFromSku } = parseTamanhoFromSku(skuRaw);
      const tamanho = pick<string>(it, "size", "variation.size") || tamFromSku || null;
      const cor = pick<string>(it, "color", "variation.color") || null;


      // Busca no estoque por sku_base
      let estoqueProdutoId: string | null = null;
      let produtoBagySyncAt: string | null = null;
      if (skuRaw) {
        const candidates = [base, skuRaw];
        for (const cand of candidates) {
          if (!cand) continue;
          const q = supabase
            .from("estoque_produtos")
            .select("id, quantidade, preco, ativo, tamanho, sku_base, bagy_sync_at")
            .ilike("sku_base", cand)
            .eq("ativo", true);
          if (tamanho) q.eq("tamanho", tamanho);
          const { data: rows } = await q.limit(1);
          if (rows && rows.length > 0) {
            estoqueProdutoId = rows[0].id;
            produtoBagySyncAt = (rows[0] as any).bagy_sync_at || null;
            break;
          }
        }
      }

      // Pedido Bagy anterior à integração do SKU: já foi contabilizado manualmente
      // aqui como venda Rancho Chique e o saldo Bagy foi zerado antes do sync.
      // Não cria pedido portal, não decrementa estoque, não empurra status.
      const isPreIntegracao = !!(
        estoqueProdutoId &&
        produtoBagySyncAt &&
        bagyCreatedAt &&
        new Date(bagyCreatedAt).getTime() < new Date(produtoBagySyncAt).getTime()
      );

      // Busca template via RPC (cobre sku raiz + sku dentro de tamanhos_skus[*].sku)
      let templateId: string | null = null;
      if (!estoqueProdutoId && skuRaw) {
        const { data: tmplId } = await supabase.rpc("find_template_by_sku", { _sku: skuRaw });
        if (tmplId) {
          templateId = typeof tmplId === "string" ? tmplId : (tmplId as any)?.id ?? null;
          if (templateId) hasTemplateMatch = true;
        }
      }


      let status = "pendente";
      if (isPreIntegracao) {
        status = "pre_integracao_ignorado";
      } else if (estoqueProdutoId) {
        status = "pedido_criado"; // será criado abaixo se isFirstTimeApproved
        if (isFirstTimeApproved) {
          estoqueParaComprar.push({
            produto_id: estoqueProdutoId,
            quantidade: qty,
            preco_unit: precoUnit,
            descricao: nomeProd ||
              (variacaoNome ? `Produto — ${variacaoNome}` : "Produto Bagy"),
          });
        } else if (!isApproved) {
          status = "aguardando_aprovacao";
        }
      } else if (templateId) {
        // Se já existe pedido portal vinculado, a ficha já foi gerada — não regride para aguardando_ficha
        status = pedidoExistente?.order_id_portal ? "pedido_criado" : "aguardando_ficha";
      } else {
        // Brindes (preço 0) não contam como mapeamento faltante — não bloqueiam o pedido
        status = precoUnit > 0 ? "sem_mapeamento" : "brinde_sem_sku";
        if (precoUnit > 0) hasMissingMap = true;
      }


      classifiedItems.push({
        sku: skuRaw || null,
        nome_produto: nomeProd,
        variacao_nome: variacaoNome,
        tamanho,
        cor,
        quantidade: qty,
        preco_unit: precoUnit,
        foto_url: foto,
        estoque_produto_id: estoqueProdutoId,
        template_id: templateId,
        status,
        ncm,
        payload: it,
      });
    }


    // Insere itens — já preenchendo order_id_portal quando o pedido portal existia (re-entrega de webhook).
    if (classifiedItems.length > 0) {
      const portalIdForExisting = pedidoExistente?.order_id_portal || null;
      await supabase.from("bagy_pedido_itens").insert(
        classifiedItems.map((c) => ({
          ...c,
          pedido_id: pedidoRow.id,
          order_id_portal: c.status === "pedido_criado" ? portalIdForExisting : null,
        })),
      );
    }


    // === Caminho A: cria pedido único no portal com TODOS os itens de estoque ===
    let createdOrderId: string | null = null;
    let pedidoFlag: string | null = null;

    if (isFirstTimeApproved && estoqueParaComprar.length > 0 && siteUserId) {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc(
        "comprar_estoque_bagy",
        {
          _items: estoqueParaComprar,
          _vendedor: siteVendedorNome,
          _cliente: clienteNome || "Cliente Bagy",
          _whatsapp: clienteWhats || "",
          _numero_pedido: numeroPortal,
          _bagy_order_id: bagyOrderId,
          _user_id: siteUserId,
          _cpf_cnpj: clienteDoc,
          _forma_pagamento: pagamento,
          _bagy_created_at: bagyCreatedAt,
        },
      );

      if (rpcErr) {
        pedidoFlag = `erro_comprar_estoque: ${rpcErr.message}`;
      } else if (rpcRes?.order_id) {
        createdOrderId = rpcRes.order_id;
        // marca itens de estoque como pedido_criado e linka
        await supabase
          .from("bagy_pedido_itens")
          .update({
            order_id_portal: createdOrderId,
            status: "pedido_criado",
          })
          .eq("pedido_id", pedidoRow.id)
          .not("estoque_produto_id", "is", null);

        // enfileira "separado" para Bagy
        await supabase.from("bagy_status_sync_queue").insert({
          bagy_order_id: bagyOrderId,
          target_status: "separated",
        });

        try {
          await fetch(`${SUPABASE_URL}/functions/v1/bagy-stock-sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_ROLE}`,
              apikey: SERVICE_ROLE,
            },
            body: JSON.stringify({}),
          });
        } catch (syncErr) {
          console.error("Erro ao disparar sync de estoque Bagy", syncErr);
        }
      }
    }

    // === Atualiza bagy_pedidos com resultado ===
    let flag: string | null = pedidoFlag;
    if (!flag) {
      // Pedido já tinha sido criado no portal (ficha gerada / estoque baixado anteriormente):
      // SEMPRE mantém "pedido_criado" — re-entregas do webhook não devem regredir o status visual.
      if (createdOrderId || pedidoExistente?.order_id_portal) flag = "pedido_criado";
      else if (!isApproved) flag = "aguardando_aprovacao";
      else if (hasMissingMap) flag = "aguardando_mapeamento";
      else if (hasTemplateMatch) flag = "aguardando_ficha";
    }


    await supabase.from("bagy_pedidos").update({
      order_id_portal: createdOrderId || pedidoExistente?.order_id_portal || null,
      flag,
      erro: pedidoFlag,
      processado_em: new Date().toISOString(),
    }).eq("id", pedidoRow.id);

    // === Cancelamento / Devolução na Bagy: propaga para o pedido do portal ===
    if (isRefund && pedidoExistente?.order_id_portal) {
      try {
        const { data: ordAtual } = await supabase
          .from("orders")
          .select("id, status, historico")
          .eq("id", pedidoExistente.order_id_portal)
          .maybeSingle();

        if (ordAtual && ordAtual.status !== "Cancelado") {
          const nowSp = new Date().toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" });
          const dataSp = nowSp.slice(0, 10);
          const horaSp = nowSp.slice(11, 16);
          const motivo = `Cancelado na Bagy (status: ${finalStatusBagy})`;
          const novaEntrada = {
            data: dataSp,
            hora: horaSp,
            local: "Cancelado",
            descricao: motivo,
            de: ordAtual.status,
            para: "Cancelado",
            motivo,
            usuario: "Bagy (webhook)",
          };
          const historicoAtual = Array.isArray(ordAtual.historico) ? ordAtual.historico : [];
          await supabase
            .from("orders")
            .update({
              status: "Cancelado",
              motivo_cancelamento: motivo,
              historico: [...historicoAtual, novaEntrada],
            })
            .eq("id", ordAtual.id);

          // Indexa a mudança de etapa
          await supabase.from("order_status_changes").insert({
            order_id: ordAtual.id,
            status: "Cancelado",
            changed_on: dataSp,
            changed_hora: horaSp,
            usuario: "Bagy (webhook)",
          });
        }
      } catch (cancelErr) {
        console.error("bagy-webhook: falha ao propagar cancelamento", cancelErr);
      }
    }


    await supabase.from("bagy_webhook_log").update({
      processed_em: new Date().toISOString(),
    }).eq("id", logRow!.id);

    return new Response(
      JSON.stringify({
        ok: true,
        bagy_order_id: bagyOrderId,
        portal_order_id: createdOrderId,
        flag,
        items: classifiedItems.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("bagy-webhook error", msg);
    await supabase.from("bagy_webhook_log").update({
      erro: msg,
      processed_em: new Date().toISOString(),
    }).eq("id", logRow!.id);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
