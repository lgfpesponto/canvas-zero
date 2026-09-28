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
  for (const item of data.itens) {
    const ref = data.refs.find(r => digits(r.ncm) === digits(item.ncm));
    if (ref?.aliq_tributos_federais != null && ref?.aliq_tributos_estaduais != null) {
      const value = Number(item.valor_total || 0);
      federal += value * Number(ref.aliq_tributos_federais) / 100;
      estadual += value * Number(ref.aliq_tributos_estaduais) / 100;
      configuredValue += value;
    }
  }
  const taxes = configuredValue > 0
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
  y = Math.max(y, emitY + 25); dashed();
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
  const x = 16, w = 178;
  let y = 8;
  const box = (bx: number, by: number, bw: number, bh: number) => { doc.setLineWidth(.2); doc.rect(bx, by, bw, bh); };
  const txt = (text: string, tx: number, ty: number, size = 7, bold = false, align: 'left' | 'center' | 'right' = 'left') => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.text(text, tx, ty, { align }); };
  const field = (label: string, value: unknown, fx: number, fy: number, fw: number, fh = 10) => { box(fx, fy, fw, fh); txt(label, fx + 1, fy + 2.5, 5.8); const lines = doc.splitTextToSize(clean(value) || ' ', fw - 2) as string[]; doc.setFontSize(7); doc.text(lines, fx + 1, fy + 6); };
  const section = (title: string) => { txt(title, x, y - 1, 8, true); };

  txt(`RECEBEMOS DE ${data.config.razao_social} OS PRODUTOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO`, x, y + 3, 6);
  box(170, y, 24, 14); txt('NF-e', 182, y + 4, 7, true, 'center'); txt(`Nº ${padNfe(data.nota.numero)}`, 182, y + 8, 9.7, true, 'center'); txt(`Série ${data.nota.serie}`, 182, y + 12, 7, true, 'center');
  field('Data de recebimento', '', x, y + 7, 43, 7); field('Identificação e assinatura do recebedor', '', x + 43, y + 7, 111, 7);
  y += 17; doc.setLineDashPattern([1, 1], 0); doc.line(x, y, x + w, y); doc.setLineDashPattern([], 0); y += 3;
  box(x, y, 73, 33); box(x + 73, y, 34, 33); box(x + 107, y, 71, 33);
  if (data.logo) doc.addImage(data.logo, 'PNG', x + 2, y + 3, 21, 20, undefined, 'FAST');
  const emitX = data.logo ? x + 25 : x + 3;
  txt(data.config.razao_social, emitX, y + 7, 7, true);
  doc.setFontSize(6.4); doc.text(doc.splitTextToSize(address(data.config), data.logo ? 44 : 66), emitX, y + 11);
  txt([data.config.telefone && `Fone ${data.config.telefone}`, data.config.website, data.config.email].filter(Boolean).join(' | '), x + 3, y + 29, 5.8);
  txt('DANFE', x + 90, y + 5, 9.7, true, 'center'); txt('Documento Auxiliar', x + 90, y + 9, 6, false, 'center'); txt('da Nota Fiscal Eletrônica', x + 90, y + 12, 6, false, 'center');
  txt('0-Entrada', x + 77, y + 18, 6); txt('1-Saída        1', x + 77, y + 22, 7, true); txt(`Nº ${padNfe(data.nota.numero)}`, x + 90, y + 27, 9.7, true, 'center'); txt(`SÉRIE: ${data.nota.serie}`, x + 90, y + 31, 7, true, 'center');
  txt('Controle do Fisco', x + 109, y + 4, 6); doc.addImage(barcode(digits(data.nota.chave_acesso)), 'PNG', x + 111, y + 6, 63, 10, undefined, 'FAST');
  txt('Chave de acesso', x + 109, y + 19, 5.8); txt(accessKey(data.nota.chave_acesso), x + 142.5, y + 23, 6, false, 'center'); txt('Consulta de autenticidade no portal nacional da NF-e', x + 109, y + 27, 5.5); txt('www.nfe.fazenda.gov.br/portal', x + 109, y + 30, 5.5);
  y += 33;
  field('Natureza da operação', data.nota.natureza_operacao, x, y, 88, 10); field('Protocolo de autorização de uso', `${data.nota.protocolo} ${dateTime(data.nota.data_autorizacao)}`, x + 88, y, 90, 10); y += 10;
  field('Inscrição Estadual', data.config.inscricao_estadual, x, y, 59, 9); field('Inscr. est. do subst. trib.', '', x + 59, y, 59, 9); field('CNPJ', formatDoc(data.config.cnpj), x + 118, y, 60, 9); y += 13;
  section('Destinatário/Remetente');
  field('Nome / Razão Social', data.dest.nome, x, y, 75); field('CNPJ/CPF', formatDoc(data.dest.cpf_cnpj), x + 75, y, 42); field('Inscrição Estadual', data.dest.inscricao_estadual, x + 117, y, 35); field('Data emissão', dateOnly(data.nota.data_emissao), x + 152, y, 26); y += 10;
  field('Endereço', `${data.dest.logradouro}, ${data.dest.numero}`, x, y, 75); field('Bairro', data.dest.bairro, x + 75, y, 42); field('CEP', data.dest.cep, x + 117, y, 35); field('Data saída', dateOnly(data.nota.data_emissao), x + 152, y, 26); y += 10;
  field('Município', data.dest.municipio, x, y, 75); field('UF', data.dest.uf, x + 75, y, 15); field('Fone/Fax', data.dest.telefone, x + 90, y, 62); field('Hora saída', new Date(data.nota.data_emissao).toLocaleTimeString('pt-BR'), x + 152, y, 26); y += 14;
  section('Faturas'); field('Número', '001', x, y, 35); field('Vencimento', dateOnly(data.nota.data_emissao), x + 35, y, 35); field('Valor', money(data.nota.valor_total), x + 70, y, 38); box(x + 108, y, 70, 10); y += 14;
  section('Cálculo do imposto');
  ['Base de cálculo do ICMS','Valor do ICMS','Base ICMS Subst.','Valor ICMS Subst.','Valor do FCP ST','Valor total dos produtos'].forEach((l,i) => field(l, i === 5 ? money(data.nota.valor_produtos) : '0,00', x + i * (w/6), y, w/6)); y += 10;
  ['Valor do frete','Valor do seguro','Desconto','Outras despesas','Valor do IPI','Valor total da nota'].forEach((l,i) => field(l, i === 5 ? money(data.nota.valor_total) : '0,00', x + i * (w/6), y, w/6)); y += 14;
  section('Transportador/Volumes transportados'); box(x, y, w, 25); field('Nome', '', x, y, 58); field('Frete por conta', '9 - Sem frete', x + 58, y, 45); field('Código ANTT / Placa / UF', '', x + 103, y, 42); field('CNPJ/CPF', '', x + 145, y, 33); y += 10; field('Endereço', '', x, y, 70); field('Município', '', x + 70, y, 50); field('UF', '', x + 120, y, 15); field('Inscrição Estadual', '', x + 135, y, 43); y += 10;
  ['Quantidade','Espécie','Marca','Numeração','Peso bruto','Peso líquido'].forEach((l,i) => field(l, i === 0 ? '1' : '', x + i*(w/6), y, w/6)); y += 14;
  section('Itens da nota fiscal');
  const cols = [20,52,17,13,13,10,16,18,19];
  const labels = ['Código','Descrição','NCM/SH','CSOSN','CFOP','UN','Qtde','Preço un','Preço total'];
  let cx = x; labels.forEach((l,i) => { field(l, '', cx, y, cols[i], 7); cx += cols[i]; }); y += 7;
  for (const item of data.itens) {
    const values = [item.codigo,item.descricao,item.ncm,item.cst_icms,item.cfop,item.unidade,qty(item.quantidade),money(item.valor_unitario),money(item.valor_total)];
    const lines = Math.max(1, (doc.splitTextToSize(clean(item.descricao), cols[1]-2) as string[]).length); const h = Math.max(8, lines * 3 + 2);
    if (y + h > 267) { doc.addPage(); y = 16; }
    cx = x; values.forEach((v,i) => { box(cx,y,cols[i],h); doc.setFontSize(6.2); doc.text(doc.splitTextToSize(clean(v),cols[i]-2),cx+1,y+3); cx += cols[i]; }); y += h;
  }
  if (y < 225) { box(x, y, w, 225-y); y = 225; }
  y += 5; section('Cálculo do ISSQN'); box(x,y,w,10); y += 14;
  section('Dados adicionais'); field('Observações', infoText(data), x, y, 115, 28); field('Reservado ao fisco', '', x + 115, y, 63, 28);
  if (data.nota.ambiente === 2) { doc.setTextColor(180); txt('SEM VALOR FISCAL', 105, 145, 30, true, 'center'); doc.setTextColor(0); }
  txt(`Impresso em ${new Date().toLocaleString('pt-BR')}`, 194, 292, 5.5, false, 'right');
  return doc;
}

export async function gerarDanfePdf(notaId: string, mode: DanfeMode, action: 'save' | 'print' = 'save') {
  const data = await loadDanfe(notaId, mode);
  const doc = mode === 'etiqueta' ? drawEtiqueta(data) : drawA4(data);
  const filename = `DANFE-${padNfe(data.nota.numero)}-${mode === 'etiqueta' ? 'Etiqueta' : 'A4'}.pdf`;
  if (action === 'print') {
    const url = URL.createObjectURL(doc.output('blob'));
    const frame = document.createElement('iframe');
    frame.style.display = 'none'; frame.src = url; document.body.appendChild(frame);
    frame.onload = () => { frame.contentWindow?.print(); setTimeout(() => { URL.revokeObjectURL(url); frame.remove(); }, 60_000); };
  } else doc.save(filename);
}