// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BAGY_TOKEN = Deno.env.get("BAGY_API_TOKEN") || "";
const BAGY_BASE = (Deno.env.get("BAGY_API_BASE") || "https://api.dooca.store")
  .replace(/\/$/, "");

const MAX_TENTATIVAS = 5;
const BATCH = 20;

// Mapeia status interno -> status aceito pela Bagy/Dooca
function mapStatus(s: string): string {
  const m: Record<string, string> = {
    separated: "separated",
    production: "production",
    shipped: "shipped",
    delivered: "delivered",
    canceled: "canceled",
    cancelled: "canceled",
  };
  return m[s] || s;
}

async function pushOne(item: any): Promise<{ ok: boolean; erro?: string }> {
  if (!BAGY_TOKEN) return { ok: false, erro: "BAGY_API_TOKEN ausente" };
  const status = mapStatus(item.target_status);
  const body: any = { status };
  if (item.tracking_code) {
    body.tracking_code = item.tracking_code;
    body.tracking = item.tracking_code;
  }
  if (item.tracking_url) body.tracking_url = item.tracking_url;

  try {
    const url = `${BAGY_BASE}/orders/${encodeURIComponent(item.bagy_order_id)}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BAGY_TOKEN}`,
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, erro: `HTTP ${res.status}: ${t.slice(0, 400)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const { data: items, error } = await supabase
    .from("bagy_status_sync_queue")
    .select("*")
    .is("processado_em", null)
    .lt("tentativas", MAX_TENTATIVAS)
    .order("created_at", { ascending: true })
    .limit(BATCH);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let ok = 0;
  let fail = 0;
  for (const it of items || []) {
    const r = await pushOne(it);
    if (r.ok) {
      await supabase.from("bagy_status_sync_queue").update({
        processado_em: new Date().toISOString(),
        tentativas: (it.tentativas || 0) + 1,
        ultimo_erro: null,
      }).eq("id", it.id);
      ok++;
    } else {
      await supabase.from("bagy_status_sync_queue").update({
        tentativas: (it.tentativas || 0) + 1,
        ultimo_erro: r.erro || "erro",
      }).eq("id", it.id);
      fail++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, processed: ok, failed: fail, batch: items?.length ?? 0 }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
