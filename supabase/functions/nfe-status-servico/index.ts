// Consulta status do serviço SEFAZ (nfeStatusServico4) — Fase 1: teste de rede.
// mTLS real com certificado A1 será adicionado na Fase 2.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STATUS_URLS: Record<string, { 1: string; 2: string }> = {
  SP: {
    1: "https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx",
    2: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx",
  },
  SVCAN: {
    1: "https://www.svc.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx",
    2: "https://hom.svc.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx",
  },
};

function ufToCodigo(uf: string): string {
  const map: Record<string, string> = {
    AC: "12", AL: "27", AM: "13", AP: "16", BA: "29", CE: "23", DF: "53",
    ES: "32", GO: "52", MA: "21", MG: "31", MS: "50", MT: "51", PA: "15",
    PB: "25", PE: "26", PI: "22", PR: "41", RJ: "33", RN: "24", RO: "11",
    RR: "14", RS: "43", SC: "42", SE: "28", SP: "35", TO: "17",
  };
  return map[uf] ?? "35";
}

function buildSoapEnvelope(uf: string, ambiente: 1 | 2) {
  const cUF = ufToCodigo(uf);
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4">
      <consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <tpAmb>${ambiente}</tpAmb>
        <cUF>${cUF}</cUF>
        <xServ>STATUS</xServ>
      </consStatServ>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // RLS já restringe nfe_config a quem tem has_nfe_access; se vier vazio, o usuário não tem acesso ou não configurou
    const { data: config } = await supabase.from("nfe_config").select("*").maybeSingle();
    if (!config) {
      return new Response(JSON.stringify({ error: "Configure os dados do emitente antes de testar a conexão (ou você não tem permissão)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uf = (config.uf || "SP").toUpperCase();
    const ambiente = (config.ambiente === 1 ? 1 : 2) as 1 | 2;
    const url = STATUS_URLS[uf]?.[ambiente] ?? STATUS_URLS.SP[ambiente];
    const envelope = buildSoapEnvelope(uf, ambiente);

    let networkOk = false;
    let httpStatus: number | null = null;
    let responseText = "";
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/soap+xml; charset=utf-8",
          "SOAPAction": "http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4/nfeStatusServicoNF",
        },
        body: envelope,
      });
      httpStatus = resp.status;
      responseText = (await resp.text()).slice(0, 2000);
      networkOk = true;
    } catch (e) {
      responseText = String(e);
    }

    return new Response(JSON.stringify({
      ok: networkOk,
      uf, ambiente,
      endpoint: url,
      http_status: httpStatus,
      preview: responseText,
      certificado_configurado: !!config.certificado_path,
      aviso: !config.certificado_path
        ? "Certificado A1 não enviado. SEFAZ exige mTLS — esta resposta é apenas teste de rede."
        : "Certificado detectado. A assinatura/handshake mTLS será aplicada na Fase 2 (emissão).",
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
