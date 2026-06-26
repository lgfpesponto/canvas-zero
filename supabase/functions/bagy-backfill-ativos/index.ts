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

function pick<T = any>(obj: any, ...keys: string[]): T | undefined {
  for (const k of keys) {
    const v = k.split(".").reduce((o: any, p: string) => o?.[p], obj);
    if (v !== undefined && v !== null && v !== "") return v as T;
  }
  return undefined;
}

function parseTamanhoFromSku(sku: string | undefined): { base: string; tamanho: string | null } {
  if (!sku) return { base: "", tamanho: null };
  const m1 = sku.match(/^(.+?)[-_ ]+(\d{2})$/);
  if (m1) return { base: m1[1], tamanho: m1[2] };
  return { base: sku, tamanho: null };
}

const SKIP_FULFILL = new Set(["invoiced", "shipped", "delivered"]);
const SKIP_STATUS = new Set(["canceled", "cancelled", "archived"]);

async function listBagyOrders(page: number): Promise<any[]> {
  const url = `${BAGY_BASE}/orders?payment_status=approved&page=${page}&per_page=50`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${BAGY_TOKEN}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Bagy GET /orders HTTP ${res.status}: ${t.slice(0, 300)}`);
  }
  const j = await res.json();
  if (Array.isArray(j)) return j;
  if (Array.isArray(j?.data)) return j.data;
  return [];
}

async function fetchBagyOrderFull(id: string): Promise<any | null> {
  const r = await fetch(`${BAGY_BASE}/orders/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${BAGY_TOKEN}`, Accept: "application/json" },
  });
  if (!r.ok) return null;
  return await r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
  if (authErr || !claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claims.claims.sub as string;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
  const roleSet = new Set((roles || []).map((r: any) => r.role));
  if (!roleSet.has("admin_master") && !roleSet.has("admin_producao")) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let maxPages = 10;
  try {
    const body = await req.json().catch(() => null);
    if (body && typeof body.max_pages === "number") {
      maxPages = Math.min(Math.max(body.max_pages, 1), 50);
    }
  } catch { /* ignore */ }

  let imported = 0;
  let linked = 0;
  let enqueued = 0;
  let skipped = 0;
  const errors: string[] = [];

  outer: for (let page = 1; page <= maxPages; page++) {
    let orders: any[] = [];
    try {
      orders = await listBagyOrders(page);
    } catch (e) {
      errors.push(`page ${page}: ${e instanceof Error ? e.message : String(e)}`);
      break;
    }
    if (orders.length === 0) break;

    for (const summary of orders) {
      const bagyOrderId = String(pick(summary, "id") ?? "");
      if (!bagyOrderId) { skipped++; continue; }

      const statusTop = String(pick(summary, "status") ?? "").toLowerCase();
      const ffStatus = String(pick(summary, "fulfillment_status") ?? "").toLowerCase();
      if (SKIP_STATUS.has(statusTop) || SKIP_FULFILL.has(ffStatus)) {
        skipped++;
        continue;
      }

      // Busca pedido completo (lista da Bagy às vezes não traz items)
      const order = await fetchBagyOrderFull(bagyOrderId) || summary;

      try {
        const numeroBagy = String(pick(order, "code", "number", "id") ?? bagyOrderId);
        const customer = order.customer || {};
        const shippingAddr = order.shipping_address || order.address || null;
        const firstLast = [pick<string>(customer, "first_name"), pick<string>(customer, "last_name")]
          .filter(Boolean).join(" ").trim();
        const clienteNome = pick<string>(customer, "name") || firstLast || null;
        const clienteDoc = pick<string>(customer, "cgc", "cpf", "document") || null;
        const clienteEmail = pick<string>(customer, "email") || null;
        const clienteWhats = pick<string>(customer, "phone", "mobile_phone", "cellphone") || null;
        const total = Number(pick(order, "total") || 0);
        const subtotal = Number(pick(order, "subtotal") || 0);
        const desconto = Number(pick(order, "discount") || 0);
        const frete = Number(pick(order, "shipping.price") || 0);
        const pagamentoRaw = pick<string>(order, "payment.name", "payment.method") || null;
        const metodoEnvio = pick<string>(order, "shipping.alias", "shipping.name") || null;
        const bagyCreatedRaw = pick<string>(order, "created_at") || null;
        const bagyCreatedAt = bagyCreatedRaw ? new Date(bagyCreatedRaw).toISOString() : null;

        // Decide status local: se há itens vendidos com selling_out_of_stock=true -> production (sob encomenda).
        // Caso contrário -> separated (estoque).
        const items: any[] = order.items || [];
        const anyOutOfStock = items.some((it: any) => it?.selling_out_of_stock === 1 || it?.selling_out_of_stock === true);
        const targetStatus = anyOutOfStock ? "production" : "separated";

        // Upsert bagy_pedidos
        const { data: pedidoRow, error: upErr } = await admin
          .from("bagy_pedidos")
          .upsert({
            bagy_order_id: bagyOrderId,
            numero_bagy: numeroBagy,
            status_bagy: targetStatus,
            cliente_nome: clienteNome,
            cliente_doc: clienteDoc,
            cliente_email: clienteEmail,
            cliente_whats: clienteWhats,
            endereco: shippingAddr,
            total: total || subtotal,
            frete,
            desconto,
            pagamento: pagamentoRaw,
            metodo_envio: metodoEnvio,
            bagy_created_at: bagyCreatedAt,
            payload: order,
            flag: "pedido_criado",
            processado_em: new Date().toISOString(),
          }, { onConflict: "bagy_order_id" })
          .select("id")
          .single();
        if (upErr) { errors.push(`${bagyOrderId}: upsert ${upErr.message}`); continue; }

        // Itens (best-effort, sem mapeamento — só pra mostrar)
        await admin.from("bagy_pedido_itens").delete().eq("pedido_id", pedidoRow.id);
        if (items.length > 0) {
          const rows = items.map((it: any) => {
            const skuRaw = String(pick(it, "sku") ?? "").trim();
            const { tamanho: tamFromSku } = parseTamanhoFromSku(skuRaw);
            return {
              pedido_id: pedidoRow.id,
              sku: skuRaw || null,
              nome_produto: pick<string>(it, "name") || null,
              variacao_nome: pick<string>(it, "variation") || null,
              tamanho: pick<string>(it, "size") || tamFromSku || null,
              cor: pick<string>(it, "color") || null,
              quantidade: Number(pick(it, "quantity") || 1),
              preco_unit: Number(pick(it, "price") || 0),
              foto_url: pick<string>(it, "image.src", "image") || null,
              ncm: pick<string>(it, "ncm") || null,
              status: "backfill",
              payload: it,
            };
          });
          await admin.from("bagy_pedido_itens").insert(rows);
        }
        imported++;

        // Tenta linkar ao pedido do portal por numero (RC-<code>)
        const numeroPortal = `RC-${numeroBagy}`;
        const { data: portalOrder } = await admin
          .from("orders")
          .select("id, bagy_order_id")
          .eq("numero", numeroPortal)
          .maybeSingle();
        if (portalOrder) {
          await admin.from("bagy_pedidos").update({
            order_id_portal: portalOrder.id,
          }).eq("id", pedidoRow.id);
          if (!portalOrder.bagy_order_id) {
            await admin.from("orders").update({
              bagy_order_id: bagyOrderId,
            } as any).eq("id", portalOrder.id);
          }
          linked++;
        }

        // Enfileira push para Bagy (production/separated)
        await admin.from("bagy_status_sync_queue").insert({
          bagy_order_id: bagyOrderId,
          target_status: targetStatus,
        });
        enqueued++;
      } catch (e) {
        errors.push(`${bagyOrderId}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (orders.length < 50) break outer;
  }

  // Dispara o drain depois de enfileirar (best-effort)
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/bagy-queue-drain`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({ limit: 200 }),
    });
  } catch { /* ignore */ }

  return new Response(
    JSON.stringify({ ok: true, imported, linked, enqueued, skipped, errors: errors.slice(0, 20) }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
