import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import { supabase } from '@/integrations/supabase/client';

type DanfeMode = 'etiqueta' | 'a4';

type FiscalData = {
  nota: any;
  config: any;
  dest: any;
  itens: any[];
  order: any;
  refs: any[];
  logo?: string;
  infCpl: string;
};

const clean = (value: unknown) => String(value ?? '').trim();
const digits = (value: unknown) => clean(value).replace(/\D/g, '');
const money = (value: unknown) => Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qty = (value: unknown) => Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const dateTime = (value: unknown) => value ? new Date(String(value)).toLocaleString('pt-BR') : '';
const dateOnly = (value: unknown) => value ? new Date(String(value)).toLocaleDateString('pt-BR') : '';
const accessKey = (value: unknown) => digits(value).replace(/(.{4})/g, '$1 ').trim();
const padNfe = (value: unknown) => String(value ?? '').padStart(6, '0');

function formatDoc(value: unknown) {
  const v = digits(value);
  if (v.length === 14) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (v.length === 11) return v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return clean(value);
}

function barcode(value: string) {
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, value, { format: 'CODE128', width: 2, height: 54, displayValue: false, margin: 0 });
  return canvas.toDataURL('image/png');
}

function extractInfCpl(xml: unknown) {
  const source = clean(xml);
  if (!source) return '';
  try {
    const parsed = new DOMParser().parseFromString(source, 'application/xml');
    return parsed.getElementsByTagName('infCpl')[0]?.textContent?.trim() ?? '';
  } catch { return ''; }
}

