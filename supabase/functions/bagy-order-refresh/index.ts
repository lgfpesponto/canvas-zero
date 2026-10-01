// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const TOKEN = Deno.env.get("BAGY_API_TOKEN") || "";
const BASE = (Deno.env.get("BAGY_API_BASE") || "https://api.dooca.store").replace(/\/+$/, "");

async function get(path: string) {
  const r = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" } });
  if (!r.ok) return null;
  try { return await r.json(); } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!TOKEN) return json({ error: "BAGY_API_TOKEN não configurado" }, 500);

  const auth = req.headers.get("Authorization") || "";
  const userClient = createClient(URL_, ANON, { global: { headers: { Authorization: auth } } });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "Não autenticado" }, 401);
  const admin = createClient(URL_, SR, { auth: { persistSession: false } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const ok = (roles || []).some((r: any) => ["admin_master", "admin_producao", "vendedor_comissao"].includes(r.role));
  if (!ok) return json({ error: "Sem permissão" }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { /* */ }
  const id = String(body?.pedido_id || "");
  if (!id) return json({ error: "pedido_id obrigatório" }, 400);

  const { data: ped } = await admin.from("bagy_pedidos").select("id, bagy_order_id, payload").eq("id", id).maybeSingle();
  if (!ped) return json({ error: "Pedido não encontrado" }, 404);

  const fresh = await get(`/orders/${encodeURIComponent(ped.bagy_order_id)}`);
  if (!fresh) return json({ error: "Bagy não retornou o pedido" }, 502);

  let tags: any = fresh.tags ?? null;
  if (!tags || (Array.isArray(tags) && tags.length === 0)) {
    const t = await get(`/orders/${encodeURIComponent(ped.bagy_order_id)}/tags`);
    if (t) tags = Array.isArray(t) ? t : (t.data ?? t.tags ?? null);
  }
  const payload = { ...(ped.payload as any || {}), ...fresh, tags };
  const { error } = await admin.from("bagy_pedidos").update({ payload }).eq("id", id);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, payload });
});
