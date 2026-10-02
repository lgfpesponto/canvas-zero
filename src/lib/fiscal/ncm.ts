import { supabase } from '@/integrations/supabase/client';

/** Regras de NCM por palavra-chave. Editáveis em Configurações NF-e (tabela nfe_ncm_regras). */
export type RegraNcm = { id?: string; palavras: string; ncm: string; referencia: string | null; ordem?: number };

const PADRAO: RegraNcm[] = [
  { palavras: 'bota, botas, texana, texanas', ncm: '64039990', referencia: 'BOTA' },
  { palavras: 'cinto, cintos, gravata, gravatas', ncm: '42033000', referencia: 'CINTO' },
  { palavras: 'regata, regatas', ncm: '61061000', referencia: 'EXTRAS' },
  { palavras: 'creme, revitalizador', ncm: '34051000', referencia: 'EXTRAS' },
];

let regras: RegraNcm[] = PADRAO;
let carregado: Promise<void> | null = null;

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function carregarRegrasNcm(force = false): Promise<void> {
  if (!carregado || force) {
    carregado = (async () => {
      const { data, error } = await supabase.from('nfe_ncm_regras' as any).select('*').order('ordem');
      if (!error && data && (data as any[]).length) regras = data as any;
    })().catch(() => {});
  }
  return carregado;
}

export function ncmPorDescricao(texto: string | null | undefined): { ncm: string; ref: string } | null {
  const t = ` ${norm(String(texto ?? '')).replace(/[^a-z0-9]+/g, ' ')} `;
  for (const r of regras) {
    const chaves = r.palavras.split(',').map(p => norm(p.trim())).filter(Boolean);
    if (chaves.some(k => t.includes(` ${k} `))) return { ncm: r.ncm.replace(/\D/g, ''), ref: r.referencia || '' };
  }
  return null;
}

export const formatNcm = (n: string) => (n.length === 8 ? `${n.slice(0, 4)}.${n.slice(4, 6)}.${n.slice(6)}` : n);
