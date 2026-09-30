import { supabase } from '@/integrations/supabase/client';
import { getOrderFinalValue } from '@/lib/order-logic';
import { ncmPorDescricao } from './ncm';

const UF_COD: Record<string, string> = {
  AC: '12', AL: '27', AM: '13', AP: '16', BA: '29', CE: '23', DF: '53', ES: '32', GO: '52', MA: '21',
  MG: '31', MS: '50', MT: '51', PA: '15', PB: '25', PE: '26', PI: '22', PR: '41', RJ: '33', RN: '24',
  RO: '11', RR: '14', RS: '43', SC: '42', SE: '28', SP: '35', TO: '17',
};

const dig = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');
const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').trim();
const n2 = (v: number) => v.toFixed(2);
const tag = (name: string, v: unknown) => (v === null || v === undefined || v === '' ? '' : `<${name}>${esc(v)}</${name}>`);

export function dvModulo11(base43: string): number {
  let peso = 2, soma = 0;
  for (let i = base43.length - 1; i >= 0; i--) {
    soma += Number(base43[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const r = soma % 11;
  return r < 2 ? 0 : 11 - r;
}

export function calcularChave(p: { uf: string; data: Date; cnpj: string; modelo: number; serie: number; numero: number; tpEmis: number; cNF: string }) {
  const aamm = String(p.data.getFullYear()).slice(2) + String(p.data.getMonth() + 1).padStart(2, '0');
  const base =
    UF_COD[p.uf] + aamm + dig(p.cnpj).padStart(14, '0') + String(p.modelo).padStart(2, '0') +
    String(p.serie).padStart(3, '0') + String(p.numero).padStart(9, '0') + String(p.tpEmis) + p.cNF.padStart(8, '0');
  return base + dvModulo11(base);
}

/** Qual referência tributária usar para o pedido. */
export function referenciaDoPedido(order: any): string {
  const t = String(order?.tipo_extra ?? '').toLowerCase();
  if (!t) return 'BOTA';
  if (t.includes('cinto')) return 'CINTO';
  if (t.includes('bota')) return 'BOTA';
  return 'EXTRAS';
}

function descricaoItem(order: any): string {
  if (order.nome_produto_estoque) return order.nome_produto_estoque;
  if (!order.tipo_extra) return `Bota ${order.modelo ?? ''} ${order.tamanho ? 'Tam ' + order.tamanho : ''}`.trim();
  return `${String(order.tipo_extra).replace(/_/g, ' ')}`.toUpperCase();
}

export interface MontagemResultado {
  xml: string;
  chave: string;
  numero: number;
  serie: number;
  ambiente: number;
  valorTotal: number;
  cfop: string;
  item: { codigo: string; descricao: string; ncm: string; cfop: string; quantidade: number; valorUnit: number; valorTotal: number; csosn: string; origem: number; unidade: string };
  destinatario: any;
}

/** Valida sem reservar número. Retorna lista de problemas. */
export async function validarEmissao(pedidoId: string, destinatarioId: string | null) {
  const erros: string[] = [];
  const [{ data: cfg }, { data: order }] = await Promise.all([
    supabase.from('nfe_config').select('*').order('created_at').limit(1).maybeSingle(),
    supabase.from('orders').select('*').eq('id', pedidoId).maybeSingle(),
  ]);
  if (!cfg) erros.push('Emitente não configurado (Configurações NF-e).');
  if (!order) erros.push('Pedido não encontrado.');
  if (!destinatarioId) erros.push('Escolha o destinatário da nota.');
  let ref: any = null;
  if (order) {
    const refNome = referenciaDoPedido(order);
    const { data } = await supabase.from('nfe_tributacao_referencias').select('*').ilike('referencia', refNome).maybeSingle();
    ref = data;
    const regra = ncmPorDescricao(`${descricaoItem(order)} ${order.tipo_extra ?? ''}`);
    if (ref && regra) ref = { ...ref, ncm: regra.ncm };
    if (!ref) erros.push(`Cadastre a referência tributária "${refNome}" na tela de Tributação.`);
    else {
      if (dig(ref.ncm).length !== 8) erros.push(`Referência "${refNome}" sem NCM válido (8 dígitos).`);
      if (!(ref.csosn || ref.cst_icms)) erros.push(`Referência "${refNome}" sem CSOSN (confirmar com o contador).`);
    }
    if (getOrderFinalValue(order as any) <= 0) erros.push('Pedido sem valor (ERRO/R$ 0,00) não pode ter nota de venda.');
  }
  return { erros, cfg, order, ref };
}

export async function montarXmlNfe(pedidoId: string, destinatarioId: string, cfopEscolhido?: string): Promise<MontagemResultado> {
  const { erros, cfg, order, ref } = await validarEmissao(pedidoId, destinatarioId);
  if (erros.length) throw new Error(erros.join('\n'));
  const { data: dest, error: dErr } = await supabase.from('nfe_destinatarios').select('*').eq('id', destinatarioId).single();
  if (dErr || !dest) throw new Error('Destinatário não encontrado.');

  const { data: num, error: nErr } = await supabase.rpc('reservar_numero_nfe');
  if (nErr) throw new Error(nErr.message);
  const { numero, serie, ambiente } = num as { numero: number; serie: number; ambiente: number };

  const agora = new Date();
  const cNF = String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
  const chave = calcularChave({ uf: cfg!.uf, data: agora, cnpj: cfg!.cnpj, modelo: 55, serie, numero, tpEmis: 1, cNF });
  const dhEmi = new Date(agora.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 19) + '-03:00';

  const interno = dest.uf.toUpperCase() === cfg!.uf.toUpperCase();
  const contribuinte = Number(dest.ind_ie_dest) === 1;
  const cfopPadrao = interno ? (contribuinte ? '5101' : '5107') : (contribuinte ? '6101' : '6107');
  const cfop = dig(cfopEscolhido || cfopPadrao);
  if (!['5101', '5107', '6101', '6107'].includes(cfop)) throw new Error('CFOP inválido para venda de produção própria.');
  const qtd = Math.max(1, Number(order!.quantidade) || 1);
  const vTotal = Number(getOrderFinalValue(order as any).toFixed(2));
  const vUnit = vTotal / qtd;
  const docDest = dig(dest.cpf_cnpj);
  const csosn = String(ref.csosn || ref.cst_icms);
  const origem = Number(ref.origem_mercadoria ?? 0);
  const unidade = ref.unidade_comercial || (referenciaDoPedido(order) === 'BOTA' ? 'PAR' : 'UN');
  const descricao = descricaoItem(order);
  const codigo = order!.numero;
  const homolog = ambiente === 2;
  const nomeDest = homolog ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL' : dest.nome;

  const icms =
    csosn === '101'
      ? `<ICMSSN101><orig>${origem}</orig><CSOSN>101</CSOSN><pCredSN>0.00</pCredSN><vCredICMSSN>0.00</vCredICMSSN></ICMSSN101>`
      : `<ICMSSN102><orig>${origem}</orig><CSOSN>${esc(csosn)}</CSOSN></ICMSSN102>`;

  const xml =
    `<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe versao="4.00" Id="NFe${chave}">` +
    `<ide><cUF>${UF_COD[cfg!.uf]}</cUF><cNF>${cNF}</cNF><natOp>VENDA DE MERCADORIA</natOp><mod>55</mod>` +
    `<serie>${serie}</serie><nNF>${numero}</nNF><dhEmi>${dhEmi}</dhEmi><tpNF>1</tpNF><idDest>${interno ? 1 : 2}</idDest>` +
    `<cMunFG>${dig(cfg!.cod_municipio)}</cMunFG><tpImp>1</tpImp><tpEmis>1</tpEmis><cDV>${chave.slice(-1)}</cDV>` +
    `<tpAmb>${ambiente}</tpAmb><finNFe>1</finNFe><indFinal>${dest.ind_ie_dest === 9 ? 1 : 0}</indFinal><indPres>9</indPres><indIntermed>0</indIntermed>` +
    `<procEmi>0</procEmi><verProc>Portal7Estrivos 1.0</verProc></ide>` +
    `<emit><CNPJ>${dig(cfg!.cnpj)}</CNPJ>${tag('xNome', cfg!.razao_social)}${tag('xFant', cfg!.nome_fantasia)}` +
    `<enderEmit>${tag('xLgr', cfg!.logradouro)}${tag('nro', cfg!.numero)}${tag('xCpl', cfg!.complemento)}${tag('xBairro', cfg!.bairro)}` +
    `<cMun>${dig(cfg!.cod_municipio)}</cMun>${tag('xMun', cfg!.municipio)}<UF>${cfg!.uf}</UF><CEP>${dig(cfg!.cep)}</CEP>` +
    `<cPais>1058</cPais><xPais>BRASIL</xPais>${tag('fone', dig(cfg!.telefone))}</enderEmit>` +
    `<IE>${dig(cfg!.inscricao_estadual)}</IE><CRT>${cfg!.crt}</CRT></emit>` +
    `<dest>${docDest.length === 14 ? `<CNPJ>${docDest}</CNPJ>` : `<CPF>${docDest}</CPF>`}${tag('xNome', nomeDest)}` +
    `<enderDest>${tag('xLgr', dest.logradouro)}${tag('nro', dest.numero)}${tag('xCpl', dest.complemento)}${tag('xBairro', dest.bairro)}` +
    `<cMun>${dig(dest.cod_municipio)}</cMun>${tag('xMun', dest.municipio)}<UF>${dest.uf.toUpperCase()}</UF><CEP>${dig(dest.cep)}</CEP>` +
    `<cPais>1058</cPais><xPais>BRASIL</xPais>${tag('fone', dig(dest.telefone))}</enderDest>` +
    `<indIEDest>${dest.ind_ie_dest}</indIEDest>${dest.ind_ie_dest === 1 ? tag('IE', dig(dest.inscricao_estadual)) : ''}${tag('email', dest.email)}</dest>` +
    `<det nItem="1"><prod><cProd>${esc(codigo)}</cProd><cEAN>SEM GTIN</cEAN><xProd>${esc(descricao)}</xProd>` +
    `<NCM>${dig(ref.ncm)}</NCM>${ref.cest ? tag('CEST', dig(ref.cest)) : ''}<CFOP>${cfop}</CFOP><uCom>${esc(unidade)}</uCom><qCom>${qtd.toFixed(4)}</qCom>` +
    `<vUnCom>${vUnit.toFixed(10)}</vUnCom><vProd>${n2(vTotal)}</vProd><cEANTrib>SEM GTIN</cEANTrib><uTrib>${esc(unidade)}</uTrib>` +
    `<qTrib>${qtd.toFixed(4)}</qTrib><vUnTrib>${vUnit.toFixed(10)}</vUnTrib><indTot>1</indTot></prod>` +
    `<imposto><ICMS>${icms}</ICMS><PIS><PISOutr><CST>99</CST><vBC>0.00</vBC><pPIS>0.00</pPIS><vPIS>0.00</vPIS></PISOutr></PIS>` +
    `<COFINS><COFINSOutr><CST>99</CST><vBC>0.00</vBC><pCOFINS>0.00</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSOutr></COFINS></imposto></det>` +
    `<total><ICMSTot><vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson><vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST>` +
    `<vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet><vProd>${n2(vTotal)}</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc>` +
    `<vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro>` +
    `<vNF>${n2(vTotal)}</vNF></ICMSTot></total>` +
    `<transp><modFrete>9</modFrete></transp>` +
    `<pag><detPag><indPag>0</indPag><tPag>99</tPag><xPag>OUTROS</xPag><vPag>${n2(vTotal)}</vPag></detPag></pag>` +
    `<infAdic><infCpl>${esc(`Pedido ${order!.numero}. Documento emitido por ME ou EPP optante pelo Simples Nacional. Nao gera direito a credito fiscal de IPI.`)}</infCpl></infAdic>` +
    `</infNFe></NFe>`;

  return {
    xml, chave, numero, serie, ambiente, valorTotal: vTotal, cfop, destinatario: dest,
    item: { codigo, descricao, ncm: dig(ref.ncm), cfop, quantidade: qtd, valorUnit: vUnit, valorTotal: vTotal, csosn, origem, unidade },
  };
}
