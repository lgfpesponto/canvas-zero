import { supabase } from '@/integrations/supabase/client';
import { calcularChave } from './montarXmlNfe';
import { ncmPorDescricao } from './ncm';
import { chamar } from './proxyProvider';

const UF_COD: Record<string, string> = {
  AC: '12', AL: '27', AM: '13', AP: '16', BA: '29', CE: '23', DF: '53', ES: '32', GO: '52', MA: '21',
  MG: '31', MS: '50', MT: '51', PA: '15', PB: '25', PE: '26', PI: '22', PR: '41', RJ: '33', RN: '24',
  RO: '11', RR: '14', RS: '43', SC: '42', SE: '28', SP: '35', TO: '17',
};
const dig = (s: unknown) => String(s ?? '').replace(/\D/g, '');
const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').trim();
const n2 = (v: number) => v.toFixed(2);
const tag = (name: string, v: unknown) => (v === null || v === undefined || String(v).trim() === '' ? '' : `<${name}>${esc(v)}</${name}>`);
const r2 = (v: number) => Math.round(v * 100) / 100;

export interface ItemRascunho {
  codigo: string; descricao: string; ncm: string; cfop: string; unidade: string;
  quantidade: number; valorUnit: number; valorTotal: number; desconto: number; frete: number;
  csosn: string; origem: number;
}
export interface NotaRascunho {
  bagyPedidoId: string; numeroBagy: string; portalOrderId: string | null;
  emitente: any; destinatario: any; itens: ItemRascunho[];
  valorProdutos: number; desconto: number; frete: number; valorTotal: number;
  cfop: string; ambiente: number; erros: string[];
  notaExistente: any | null;
  /** Campos opcionais usados na emissão avulsa. */
  natOp?: string; finNFe?: number; indPres?: number; indFinal?: number; infCpl?: string; observacoes?: string;
  tPag?: string; modFrete?: number; seguro?: number; outras?: number; bagyPedidoIdNull?: boolean;
}

