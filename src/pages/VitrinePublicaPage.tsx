import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Package } from 'lucide-react';
import EstoqueFoto from '@/components/estoque/EstoqueFoto';
import { decodeVitrineToken, type VitrinePayload } from '@/lib/vitrineToken';
import { buildFichaOptions, matchesFichaFilters, useFichaFilterKeys } from '@/lib/fichaFilterKeys';
import { estoqueGroupKey } from '@/lib/estoqueGroupKey';
import { useDescontosAtivos, getDescontoParaProduto } from '@/lib/estoqueDescontos';
import logo from '@/assets/logo-7estrivos.png';

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
  tamanhos: EstoqueRow[];
}

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Atualiza/insere uma meta tag no <head>
const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const VitrinePublicaPage = () => {
  const { token } = useParams();
  const payload: VitrinePayload | null = useMemo(() => (token ? decodeVitrineToken(token) : null), [token]);
  const [rows, setRows] = useState<EstoqueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const fichaKeys = useFichaFilterKeys(['bota', 'cinto']);
  const { descontos } = useDescontosAtivos();

  const titulo = payload?.titulo || 'Vitrine 7ESTRIVOS';

  // <title>, og:title, og:description sincronizados
  useEffect(() => {
    const prev = document.title;
    document.title = titulo;
    setMeta('property', 'og:title', titulo);
    setMeta('name', 'twitter:title', titulo);
    setMeta('property', 'og:description', 'Produtos disponíveis em estoque · atualizado em tempo real');
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:url', window.location.href);
    return () => { document.title = prev; };
  }, [titulo]);

  useEffect(() => {
    if (!payload) { setLoading(false); return; }
    let cancelled = false;
    const fetchRows = async () => {
      const { data, error } = await supabase
        .from('estoque_produtos' as any)
        .select('id, nome, sku_base, tamanho, quantidade, preco, foto_url, ficha_snapshot, ativo')
        .eq('ativo', true)
        .order('nome');
      if (cancelled) return;
      if (!error) setRows((data || []) as any);
      setLoading(false);
    };
    fetchRows();
    const ch = supabase
      .channel('vitrine-public-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_produtos' }, () => {
        fetchRows();
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [payload]);

  const groups: ProductGroup[] = useMemo(() => {
    const map = new Map<string, ProductGroup>();
    for (const r of rows) {
      const key = estoqueGroupKey(r.nome, r.sku_base);
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
    return [...map.values()];
  }, [rows]);

  const filteredGroups = useMemo(() => {
    if (!payload) return [];
    const q = payload.search.trim().toLowerCase();
    const selTam = new Set(payload.tamanhos);
    const selFicha: Record<string, Set<string>> = Object.fromEntries(
      Object.entries(payload.ficha).map(([k, v]) => [k, new Set(v)])
    );
    const list = groups.filter((g) => {
      if (q) {
        const hitNome = g.nome.toLowerCase().includes(q);
        const hitSku = g.tamanhos.some((t) => t.sku_base.toLowerCase().includes(q));
        if (!hitNome && !hitSku) return false;
      }
      // Filtro de tamanho: só mostra se algum dos tamanhos filtrados tiver estoque > 0
      if (selTam.size > 0) {
        if (!g.tamanhos.some((t) => selTam.has(t.tamanho) && t.quantidade > 0)) return false;
      } else {
        // Sem filtro de tamanho: só mostra produtos que ainda tenham algum estoque
        if (!g.tamanhos.some((t) => t.quantidade > 0)) return false;
      }
      if (!matchesFichaFilters(g.ficha_snapshot, selFicha, fichaKeys)) return false;
      return true;
    });
    list.sort((a, b) => a.nome.localeCompare(b.nome));
    return list;
  }, [groups, payload, fichaKeys]);

  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <Package className="mx-auto text-muted-foreground mb-3" size={40} />
          <p className="text-sm text-muted-foreground">Link inválido ou expirado.</p>
        </div>
      </div>
    );
  }

  const mostrarPreco = payload.mostrarPreco;
  const mostrarDesconto = payload.mostrarPreco && payload.mostrarDesconto;
  const selTam = new Set(payload.tamanhos);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 max-w-6xl flex items-center gap-3">
          <img src={logo} alt="7 Estrivos" className="h-9 w-auto" />
          <div className="flex-1">
            <h1 className="text-sm md:text-base font-display font-bold leading-tight">{titulo}</h1>
            <p className="text-[11px] text-muted-foreground">Produtos disponíveis em estoque</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {loading ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Carregando…</p>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <Package size={32} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum produto disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map((g) => {
              // Filtro de tamanho: só mostra os tamanhos filtrados que ainda têm estoque
              const tamanhosMostrados = selTam.size > 0
                ? g.tamanhos.filter((t) => selTam.has(t.tamanho) && t.quantidade > 0)
                : g.tamanhos.filter((t) => t.quantidade > 0);
              const grupoKey = estoqueGroupKey(g.nome, g.tamanhos[0].sku_base);
              const desc = mostrarDesconto ? getDescontoParaProduto(grupoKey, g.preco, descontos) : null;
              return (
                <div
                  key={grupoKey}
                  className="bg-card border border-border rounded-xl overflow-hidden flex flex-col"
                >
                  <div className="aspect-square bg-muted relative">
                    <EstoqueFoto
                      url={g.foto_url}
                      alt={g.nome}
                      className="w-full h-full object-cover"
                      wrapperClassName="w-full h-full"
                    />
                    {desc && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full shadow">
                        {desc.label}
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col gap-2">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2">{g.nome}</h3>

                    <div className="flex flex-wrap gap-1.5">
                      {tamanhosMostrados.map((t) => (
                        <div
                          key={t.id}
                          className="flex flex-col items-center rounded-md px-2.5 py-1 min-w-[48px] bg-muted"
                        >
                          <span className="text-base font-bold leading-none">{t.tamanho}</span>
                          <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                            {t.quantidade} un.
                          </span>
                        </div>
                      ))}
                    </div>

                    {mostrarPreco && (
                      <div className="mt-auto pt-1 space-y-1">
                        {desc ? (
                          <>
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-xs line-through text-muted-foreground">
                                {formatBRL(g.preco)}
                              </span>
                              <span className="text-xl font-bold text-primary">
                                {formatBRL(desc.precoFinal)}
                              </span>
                            </div>
                            <div className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-semibold rounded-full px-2 py-0.5">
                              {desc.label} de desconto · {desc.nome}
                            </div>
                          </>
                        ) : (
                          <span className="text-xl font-bold text-primary">{formatBRL(g.preco)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-center text-muted-foreground mt-8">
          Estoque atualizado em tempo real · 7 Estrivos
        </p>
      </main>
    </div>
  );
};

export default VitrinePublicaPage;