async function imageAsDataUrl(path: string, monochrome: boolean) {
  const { data } = await supabase.storage.from('nfe-certificados').createSignedUrl(path, 120);
  if (!data?.signedUrl) return undefined;
  const blob = await fetch(data.signedUrl).then(r => r.blob());
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  if (!monochrome) return source;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = reject;
    element.src = source;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return source;
  ctx.drawImage(img, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const dark = (pixels.data[i] * .299 + pixels.data[i + 1] * .587 + pixels.data[i + 2] * .114) < 160;
    pixels.data[i] = dark ? 0 : 255;
    pixels.data[i + 1] = dark ? 0 : 255;
    pixels.data[i + 2] = dark ? 0 : 255;
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas.toDataURL('image/png');
}

async function loadDanfe(notaId: string, mode: DanfeMode): Promise<FiscalData> {
  const { data: nota, error } = await supabase.from('nfe_notas').select('*').eq('id', notaId).single();
  if (error || !nota) throw new Error('Nota fiscal não encontrada.');
  if (nota.status !== 'autorizada' || !nota.chave_acesso || !nota.protocolo) throw new Error('O DANFE só pode ser gerado para uma NF-e autorizada.');
  const [{ data: config }, { data: itens }, { data: order }] = await Promise.all([
    supabase.from('nfe_config').select('*').order('created_at').limit(1).single(),
    supabase.from('nfe_itens').select('*').eq('nota_id', notaId).order('ordem'),
    nota.pedido_id ? supabase.from('orders').select('numero').eq('id', nota.pedido_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!config) throw new Error('Configuração do emitente não encontrada.');
  const ncms = [...new Set((itens ?? []).map(item => clean(item.ncm)).filter(Boolean))];
  const { data: refs } = ncms.length
    ? await supabase.from('nfe_tributacao_referencias').select('ncm, aliq_tributos_federais, aliq_tributos_estaduais').in('ncm', ncms)
    : { data: [] };
  const dest = nota.destinatario_snapshot && typeof nota.destinatario_snapshot === 'object' ? nota.destinatario_snapshot : {};
  const logo = config.logo_path ? await imageAsDataUrl(config.logo_path, mode === 'etiqueta').catch(() => undefined) : undefined;
  return { nota, config, dest, itens: itens ?? [], order, refs: refs ?? [], logo, infCpl: extractInfCpl(nota.xml_autorizado || nota.xml_assinado) || clean(nota.observacoes) };
}

function address(person: any) {
  return [person.logradouro, person.numero, person.complemento, person.bairro, person.municipio, person.uf, person.cep && `CEP ${person.cep}`].filter(Boolean).join(', ');
}

function infoText(data: FiscalData) {
  let federal = 0;
  let estadual = 0;
  let configuredValue = 0;
  let taxableValue = 0;
  for (const item of data.itens) {
    const value = Number(item.valor_total || 0);
    if (value > 0) taxableValue += value;
    const ref = data.refs.find(r => digits(r.ncm) === digits(item.ncm));
    if (ref?.aliq_tributos_federais != null && ref?.aliq_tributos_estaduais != null) {
      federal += value * Number(ref.aliq_tributos_federais) / 100;
      estadual += value * Number(ref.aliq_tributos_estaduais) / 100;
      configuredValue += value;
    }
  }
  const taxes = configuredValue > 0 && Math.abs(configuredValue - taxableValue) < .01
    ? `Total aproximado de tributos: R$ ${money(federal + estadual)} (${money((federal + estadual) / configuredValue * 100)}%). Federais R$ ${money(federal)}; Estaduais R$ ${money(estadual)}. Fonte IBPT.`
    : '';
  const orderInfo = data.order?.numero ? `Nº Pedido: ${data.order.numero}.` : '';
  const delivery = `Endereço de entrega: ${data.dest.nome}, ${address(data.dest)}.`;
  return [taxes, data.infCpl, delivery, orderInfo].filter(Boolean).join(' ');
}

export function drawEtiqueta(data: FiscalData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 150] });
  const margin = 4;
  const width = 92;
  let y = 5;
  const dashed = () => { doc.setLineDashPattern([1.1, 1.1], 0); doc.line(margin, y, 100 - margin, y); doc.setLineDashPattern([], 0); y += 3; };
  const center = (text: string, size = 7, bold = false) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.text(text, 50, y, { align: 'center' }); y += size * .38; };
  const wrapped = (text: string, x: number, maxWidth: number, size = 7, bold = false, align: 'left' | 'center' = 'left') => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
    const lines = doc.splitTextToSize(text || '—', maxWidth) as string[];
    doc.text(lines, x, y, { align }); y += lines.length * 2.75;
  };
  const newPage = () => { doc.addPage([100, 150], 'portrait'); y = 5; center('DANFE Simplificado - Etiqueta (continuação)', 7, true); dashed(); };
  const guard = (needed: number) => { if (y + needed > 146) newPage(); };

  dashed(); center('DANFE Simplificado - Etiqueta', 7, true); dashed();
  const emitX = data.logo ? 37 : 6;
  if (data.logo) doc.addImage(data.logo, 'PNG', 6, y, 26, 24, undefined, 'FAST');
  const emitY = y;
  y += 2;
  wrapped(data.config.razao_social, emitX, data.logo ? 57 : 88, 7, true);
  wrapped(`CNPJ: ${formatDoc(data.config.cnpj)}  IE: ${data.config.inscricao_estadual}`, emitX, data.logo ? 57 : 88);
  wrapped(address(data.config), emitX, data.logo ? 57 : 88);
  y = Math.max(y, data.logo ? emitY + 25 : y + 2); dashed();
  doc.addImage(barcode(digits(data.nota.chave_acesso)), 'PNG', 8, y, 84, 12, undefined, 'FAST'); y += 14;
  center(accessKey(data.nota.chave_acesso), 6.6);
  center('Protocolo de autorização de uso', 6);
  center(`${data.nota.protocolo}  ${dateTime(data.nota.data_autorizacao)}`, 6.5);
  center(`TIPO: 1 - Saída | Nº NFe: ${padNfe(data.nota.numero)} | SERIE: ${data.nota.serie}`, 7);
  center(`Data de emissão: ${dateOnly(data.nota.data_emissao)}`, 7);
  if (data.nota.ambiente === 2) center('SEM VALOR FISCAL — HOMOLOGAÇÃO', 8, true);
  dashed();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.text('ITEM', margin, y); doc.text('VL. ITEM', 100 - margin, y, { align: 'right' }); y += 3;
  for (const item of data.itens) {
    const text = `${item.codigo || '—'} - ${item.descricao} - ${qty(item.quantidade)} ${item.unidade || 'UN'} X ${money(item.valor_unitario)}`;
    const lines = doc.splitTextToSize(text, 76) as string[];
    guard(lines.length * 2.8 + 2);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(lines, margin, y);
    doc.text(money(item.valor_total), 100 - margin, y, { align: 'right' }); y += lines.length * 2.8;
  }
  dashed();
  const extras = Number(data.nota.valor_total) - Number(data.nota.valor_produtos);
  const line = (label: string, value: string, bold = false) => { guard(3); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(7); doc.text(label, margin, y); doc.text(value, 100 - margin, y, { align: 'right' }); y += 3; };
  line('QTD. TOTAL DE ITENS', String(data.itens.length));
  line('ACRÉSCIMOS (IPI, ST, FRETE, SEGURO E OUTRAS', '');
  line('DESPESAS)/DESCONTO R$', money(extras));
  line('VALOR NOTA R$', money(data.nota.valor_total), true);
  dashed(); center('CONSUMIDOR', 7, true);
  wrapped(`CNPJ/CPF/ID Estrangeiro: ${formatDoc(data.dest.cpf_cnpj)} ${data.dest.nome || ''}`, 50, width, 7, false, 'center');
  wrapped(address(data.dest), 50, width, 7, false, 'center');
  dashed();
  guard(15); wrapped('INFORMAÇÕES ADICIONAIS DE INTERESSE DO CONTRIBUINTE', margin, width, 7, true);
  wrapped(infoText(data), margin, width, 7);
  return doc;
}

