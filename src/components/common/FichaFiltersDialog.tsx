import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { FICHA_FILTER_KEYS, type FichaFilterKey } from '@/lib/fichaFilterKeys';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fichaOptions: Record<string, Set<string>>;
  selFicha: Record<string, Set<string>>;
  onToggle: (k: string, v: string) => void;
  onClear: () => void;
  keys?: FichaFilterKey[];
}

const PINNED_TOP = ['modelo', 'genero'];

export default function FichaFiltersDialog({ open, onOpenChange, fichaOptions, selFicha, onToggle, onClear, keys }: Props) {
  const [q, setQ] = useState('');
  const activeKeys = keys && keys.length > 0 ? keys : FICHA_FILTER_KEYS;
  const query = q.trim().toLowerCase();

  // Bloco reutilizável: renderiza um campo (label + chips) filtrando por query.
  const renderCampo = (k: FichaFilterKey, opts: string[]) => (
    <div key={k.key}>
      <h4 className="text-sm font-semibold mb-2">{k.label}</h4>
      <div className="flex flex-wrap gap-1.5">
        {opts.map(v => {
          const active = selFicha[k.key]?.has(v);
          return (
            <button
              key={v}
              type="button"
              onClick={() => onToggle(k.key, v)}
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

  const filterOpts = (k: FichaFilterKey): string[] => {
    let opts = [...(fichaOptions[k.key] || [])].sort();
    if (query) {
      const labelMatch = k.label.toLowerCase().includes(query);
      if (!labelMatch) opts = opts.filter(v => v.toLowerCase().includes(query));
    }
    return opts;
  };

  // Separa pinned top (Modelo/Gênero) do restante e agrupa por categoria.
  const { topKeys, categorias } = useMemo(() => {
    const top: { k: FichaFilterKey; opts: string[] }[] = [];
    const catMap = new Map<string, {
      slug: string;
      nome: string;
      ordem: number;
      campos: { k: FichaFilterKey; opts: string[] }[];
    }>();
    for (const k of activeKeys) {
      const opts = filterOpts(k);
      if (opts.length === 0) continue;
      if (PINNED_TOP.includes(k.key)) {
        top.push({ k, opts });
        continue;
      }
      const catSlug = k.categoriaSlug || '__outros__';
      const catNome = k.categoriaNome || 'Outros';
      const catOrdem = k.categoriaOrdem ?? 9999;
      if (!catMap.has(catSlug)) catMap.set(catSlug, { slug: catSlug, nome: catNome, ordem: catOrdem, campos: [] });
      catMap.get(catSlug)!.campos.push({ k, opts });
    }
    // Ordena top pela ordem em PINNED_TOP.
    top.sort((a, b) => PINNED_TOP.indexOf(a.k.key) - PINNED_TOP.indexOf(b.k.key));
    const cats = [...catMap.values()].sort((a, b) => (a.ordem - b.ordem) || a.nome.localeCompare(b.nome));
    // Ordena campos dentro da categoria pela ordem do campo.
    for (const c of cats) c.campos.sort((a, b) => (a.k.ordem ?? 0) - (b.k.ordem ?? 0));
    return { topKeys: top, categorias: cats };
  }, [activeKeys, fichaOptions, selFicha, query]);

  const countAtivosCat = (catSlug: string) => {
    const cat = categorias.find(c => c.slug === catSlug);
    if (!cat) return 0;
    return cat.campos.reduce((s, { k }) => s + (selFicha[k.key]?.size || 0), 0);
  };

  // Expande automaticamente categorias com filtro ativo ou com match de busca.
  const [expanded, setExpanded] = useState<string[]>([]);
  useEffect(() => {
    if (!open) return;
    const auto = new Set<string>();
    for (const cat of categorias) {
      const hasActive = cat.campos.some(({ k }) => (selFicha[k.key]?.size || 0) > 0);
      if (hasActive || query) auto.add(cat.slug);
    }
    setExpanded(prev => Array.from(new Set([...prev, ...auto])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, categorias.length]);

  const nada = topKeys.length === 0 && categorias.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Filtros da ficha</DialogTitle>
        </DialogHeader>
        <div className="relative mb-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar filtro por palavra-chave..."
            className="pl-9"
          />
        </div>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {nada && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum filtro encontrado.</p>
          )}
          {topKeys.length > 0 && (
            <div className="space-y-4 pb-2 border-b border-border">
              {topKeys.map(({ k, opts }) => renderCampo(k, opts))}
            </div>
          )}
          {categorias.length > 0 && (
            <Accordion type="multiple" value={expanded} onValueChange={setExpanded} className="w-full">
              {categorias.map(cat => {
                const ativos = countAtivosCat(cat.slug);
                return (
                  <AccordionItem key={cat.slug} value={cat.slug} className="border-border">
                    <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                      <span className="flex items-center gap-2">
                        {cat.nome}
                        {ativos > 0 && (
                          <Badge variant="secondary" className="h-5 px-1.5">{ativos}</Badge>
                        )}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-1">
                        {cat.campos.map(({ k, opts }) => renderCampo(k, opts))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
        <div className="flex justify-between gap-2 pt-2">
          <Button variant="outline" onClick={onClear}>Limpar</Button>
          <Button onClick={() => onOpenChange(false)}>Aplicar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
