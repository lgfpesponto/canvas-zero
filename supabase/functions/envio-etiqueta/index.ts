// Gera etiqueta de envio (Correios contrato / Melhor Envio) ou marca retirada no showroom.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Códigos de serviço do contrato Correios
const CORREIOS: Record<string, string> = { PAC: "03298", SEDEX: "03220", MINI: "03220" };
const CWS = "https://api.correios.com.br";
const ME = "https://www.melhorenvio.com.br/api/v2";

const Body = z.object({
  acao: z.enum(["gerar", "cotar", "salvar_servico", "saldo_me", "pix_me", "carrinho_me"]),
  bagyPedidoId: z.string().uuid().optional(),
  valor: z.number().min(1).max(20000).optional(),
  servico: z.string().max(60).optional(), // PAC | SEDEX | MINI | RETIRADA | ME:<id>
  peso: z.number().positive().max(30).optional(), // kg
  altura: z.number().positive().max(150).optional(),
  largura: z.number().positive().max(150).optional(),
  comprimento: z.number().positive().max(150).optional(),
});

const dig = (s: unknown) => String(s ?? "").replace(/\D/g, "");

export function detectarServico(metodo: string | null | undefined): string {
  const m = String(metodo ?? "").toLowerCase();
  if (/retir|showroom|loja/.test(m)) return "RETIRADA";
  if (/sedex/.test(m)) return "SEDEX";
  if (/mini/.test(m)) return "MINI";
  if (/pac/.test(m)) return "PAC";
  if (/jadlog|azul|loggi|latam|j&t|jet|buslog|melhor/.test(m)) {
    const id = m.match(/^\s*(\d{1,3})\s*-/)?.[1];
    if (id) return `ME:${id}`;
    for (const [re, sid] of [[/loggi/, 31], [/j&t|\bjet\b/, 33], [/jadlog.*\.?com\b/, 4], [/jadlog/, 3], [/azul/, 15], [/latam/, 12], [/buslog/, 22]] as [RegExp, number][]) if (re.test(m)) return `ME:${sid}`;
    return "ME";
  }
  return "PAC";
}