export function drawA4(data: FiscalData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const x = 10, w = 190;
  let y = 11;
  const xmlSource = clean(data.nota.xml_autorizado || data.nota.xml_assinado);
  const xml = xmlSource ? new DOMParser().parseFromString(xmlSource, 'application/xml') : null;
  const node = (parent: Element | Document | null, tag: string) => parent?.getElementsByTagName(tag)[0] ?? null;
  const value = (parent: Element | Document | null, tag: string) => node(parent, tag)?.textContent?.trim() ?? '';
  const nfe = node(xml, 'NFe');
  const totals = node(nfe, 'ICMSTot');
  const transp = node(nfe, 'transp');
  const transportador = node(transp, 'transporta');
  const veiculo = node(transp, 'veicTransp');
  const vol = node(transp, 'vol');
  const duplicatas = Array.from(xml?.getElementsByTagName('dup') ?? []);
  const detalhes = Array.from(xml?.getElementsByTagName('det') ?? []);
  const fmtXmlMoney = (tag: string, parent: Element | Document | null = totals) => {
    const v = value(parent, tag);
    return v ? money(v) : '';
  };
  const rect = (bx: number, by: number, bw: number, bh: number) => { doc.setLineWidth(.17); doc.rect(bx, by, bw, bh); };
  const txt = (text: unknown, tx: number, ty: number, size = 6.6, bold = false, align: 'left' | 'center' | 'right' = 'left') => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
    doc.text(clean(text), tx, ty, { align });
  };
  const field = (label: string, raw: unknown, fx: number, fy: number, fw: number, fh = 7) => {
    rect(fx, fy, fw, fh);
    txt(label, fx + .8, fy + 2, 5.1);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6);
    const lines = doc.splitTextToSize(clean(raw), fw - 1.6) as string[];
    // Never allow a long address or observation to bleed into the next field.
    const maxLines = Math.max(1, Math.floor((fh - 3.6) / 2.5));
    doc.text(lines.slice(0, maxLines), fx + .8, fy + 4.9);
  };
  const section = (title: string) => { txt(title, x, y - .7, 6.8, true); };
  const watermark = () => {
    if (Number(data.nota.ambiente) !== 2) return;
    doc.setTextColor(220);
    txt('SEM VALOR FISCAL', 105, 150, 27, true, 'center');
    doc.setTextColor(0);
  };
  watermark();

  // Canhoto destacável, na mesma proporção e ordem do modelo enviado.
  const receiptW = 166;
  txt(`RECEBEMOS DE ${clean(data.config.razao_social).toUpperCase()} OS PRODUTOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO`, x + 1, y + 2.8, 5.8);
  rect(x, y, receiptW, 16);
  field('Data de recebimento', '', x, y + 6, 58, 10);
  field('Identificação e assinatura do recebedor', '', x + 58, y + 6, receiptW - 58, 10);
  rect(x + receiptW + 1, y, w - receiptW - 1, 16);
  txt('NF-e', x + receiptW + 12, y + 4, 7, true, 'center');
  txt(`Nº ${padNfe(data.nota.numero)}`, x + receiptW + 12, y + 9, 9, true, 'center');
  txt(`Série ${data.nota.serie}`, x + receiptW + 12, y + 13, 7, true, 'center');
  y += 19;
  doc.setLineDashPattern([1, 1], 0); doc.line(x, y, x + w, y); doc.setLineDashPattern([], 0); y += 3;

  const headY = y, emitW = 80, danfeW = 28, fiscalW = w - emitW - danfeW;
  rect(x, headY, emitW, 33); rect(x + emitW, headY, danfeW, 33); rect(x + emitW + danfeW, headY, fiscalW, 33);
  if (data.logo) doc.addImage(data.logo, 'PNG', x + 2, headY + 5, 27, 22, undefined, 'FAST');
  const emitX = x + (data.logo ? 33 : 3);
  const emitWidth = data.logo ? 44 : 74;
  txt(data.config.razao_social, emitX, headY + 8, 7, true);
  doc.setFontSize(6);
  const emitAddress = [data.config.logradouro, data.config.numero, data.config.complemento, data.config.bairro,
    [data.config.cep, data.config.municipio, data.config.uf].filter(Boolean).join(' - '),
    data.config.telefone && `Fone ${data.config.telefone}`, data.config.website, data.config.email].filter(Boolean).join(', ');
  doc.text((doc.splitTextToSize(emitAddress, emitWidth) as string[]).slice(0, 7), emitX, headY + 12);
  const mid = x + emitW + danfeW / 2;
  txt('DANFE', mid, headY + 5, 10, true, 'center');
  txt('Documento Auxiliar', mid, headY + 8, 5.6, false, 'center');
  txt('da Nota Fiscal Eletrônica', mid, headY + 11, 5.4, false, 'center');
  const tpNF = value(node(nfe, 'ide'), 'tpNF') || '1';
  txt('0-Entrada', x + emitW + 2, headY + 16, 5.7);
  txt('1-Saída', x + emitW + 2, headY + 19, 5.7);
  rect(x + emitW + 21, headY + 14, 5, 6); txt(tpNF, x + emitW + 23.5, headY + 18, 7, true, 'center');
  txt(`Nº ${padNfe(data.nota.numero)}`, mid, headY + 24, 8.4, true, 'center');
  txt(`SÉRIE: ${data.nota.serie}`, mid, headY + 28, 6.7, true, 'center');
  txt('Controle do Fisco', x + emitW + danfeW + 1, headY + 3, 5.3);
  doc.addImage(barcode(digits(data.nota.chave_acesso)), 'PNG', x + emitW + danfeW + 5, headY + 5, fiscalW - 10, 9, undefined, 'FAST');
  doc.line(x + emitW + danfeW, headY + 15, x + w, headY + 15);
  txt('Chave de acesso', x + emitW + danfeW + 1, headY + 17.4, 5.1);
  txt(accessKey(data.nota.chave_acesso), x + emitW + danfeW + fiscalW / 2, headY + 21, 6, false, 'center');
  doc.line(x + emitW + danfeW, headY + 22, x + w, headY + 22);
  txt('Consulta de autenticidade no portal nacional da NF-e', x + emitW + danfeW + 1, headY + 25, 5.2);
  txt('www.nfe.fazenda.gov.br/portal', x + emitW + danfeW + 1, headY + 28, 5.2);
  txt('ou no site da Sefaz autorizadora', x + emitW + danfeW + 1, headY + 31, 5.2);
  y += 36;
  field('Natureza da operação', data.nota.natureza_operacao, x, y, 86, 7);
  field('Protocolo de autorização de uso', `${data.nota.protocolo} ${dateTime(data.nota.data_autorizacao)}`, x + 86, y, w - 86, 7); y += 7;
  field('Inscrição Estadual', data.config.inscricao_estadual, x, y, 57);
  field('Inscr.est. do subst.trib.', '', x + 57, y, 57);
  field('CNPJ', formatDoc(data.config.cnpj), x + 114, y, w - 114); y += 10;

  section('Destinatário/Remetente');
  field('Nome / Razão Social', data.dest.nome, x, y, 69);
  field('CNPJ/CPF', formatDoc(data.dest.cpf_cnpj), x + 69, y, 48);
  field('Inscrição Estadual', data.dest.inscricao_estadual, x + 117, y, 48);
  field('Data emissão', dateOnly(data.nota.data_emissao), x + 165, y, 25); y += 7;
  field('Endereço', [data.dest.logradouro, data.dest.numero].filter(Boolean).join(', '), x, y, 69);
  field('Bairro', data.dest.bairro, x + 69, y, 48);
  field('CEP', data.dest.cep, x + 117, y, 48);
  field('Data saída', value(node(nfe, 'ide'), 'dhSaiEnt')?.slice(0, 10), x + 165, y, 25); y += 7;
  field('Município', data.dest.municipio, x, y, 69);
  field('UF', data.dest.uf, x + 69, y, 17);
  field('Fone/Fax', data.dest.telefone, x + 86, y, 79);
  field('Hora saída', value(node(nfe, 'ide'), 'dhSaiEnt')?.slice(11, 19), x + 165, y, 25); y += 10;

  section('Faturas');
  const bills = duplicatas.slice(0, 3);
  for (let i = 0; i < 3; i++) {
    const dx = x + i * (w / 3), dup = bills[i] ?? null;
    field('Número', value(dup, 'nDup'), dx, y, w / 9, 8);
    field('Vencimento', value(dup, 'dVenc'), dx + w / 9, y, w / 9, 8);
    field('Valor', fmtXmlMoney('vDup', dup), dx + 2 * w / 9, y, w / 9, 8);
  }
  y += 11;
  section('Cálculo do imposto');
  const tax1: [string, string][] = [['Base de cálculo do ICMS', 'vBC'], ['Valor do ICMS', 'vICMS'], ['Base de cálculo do ICMS Subst.', 'vBCST'], ['Valor do ICMS Subst.', 'vST'], ['Valor do FCP ST', 'vFCPST'], ['Valor total dos produtos', 'vProd']];
  const tax2: [string, string][] = [['Valor do frete', 'vFrete'], ['Valor do seguro', 'vSeg'], ['Desconto', 'vDesc'], ['Outras despesas acessórias', 'vOutro'], ['Valor do IPI', 'vIPI'], ['Valor total da nota', 'vNF']];
  tax1.forEach(([label, tag], i) => field(label, fmtXmlMoney(tag) || (tag === 'vProd' ? money(data.nota.valor_produtos) : ''), x + i*w/6, y, w/6, 7)); y += 7;
  tax2.forEach(([label, tag], i) => field(label, fmtXmlMoney(tag) || (tag === 'vNF' ? money(data.nota.valor_total) : ''), x + i*w/6, y, w/6, 7)); y += 10;

  section('Transportador/Volumes transportados');
  const freight: Record<string, string> = { '0': '0 - Por conta do remetente (CIF)', '1': '1 - Por conta do destinatário (FOB)', '2': '2 - Por conta de terceiros', '3': '3 - Transporte próprio remetente', '4': '4 - Transporte próprio destinatário', '9': '9 - Sem frete' };
  field('Nome', value(transportador, 'xNome'), x, y, 58);
  field('Frete por conta', freight[value(transp, 'modFrete')] || '', x + 58, y, 43);
  field('Código ANTT', value(veiculo, 'RNTC'), x + 101, y, 22);
  field('Placa do veículo', value(veiculo, 'placa'), x + 123, y, 28);
  field('UF', value(veiculo, 'UF'), x + 151, y, 12);
  field('CNPJ/CPF', formatDoc(value(transportador, 'CNPJ') || value(transportador, 'CPF')), x + 163, y, 27); y += 7;
  field('Endereço', value(transportador, 'xEnder'), x, y, 87);
  field('Município', value(transportador, 'xMun'), x + 87, y, 49);
  field('UF', value(transportador, 'UF'), x + 136, y, 15);
  field('Inscrição Estadual', value(transportador, 'IE'), x + 151, y, 39); y += 7;
  const volumes: [string, string][] = [['Quantidade', 'qVol'], ['Espécie', 'esp'], ['Marca', 'marca'], ['Numeração', 'nVol'], ['Peso bruto', 'pesoB'], ['Peso líquido', 'pesoL']];
  volumes.forEach(([label, tag], i) => field(label, value(vol, tag), x + i*w/6, y, w/6, 7)); y += 10;

  section('Itens da nota fiscal');
  const cols = [15, 43, 13, 11, 10, 6, 11, 16, 16, 11, 10, 10, 9, 9]; // 190 mm
  const labels = ['Código', 'Descrição do produto/serviço', 'NCM/SH', 'CSOSN', 'CFOP', 'UN', 'Qtde', 'Preço un', 'Preço total', 'BC ICMS', 'Vlr.ICMS', 'Vlr.IPI', '%ICMS', '%IPI'];
  const row = (values: string[], ry: number, height: number, header = false) => {
    let cx = x;
    values.forEach((v, i) => {
      rect(cx, ry, cols[i], height);
      doc.setFont('helvetica', header ? 'bold' : 'normal'); doc.setFontSize(header ? 5.1 : 5.8);
      const lines = doc.splitTextToSize(v, cols[i] - 1.2) as string[];
      doc.text(lines.slice(0, Math.max(1, Math.floor((height - 1) / 2.3))), cx + .6, ry + 2.6);
      cx += cols[i];
    });
  };
  const tableHead = () => { row(labels, y, 6, true); y += 6; };
  tableHead();
  for (let index = 0; index < data.itens.length; index++) {
    const item = data.itens[index];
    const det = detalhes[index] ?? null;
    const prod = node(det, 'prod');
    const icms = node(node(det, 'imposto'), 'ICMS');
    const ipi = node(node(det, 'imposto'), 'IPI');
    doc.setFontSize(5.8);
    const descLines = (doc.splitTextToSize(clean(item.descricao), cols[1] - 1.2) as string[]).length;
    const height = Math.max(6, Math.min(22, descLines * 2.3 + 1.6));
    if (y + height > 266) { doc.addPage(); watermark(); y = 13; tableHead(); }
    row([clean(item.codigo), clean(item.descricao), digits(item.ncm),
      `${clean(item.origem_mercadoria)}${clean(item.cst_icms)}`, clean(item.cfop), clean(item.unidade), qty(item.quantidade),
      money(item.valor_unitario), money(item.valor_total), fmtXmlMoney('vBC', icms), fmtXmlMoney('vICMS', icms),
      fmtXmlMoney('vIPI', ipi), value(icms, 'pICMS'), value(ipi, 'pIPI')], y, height);
    y += height;
  }
  // Keep the following blocks together even for invoices with many items.
  const footerHeight = 37;
  if (y + footerHeight > 282) { doc.addPage(); watermark(); y = 13; }
  else if (y < 194) { rect(x, y, w, 194 - y); y = 194; }
  y += 3;
  section('Cálculo do ISSQN');
  const iss = node(node(nfe, 'total'), 'ISSQNtot');
  field('Inscrição Municipal', value(node(nfe, 'emit'), 'IM'), x, y, w/4);
  field('Valor total dos serviços', fmtXmlMoney('vServ', iss), x + w/4, y, w/4);
  field('Base de cálculo do ISSQN', fmtXmlMoney('vBC', iss), x + w/2, y, w/4);
  field('Valor do ISSQN', fmtXmlMoney('vISS', iss), x + 3*w/4, y, w/4); y += 10;
  section('Dados adicionais');
  const notes = infoText(data);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.4);
  const notesLines = doc.splitTextToSize(notes, 94) as string[];
  const noteHeight = Math.max(20, Math.min(40, notesLines.length * 2.6 + 5));
  if (y + noteHeight > 284) { doc.addPage(); watermark(); y = 13; section('Dados adicionais'); }
  field('Observações', notes, x, y, 96, noteHeight);
  field('Reservado ao fisco', '', x + 96, y, w - 96, noteHeight);
  txt(`Impresso em ${new Date().toLocaleString('pt-BR')}`, x + w, Math.min(291, y + noteHeight + 3), 5.4, false, 'right');
  return doc;
}

export async function gerarDanfePdf(notaId: string, mode: DanfeMode, action: 'save' | 'print' = 'save') {
  const data = await loadDanfe(notaId, mode);
  const doc = mode === 'etiqueta' ? drawEtiqueta(data) : drawA4(data);
  const filename = `DANFE-${padNfe(data.nota.numero)}-${mode === 'etiqueta' ? 'Etiqueta' : 'A4'}.pdf`;
  if (action === 'print') {
    // Abre o PDF em nova aba (o visualizador do navegador tem botão de imprimir).
    // Imprimir via iframe falha: o leitor de PDF é de outra origem e bloqueia print().
    doc.autoPrint();
    const url = URL.createObjectURL(doc.output('blob'));
    const w = window.open(url, '_blank');
    if (!w) doc.save(filename); // pop-up bloqueado → baixa o arquivo
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
  } else doc.save(filename);
}