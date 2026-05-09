/**
 * Edge function: reconciliar-precos
 *
 * Recalcula `orders.preco` para pedidos com `preco_regra_versao` desatualizada
 * (NULL ou < versão atual em system_counters). Roda no servidor, sem depender
 * de cliente. Idempotente: se a versão já bate, não toca.
 *
 * Disparada por:
 *  - pg_net (trigger SQL quando admin muda regra) — futura
 *  - botão manual no admin (RecalcPrecosRunner)
 *  - one-shot ao logar (frontend invoca uma vez por sessão se houver pendentes)
 *
 * Body opcional: { batch_size?: number (default 500) }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// CONFIG DE PREÇOS — espelho de src/lib/orderFieldsConfig.ts
// ============================================================
const MODELOS: { label: string; preco: number }[] = [
  { label: 'Bota Tradicional', preco: 260 }, { label: 'Bota Feminino', preco: 260 },
  { label: 'Bota Peão', preco: 260 }, { label: 'Bota Montaria (40)', preco: 270 },
  { label: 'Coturno', preco: 240 }, { label: 'Destroyer', preco: 200 },
  { label: 'Capota', preco: 230 }, { label: 'Capota Bico Fino', preco: 230 },
  { label: 'Capota Bico Fino Perfilado', preco: 230 }, { label: 'Cano Médio', preco: 205 },
  { label: 'Botina', preco: 200 }, { label: 'Bota Infantil', preco: 170 },
  { label: 'Botina Infantil', preco: 160 }, { label: 'Bota Over', preco: 270 },
  { label: 'Urbano', preco: 260 }, { label: 'Bota Bico Fino Feminino', preco: 260 },
  { label: 'Bota Bico Fino Perfilado', preco: 260 }, { label: 'Tradicional Bico Fino', preco: 260 },
  { label: 'Cano Médio Infantil', preco: 160 }, { label: 'City', preco: 270 },
  { label: 'Cano Inteiro', preco: 260 },
];

const ACESSORIOS: { label: string; preco: number }[] = [
  { label: 'Kit Faca', preco: 70 }, { label: 'Kit Canivete', preco: 60 },
  { label: 'Kit Cantil', preco: 40 }, { label: 'Bolso', preco: 50 },
  { label: 'Zíper inteiro', preco: 40 },
];

const COURO_PRECOS: Record<string, number> = {
  'Estilizado em Dinossauro': 50, 'Estilizado em Avestruz': 10,
  'Estilizado em Tatu': 40, 'Aramado': 40, 'Escamado': 20,
  'Estilizado Duplo': 20, 'Vaca Holandesa': 15, 'Vaca Pintada': 15,
};

const BORDADOS_CANO: { label: string; preco: number }[] = [
  { label: 'Florência', preco: 25 }, { label: 'Linhas', preco: 25 },
  { label: 'Peão Elite G', preco: 35 }, { label: 'Velho Barreiro', preco: 70 },
  { label: 'Rozeta', preco: 35 }, { label: 'Nelore', preco: 25 },
  { label: 'Cruz Bordada', preco: 25 }, { label: 'Milionário', preco: 35 },
  { label: 'Monster', preco: 35 }, { label: 'Cruz Básica', preco: 25 },
  { label: 'Mulas', preco: 25 }, { label: 'Ramos', preco: 25 },
  { label: 'Peão Elite P', preco: 25 }, { label: 'N. Senhora', preco: 25 },
  { label: 'Logo Marca', preco: 50 }, { label: 'N. Senhora P', preco: 10 },
  { label: 'Rozeta P', preco: 10 }, { label: 'Cruz P', preco: 10 },
  { label: 'Monster P', preco: 10 }, { label: 'Bandeira P', preco: 15 },
  { label: 'Bordado Variado R$5', preco: 5 }, { label: 'Bordado Variado R$10', preco: 10 },
  { label: 'Bordado Variado R$15', preco: 15 }, { label: 'Bordado Variado R$20', preco: 20 },
  { label: 'Bordado Variado R$25', preco: 25 }, { label: 'Bordado Variado R$30', preco: 30 },
  { label: 'Bordado Variado R$35', preco: 35 },
];

const BORDADOS_GASPEA: { label: string; preco: number }[] = [
  { label: 'Florência', preco: 15 }, { label: 'Peão Elite G', preco: 20 },
  { label: 'Nelore', preco: 15 }, { label: 'Mulas', preco: 15 },
  { label: 'Cruz Bordada', preco: 15 }, { label: 'Milionário', preco: 20 },
  { label: 'Monster', preco: 20 }, { label: 'Cruz Básica', preco: 15 },
  { label: 'Rozeta', preco: 20 }, { label: 'N. Senhora', preco: 20 },
  { label: 'Velho Barreiro', preco: 35 }, { label: 'Peão Elite P', preco: 25 },
  { label: 'Logo Marca', preco: 50 }, { label: 'N. Senhora P', preco: 10 },
  { label: 'Rozeta P', preco: 10 }, { label: 'Cruz P', preco: 10 },
  { label: 'Monster P', preco: 10 }, { label: 'Bandeira P', preco: 15 },
  { label: 'Bordado Variado R$5', preco: 5 }, { label: 'Bordado Variado R$10', preco: 10 },
  { label: 'Bordado Variado R$15', preco: 15 }, { label: 'Bordado Variado R$20', preco: 20 },
  { label: 'Bordado Variado R$25', preco: 25 }, { label: 'Bordado Variado R$30', preco: 30 },
  { label: 'Bordado Variado R$35', preco: 35 },
];

const BORDADOS_TALONEIRA: { label: string; preco: number }[] = [
  { label: 'Florência', preco: 10 }, { label: 'Nelore', preco: 10 },
  { label: 'Mulas', preco: 10 }, { label: 'Cruz Bordada', preco: 10 },
  { label: 'Peão Elite P', preco: 25 }, { label: 'Logo Marca', preco: 50 },
  { label: 'N. Senhora P', preco: 10 }, { label: 'Rozeta P', preco: 10 },
  { label: 'Cruz P', preco: 10 }, { label: 'Monster P', preco: 10 },
  { label: 'Bandeira P', preco: 15 }, { label: 'Bordado Variado R$5', preco: 5 },
  { label: 'Bordado Variado R$10', preco: 10 }, { label: 'Bordado Variado R$15', preco: 15 },
  { label: 'Bordado Variado R$20', preco: 20 }, { label: 'Bordado Variado R$25', preco: 25 },
  { label: 'Bordado Variado R$30', preco: 30 }, { label: 'Bordado Variado R$35', preco: 35 },
];

const SOLADO: { label: string; preco: number }[] = [
  { label: 'Borracha', preco: 0 }, { label: 'Couro Reta', preco: 60 },
  { label: 'Couro Carrapeta', preco: 60 }, { label: 'Couro Carrapeta com Espaço Espora', preco: 60 },
  { label: 'Jump', preco: 30 }, { label: 'Rústica', preco: 0 },
  { label: 'Infantil', preco: 0 }, { label: 'PVC', preco: 0 },
  { label: 'Borracha City', preco: 0 },
];

const COR_VIRA: { label: string; preco: number }[] = [
  { label: 'Bege', preco: 0 }, { label: 'Preto', preco: 10 },
  { label: 'Rosa', preco: 10 }, { label: 'Neutra', preco: 0 },
];

const CARIMBO: { label: string; preco: number }[] = [
  { label: 'Até 3 Carimbos', preco: 20 }, { label: 'Até 6 Carimbos', preco: 40 },
];

const AREA_METAL: { label: string; preco: number }[] = [
  { label: 'Inteira', preco: 30 }, { label: 'Metade da Bota', preco: 15 },
];

const DESENVOLVIMENTO: { label: string; preco: number }[] = [
  { label: 'Estampa', preco: 150 }, { label: 'Laser', preco: 100 },
  { label: 'Bordado', preco: 50 },
];

const COR_SOLA: { label: string; preco: number }[] = [
  { label: 'Marrom', preco: 20 }, { label: 'Preto', preco: 0 },
  { label: 'Branco', preco: 20 }, { label: 'Madeira', preco: 0 },
  { label: 'Avermelhada', preco: 10 }, { label: 'Pintada de Preto', preco: 0 },
  { label: 'Off White', preco: 0 },
];

const SOB_MEDIDA_PRECO = 50, NOME_BORDADO_PRECO = 40, ESTAMPA_PRECO = 30,
  PINTURA_PRECO = 15, TRICE_PRECO = 20, TIRAS_PRECO = 15, COSTURA_ATRAS_PRECO = 20,
  STRASS_PRECO = 0.60, CRUZ_METAL_PRECO = 6, BRIDAO_METAL_PRECO = 3,
  CAVALO_METAL_PRECO = 5, FRANJA_PRECO = 15, CORRENTE_PRECO = 10,
  LASER_CANO_PRECO = 50, LASER_GASPEA_PRECO = 50,
  GLITTER_CANO_PRECO = 30, GLITTER_GASPEA_PRECO = 30;

const BELT_SIZES = [
  { label: '1,10 cm', preco: 100 }, { label: '1,25 cm', preco: 130 },
  { label: '50 cm', preco: 70 }, { label: '70 cm', preco: 70 },
];
const BORDADO_P_PRECO = 10, NOME_BORDADO_CINTO_PRECO = 40;
const BELT_CARIMBO = [
  { label: '1 a 3 carimbos', preco: 20 }, { label: '4 a 6 carimbos', preco: 40 },
];

type ModelBlock = 'infantil' | 'city' | 'tradicional' | 'bicoFinoFeminino' | 'perfilado';
const INFANTIL = ['Bota Infantil', 'Botina Infantil', 'Cano Médio Infantil'];
const TRADICIONAL = ['Bota Tradicional', 'Bota Feminino', 'Bota Peão', 'Bota Montaria (40)', 'Coturno', 'Destroyer', 'Capota', 'Cano Médio', 'Botina', 'Urbano', 'Cano Inteiro'];
const BF_FEM = ['Bota Bico Fino Feminino', 'Capota Bico Fino'];
const PERFILADO = ['Bota Bico Fino Perfilado', 'Bota Over', 'Capota Bico Fino Perfilado', 'Tradicional Bico Fino'];

function getBlockForModelo(modelo: string): ModelBlock | null {
  if (INFANTIL.includes(modelo)) return 'infantil';
  if (modelo === 'City') return 'city';
  if (TRADICIONAL.includes(modelo)) return 'tradicional';
  if (BF_FEM.includes(modelo)) return 'bicoFinoFeminino';
  if (PERFILADO.includes(modelo)) return 'perfilado';
  return null;
}

function getCorSolaOptions(modelo: string, solado: string, formatoBico?: string) {
  const block = getBlockForModelo(modelo);
  if (!block) return COR_SOLA;
  switch (block) {
    case 'infantil': return null;
    case 'city': return [{ label: 'Preto', preco: 0 }];
    case 'tradicional':
      if (solado === 'Borracha') {
        let opts = COR_SOLA.filter(c => ['Marrom', 'Preto', 'Branco'].includes(c.label));
        if (formatoBico === 'Redondo') opts = opts.filter(c => ['Preto', 'Branco'].includes(c.label));
        return opts;
      }
      if (['Couro Reta', 'Couro Carrapeta', 'Couro Carrapeta com Espaço Espora'].includes(solado))
        return COR_SOLA.filter(c => ['Madeira', 'Avermelhada', 'Pintada de Preto'].includes(c.label));
      if (solado === 'Jump') return null;
      if (solado === 'Rústica') return COR_SOLA.filter(c => c.label === 'Madeira');
      return COR_SOLA;
    case 'bicoFinoFeminino':
      if (solado === 'PVC') return [{ label: 'Preto', preco: 0 }, { label: 'Off White', preco: 0 }, { label: 'Marrom', preco: 0 }];
      if (solado === 'Couro Reta') return COR_SOLA.filter(c => ['Madeira', 'Avermelhada', 'Pintada de Preto'].includes(c.label));
      return COR_SOLA;
    case 'perfilado':
      if (solado === 'PVC') return [{ label: 'Marrom', preco: 0 }];
      if (solado === 'Couro Reta') return COR_SOLA.filter(c => ['Madeira', 'Avermelhada', 'Pintada de Preto'].includes(c.label));
      return COR_SOLA;
    default: return COR_SOLA;
  }
}

function getCorSolaPrecoContextual(modelo: any, solado: any, formatoBico: any, corSola: any): number {
  if (!corSola || !modelo || !solado) return 0;
  const opts = getCorSolaOptions(modelo, solado, formatoBico);
  if (!opts) return 0;
  return opts.find((o: any) => o.label === corSola)?.preco ?? 0;
}

// ============================================================
// LOOKUP de preços do banco (ficha_variacoes + custom_options)
// ============================================================
const FICHA_CATEGORY_MAP: Record<string, string> = {
  bordado_cano: 'bordado_cano', bordado_gaspea: 'bordado_gaspea', bordado_taloneira: 'bordado_taloneira',
  laser_cano: 'laser_cano', laser_gaspea: 'laser_gaspea', laser_taloneira: 'laser_taloneira',
  couro_cano: 'couro_cano', couro_gaspea: 'couro_gaspea', couro_taloneira: 'couro_taloneira',
  recorte_cano: 'recorte_cano', recorte_gaspea: 'recorte_gaspea', recorte_taloneira: 'recorte_taloneira',
};

interface FichaItem { nome: string; preco: number; slug: string }
interface CustomOpt { label: string; preco: number; categoria: string }

async function loadLookups(supabase: any): Promise<{
  findFicha: (nome: string, cat: string) => number | undefined;
  getCustom: (cat: string) => { label: string; preco: number }[];
}> {
  const [{ data: fichaRows }, { data: customRows }] = await Promise.all([
    supabase.from('ficha_variacoes').select('nome, preco_adicional, ficha_campos!inner(slug)').eq('ativo', true),
    supabase.from('custom_options').select('label, preco, categoria'),
  ]);

  const ficha: FichaItem[] = (fichaRows || []).map((r: any) => ({
    nome: r.nome,
    preco: Number(r.preco_adicional) || 0,
    slug: r.ficha_campos?.slug || '',
  }));
  const custom: CustomOpt[] = (customRows || []).map((r: any) => ({
    label: r.label, preco: Number(r.preco) || 0, categoria: r.categoria,
  }));

  return {
    findFicha: (nome, cat) => {
      const slug = FICHA_CATEGORY_MAP[cat];
      if (!slug) return undefined;
      return ficha.find(f => f.slug === slug && f.nome === nome)?.preco;
    },
    getCustom: (cat) => custom.filter(c => c.categoria === cat).map(c => ({ label: c.label, preco: c.preco })),
  };
}

// ============================================================
// CÁLCULO — espelho de src/lib/recomputeOrderPrice.ts
// ============================================================
function recomputeSubtotal(o: any, findFicha: any, getCustom: any): number {
  if (o.tipo_extra) return computeExtraTotal(o);

  const items: number[] = [];
  const push = (v: any) => { if (v && v > 0) items.push(v); };

  push(MODELOS.find(m => m.label === o.modelo)?.preco);
  if (o.sob_medida) items.push(SOB_MEDIDA_PRECO);
  if (o.acessorios) o.acessorios.split(', ').filter(Boolean).forEach((a: string) =>
    push(ACESSORIOS.find(x => x.label === a)?.preco));

  ([
    [o.couro_cano, 'couro_cano'],
    [o.couro_gaspea, 'couro_gaspea'],
    [o.couro_taloneira, 'couro_taloneira'],
  ] as [string, string][]).forEach(([t, cat]) => {
    if (!t) return;
    push(findFicha(t, cat) ?? COURO_PRECOS[t] ?? 0);
  });
  push(DESENVOLVIMENTO.find(d => d.label === o.desenvolvimento)?.preco);

  const findDetail = (b: string, cat: string, fb: { label: string; preco: number }[]) =>
    findFicha(b, cat) ?? getCustom(cat).find((x: any) => x.label === b)?.preco ?? fb.find(x => x.label === b)?.preco ?? 0;

  ([
    [o.bordado_cano, 'bordado_cano', BORDADOS_CANO],
    [o.bordado_gaspea, 'bordado_gaspea', BORDADOS_GASPEA],
    [o.bordado_taloneira, 'bordado_taloneira', BORDADOS_TALONEIRA],
  ] as [string, string, any[]][]).forEach(([str, cat, fb]) => {
    if (!str) return;
    str.split(', ').filter(Boolean).forEach(b => push(findDetail(b, cat, fb)));
  });

  if (o.nome_bordado_desc || o.personalizacao_nome) items.push(NOME_BORDADO_PRECO);
  if (o.laser_cano) items.push(LASER_CANO_PRECO);
  if (o.cor_glitter_cano) items.push(GLITTER_CANO_PRECO);
  if (o.laser_gaspea) items.push(LASER_GASPEA_PRECO);
  if (o.cor_glitter_gaspea) items.push(GLITTER_GASPEA_PRECO);
  if (o.pintura === 'Sim') items.push(PINTURA_PRECO);
  if (o.estampa === 'Sim') items.push(ESTAMPA_PRECO);
  push(AREA_METAL.find(a => a.label === o.metais)?.preco);
  if (o.strass_qtd) items.push(o.strass_qtd * STRASS_PRECO);
  if (o.cruz_metal_qtd) items.push(o.cruz_metal_qtd * CRUZ_METAL_PRECO);
  if (o.bridao_metal_qtd) items.push(o.bridao_metal_qtd * BRIDAO_METAL_PRECO);
  const det = o.extra_detalhes || {};
  if (det.cavaloMetal && det.cavaloMetalQtd) items.push(det.cavaloMetalQtd * CAVALO_METAL_PRECO);
  if (o.trisce === 'Sim') items.push(TRICE_PRECO);
  if (o.tiras === 'Sim') items.push(TIRAS_PRECO);
  if (det.franja) items.push(FRANJA_PRECO);
  if (det.corrente) items.push(CORRENTE_PRECO);
  push(SOLADO.find(s => s.label === o.solado)?.preco);
  push(getCorSolaPrecoContextual(o.modelo, o.solado, o.formato_bico, o.cor_sola));
  push(COR_VIRA.find(c => c.label === o.cor_vira)?.preco);
  if (o.costura_atras === 'Sim') items.push(COSTURA_ATRAS_PRECO);
  push(CARIMBO.find(c => c.label === o.carimbo)?.preco);
  if (o.adicional_valor && Number(o.adicional_valor) > 0) items.push(Number(o.adicional_valor));

  return items.reduce((s, v) => s + v, 0);
}

function computeExtraTotal(o: any): number {
  const det = o.extra_detalhes || {};
  let t = 0;
  switch (o.tipo_extra) {
    case 'cinto': {
      const sz = BELT_SIZES.find(s => det.tamanhoCinto?.startsWith(s.label));
      if (sz) t += sz.preco;
      if (det.bordadoP === 'Tem') t += BORDADO_P_PRECO;
      if (det.nomeBordado === 'Tem') t += NOME_BORDADO_CINTO_PRECO;
      if (det.carimbo) { const c = BELT_CARIMBO.find(x => x.label === det.carimbo); if (c) t += c.preco; }
      break;
    }
    case 'tiras_laterais': t += 15; break;
    case 'desmanchar':
      t += 65;
      if (det.qualSola === 'Preta borracha') t += 25;
      else if (det.qualSola === 'De cor borracha') t += 40;
      else if (det.qualSola === 'De couro') t += 60;
      if (det.trocaGaspea === 'Sim') t += 35;
      break;
    case 'kit_canivete': t += 30; if (det.vaiCanivete === 'Sim') t += 30; break;
    case 'kit_faca': t += 35; if (det.vaiCanivete === 'Sim') t += 35; break;
    case 'carimbo_fogo': { const q = parseInt(det.qtdCarimbos) || 1; t += q >= 4 ? 40 : 20; break; }
    case 'revitalizador': t += 10 * (parseInt(det.quantidade) || 1); break;
    case 'kit_revitalizador': t += 26 * (parseInt(det.quantidade) || 1); break;
    case 'gravata_country': t += 30; break;
    case 'adicionar_metais': {
      const sel = det.metaisSelecionados || [];
      if (sel.includes('Bola grande')) t += 0.60 * (parseInt(det.qtdBolaGrande) || 1);
      if (sel.includes('Strass')) t += 0.60 * (parseInt(det.qtdStrass) || 1);
      break;
    }
    case 'chaveiro_carimbo': t += 50; break;
    case 'bainha_cartao': t += 15; break;
    case 'regata': t += 50; break;
    case 'bota_pronta_entrega': t += computeBotaProntaEntregaBruto(o); break;
  }
  return t;
}

// ⚠️ NUNCA usar `o.preco` como bruto: preco é o RESULTADO (já contém ajuste).
// Bruto vem da composição em extra_detalhes.botas[].
function computeBotaProntaEntregaBruto(o: any): number {
  const det: any = o.extra_detalhes || {};
  if (!Array.isArray(det.botas) || det.botas.length === 0) {
    const raiz = parseFloat(det.valorManual);
    if (Number.isFinite(raiz) && raiz > 0) return raiz;
    // Pedidos legados: bruto = preco + desconto (preco = bruto − desconto).
    return Math.max(0, (Number(o.preco) || 0) + (Number(o.desconto) || 0));
  }
  let total = 0;
  for (const b of det.botas) {
    total += parseFloat(b?.valorManual) || 0;
    if (Array.isArray(b?.extras)) {
      for (const ex of b.extras) total += Number(ex?.preco) || 0;
    }
  }
  return total;
}

function computeTotalToSave(o: any, findFicha: any, getCustom: any): number {
  if (o.tipo_extra === 'bota_pronta_entrega') {
    const bruto = computeBotaProntaEntregaBruto(o);
    return Math.max(0, bruto - (Number(o.desconto) || 0));
  }
  const sub = recomputeSubtotal(o, findFicha, getCustom);
  const isExtra = !!o.tipo_extra;
  const qtd = isExtra ? 1 : Math.max(1, Number(o.quantidade) || 1);
  const ajuste = Number(o.desconto) || 0;
  return Math.max(0, sub * qtd - ajuste);
}

// ============================================================
// HANDLER
// ============================================================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let body: any = {};
    try { body = await req.json(); } catch {}
    const batchSize = Math.min(Math.max(Number(body?.batch_size) || 500, 1), 1000);

    // Versão atual
    const { data: counterRow } = await supabase
      .from('system_counters').select('value').eq('key', 'preco_regra_versao').maybeSingle();
    const versaoAtual = Number(counterRow?.value) || 1;

    // Pedidos pendentes (preco_regra_versao IS NULL OR < atual)
    const { data: pedidos, error: selErr } = await supabase
      .from('orders')
      .select('*')
      .or(`preco_regra_versao.is.null,preco_regra_versao.lt.${versaoAtual}`)
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (selErr) throw selErr;
    if (!pedidos || pedidos.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0, updated: 0, versao_atual: versaoAtual, pendentes_restantes: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const lookups = await loadLookups(supabase);

    let updated = 0;
    let processed = 0;
    const errors: string[] = [];

    // Processa em paralelo controlado (10 por vez)
    const CHUNK = 10;
    for (let i = 0; i < pedidos.length; i += CHUNK) {
      const chunk = pedidos.slice(i, i + CHUNK);
      await Promise.all(chunk.map(async (p: any) => {
        try {
          const target = computeTotalToSave(p, lookups.findFicha, lookups.getCustom);
          const current = Number(p.preco) || 0;
          const diff = Math.abs(target - current);
          const patch: any = { preco_regra_versao: versaoAtual };
          if (diff > 0.005) { patch.preco = target; updated++; }
          const { error } = await supabase.from('orders').update(patch).eq('id', p.id);
          if (error) errors.push(`${p.numero}: ${error.message}`);
          processed++;
        } catch (e: any) {
          errors.push(`${p.numero}: ${e.message}`);
        }
      }));
    }

    // Conta restantes
    const { count: restantes } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .or(`preco_regra_versao.is.null,preco_regra_versao.lt.${versaoAtual}`);

    return new Response(JSON.stringify({
      ok: true,
      processed,
      updated,
      versao_atual: versaoAtual,
      pendentes_restantes: restantes || 0,
      errors: errors.slice(0, 10),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('reconciliar-precos error', e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
