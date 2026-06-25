import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, Eye, ShoppingCart, Filter, X, Package, Trash2, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import EstoqueBuyDialog from '@/components/estoque/EstoqueBuyDialog';
import EstoqueGradeEditor from '@/components/estoque/EstoqueGradeEditor';
import { useAuth } from '@/contexts/AuthContext';

interface EstoqueRow {
  id: string;
  nome: string;
  sku_base: string;
  tamanho: string;
  quantidade: number;
  preco: number;
  foto_url: string | null;
  ficha_snapshot: Record<string, any>;
  ativo: boolean;
}

interface ProductGroup {
  nome: string;
  foto_url: string | null;
  ficha_snapshot: Record<string, any>;
  preco: number;
  tamanhos: EstoqueRow[]; // sorted by tamanho
}

const FICHA_FILTER_KEYS: { key: string; label: string }[] = [
  { key: 'modelo', label: 'Modelo' },
  { key: 'tipo_couro_cano', label: 'Tipo Couro Cano' },
  { key: 'tipo_couro_gaspea', label: 'Tipo Couro Gáspea' },
  { key: 'solado', label: 'Solado' },
  { key: 'genero', label: 'Gênero' },
];

const EstoquePage = () => {
  const [rows, setRows] = useState<EstoqueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selTamanhos, setSelTamanhos] = useState<Set<string>>(new Set());
  const [selFicha, setSelFicha] = useState<Record<string, Set<string>>>({});
  const [fichaFilterOpen, setFichaFilterOpen] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<ProductGroup | null>(null);
  const [buyProduct, setBuyProduct] = useState<ProductGroup | null>(null);
  const [vendedores, setVendedores] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<ProductGroup | null>(null);
  const { user } = useAuth();
  const isAdmin = !!user && ['admin_master', 'admin_producao', 'admin'].includes(user.role || '');

  const handleDeleteProduct = async (g: ProductGroup) => {
    const ids = g.tamanhos.map(t => t.id);
    if (ids.length === 0) return;
    if (!window.confirm(`Excluir definitivamente o produto "${g.nome}" do estoque? Todas as ${ids.length} entradas de tamanho serão removidas. Pedidos e histórico permanecem intactos.`)) return;
    const { error } = await supabase.from('estoque_produtos' as any).delete().in('id', ids);
    if (error) { toast.error(error.message); return; }
    toast.success('Produto removido do estoque.');
    fetchRows();
  };

  const fetchRows = async () => {
    const { data, error } = await supabase
      .from('estoque_produtos' as any)
      .select('*')
      .eq('ativo', true)
      .order('nome');
    if (error) {
      toast.error('Erro ao carregar estoque: ' + error.message);
    } else {
      setRows((data || []) as any);
    }
  };

  useEffect(() => {
    (async () => {
      await fetchRows();
      setLoading(false);
      // carrega lista de vendedores (admin)
      const { data: profs } = await supabase.from('profiles').select('nome_completo').order('nome_completo');
      setVendedores((profs || []).map((p: any) => p.nome_completo).filter(Boolean));
    })();

    // Realtime: estoque cai ao vivo para todos
    const ch = supabase
      .channel('estoque-produtos-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_produtos' }, () => {
        fetchRows();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Agrupa por nome+sku_base (produto base)
  const groups: ProductGroup[] = useMemo(() => {
    const map = new Map<string, ProductGroup>();
    for (const r of rows) {
      const key = `${r.nome}::${r.sku_base.split('-').slice(0, -1).join('-') || r.sku_base}`;
      // chave de agrupamento: nome + raiz do sku (tudo menos o último segmento, geralmente o tamanho)
      if (!map.has(key)) {
        map.set(key, {
          nome: r.nome,
          foto_url: r.foto_url,
          ficha_snapshot: r.ficha_snapshot || {},
          preco: r.preco,
          tamanhos: [],
        });
      }
      map.get(key)!.tamanhos.push(r);
    }
    for (const g of map.values()) {
      g.tamanhos.sort((a, b) => Number(a.tamanho) - Number(b.tamanho));
    }
    return [...map.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [rows]);

  // Opções de filtros derivadas
  const allTamanhos = useMemo(() => [...new Set(rows.map(r => r.tamanho))].sort((a, b) => Number(a) - Number(b)), [rows]);
  const fichaOptions = useMemo(() => {
    const out: Record<string, Set<string>> = {};
    for (const k of FICHA_FILTER_KEYS) out[k.key] = new Set();
    for (const r of rows) {
      for (const k of FICHA_FILTER_KEYS) {
        const v = r.ficha_snapshot?.[k.key];
        if (v && typeof v === 'string') out[k.key].add(v);
      }
    }
    return out;
  }, [rows]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups
      .map(g => ({ ...g, tamanhos: g.tamanhos.filter(t => t.quantidade > 0) }))
      .filter(g => g.tamanhos.length > 0)
      .filter(g => {
        if (q) {
          const hitNome = g.nome.toLowerCase().includes(q);
          const hitSku = g.tamanhos.some(t => t.sku_base.toLowerCase().includes(q));
          if (!hitNome && !hitSku) return false;
        }
        if (selTamanhos.size > 0) {
          if (!g.tamanhos.some(t => selTamanhos.has(t.tamanho))) return false;
        }
        for (const k of Object.keys(selFicha)) {
          const set = selFicha[k];
          if (!set || set.size === 0) continue;
          const v = g.ficha_snapshot?.[k];
          if (!v || !set.has(v)) return false;
        }
        return true;
      });
  }, [groups, search, selTamanhos, selFicha]);

  const toggleTam = (t: string) => {
    setSelTamanhos(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };

  const toggleFicha = (k: string, v: string) => {
    setSelFicha(prev => {
      const cur = new Set(prev[k] || []);
      if (cur.has(v)) cur.delete(v); else cur.add(v);
      return { ...prev, [k]: cur };
    });
  };

  const activeFichaCount = Object.values(selFicha).reduce((s, set) => s + (set?.size || 0), 0);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex items-center gap-3 mb-6">
        <Package className="text-primary" size={28} />
        <h1 className="text-2xl md:text-3xl font-display font-bold">Estoque</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          {/* Scanner-style: input sempre focado e quase invisível para QR */}
          <input
            type="text"
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou SKU... (ou escanear código)"
            className="w-full bg-muted rounded-lg pl-10 pr-4 py-2.5 text-sm border border-border focus:border-primary outline-none"
          />
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
        <Button
          variant="outline"
          onClick={() => setFichaFilterOpen(true)}
          className="md:w-auto"
        >
          <Filter size={14} /> Filtros da ficha
          {activeFichaCount > 0 && <Badge className="ml-2">{activeFichaCount}</Badge>}
        </Button>
      </div>

      {/* Chips de tamanho */}
      {allTamanhos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Numeração:</span>
          {allTamanhos.map(t => {
            const active = selTamanhos.has(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTam(t)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  active ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border hover:border-primary'
                }`}
              >
                {t}
              </button>
            );
          })}
          {(selTamanhos.size > 0 || activeFichaCount > 0) && (
            <button
              type="button"
              onClick={() => { setSelTamanhos(new Set()); setSelFicha({}); }}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 ml-2"
            >
              <X size={12} /> Limpar filtros
            </button>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Carregando estoque…</p>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <Package size={32} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {rows.length === 0
              ? 'Nenhum produto em estoque ainda. Crie pedidos com vendedor "Estoque" e gere a partir da etapa Baixa Estoque.'
              : 'Nenhum produto encontrado com esses filtros.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredGroups.map(g => (
            <div key={g.nome + g.tamanhos[0].sku_base} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
              <div className="aspect-square bg-muted relative">
                {g.foto_url ? (
                  // eslint-disable-next-line jsx-a11y/img-redundant-alt
                  <img src={g.foto_url} alt={g.nome} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Package size={32} />
                  </div>
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col gap-2">
                <h3 className="font-semibold text-sm leading-tight line-clamp-2">{g.nome}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {g.tamanhos.map(t => (
                    <div key={t.id} className="flex flex-col items-center bg-muted rounded px-2 py-1 min-w-[44px]">
                      <span className="text-xs font-bold leading-tight">{t.tamanho}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{t.quantidade} un.</span>
                      <span className="text-[9px] text-muted-foreground/70 font-mono leading-none truncate max-w-[60px]" title={t.sku_base}>{t.sku_base}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm font-bold text-primary mt-auto">
                  {g.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <div className="flex gap-2 mt-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setPreviewProduct(g)}>
                    <Eye size={14} /> Ver
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 orange-gradient text-primary-foreground"
                    onClick={() => setBuyProduct(g)}
                  >
                    <ShoppingCart size={14} /> Comprar
                  </Button>
                </div>
                {isAdmin && (
                  <div className="flex gap-2 mt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                      const full = groups.find(x => x.nome === g.nome && x.tamanhos[0]?.sku_base.replace(/-[^-]+$/, '') === g.tamanhos[0]?.sku_base.replace(/-[^-]+$/, ''));
                      setEditingProduct(full || g);
                    }}>
                      <Pencil size={14} /> Editar grade
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => {
                      const full = groups.find(x => x.nome === g.nome && x.tamanhos[0]?.sku_base.replace(/-[^-]+$/, '') === g.tamanhos[0]?.sku_base.replace(/-[^-]+$/, ''));
                      handleDeleteProduct(full || g);
                    }}>
                      <Trash2 size={14} /> Excluir
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview product */}
      <Dialog open={!!previewProduct} onOpenChange={(v) => !v && setPreviewProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewProduct?.nome}</DialogTitle>
          </DialogHeader>
          {previewProduct && (
            <div className="space-y-4">
              {previewProduct.foto_url && (
                <img src={previewProduct.foto_url} alt={previewProduct.nome} className="w-full max-h-[400px] object-contain rounded-lg" />
              )}
              <div>
                <h4 className="text-sm font-semibold mb-1">Tamanhos disponíveis</h4>
                <div className="flex flex-wrap gap-2">
                  {previewProduct.tamanhos.map(t => (
                    <div key={t.id} className="bg-muted rounded px-3 py-1.5 text-xs">
                      <span className="font-bold">{t.tamanho}</span> · {t.quantidade} un. · <span className="font-mono text-muted-foreground">{t.sku_base}</span>
                    </div>
                  ))}
                </div>
              </div>
              {Object.keys(previewProduct.ficha_snapshot || {}).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Especificações</h4>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {Object.entries(previewProduct.ficha_snapshot).map(([k, v]) =>
                      v ? (
                        <div key={k} className="flex justify-between border-b border-border/40 py-1">
                          <dt className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</dt>
                          <dd className="font-medium text-right">{String(v)}</dd>
                        </div>
                      ) : null
                    )}
                  </dl>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Filtros da ficha */}
      <Dialog open={fichaFilterOpen} onOpenChange={setFichaFilterOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Filtros da ficha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {FICHA_FILTER_KEYS.map(({ key, label }) => {
              const opts = [...(fichaOptions[key] || [])].sort();
              if (opts.length === 0) return null;
              return (
                <div key={key}>
                  <h4 className="text-sm font-semibold mb-2">{label}</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {opts.map(v => {
                      const active = selFicha[key]?.has(v);
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => toggleFicha(key, v)}
                          className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                            active ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border hover:border-primary'
                          }`}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between gap-2 pt-2">
            <Button variant="outline" onClick={() => setSelFicha({})}>Limpar</Button>
            <Button onClick={() => setFichaFilterOpen(false)}>Aplicar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <EstoqueBuyDialog
        open={!!buyProduct}
        onClose={() => setBuyProduct(null)}
        produto={buyProduct}
        vendedores={vendedores}
        onSuccess={fetchRows}
      />

      <EstoqueGradeEditor
        open={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        produtoNome={editingProduct?.nome || null}
        rows={(editingProduct?.tamanhos || []) as any}
        onSaved={fetchRows}
      />
    </div>
  );
};

export default EstoquePage;