/** Monta os rascunhos das notas (sem reservar número nem falar com a SEFAZ). */
export async function prepararNotasBagy(pedidoIds: string[], portalIdPorBagy: Record<string, string | null>): Promise<NotaRascunho[]> {
  const [{ data: cfg }, { data: peds }, { data: itens }, { data: refs }, { data: notas }] = await Promise.all([
    supabase.from('nfe_config').select('*').order('created_at').limit(1).maybeSingle(),
    supabase.from('bagy_pedidos').select('*').in('id', pedidoIds),
    supabase.from('bagy_pedido_itens').select('*').in('pedido_id', pedidoIds).order('created_at'),
    supabase.from('nfe_tributacao_referencias').select('*'),
    supabase.from('nfe_notas').select('*').in('bagy_pedido_id', pedidoIds).order('created_at', { ascending: false }),
  ]);
  const refPor = (nome: string) => (refs ?? []).find((r: any) => String(r.referencia).toUpperCase() === nome) as any;
  const ambiente = Number(cfg?.ambiente ?? 2);

  return pedidoIds.map((id) => {
    const p: any = (peds ?? []).find((x: any) => x.id === id);
    const erros: string[] = [];
    if (!cfg) erros.push('Emitente não configurado (Configurações NF-e).');
    else {
      if (dig(cfg.cnpj).length !== 14) erros.push('CNPJ do emitente inválido.');
      if (!dig(cfg.inscricao_estadual)) erros.push('Inscrição Estadual do emitente não preenchida.');
      if (dig(cfg.cod_municipio).length !== 7) erros.push('Código IBGE do município do emitente inválido.');
    }
    if (!p) return { bagyPedidoId: id, numeroBagy: '?', portalOrderId: null, emitente: cfg, destinatario: {}, itens: [], valorProdutos: 0, desconto: 0, frete: 0, valorTotal: 0, cfop: '', ambiente, erros: ['Pedido Bagy não encontrado.'], notaExistente: null };

    const cust = p.payload?.customer ?? {};
    const end = p.endereco ?? {};
    const doc = dig(p.cliente_doc || cust.doc || cust.cgc || cust.cpf || cust.cnpj);
    const ie = dig(cust.ie);
    const ind_ie_dest = doc.length === 14 && ie ? 1 : 9;
    const uf = String(end.state ?? '').toUpperCase();
    const destinatario = {
      nome: String(cust.name || p.cliente_nome || end.receiver || '').trim(),
      cpf_cnpj: doc, inscricao_estadual: ie || null, ind_ie_dest,
      email: p.cliente_email || cust.email || null, telefone: dig(p.cliente_whats || cust.phone) || null,
      logradouro: end.street ?? '', numero: end.number ?? 'S/N', complemento: end.detail ?? null,
      bairro: end.district ?? '', cep: dig(end.zipcode), cod_municipio: dig(end.city_ibge_id), municipio: end.city ?? '', uf,
    };
    if (!destinatario.nome) erros.push('Cliente sem nome.');
    if (![11, 14].includes(doc.length)) erros.push('Cliente sem CPF/CNPJ válido na Bagy.');
    if (!destinatario.logradouro) erros.push('Endereço do cliente sem rua.');
    if (!destinatario.bairro) erros.push('Endereço do cliente sem bairro.');
    if (destinatario.cep.length !== 8) erros.push('CEP do cliente inválido.');
    if (destinatario.cod_municipio.length !== 7) erros.push('Código IBGE da cidade do cliente ausente.');
    if (!UF_COD[uf]) erros.push('UF do cliente inválida.');

    const interno = cfg && uf === String(cfg.uf).toUpperCase();
    // PJ (CNPJ) → 5101/6101; PF (CPF) → 5107/6107. Brinde (R$ 0) → 5910/6910.
    const pj = doc.length === 14;
    const cfop = interno ? (pj ? '5101' : '5107') : (pj ? '6101' : '6107');
    const cfopBrinde = interno ? '5910' : '6910';

    const lista = (itens ?? []).filter((i: any) => i.pedido_id === id);
    if (!lista.length) erros.push('Pedido sem itens.');
    const base: ItemRascunho[] = lista.map((i: any, idx: number) => {
      const descricao = [i.nome_produto, i.variacao_nome || (i.tamanho ? `Tam ${i.tamanho}` : '')].filter(Boolean).join(' - ') || 'Produto';
      const regra = ncmPorDescricao(`${i.nome_produto ?? ''} ${i.variacao_nome ?? ''}`);
      const ncm = regra?.ncm || dig(i.ncm);
      const refNome = regra?.ref || 'EXTRAS';
      const ref = refPor(refNome) || (refs ?? []).find((r: any) => r.csosn);
      if (ncm.length !== 8) erros.push(`Item ${idx + 1} (${descricao}): NCM não identificado.`);
      const qtd = Math.max(1, Number(i.quantidade) || 1);
      const unit = Number(i.preco_unit || 0);
      const brinde = unit <= 0 || String(i.status ?? '').startsWith('brinde');
      return {
        codigo: i.sku || `RC-${p.numero_bagy}-${idx + 1}`, descricao: brinde && !/brinde/i.test(descricao) ? `${descricao} (BRINDE)` : descricao, ncm, cfop: brinde ? cfopBrinde : cfop,
        unidade: ref?.unidade_comercial || (refNome === 'BOTA' ? 'PAR' : 'UN'),
        quantidade: qtd, valorUnit: unit, valorTotal: r2(unit * qtd), desconto: 0, frete: 0,
        csosn: String(ref?.csosn || ref?.cst_icms || '102'), origem: Number(ref?.origem_mercadoria ?? 0),
      };
    });
    const valorProdutos = r2(base.reduce((s, i) => s + i.valorTotal, 0));
    const desconto = Math.min(r2(Number(p.desconto || 0)), valorProdutos);
    const frete = r2(Number(p.frete || 0));
    // rateio proporcional (o resto vai no último item)
    let accD = 0, accF = 0;
    base.forEach((it, k) => {
      const last = k === base.length - 1;
      const share = valorProdutos > 0 ? it.valorTotal / valorProdutos : 0;
      it.desconto = last ? r2(desconto - accD) : r2(desconto * share);
      it.frete = last ? r2(frete - accF) : r2(frete * share);
      accD += it.desconto; accF += it.frete;
    });
    const valorTotal = r2(valorProdutos - desconto + frete);
    if (valorTotal <= 0) erros.push('Nota sem valor.');
    const notaExistente = (notas ?? []).find((n: any) => n.bagy_pedido_id === id && n.status !== 'rejeitada' && n.status !== 'erro') ?? null;
    if (notaExistente?.status === 'autorizada') erros.push(`Já existe NF-e autorizada (nº ${notaExistente.numero}) para este pedido.`);

    return {
      bagyPedidoId: id, numeroBagy: p.numero_bagy, portalOrderId: portalIdPorBagy[id] ?? null,
      emitente: cfg, destinatario, itens: base, valorProdutos, desconto, frete, valorTotal, cfop, ambiente,
      erros: [...new Set(erros)], notaExistente,
    };
  });
}

