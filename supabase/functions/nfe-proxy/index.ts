// Encaminha ações de NF-e (autorizar, evento, status) ao proxy Node externo,
// que assina o XML com o certificado A1 e fala com a SEFAZ.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({
  acao: z.enum(["autorizar", "evento", "status"]),
  payload: z.record(z.unknown()).default({}),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Não autenticado" }, 401);
    const { data: ok } = await sb.rpc("has_nfe_access", { _user_id: u.user.id });
    if (!ok) return json({ error: "Sem permissão para NF-e" }, 403);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { acao, payload } = parsed.data;

    const url = Deno.env.get("NFE_PROXY_URL");
    const token = Deno.env.get("NFE_PROXY_TOKEN");
    if (!url || !token) return json({ error: "Proxy NF-e ainda não configurado" }, 412);
    const pfx = Deno.env.get("NFE_CERT_PFX_BASE64");
    if (!pfx) return json({ error: "Certificado digital ainda não configurado" }, 412);
    const senha = Deno.env.get("NFE_CERT_SENHA") ?? "";

    const { data: cfg } = await sb.from("nfe_config").select("ambiente, uf").order("created_at").limit(1).maybeSingle();

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 55000);
    const res = await fetch(`${url.replace(/\/$/, "")}/${acao}`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        pfxBase64: pfx,
        senhaCertificado: senha,
        ambiente: cfg?.ambiente ?? 2,
        uf: cfg?.uf ?? "SP",
        ...payload,
      }),
    }).finally(() => clearTimeout(t));
    const text = await res.text();
    let body: unknown;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
    console.log(`nfe-proxy ${acao} -> ${res.status}`);
    return json(body, res.status);
  } catch (e) {
    const msg = e instanceof Error ? (e.name === "AbortError" ? "Proxy NF-e não respondeu a tempo" : e.message) : "Erro";
    return json({ error: msg }, 502);
  }
});
