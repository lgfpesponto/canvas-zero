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
    const pfxRaw = (Deno.env.get("NFE_CERT_PFX_BASE64") ?? "").replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
    if (!pfxRaw) return json({ error: "Certificado digital ainda não configurado" }, 412);
    const senha = Deno.env.get("NFE_CERT_SENHA") ?? "";
    // Certificados antigos (RC2/3DES) são recusados pelo OpenSSL 3 do proxy:
    // regrava o PFX com criptografia moderna (AES-256) antes de enviar.
    let pfx = pfxRaw;
    let keyPem = "";
    let certPem = "";
    try {
      const forge = (await import("npm:node-forge@1.3.1")).default;
      const der = forge.util.decode64(pfxRaw);
      const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(der), senha);
      const certs: any[] = [];
      let key: any = null;
      for (const sc of p12.safeContents) for (const bag of sc.safeBags) {
        if (bag.cert) certs.push(bag.cert);
        if (bag.key) key = bag.key;
      }
      if (!key || !certs.length) return json({ error: "Certificado inválido: chave ou certificado ausente no arquivo" }, 422);
      // Certificado do emitente = o que corresponde à chave privada (o arquivo pode trazer a cadeia).
      const leaf = certs.find((c) => c.publicKey?.n && key.n && c.publicKey.n.equals(key.n)) ?? certs[0];
      keyPem = forge.pki.privateKeyToPem(key);
      certPem = forge.pki.certificateToPem(leaf);
      const novo = forge.pkcs12.toPkcs12Asn1(key, certs, senha, { algorithm: "aes256", generateLocalKeyId: true, friendlyName: "nfe" });
      pfx = forge.util.encode64(forge.asn1.toDer(novo).getBytes());
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      const senhaErrada = /mac|password|invalid/i.test(m);
      return json({ error: senhaErrada ? "Senha do certificado incorreta ou arquivo corrompido" : "Não foi possível ler o certificado digital", detalhe: m }, 422);
    }

    // O proxy exige o XML da NF-e já assinado (XML-DSig enveloped, RSA-SHA1, C14N) no campo xmlAssinado.
    let extra: Record<string, unknown> = {};
    if (acao === "autorizar") {
      const xml = String((payload as any).xmlAssinado ?? (payload as any).xml ?? "");
      if (!xml) return json({ error: "XML da nota não informado" }, 400);
      try {
        extra = { xmlAssinado: await assinarNfe(xml, keyPem, certPem) };
      } catch (e) {
        return json({ error: "Não foi possível assinar o XML da nota", detalhe: e instanceof Error ? e.message : String(e) }, 422);
      }
    }

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
        ...extra,
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

async function assinarNfe(xml: string, keyPem: string, certPem: string): Promise<string> {
  const { SignedXml } = await import("npm:xml-crypto@6.0.1");
  const limpo = xml.replace(/^\s*<\?xml[^>]*\?>\s*/, "");
  const xpath = "//*[local-name(.)='infNFe']";
  const sig = new SignedXml({
    privateKey: keyPem,
    publicCert: certPem,
    signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
    canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
  });
  sig.addReference({
    xpath,
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    ],
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
  });
  sig.computeSignature(limpo, { location: { reference: xpath, action: "after" } });
  return sig.getSignedXml();
}