function montarXml(r: NotaRascunho, numero: number, serie: number, ambiente: number) {
  const cfg = r.emitente, dest = r.destinatario;
  const agora = new Date();
  const cNF = String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
  const chave = calcularChave({ uf: cfg.uf, data: agora, cnpj: cfg.cnpj, modelo: 55, serie, numero, tpEmis: 1, cNF });
  const dhEmi = new Date(agora.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 19) + '-03:00';
  const interno = dest.uf === String(cfg.uf).toUpperCase();
  const homolog = ambiente === 2;
  const nomeDest = homolog ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL' : dest.nome;
  const doc = dig(dest.cpf_cnpj);

  const dets = r.itens.map((it, k) => {
    const icms = it.csosn === '101'
      ? `<ICMSSN101><orig>${it.origem}</orig><CSOSN>101</CSOSN><pCredSN>0.00</pCredSN><vCredICMSSN>0.00</vCredICMSSN></ICMSSN101>`
      : `<ICMSSN102><orig>${it.origem}</orig><CSOSN>${esc(it.csosn)}</CSOSN></ICMSSN102>`;
    return `<det nItem="${k + 1}"><prod><cProd>${esc(it.codigo)}</cProd><cEAN>SEM GTIN</cEAN><xProd>${esc(it.descricao)}</xProd>` +
      `<NCM>${it.ncm}</NCM><CFOP>${it.cfop}</CFOP><uCom>${esc(it.unidade)}</uCom><qCom>${it.quantidade.toFixed(4)}</qCom>` +
      `<vUnCom>${it.valorUnit.toFixed(10)}</vUnCom><vProd>${n2(it.valorTotal)}</vProd><cEANTrib>SEM GTIN</cEANTrib><uTrib>${esc(it.unidade)}</uTrib>` +
      `<qTrib>${it.quantidade.toFixed(4)}</qTrib><vUnTrib>${it.valorUnit.toFixed(10)}</vUnTrib>` +
      (it.frete > 0 ? `<vFrete>${n2(it.frete)}</vFrete>` : '') + (it.desconto > 0 ? `<vDesc>${n2(it.desconto)}</vDesc>` : '') +
      `<indTot>1</indTot></prod>` +
      `<imposto><ICMS>${icms}</ICMS><PIS><PISOutr><CST>99</CST><vBC>0.00</vBC><pPIS>0.00</pPIS><vPIS>0.00</vPIS></PISOutr></PIS>` +
      `<COFINS><COFINSOutr><CST>99</CST><vBC>0.00</vBC><pCOFINS>0.00</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSOutr></COFINS></imposto></det>`;
  }).join('');

  const xml =
    `<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe versao="4.00" Id="NFe${chave}">` +
    `<ide><cUF>${UF_COD[cfg.uf]}</cUF><cNF>${cNF}</cNF><natOp>${esc(r.natOp || 'VENDA DE MERCADORIA')}</natOp><mod>55</mod>` +
    `<serie>${serie}</serie><nNF>${numero}</nNF><dhEmi>${dhEmi}</dhEmi><tpNF>1</tpNF><idDest>${interno ? 1 : 2}</idDest>` +
    `<cMunFG>${dig(cfg.cod_municipio)}</cMunFG><tpImp>1</tpImp><tpEmis>1</tpEmis><cDV>${chave.slice(-1)}</cDV>` +
    `<tpAmb>${ambiente}</tpAmb><finNFe>${r.finNFe ?? 1}</finNFe><indFinal>${r.indFinal ?? (dest.ind_ie_dest === 9 ? 1 : 0)}</indFinal><indPres>${r.indPres ?? 2}</indPres>` +
    `<procEmi>0</procEmi><verProc>Portal7Estrivos 1.0</verProc></ide>` +
    `<emit><CNPJ>${dig(cfg.cnpj)}</CNPJ>${tag('xNome', cfg.razao_social)}${tag('xFant', cfg.nome_fantasia)}` +
    `<enderEmit>${tag('xLgr', cfg.logradouro)}${tag('nro', cfg.numero)}${tag('xCpl', cfg.complemento)}${tag('xBairro', cfg.bairro)}` +
    `<cMun>${dig(cfg.cod_municipio)}</cMun>${tag('xMun', cfg.municipio)}<UF>${cfg.uf}</UF><CEP>${dig(cfg.cep)}</CEP>` +
    `<cPais>1058</cPais><xPais>BRASIL</xPais>${tag('fone', dig(cfg.telefone))}</enderEmit>` +
    `<IE>${dig(cfg.inscricao_estadual)}</IE><CRT>${cfg.crt}</CRT></emit>` +
    `<dest>${doc.length === 14 ? `<CNPJ>${doc}</CNPJ>` : `<CPF>${doc}</CPF>`}${tag('xNome', nomeDest)}` +
    `<enderDest>${tag('xLgr', dest.logradouro)}${tag('nro', dest.numero)}${tag('xCpl', dest.complemento)}${tag('xBairro', dest.bairro)}` +
    `<cMun>${dest.cod_municipio}</cMun>${tag('xMun', dest.municipio)}<UF>${dest.uf}</UF><CEP>${dest.cep}</CEP>` +
    `<cPais>1058</cPais><xPais>BRASIL</xPais>${tag('fone', dest.telefone)}</enderDest>` +
    `<indIEDest>${dest.ind_ie_dest}</indIEDest>${dest.ind_ie_dest === 1 ? tag('IE', dest.inscricao_estadual) : ''}${tag('email', dest.email)}</dest>` +
    dets +
    `<total><ICMSTot><vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson><vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST>` +
    `<vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet><vProd>${n2(r.valorProdutos)}</vProd><vFrete>${n2(r.frete)}</vFrete><vSeg>${n2(r.seguro ?? 0)}</vSeg><vDesc>${n2(r.desconto)}</vDesc>` +
    `<vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>${n2(r.outras ?? 0)}</vOutro>` +
    `<vNF>${n2(r.valorTotal)}</vNF></ICMSTot></total>` +
    `<transp><modFrete>${r.modFrete ?? (r.frete > 0 ? 0 : 9)}</modFrete></transp>` +
    `<pag><detPag><indPag>0</indPag>${(r.tPag ?? '99') === '99' ? '<tPag>99</tPag><xPag>OUTROS</xPag>' : `<tPag>${r.tPag}</tPag>`}<vPag>${n2(r.valorTotal)}</vPag></detPag></pag>` +
    `<infAdic><infCpl>${esc(`${r.infCpl ? r.infCpl + ' ' : (r.numeroBagy ? `Pedido Bagy RC-${r.numeroBagy}. ` : '')}Documento emitido por ME ou EPP optante pelo Simples Nacional. Nao gera direito a credito fiscal de IPI.`)}</infCpl></infAdic>` +
    `</infNFe></NFe>`;
  return { xml, chave };
}

