import type { ReactNode } from 'react';

export interface SummaryLine {
  label: string;
  value: ReactNode;
}

interface Destaque { label: string; value: ReactNode }

interface Props {
  /** Frase introdutória curta (ex: "Será gerado o relatório de Cobrança."). */
  intro?: ReactNode;
  /** Destaque grande no topo (ex: qtd de pedidos). */
  destaque?: Destaque;
  /** Vários destaques numéricos (Pedidos / Produtos / Valor). */
  destaques?: Destaque[];
  linhas?: SummaryLine[];
  nota?: ReactNode;
}

/**
 * Bloco de resumo padrão exibido dentro do ConfirmPrintDialog antes de gerar PDFs.
 * Mantém visual consistente em todos os pontos do sistema.
 */
export function ReportConfirmSummary({ intro, destaque, destaques, linhas = [], nota }: Props) {
  const visiveis = linhas.filter(l => l.value !== undefined && l.value !== null && l.value !== '');
  const todosDestaques: Destaque[] = [
    ...(destaque ? [destaque] : []),
    ...(destaques || []),
  ];
  return (
    <div className="space-y-3 text-sm">
      {intro && <p className="text-muted-foreground">{intro}</p>}
      {todosDestaques.length > 0 && (
        <div className={`grid gap-2 ${todosDestaques.length === 1 ? 'grid-cols-1' : todosDestaques.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {todosDestaques.map((d, i) => (
            <div key={i} className="rounded-md border bg-muted/50 px-3 py-2 flex flex-col items-start gap-0.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {d.label}
              </span>
              <span className="text-lg font-bold text-foreground leading-tight break-all">{d.value}</span>
            </div>
          ))}
        </div>
      )}
      {visiveis.length > 0 && (
        <ul className="rounded-md border divide-y">
          {visiveis.map((l, i) => (
            <li key={i} className="flex items-start justify-between gap-3 px-3 py-1.5">
              <span className="text-muted-foreground">{l.label}</span>
              <span className="text-right font-medium text-foreground break-words">{l.value}</span>
            </li>
          ))}
        </ul>
      )}
      {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
    </div>
  );
}

/** Helper: formata Set/array em string compacta ou "Todos". */
export function fmtSet(s: Set<string> | string[] | undefined, fallback = 'Todos'): string {
  const arr = s instanceof Set ? [...s] : (s || []);
  if (!arr.length) return fallback;
  if (arr.length <= 3) return arr.join(', ');
  return `${arr.slice(0, 3).join(', ')} +${arr.length - 3}`;
}

/** Helper: período "DE → ATÉ" com fallback. */
export function fmtPeriodo(de?: string, ate?: string, fallback = 'Sem filtro de data'): string {
  if (!de && !ate) return fallback;
  const fmt = (d: string) => {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };
  return `${fmt(de || '')} → ${fmt(ate || '')}`;
}