async function correiosToken() {
  const u = Deno.env.get("CORREIOS_USUARIO"), c = Deno.env.get("CORREIOS_CODIGO_ACESSO"), cartao = Deno.env.get("CORREIOS_CARTAO_POSTAGEM");
  if (!u || !c || !cartao) throw new Error("Contrato Correios não configurado");
  const r = await fetch(`${CWS}/token/v1/autentica/cartaopostagem`, {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(`${u}:${c}`), "Content-Type": "application/json" },
    body: JSON.stringify({ numero: cartao }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.token) throw new Error("Correios recusou o acesso: " + (j.msgs?.join(" ") || r.status));
  return j.token as string;
}

function endCorreios(e: any) {
  return {
    cep: dig(e.cep), logradouro: e.logradouro || "", numero: e.numero || "S/N",
    complemento: e.complemento || "", bairro: e.bairro || "", cidade: e.cidade || "", uf: e.uf || "",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);
    const sbUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await sbUser.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Não autenticado" }, 401);
    const { data: ok } = await sbUser.rpc("has_nfe_access", { _user_id: u.user.id });
    if (!ok) return json({ error: "Sem permissão" }, 403);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const b = parsed.data;

    if (b.acao === "saldo_me") {
      const tk = Deno.env.get("MELHOR_ENVIO_TOKEN");
      if (!tk) return json({ error: "Token do Melhor Envio não configurado" }, 412);
      const r = await fetch(`${ME}/me/balance`, { headers: { Authorization: `Bearer ${tk}`, Accept: "application/json", "User-Agent": "Portal 7Estrivos (contato@7estrivos.com.br)" } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return json({ error: "Melhor Envio: " + (j.message || r.status) }, 502);
      return json({ saldo: Number(j.balance ?? 0), reservado: Number(j.reserved ?? 0) });
    }
    if (b.acao === "carrinho_me") {
      // Valor real do carrinho calculado pelo próprio Melhor Envio + saldo da carteira.
      const tk = Deno.env.get("MELHOR_ENVIO_TOKEN");
      if (!tk) return json({ error: "Token do Melhor Envio não configurado" }, 412);
      const h = { Authorization: `Bearer ${tk}`, Accept: "application/json", "User-Agent": "Portal 7Estrivos (contato@7estrivos.com.br)" };
      const [rc, rb] = await Promise.all([fetch(`${ME}/me/cart`, { headers: h }), fetch(`${ME}/me/balance`, { headers: h })]);
      const cj: any = await rc.json().catch(() => ({}));
      const bj: any = await rb.json().catch(() => ({}));
      if (!rc.ok) return json({ error: "Melhor Envio (carrinho): " + (cj.message || rc.status) }, 502);
      const itens: any[] = Array.isArray(cj) ? cj : (cj.data ?? []);
      const total = itens.reduce((s, i) => s + (Number(i.price) || 0), 0);
      const saldo = Number(bj.balance ?? 0);
      return json({ total: Math.round(total * 100) / 100, qtd: itens.length, saldo, falta: Math.max(0, Math.round((total - saldo) * 100) / 100) });
    }
    if (b.acao === "pix_me") {
      const tk = Deno.env.get("MELHOR_ENVIO_TOKEN");
      if (!tk) return json({ error: "Token do Melhor Envio não configurado" }, 412);
      if (!b.valor) return json({ error: "Informe o valor" }, 400);
      const r = await fetch(`${ME}/me/balance`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tk}`, Accept: "application/json", "Content-Type": "application/json", "User-Agent": "Portal 7Estrivos (contato@7estrivos.com.br)" },
        body: JSON.stringify({ gateway: "yapay-transparente", slug: "pix", value: Number(b.valor.toFixed(2)) }),
      });
      const j: any = await r.json().catch(() => ({}));
      if (!r.ok) return json({ error: "Melhor Envio (Pix): " + (j.message || JSON.stringify(j.errors || j).slice(0, 300)) }, 502);
      // Procura o código copia-e-cola, imagem do QR e link em qualquer nível da resposta.
      let copia = "", imagem = "", link = "";
      const walk = (o: any) => {
        if (!o || typeof o !== "object") return;
        for (const [k, v] of Object.entries(o)) {
          if (typeof v === "string") {
            if (!copia && v.startsWith("000201")) copia = v;
            else if (!imagem && (v.startsWith("data:image") || (/qr/i.test(k) && /^https?:.*\.(png|jpe?g|svg)/i.test(v)))) imagem = v;
            else if (!link && /^https?:\/\//.test(v)) link = v;
          } else walk(v);
        }
      };
      walk(j);
      return json({ copia, imagem, link, id: j.id ?? j.transaction?.id ?? null });
    }
    if (!b.bagyPedidoId) return json({ error: "bagyPedidoId obrigatório" }, 400);

    const { data: ped } = await sb.from("bagy_pedidos").select("*").eq("id", b.bagyPedidoId).maybeSingle();
    if (!ped) return json({ error: "Pedido não encontrado" }, 404);
    const salvoSvc = b.servico || ped.envio_servico;
    const detSvc = detectarServico(ped.metodo_envio);
    const servico = !salvoSvc ? detSvc : (salvoSvc === "ME" && detSvc.startsWith("ME:") ? detSvc : salvoSvc);

    if (b.acao === "salvar_servico") {
      await sb.from("bagy_pedidos").update({ envio_servico: servico }).eq("id", ped.id);
      return json({ ok: true, servico });
    }

    const { data: cfg } = await sb.from("nfe_config").select("*").order("created_at").limit(1).maybeSingle();
    if (!cfg) return json({ error: "Configure os dados da empresa em Configurações NF-e" }, 412);
    const { data: nota } = await sb.from("nfe_notas").select("numero,chave_acesso,valor_total,status")
      .eq("bagy_pedido_id", ped.id).eq("tipo_nota", "normal").eq("status", "autorizada")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    const e = ped.endereco || {};
    const dest = {
      nome: ped.cliente_nome || "", doc: dig(ped.cliente_doc), email: ped.cliente_email || "",
      fone: dig(ped.cliente_whats), cep: dig(e.cep || e.zipcode), logradouro: e.logradouro || e.street || e.rua || "",
      numero: String(e.numero || e.number || "S/N"), complemento: e.complemento || e.complement || e.detail || "",
      bairro: e.bairro || e.district || e.neighborhood || "", cidade: e.cidade || e.city || "", uf: e.uf || e.state || "",
    };
    if (dest.cep.length !== 8) return json({ error: "CEP do cliente inválido. Corrija em Editar pedido." }, 422);
    const peso = b.peso ?? 2, alt = b.altura ?? 15, larg = b.largura ?? 30, comp = b.comprimento ?? 35;
    const valor = Number(nota?.valor_total ?? ped.total ?? 0);

    if (servico === "RETIRADA") {
      await sb.from("bagy_pedidos").update({ envio_servico: "RETIRADA", envio_provider: "retirada" }).eq("id", ped.id);
      return json({ ok: true, servico, mensagem: "Retirada no showroom — sem etiqueta de transporte." });
    }

    const meToken = Deno.env.get("MELHOR_ENVIO_TOKEN");
    const meHeaders = { Authorization: `Bearer ${meToken}`, Accept: "application/json", "Content-Type": "application/json", "User-Agent": "Portal 7Estrivos (contato@7estrivos.com.br)" };

    if (b.acao === "cotar") {
      if (!meToken) return json({ error: "Token do Melhor Envio não configurado" }, 412);
      const r = await fetch(`${ME}/me/shipment/calculate`, {
        method: "POST", headers: meHeaders,
        body: JSON.stringify({ from: { postal_code: dig(cfg.cep) }, to: { postal_code: dest.cep },
          volumes: [{ height: alt, width: larg, length: comp, weight: peso }], options: { insurance_value: valor } }),
      });
      const j = await r.json().catch(() => []);
      if (!r.ok) return json({ error: "Melhor Envio: " + (j.message || r.status) }, 502);
      return json({ opcoes: (j as any[]).filter((o) => !o.error).map((o) => ({ id: o.id, nome: `${o.company?.name} ${o.name}`, preco: o.price, prazo: o.delivery_time })) });
    }

    // ===== gerar =====
    if (ped.etiqueta_path) return json({ error: "Este pedido já tem etiqueta gerada." }, 409);
    let pdf: Uint8Array; let rastreio = ""; let providerId = ""; let provider = "";

    if (CORREIOS[servico]) {
      provider = "correios";
      const token = await correiosToken();
      const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      // Telefone: remove +55; 11 dígitos = celular (DDD + 9), 10 = fixo (DDD + 8).
      const fone = (raw: unknown) => {
        let d = dig(raw);
        if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
        if (d.length === 11) return { dddCelular: d.slice(0, 2), celular: d.slice(2) };
        if (d.length === 10) return { dddTelefone: d.slice(0, 2), telefone: d.slice(2) };
        return {};
      };
      const body: Record<string, unknown> = {
        remetente: { nome: cfg.razao_social, cpfCnpj: dig(cfg.cnpj), email: cfg.email || "", ...fone(cfg.telefone),
          endereco: endCorreios({ ...cfg, cidade: cfg.municipio }) },
        destinatario: { nome: dest.nome, cpfCnpj: dest.doc, email: dest.email, ...fone(dest.fone), endereco: endCorreios(dest) },
        codigoServico: CORREIOS[servico],
        pesoInformado: String(Math.round(peso * 1000)),
        codigoFormatoObjetoInformado: "2",
        alturaInformada: String(alt), larguraInformada: String(larg), comprimentoInformado: String(comp),
        cienteObjetoNaoProibido: 1,
        modalidadePagamento: "2",
      };
      if (nota?.chave_acesso) { body.numeroNotaFiscal = String(nota.numero); body.chaveNFe = nota.chave_acesso; }
      // Correios exigem a declaração de conteúdo mesmo com NF-e (desde 15/09/2025).
      const { data: itens } = await sb.from("bagy_pedido_itens").select("*").eq("pedido_id", ped.id);
      const decl = (itens || []).map((i: any) => ({
        conteudo: String(i.nome_produto || "Mercadoria").slice(0, 80).padEnd(5, "."),
        quantidade: String(Math.max(1, Math.round(Number(i.quantidade) || 1))),
        valor: (Number(i.preco_unit ?? 0) || 0).toFixed(2),
      }));
      body.itensDeclaracaoConteudo = decl.length ? decl : [{ conteudo: "Mercadoria", quantidade: "1", valor: valor.toFixed(2) }];
      const r = await fetch(`${CWS}/prepostagem/v1/prepostagens`, { method: "POST", headers: h, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.id) return json({ error: "Correios: " + (j.msgs?.join(" ") || JSON.stringify(j).slice(0, 300)) }, 502);
      providerId = j.id; rastreio = j.codigoObjeto || "";
      const r2 = await fetch(`${CWS}/prepostagem/v1/prepostagens/rotulo/assincrono/pdf`, {
        method: "POST", headers: h, body: JSON.stringify({ idsPrePostagem: [j.id], tipoRotulo: "P", formatoRotulo: "ET", layoutImpressao: "PADRAO" }),
      });
      const j2 = await r2.json().catch(() => ({}));
      if (!r2.ok || !j2.idRecibo) return json({ error: "Correios (rótulo): " + (j2.msgs?.join(" ") || r2.status), rastreio }, 502);
      let dados = "";
      for (let i = 0; i < 10 && !dados; i++) {
        await new Promise((s) => setTimeout(s, 1500));
        const r3 = await fetch(`${CWS}/prepostagem/v1/prepostagens/rotulo/download/assincrono/${j2.idRecibo}`, { headers: h });
        const j3 = await r3.json().catch(() => ({}));
        if (r3.ok && j3.dados) dados = j3.dados;
      }
      if (!dados) return json({ error: "Correios demorou para gerar o rótulo. Tente de novo em instantes.", rastreio }, 504);
      pdf = Uint8Array.from(atob(dados), (c) => c.charCodeAt(0));
    } else {
      provider = "melhorenvio";
      if (!meToken) return json({ error: "Token do Melhor Envio não configurado" }, 412);
      const svcId = Number(servico.replace(/^ME:?/, "")) || 0;
      if (!svcId) return json({ error: "Escolha a transportadora do Melhor Envio (cotar primeiro)." }, 422);
      // Reaproveita o item que já está no carrinho (tentativa anterior sem saldo) em vez de duplicar.
      let cartId = "";
      if (ped.envio_provider === "melhorenvio" && ped.envio_provider_id) {
        const ck = await fetch(`${ME}/me/orders/${ped.envio_provider_id}`, { headers: meHeaders });
        const oj: any = await ck.json().catch(() => ({}));
        if (ck.ok && oj?.id && !["canceled", "cancelled"].includes(String(oj.status))) cartId = oj.id;
      }
      if (!cartId) {
      const cart = await fetch(`${ME}/me/cart`, {
        method: "POST", headers: meHeaders,
        body: JSON.stringify({
          service: svcId,
          from: { name: cfg.razao_social, phone: dig(cfg.telefone), email: cfg.email, company_document: dig(cfg.cnpj), state_register: dig(cfg.inscricao_estadual),
            address: cfg.logradouro, number: cfg.numero, complement: cfg.complemento, district: cfg.bairro, city: cfg.municipio, state_abbr: cfg.uf, postal_code: dig(cfg.cep), country_id: "BR" },
          to: { name: dest.nome, phone: dest.fone, email: dest.email, ...(dest.doc.length === 14 ? { company_document: dest.doc } : { document: dest.doc }),
            address: dest.logradouro, number: dest.numero, complement: dest.complemento, district: dest.bairro, city: dest.cidade, state_abbr: dest.uf, postal_code: dest.cep, country_id: "BR" },
          products: [{ name: "Mercadoria", quantity: 1, unitary_value: valor }],
          volumes: [{ height: alt, width: larg, length: comp, weight: peso }],
          options: { insurance_value: valor, receipt: false, own_hand: false, non_commercial: !nota?.chave_acesso, ...(nota?.chave_acesso ? { invoice: { key: nota.chave_acesso } } : {}) },
        }),
      });
      const cj = await cart.json().catch(() => ({}));
      if (!cart.ok || !cj.id) return json({ error: "Melhor Envio: " + (cj.message || JSON.stringify(cj.errors || cj).slice(0, 300)) }, 502);
      cartId = cj.id;
      await sb.from("bagy_pedidos").update({ envio_servico: servico, envio_provider: "melhorenvio", envio_provider_id: cartId }).eq("id", ped.id);
      }
      providerId = cartId;
      const oSt = await fetch(`${ME}/me/orders/${cartId}`, { headers: meHeaders }).then((r) => r.json()).catch(() => ({}));
      if (!["released", "generated", "posted", "paid"].includes(String(oSt?.status))) {
        const co = await fetch(`${ME}/me/shipment/checkout`, { method: "POST", headers: meHeaders, body: JSON.stringify({ orders: [cartId] }) });
        if (!co.ok) {
          const x = await co.json().catch(() => ({}));
          return json({ error: `Melhor Envio: saldo insuficiente para pagar este frete (R$ ${Number(oSt?.price ?? 0).toFixed(2)}). Pague o carrinho via Pix e gere de novo. ${x.message || ""}`.trim() }, 402);
        }
      }
      if (!["generated", "posted"].includes(String(oSt?.status))) {
        await fetch(`${ME}/me/shipment/generate`, { method: "POST", headers: meHeaders, body: JSON.stringify({ orders: [cartId] }) });
      }
      // A geração é assíncrona: espera a etiqueta ficar pronta e baixa o PDF real (não a página HTML).
      const isPdf = (u8: Uint8Array) => u8.length > 4 && u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46;
      const authOnly = { Authorization: meHeaders.Authorization, "User-Agent": meHeaders["User-Agent"], Accept: "application/pdf" };
      let got: Uint8Array | null = null;
      for (let i = 0; i < 10 && !got; i++) {
        if (i) await new Promise((s) => setTimeout(s, 1500));
        for (const mode of ["private", "public"]) {
          const pr = await fetch(`${ME}/me/shipment/print`, { method: "POST", headers: meHeaders, body: JSON.stringify({ mode, orders: [cartId] }) });
          const pj = await pr.json().catch(() => ({}));
          if (!pr.ok || !pj.url) continue;
          const pf = await fetch(pj.url, { headers: authOnly });
          const u8 = new Uint8Array(await pf.arrayBuffer());
          if (isPdf(u8)) { got = u8; break; }
        }
        if (!got) {
          const pf = await fetch(`${ME}/me/imprimir/pdf/${cartId}`, { headers: authOnly }).catch(() => null);
          if (pf?.ok) { const u8 = new Uint8Array(await pf.arrayBuffer()); if (isPdf(u8)) got = u8; }
        }
      }
      if (!got) return json({ error: "Frete pago, mas o Melhor Envio ainda está gerando a etiqueta. Clique em gerar de novo em instantes (não cobra de novo)." }, 504);
      pdf = got;
      // Rastreio pode demorar alguns segundos para a transportadora devolver.
      for (let i = 0; i < 5 && !rastreio; i++) {
        if (i) await new Promise((s) => setTimeout(s, 2000));
        const tr = await fetch(`${ME}/me/shipment/tracking`, { method: "POST", headers: meHeaders, body: JSON.stringify({ orders: [cartId] }) });
        const tj = await tr.json().catch(() => ({}));
        rastreio = tj?.[cartId]?.tracking || tj?.[cartId]?.melhorenvio_tracking || "";
        if (!rastreio) {
          const oj: any = await fetch(`${ME}/me/orders/${cartId}`, { headers: meHeaders }).then((r) => r.json()).catch(() => ({}));
          rastreio = oj?.tracking || oj?.self_tracking || "";
        }
      }
    }

    const path = `${ped.id}/${Date.now()}.pdf`;
    const up = await sb.storage.from("etiquetas-envio").upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (up.error) return json({ error: "Falha ao salvar etiqueta: " + up.error.message }, 500);
    await sb.from("bagy_pedidos").update({
      envio_servico: servico, envio_provider: provider, envio_provider_id: providerId, etiqueta_path: path,
      etiqueta_gerada_em: new Date().toISOString(),
      ...(rastreio ? { tracking_code: rastreio, tracking_url: provider === "correios" ? `https://rastreamento.correios.com.br/app/index.php?objeto=${rastreio}` : `https://melhorrastreio.com.br/rastreio/${rastreio}` } : {}),
    }).eq("id", ped.id);
    if (rastreio && ped.bagy_order_id) {
      // Bagy → "Despachado" com código e link de rastreio (fila processada a cada minuto).
      await sb.from("bagy_status_sync_queue").insert({
        bagy_order_id: ped.bagy_order_id, target_status: "shipped", tracking_code: rastreio,
        tracking_url: provider === "correios" ? `https://rastreamento.correios.com.br/app/index.php?objeto=${rastreio}` : `https://melhorrastreio.com.br/rastreio/${rastreio}`,
      });
    }
    return json({ ok: true, servico, rastreio, etiqueta_path: path });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