/** Reserva número, grava e transmite para a SEFAZ. */
export async function transmitirNotaBagy(r: NotaRascunho) {
  if (r.erros.length) throw new Error(r.erros.join('\n'));
  const { data: num, error: nErr } = await supabase.rpc('reservar_numero_nfe');
  if (nErr) throw new Error(nErr.message);
  const { numero, serie, ambiente } = num as { numero: number; serie: number; ambiente: number };
  const { xml, chave } = montarXml(r, numero, serie, ambiente);

  const { data: nota, error } = await supabase.from('nfe_notas').insert({
    pedido_id: r.portalOrderId, bagy_pedido_id: r.bagyPedidoId || null, numero, serie, modelo: 55, chave_acesso: chave, ambiente,
    status: 'processando', natureza_operacao: r.natOp || 'VENDA DE MERCADORIA', valor_produtos: r.valorProdutos, valor_total: r.valorTotal,
    destinatario_snapshot: r.destinatario, observacoes: r.observacoes ?? `Pedido Bagy RC-${r.numeroBagy}`,
  } as any).select().single();
  if (error) throw new Error(error.message);
  await supabase.from('nfe_itens').insert(r.itens.map((it, k) => ({
    nota_id: nota.id, ordem: k + 1, codigo: it.codigo, descricao: it.descricao, ncm: it.ncm, cfop: it.cfop, unidade: it.unidade,
    quantidade: it.quantidade, valor_unitario: it.valorUnit, valor_total: it.valorTotal, origem_mercadoria: it.origem,
    cst_icms: it.csosn, cst_pis: '99', cst_cofins: '99',
  })) as any);

  let resp;
  try { resp = await chamar('autorizar', { xml, chave }); }
  catch (e: any) {
    await supabase.from('nfe_notas').update({ status: 'erro', motivo_rejeicao: e.message } as any).eq('id', nota.id);
    throw e;
  }
  const cStat = String(resp.cStat ?? '');
  const autorizada = cStat === '100' || cStat === '150';
  const motivo = `${cStat} - ${resp.xMotivo ?? resp.error ?? 'Sem retorno'}`;
  await supabase.from('nfe_notas').update({
    status: autorizada ? 'autorizada' : 'rejeitada',
    protocolo: (resp.protocolo ?? resp.nProt ?? null) as any,
    data_autorizacao: autorizada ? new Date().toISOString() : null,
    motivo_rejeicao: autorizada ? null : motivo,
    xml_assinado: (resp.xml ?? null) as any, xml_autorizado: (resp.xmlAutorizado ?? null) as any,
  } as any).eq('id', nota.id);
  return { notaId: nota.id, numero, autorizada, motivo };
}

