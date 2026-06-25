import { useMemo, useState } from 'react';
import { X, Package, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { criarEstoqueEmMassa, type BulkResultItem } from '@/lib/criarEstoqueBulk';

interface PedidoMin {
  id: string;
  numero?: string;
  tamanho?: string;
  quantidade?: number;
  modelo?: string;
  skuEstoque?: string;
  nomeProdutoEstoque?: string;
}

interface Props {
  faltando: PedidoMin[];      // pedidos sem SKU/Nome
  prontos: PedidoMin[];       // pedidos já com SKU/Nome
  onClose: () => void;
  onDone: () => void;         // chamado ao terminar (refetch)
}

interface GroupState {
  numero: string;
  pedidos: PedidoMin[];
  skuBase: string;
  nome: string;
  skuOverrides: Record<string, string>; // id -> sku final manual
}

const stripSizeSuffix = (sku: string, tamanho?: string) => {
  if (!sku) return '';
  if (tamanho && sku.endsWith(`-${tamanho}`)) return sku.slice(0, -1 - tamanho.length);
  return sku.replace(/-\d+$/, '');
};

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const CompletarSkusBulkPanel = ({ faltando, prontos, onClose, onDone }: Props) => {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<BulkResultItem[] | null>(null);

  const [groups, setGroups] = useState<GroupState[]>(() => {
    const byNumero = new Map<string, PedidoMin[]>();
    faltando.forEach(p => {
      const key = p.numero || `__sem_numero_${p.id}`;
      if (!byNumero.has(key)) byNumero.set(key, []);
      byNumero.get(key)!.push(p);
    });
    return Array.from(byNumero.entries()).map(([numero, pedidos]) => {
      const firstWithSku = pedidos.find(p => p.skuEstoque);
      const firstWithNome = pedidos.find(p => p.nomeProdutoEstoque);
      const firstModelo = pedidos.find(p => p.modelo);
      const skuBase = firstWithSku
        ? stripSizeSuffix(firstWithSku.skuEstoque!, firstWithSku.tamanho)
        : firstModelo?.modelo
          ? slugify(firstModelo.modelo)
          : '';
      return {
        numero,
        pedidos: [...pedidos].sort((a, b) => (a.tamanho || '').localeCompare(b.tamanho || '')),
        skuBase,
        nome: firstWithNome?.nomeProdutoEstoque || firstModelo?.modelo || '',
        skuOverrides: {},
      };
    });
  });

  const finalSkuFor = (g: GroupState, p: PedidoMin) =>
    g.skuOverrides[p.id]?.trim() || (g.skuBase ? `${g.skuBase.trim()}-${p.tamanho || ''}` : '');

  const allValid = useMemo(
    () =>
      groups.every(g =>
        g.skuBase.trim() && g.nome.trim() && g.pedidos.every(p => finalSkuFor(g, p).length > 0),
      ),
    [groups],
  );

  const setGroup = (idx: number, patch: Partial<GroupState>) => {
    setGroups(gs => gs.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  };

  const handleSubmit = async () => {
    if (!allValid) {
      toast.error('Preencha SKU base e Nome de todos os grupos.');
      return;
    }
    setRunning(true);
    setResults(null);
    try {
      // 1) salva updates por pedido
      const updates: { id: string; sku: string; nome: string }[] = [];
      for (const g of groups) {
        for (const p of g.pedidos) {
          updates.push({ id: p.id, sku: finalSkuFor(g, p), nome: g.nome.trim() });
        }
      }
      // Faz updates em paralelo (limitado)
      const upBatchSize = 6;
      for (let i = 0; i < updates.length; i += upBatchSize) {
        const batch = updates.slice(i, i + upBatchSize);
        await Promise.all(
          batch.map(u =>
            supabase
              .from('orders')
              .update({ sku_estoque: u.sku, nome_produto_estoque: u.nome })
              .eq('id', u.id),
          ),
        );
      }

      // 2) cria estoque para todos (faltando recém-salvos + prontos)
      const allIds = [
        ...updates.map(u => ({ id: u.id, numero: groups.find(g => g.pedidos.some(p => p.id === u.id))?.numero })),
        ...prontos.map(p => ({ id: p.id, numero: p.numero })),
      ];

      setProgress({ done: 0, total: allIds.length });
      const res = await criarEstoqueEmMassa(allIds, (done, total) => setProgress({ done, total }));
      setResults(res);
      const ok = res.filter(r => r.ok).length;
      const fail = res.length - ok;
      if (fail === 0) {
        toast.success(`Estoque criado para ${ok} pedido(s)!`);
        setTimeout(() => {
          onDone();
          onClose();
        }, 800);
      } else {
        toast.warning(`Concluído: ${ok} criados, ${fail} com erro.`);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar/criar estoque.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mb-4 border-2 border-primary rounded-xl bg-primary/5 p-4 western-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-display font-bold text-primary">
          <Package size={18} />
          Complete SKUs e Nomes ({faltando.length} pedido{faltando.length > 1 ? 's' : ''} faltando · {prontos.length} prontos)
        </div>
        <button onClick={onClose} disabled={running} className="p-1 rounded hover:bg-muted disabled:opacity-50">
          <X size={18} />
        </button>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Pedidos com o mesmo número (mesma grade) compartilham o SKU base e o nome — apenas o sufixo de tamanho muda.
      </p>

      <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
        {groups.map((g, gi) => (
          <div key={g.numero} className="border border-border rounded-lg p-3 bg-card">
            <div className="text-xs font-bold text-muted-foreground mb-2">
              Pedido <span className="font-mono text-foreground">{g.numero}</span> · {g.pedidos.length} tamanho{g.pedidos.length > 1 ? 's' : ''}
            </div>
            <div className="grid sm:grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-xs font-semibold mb-1 block">SKU base *</label>
                <Input
                  value={g.skuBase}
                  onChange={e => setGroup(gi, { skuBase: e.target.value })}
                  placeholder="ex: bota-country-marrom"
                  className="h-8 text-xs font-mono"
                  disabled={running}
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">Nome do produto *</label>
                <Input
                  value={g.nome}
                  onChange={e => setGroup(gi, { nome: e.target.value })}
                  placeholder="Nome visível no estoque"
                  className="h-8 text-xs"
                  disabled={running}
                />
              </div>
            </div>
            <div className="space-y-1">
              {g.pedidos.map(p => {
                const sku = finalSkuFor(g, p);
                return (
                  <div key={p.id} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-20">tam <span className="font-semibold text-foreground">{p.tamanho || '?'}</span></span>
                    <span className="text-muted-foreground">qtd <span className="font-semibold text-foreground">{p.quantidade ?? 1}</span></span>
                    <span className="text-muted-foreground">→</span>
                    <Input
                      value={g.skuOverrides[p.id] ?? sku}
                      onChange={e => setGroup(gi, { skuOverrides: { ...g.skuOverrides, [p.id]: e.target.value } })}
                      className="h-7 text-xs font-mono flex-1"
                      disabled={running}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {results && (
        <div className="mt-3 text-xs space-y-1 max-h-32 overflow-y-auto">
          {results.filter(r => !r.ok).map(r => (
            <div key={r.id} className="flex items-start gap-1 text-destructive">
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
              <span><span className="font-mono">{r.numero || r.id.slice(0, 8)}</span>: {r.error}</span>
            </div>
          ))}
          {results.filter(r => r.ok).length > 0 && (
            <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 size={12} /> {results.filter(r => r.ok).length} estoque(s) criado(s).
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 mt-4">
        {progress && running && (
          <span className="text-xs text-muted-foreground mr-auto inline-flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" />
            {progress.done}/{progress.total}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={onClose} disabled={running}>
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!allValid || running}
          className="orange-gradient text-primary-foreground"
        >
          {running ? <><Loader2 size={14} className="animate-spin" /> Processando…</> : <>Salvar e Criar Estoque →</>}
        </Button>
      </div>
    </div>
  );
};

export default CompletarSkusBulkPanel;
