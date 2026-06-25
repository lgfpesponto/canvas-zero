import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, Eye, ShoppingCart, Filter, X, Package, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import EstoqueBuyDialog from '@/components/estoque/EstoqueBuyDialog';
import EstoqueFoto from '@/components/estoque/EstoqueFoto';

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

const PAGE_SIZE = 25;

const EstoquePage = () => {
  const [rows, setRows] = useState<EstoqueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selTamanhos, setSelTamanhos] = useState<Set<string>>(new Set());
  const [selFicha, setSelFicha] = useState<Record<string, Set<string>>>({});
  const [fichaFilterOpen, setFichaFilterOpen] = useState(false);
  const [fichaFilterSearch, setFichaFilterSearch] = useState('');
  const [page, setPage] = useState(1);
  const [previewProduct, setPreviewProduct] = useState<ProductGroup | null>(null);
  const [buyProduct, setBuyProduct] = useState<ProductGroup | null>(null);
  const [vendedores, setVendedores] = useState<string[]>([]);
  const { isAdmin } = useAuth();

  const handleExcluirTamanho = async (row: EstoqueRow, nomeProduto: string) => {
    const ok = window.confirm(
      `Excluir ${nomeProduto} tam ${row.tamanho} (${row.quantidade} un.) do estoque?\n\n` +
      `Os pedidos originais que geraram esse item ficarão liberados para criar estoque novamente.`
    );
    if (!ok) return;
    const { data, error } = await (supabase.rpc as any)('excluir_estoque_produto', { _produto_id: row.id });
    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
      return;
    }
    const liberados = (data as any)?.pedidos_liberados ?? 0;
    toast.success(`Item removido do estoque. ${liberados} pedido(s) liberado(s) para recriar.`);
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
    const list = groups
      .filter(g => {
        if (q) {
          const hitNome = g.nome.toLowerCase().includes(q);
          const hitSku = g.tamanhos.some(t => t.sku_base.toLowerCase().includes(q));
          if (!hitNome && !hitSku) return false;
        }
        if (selTamanhos.size > 0) {
          // Considera apenas tamanhos com estoque para o filtro de numeração
          if (!g.tamanhos.some(t => t.quantidade > 0 && selTamanhos.has(t.tamanho))) return false;
        }
        for (const k of Object.keys(selFicha)) {
          const set = selFicha[k];
          if (!set || set.size === 0) continue;
          const v = g.ficha_snapshot?.[k];
          if (!v || !set.has(v)) return false;
        }
        return true;
      });
    // Ordena: com estoque primeiro (alfabético), zerados depois (alfabético)
    list.sort((a, b) => {
      const aTot = a.tamanhos.reduce((s, t) => s + t.quantidade, 0);
      const bTot = b.tamanhos.reduce((s, t) => s + t.quantidade, 0);
      const aOut = aTot === 0 ? 1 : 0;
      const bOut = bTot === 0 ? 1 : 0;
      if (aOut !== bOut) return aOut - bOut;
      return a.nome.localeCompare(b.nome);
    });
    return list;
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

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedGroups = useMemo(
    () => filteredGroups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredGroups, currentPage]
  );
  useEffect(() => { setPage(1); }, [search, selTamanhos, selFicha]);

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
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedGroups.map(g => {
            const totalQtd = g.tamanhos.reduce((s, t) => s + t.quantidade, 0);
            const semEstoque = totalQtd === 0;
            return (
            <div key={g.nome + g.tamanhos[0].sku_base} className={`bg-card border border-border rounded-xl overflow-hidden flex flex-col ${semEstoque ? 'opacity-80' : ''}`}>
              <div className="aspect-square bg-muted relative">
                <EstoqueFoto
                  url={g.foto_url}
                  alt={g.nome}
                  grayscale={semEstoque}
                  className="w-full h-full object-cover"
                  wrapperClassName="w-full h-full"
                />
                {semEstoque && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="text-white font-display font-bold text-xl tracking-wider border-2 border-white px-3 py-1 rounded-md -rotate-6">
                      SEM ESTOQUE
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col gap-2">
                <h3 className="font-semibold text-sm leading-tight line-clamp-2">{g.nome}</h3>
                <div className="flex flex-wrap gap-2">
                  {g.tamanhos.map(t => (
                    <div
                      key={t.id}
                      className={`relative flex flex-col items-center rounded-md px-3 py-1.5 min-w-[56px] group ${t.quantidade === 0 ? 'bg-muted/40 text-muted-foreground/60' : 'bg-muted'}`}
                    >
                      <span className="text-lg font-bold leading-none">{t.tamanho}</span>
                      <span className="text-[11px] text-muted-foreground leading-tight mt-0.5">{t.quantidade} un.</span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleExcluirTamanho(t, g.nome)}
                          title="Excluir este tamanho do estoque"
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition shadow"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xl font-bold text-primary mt-auto">
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
                    disabled={semEstoque}
                  >
                    <ShoppingCart size={14} /> {semEstoque ? 'Indisponível' : 'Comprar'}
                  </Button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 mt-6 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {filteredGroups.length} produto(s) · Página {currentPage} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft size={14} /> Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Próxima <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
        </>
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
                <div className="w-full max-h-[400px] flex items-center justify-center bg-muted rounded-lg overflow-hidden">
                  <EstoqueFoto
                    url={previewProduct.foto_url}
                    alt={previewProduct.nome}
                    className="w-full max-h-[400px] object-contain"
                    iframeHeightClass="h-[400px]"
                  />
                </div>
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
    </div>
  );
};

export default EstoquePage;