/** Emite NFe complementar (finNFe=3) vinculada a uma nota autorizada. */
export async function emitirComplementar(notaPaiId: string, valor: number, descricao: string) {
  const [{ data: pai }, { data: cfg }] = await Promise.all([
    supabase.from('nfe_notas').select('*').eq('id', notaPaiId).single(),
    supabase.from('nfe_config').select('*').order('created_at').limit(1).maybeSingle(),
  ]);
  if (!pai?.chave_acesso) throw new Error('Nota original sem chave de acesso.');
  if (pai.status !== 'autorizada') throw new Error('Só é possível complementar nota autorizada.');
  if (!cfg) throw new Error('Emitente não configurado.');
  const dest = pai.destinatario_snapshot as any;
  const { data: num, error: nErr } = await supabase.rpc('reservar_numero_nfe');
  if (nErr) throw new Error(nErr.message);
  const { numero, serie, ambiente } = num as { numero: number; serie: number; ambiente: number };

  const agora = new Date();
  const cNF = String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
  const chave = calcularChave({ uf: cfg.uf, data: agora, cnpj: cfg.cnpj, modelo: 55, serie, numero, tpEmis: 1, cNF });
  const dhEmi = new Date(agora.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 19) + '-03:00';
  const interno = String(dest.uf).toUpperCase() === String(cfg.uf).toUpperCase();
  const doc = dig(dest.cpf_cnpj);
  const homolog = ambiente === 2;
  const nomeDest = homolog ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL' : dest.nome;
  const ref = await supabase.from('nfe_tributacao_referencias').select('*').ilike('referencia', 'EXTRAS').maybeSingle();
  const csosn = String(ref.data?.csosn || ref.data?.cst_icms || '102');

  const xml =
    `<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe versao="4.00" Id="NFe${chave}">` +
    `<ide><cUF>${UF_COD[cfg.uf]}</cUF><cNF>${cNF}</cNF><natOp>COMPLEMENTO DE VALOR</natOp><mod>55</mod>` +
    `<serie>${serie}</serie><nNF>${numero}</nNF><dhEmi>${dhEmi}</dhEmi><tpNF>1</tpNF><idDest>${interno ? 1 : 2}</idDest>` +
    `<cMunFG>${dig(cfg.cod_municipio)}</cMunFG><tpImp>1</tpImp><tpEmis>1</tpEmis><cDV>${chave.slice(-1)}</cDV>` +
    `<tpAmb>${ambiente}</tpAmb><finNFe>3</finNFe><indFinal>${dest.ind_ie_dest === 9 ? 1 : 0}</indFinal><indPres>9</indPres>` +
    `<procEmi>0</procEmi><verProc>Portal7Estrivos 1.0</verProc></ide>` +
    `<emit><CNPJ>${dig(cfg.cnpj)}</CNPJ>${tag('xNome', cfg.razao_social)}${tag('xFant', cfg.nome_fantasia)}` +
    `<enderEmit>${tag('xLgr', cfg.logradouro)}${tag('nro', cfg.numero)}${tag('xCpl', cfg.complemento)}${tag('xBairro', cfg.bairro)}` +
    `<cMun>${dig(cfg.cod_municipio)}</cMun>${tag('xMun', cfg.municipio)}<UF>${cfg.uf}</UF><CEP>${dig(cfg.cep)}</CEP>` +
    `<cPais>1058</cPais><xPais>BRASIL</xPais>${tag('fone', dig(cfg.telefone))}</enderEmit>` +
    `<IE>${dig(cfg.inscricao_estadual)}</IE><CRT>${cfg.crt}</CRT></emit>` +
    `<dest>${doc.length === 14 ? `<CNPJ>${doc}</CNPJ>` : `<CPF>${doc}</CPF>`}${tag('xNome', nomeDest)}` +
    `<enderDest>${tag('xLgr', dest.logradouro)}${tag('nro', dest.numero)}${tag('xCpl', dest.complemento)}${tag('xBairro', dest.bairro)}` +
    `<cMun>${dig(dest.cod_municipio)}</cMun>${tag('xMun', dest.municipio)}<UF>${dest.uf}</UF><CEP>${dig(dest.cep)}</CEP>` +
    `<cPais>1058</cPais><xPais>BRASIL</xPais>${tag('fone', dig(dest.telefone))}</enderDest>` +
    `<indIEDest>${dest.ind_ie_dest}</indIEDest>${dest.ind_ie_dest === 1 ? tag('IE', dest.inscricao_estadual) : ''}${tag('email', dest.email)}</dest>` +
    `<det nItem="1"><prod><cProd>COMPLEMENTO</cProd><cEAN>SEM GTIN</cEAN><xProd>${esc(descricao)}</xProd>` +
    `<NCM>00000000</NCM><CFOP>${interno ? '5949' : '6949'}</CFOP><uCom>UN</uCom><qCom>1.0000</qCom>` +
    `<vUnCom>${valor.toFixed(10)}</vUnCom><vProd>${n2(valor)}</vProd><cEANTrib>SEM GTIN</cEANTrib><uTrib>UN</uTrib>` +
    `<qTrib>1.0000</qTrib><vUnTrib>${valor.toFixed(10)}</vUnTrib><indTot>1</indTot></prod>` +
    `<imposto><ICMS><ICMSSN102><orig>0</orig><CSOSN>${esc(csosn)}</CSOSN></ICMSSN102></ICMS>` +
    `<PIS><PISOutr><CST>99</CST><vBC>0.00</vBC><pPIS>0.00</pPIS><vPIS>0.00</vPIS></PISOutr></PIS>` +
    `<COFINS><COFINSOutr><CST>99</CST><vBC>0.00</vBC><pCOFINS>0.00</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSOutr></COFINS></imposto></det>` +
    `<total><ICMSTot><vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson><vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST>` +
    `<vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet><vProd>${n2(valor)}</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc>` +
    `<vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro>` +
    `<vNF>${n2(valor)}</vNF></ICMSTot></total>` +
    `<transp><modFrete>9</modFrete></transp>` +
    `<pag><detPag><indPag>0</indPag><tPag>99</tPag><xPag>OUTROS</xPag><vPag>${n2(valor)}</vPag></detPag></pag>` +
    `<infAdic><infCpl>${esc(`NFe complementar da NF-e ${pai.numero}/${pai.serie}.`)}</infCpl></infAdic>` +
    `</infNFe></NFe>`;

  const { data: nota, error } = await supabase.from('nfe_notas').insert({
    pedido_id: pai.pedido_id, bagy_pedido_id: pai.bagy_pedido_id, numero, serie, modelo: 55, chave_acesso: chave, ambiente,
    status: 'processando', natureza_operacao: 'COMPLEMENTO DE VALOR', valor_produtos: valor, valor_total: valor,
    destinatario_snapshot: dest, observacoes: `NFe complementar da NF-e ${pai.numero}/${pai.serie}`,
  } as any).select().single();
  if (error) throw new Error(error.message);
  await supabase.from('nfe_itens').insert({
    nota_id: nota.id, ordem: 1, codigo: 'COMPLEMENTO', descricao, ncm: '00000000', cfop: interno ? '5949' : '6949',
    unidade: 'UN', quantidade: 1, valor_unitario: valor, valor_total: valor, origem_mercadoria: 0,
    cst_icms: csosn, cst_pis: '99', cst_cofins: '99',
  } as any);

  let resp;
  try { resp = await chamar('autorizar', { xml, chave, refNFe: pai.chave_acesso }); }
  catch (e: any) {
    await supabase.from('nfe_notas').update({ status: 'erro', motivo_rejeicao: e.message } as any).eq('id', nota.id);
    throw e;
  }
  const cStat = String(resp.cStat ?? '');
  const autorizada = cStat === '100' || cStat === '150';
  const motivo = `${cStat} - ${resp.xMotivo ?? resp.error ?? 'Sem retorno'}`;
  await supabase.from('nfe_notas').update({
    status: autorizada ? 'autorizada' : 'rejeitada',
    protocolo: (resp.protocolo ?? resp.nProt ?? null) as any,
    data_autorizacao: autorizada ? new Date().toISOString() : null,
    motivo_rejeicao: autorizada ? null : motivo,
    xml_assinado: (resp.xml ?? null) as any, xml_autorizado: (resp.xmlAutorizado ?? null) as any,
  } as any).eq('id', nota.id);
  return { notaId: nota.id, numero, autorizada, motivo };
}

