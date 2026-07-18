import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EstoqueDesconto {
  id: string;
  nome: string;
  tipo: 'pct' | 'fixo';
  valor: number;
  escopo: 'todos' | 'produtos';
  ativo: boolean;
  produtos: string[]; // grupo_keys quando escopo=produtos
}

export interface DescontoAplicado {
  id: string;
  nome: string;
  tipo: 'pct' | 'fixo';
  valor: number;
  precoOriginal: number;
  precoFinal: number;
  valorDesconto: number;
  label: string;
}

const norm = (n: number) => Math.max(0, Math.round(n * 100) / 100);

export function calcularDesconto(preco: number, desc: EstoqueDesconto): number {
  if (desc.tipo === 'pct') {
    return norm(preco * (1 - Math.min(100, desc.valor) / 100));
  }
  return norm(preco - desc.valor);
}

export function getDescontoParaProduto(
  grupoKey: string,
  precoBase: number,
  descontos: EstoqueDesconto[],
): DescontoAplicado | null {
  if (!descontos.length || precoBase <= 0) return null;
  const aplicaveis = descontos.filter(d => d.ativo && (d.escopo === 'todos' || d.produtos.includes(grupoKey)));
  if (!aplicaveis.length) return null;

  let best: { desc: EstoqueDesconto; final: number } | null = null;
  for (const d of aplicaveis) {
    const final = calcularDesconto(precoBase, d);
    if (final >= precoBase) continue; // não abateu nada
    if (!best || final < best.final) best = { desc: d, final };
  }
  if (!best) return null;

  const valorDesconto = norm(precoBase - best.final);
  const label = best.desc.tipo === 'pct'
    ? `-${best.desc.valor}%`
    : `-${valorDesconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;

  return {
    id: best.desc.id,
    nome: best.desc.nome,
    tipo: best.desc.tipo,
    valor: best.desc.valor,
    precoOriginal: precoBase,
    precoFinal: best.final,
    valorDesconto,
    label,
  };
}

export function useDescontosAtivos(refreshKey: number = 0) {
  const [descontos, setDescontos] = useState<EstoqueDesconto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [{ data: descs }, { data: vinculos }] = await Promise.all([
        supabase.from('estoque_descontos' as any).select('*').eq('ativo', true),
        supabase.from('estoque_desconto_produtos' as any).select('*'),
      ]);
      if (cancelled) return;
      const vincMap = new Map<string, string[]>();
      (vinculos as any[] || []).forEach(v => {
        const arr = vincMap.get(v.desconto_id) || [];
        arr.push(v.produto_grupo_key);
        vincMap.set(v.desconto_id, arr);
      });
      setDescontos(
        (descs as any[] || []).map(d => ({
          id: d.id,
          nome: d.nome,
          tipo: d.tipo,
          valor: Number(d.valor),
          escopo: d.escopo,
          ativo: d.ativo,
          produtos: vincMap.get(d.id) || [],
        })),
      );
      setLoading(false);
    };
    load();

    const ch = supabase
      .channel(`estoque-descontos-rt-${Math.random().toString(36).slice(2, 10)}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'estoque_descontos' }, load)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'estoque_desconto_produtos' }, load)
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [refreshKey]);

  return { descontos, loading };
}