/** NF-e de devolução (entrada, finNFe=4) referenciando a nota original, com os itens selecionados. */
export async function emitirDevolucao(notaPaiId: string, itensDev: { itemId: string; quantidade: number }[], motivoDev: string) {
  const [{ data: pai }, { data: cfg }, { data: itensPai }] = await Promise.all([
    supabase.from('nfe_notas').select('*').eq('id', notaPaiId).single(),
    supabase.from('nfe_config').select('*').order('created_at').limit(1).maybeSingle(),
    supabase.from('nfe_itens').select('*').eq('nota_id', notaPaiId).order('ordem'),
  ]);
  if (!pai?.chave_acesso) throw new Error('Nota original sem chave de acesso.');
  if (pai.status !== 'autorizada') throw new Error('Só é possível devolver nota autorizada.');
  if (!cfg) throw new Error('Emitente não configurado.');
  const sel = itensDev.filter(i => i.quantidade > 0).map(i => {
    const it = (itensPai || []).find((x: any) => x.id === i.itemId) as any;
    if (!it) throw new Error('Item não encontrado.');
    if (i.quantidade > Number(it.quantidade)) throw new Error(`Quantidade maior que a vendida: ${it.descricao}`);
    return { ...it, qtd: i.quantidade, total: Math.round(i.quantidade * Number(it.valor_unitario) * 100) / 100 };
  });
  if (!sel.length) throw new Error('Selecione ao menos um item para devolver.');

  const dest = pai.destinatario_snapshot as any;
  const { data: num, error: nErr } = await supabase.rpc('reservar_numero_nfe');
  if (nErr) throw new Error(nErr.message);
  const { numero, serie, ambiente } = num as { numero: number; serie: number; ambiente: number };
  const agora = new Date();
  const cNF = String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
  const chave = calcularChave({ uf: cfg.uf, data: agora, cnpj: cfg.cnpj, modelo: 55, serie, numero, tpEmis: 1, cNF });
  const dhEmi = new Date(agora.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 19) + '-03:00';
  const interno = String(dest.uf).toUpperCase() === String(cfg.uf).toUpperCase();
  const cfop = interno ? '1202' : '2202';
  const doc = dig(dest.cpf_cnpj);
  const homolog = ambiente === 2;
  const nomeDest = homolog ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL' : dest.nome;
  const total = Math.round(sel.reduce((s, i) => s + i.total, 0) * 100) / 100;
  const natOp = 'DEVOLUCAO DE VENDA';

  const dets = sel.map((it, idx) =>
    `<det nItem="${idx + 1}"><prod><cProd>${esc(it.codigo || String(idx + 1))}</cProd><cEAN>SEM GTIN</cEAN><xProd>${esc(it.descricao)}</xProd>` +
    `<NCM>${dig(it.ncm) || '00000000'}</NCM><CFOP>${cfop}</CFOP><uCom>${esc(it.unidade || 'UN')}</uCom><qCom>${Number(it.qtd).toFixed(4)}</qCom>` +
    `<vUnCom>${Number(it.valor_unitario).toFixed(10)}</vUnCom><vProd>${n2(it.total)}</vProd><cEANTrib>SEM GTIN</cEANTrib><uTrib>${esc(it.unidade || 'UN')}</uTrib>` +
    `<qTrib>${Number(it.qtd).toFixed(4)}</qTrib><vUnTrib>${Number(it.valor_unitario).toFixed(10)}</vUnTrib><indTot>1</indTot></prod>` +
    `<imposto><ICMS><ICMSSN900><orig>${it.origem_mercadoria ?? 0}</orig><CSOSN>900</CSOSN></ICMSSN900></ICMS>` +
    `<PIS><PISOutr><CST>99</CST><vBC>0.00</vBC><pPIS>0.00</pPIS><vPIS>0.00</vPIS></PISOutr></PIS>` +
    `<COFINS><COFINSOutr><CST>99</CST><vBC>0.00</vBC><pCOFINS>0.00</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSOutr></COFINS></imposto></det>`
  ).join('');

  const xml =
    `<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe versao="4.00" Id="NFe${chave}">` +
    `<ide><cUF>${UF_COD[cfg.uf]}</cUF><cNF>${cNF}</cNF><natOp>${natOp}</natOp><mod>55</mod>` +
    `<serie>${serie}</serie><nNF>${numero}</nNF><dhEmi>${dhEmi}</dhEmi><tpNF>0</tpNF><idDest>${interno ? 1 : 2}</idDest>` +
    `<cMunFG>${dig(cfg.cod_municipio)}</cMunFG><tpImp>1</tpImp><tpEmis>1</tpEmis><cDV>${chave.slice(-1)}</cDV>` +
    `<tpAmb>${ambiente}</tpAmb><finNFe>4</finNFe><indFinal>${dest.ind_ie_dest === 9 ? 1 : 0}</indFinal><indPres>9</indPres>` +
    `<procEmi>0</procEmi><verProc>Portal7Estrivos 1.0</verProc><NFref><refNFe>${pai.chave_acesso}</refNFe></NFref></ide>` +
    `<emit><CNPJ>${dig(cfg.cnpj)}</CNPJ>${tag('xNome', cfg.razao_social)}${tag('xFant', cfg.nome_fantasia)}` +
    `<enderEmit>${tag('xLgr', cfg.logradouro)}${tag('nro', cfg.numero)}${tag('xCpl', cfg.complemento)}${tag('xBairro', cfg.bairro)}` +
    `<cMun>${dig(cfg.cod_municipio)}</cMun>${tag('xMun', cfg.municipio)}<UF>${cfg.uf}</UF><CEP>${dig(cfg.cep)}</CEP>` +
    `<cPais>1058</cPais><xPais>BRASIL</xPais>${tag('fone', dig(cfg.telefone))}</enderEmit>` +
    `<IE>${dig(cfg.inscricao_estadual)}</IE><CRT>${cfg.crt}</CRT></emit>` +
    `<dest>${doc.length === 14 ? `<CNPJ>${doc}</CNPJ>` : `<CPF>${doc}</CPF>`}${tag('xNome', nomeDest)}` +
    `<enderDest>${tag('xLgr', dest.logradouro)}${tag('nro', dest.numero)}${tag('xCpl', dest.complemento)}${tag('xBairro', dest.bairro)}` +
    `<cMun>${dig(dest.cod_municipio)}</cMun>${tag('xMun', dest.municipio)}<UF>${dest.uf}</UF><CEP>${dig(dest.cep)}</CEP>` +
    `<cPais>1058</cPais><xPais>BRASIL</xPais>${tag('fone', dig(dest.telefone))}</enderDest>` +
    `<indIEDest>${dest.ind_ie_dest}</indIEDest>${dest.ind_ie_dest === 1 ? tag('IE', dest.inscricao_estadual) : ''}${tag('email', dest.email)}</dest>` +
    dets +
    `<total><ICMSTot><vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson><vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST>` +
    `<vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet><vProd>${n2(total)}</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc>` +
    `<vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro>` +
    `<vNF>${n2(total)}</vNF></ICMSTot></total>` +
    `<transp><modFrete>9</modFrete></transp>` +
    `<pag><detPag><tPag>90</tPag><vPag>0.00</vPag></detPag></pag>` +
    `<infAdic><infCpl>${esc(`Devolucao referente a NF-e ${pai.numero}/${pai.serie}. Motivo: ${motivoDev}`)}</infCpl></infAdic>` +
    `</infNFe></NFe>`;

  const { data: nota, error } = await supabase.from('nfe_notas').insert({
    pedido_id: pai.pedido_id, bagy_pedido_id: pai.bagy_pedido_id, numero, serie, modelo: 55, chave_acesso: chave, ambiente,
    status: 'processando', natureza_operacao: natOp, valor_produtos: total, valor_total: total,
    destinatario_snapshot: dest, observacoes: `Devolução da NF-e ${pai.numero}/${pai.serie} — ${motivoDev}`,
  } as any).select().single();
  if (error) throw new Error(error.message);
  await supabase.from('nfe_itens').insert(sel.map((it, idx) => ({
    nota_id: nota.id, ordem: idx + 1, codigo: it.codigo, descricao: it.descricao, ncm: it.ncm, cfop,
    unidade: it.unidade || 'UN', quantidade: it.qtd, valor_unitario: it.valor_unitario, valor_total: it.total,
    origem_mercadoria: it.origem_mercadoria ?? 0, cst_icms: '900', cst_pis: '99', cst_cofins: '99',
  })) as any);

  let resp;
  try { resp = await chamar('autorizar', { xml, chave, refNFe: pai.chave_acesso }); }
  catch (e: any) {
    await supabase.from('nfe_notas').update({ status: 'erro', motivo_rejeicao: e.message } as any).eq('id', nota.id);
    throw e;
  }
  const cStat = String(resp.cStat ?? '');
  const autorizada = cStat === '100' || cStat === '150';
  const motivo = `${cStat} - ${resp.xMotivo ?? resp.error ?? 'Sem retorno'}`;
  await supabase.from('nfe_notas').update({
    status: autorizada ? 'autorizada' : 'rejeitada',
    protocolo: (resp.protocolo ?? resp.nProt ?? null) as any,
    data_autorizacao: autorizada ? new Date().toISOString() : null,
    motivo_rejeicao: autorizada ? null : motivo,
    xml_assinado: (resp.xml ?? null) as any, xml_autorizado: (resp.xmlAutorizado ?? null) as any,
  } as any).eq('id', nota.id);
  return { notaId: nota.id, numero, autorizada, motivo };
}
