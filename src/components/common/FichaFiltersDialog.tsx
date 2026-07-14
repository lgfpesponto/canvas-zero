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
// Chaves que nunca aparecem no dialog (Modelo/Gênero ficam pinados no topo; Tamanho de bota removido).
const HIDDEN_KEYS = new Set(['modelo', 'genero', 'tamanho']);
// Categorias excluídas por completo.
const HIDDEN_CATEGORIAS = new Set(['pesponto-visual']);
// Ordem manual: quanto menor o índice, mais acima. Categorias fora da lista vão ao fim.
const CATEGORIA_ORDER: string[] = [
  'couros',
  'solados-visual',
  'bordados-visual',
  'laser-visual',
  'metais-visual',
  'extras-visual',
  'tamanho-genero-modelo',
  'fivelas',
];

function catOrderIdx(slug: string) {
  const i = CATEGORIA_ORDER.indexOf(slug);
  return i === -1 ? 1000 + slug.charCodeAt(0) : i;
}

export default function FichaFiltersDialog({ open, onOpenChange, fichaOptions, selFicha, onToggle, onClear, keys }: Props) {
  const [q, setQ] = useState('');
  const activeKeys = keys && keys.length > 0 ? keys : FICHA_FILTER_KEYS;
  const query = q.trim().toLowerCase();

  const renderChip = (k: FichaFilterKey, v: string) => {
    const active = selFicha[k.key]?.has(v);
    return (
      <button
        key={`${k.key}::${v}`}
        type="button"
        onClick={() => onToggle(k.key, v)}
        className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
          active ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border hover:border-primary'
        }`}
      >
        {v}
      </button>
    );
  };

  const renderCampo = (k: FichaFilterKey, opts: string[], showLabel: boolean) => (
    <div key={k.key}>
      {showLabel && <h4 className="text-sm font-semibold mb-2">{k.label}</h4>}
      <div className="flex flex-wrap gap-1.5">{opts.map(v => renderChip(k, v))}</div>
    </div>
  );

  const allOpts = (k: FichaFilterKey): string[] => [...(fichaOptions[k.key] || [])].sort();

  // Sem query: separa pinned top e agrupa por categoria (com filtros ocultos aplicados).
  const { topKeys, categorias } = useMemo(() => {
    const top: { k: FichaFilterKey; opts: string[] }[] = [];
    const catMap = new Map<string, {
      slug: string;
      nome: string;
      ordem: number;
      campos: { k: FichaFilterKey; opts: string[] }[];
    }>();
    for (const k of activeKeys) {
      const opts = allOpts(k);
      if (opts.length === 0) continue;
      if (PINNED_TOP.includes(k.key)) {
        top.push({ k, opts });
        continue;
      }
      if (HIDDEN_KEYS.has(k.key)) continue;
      const catSlug = k.categoriaSlug || '__outros__';
      if (HIDDEN_CATEGORIAS.has(catSlug)) continue;
      const catNome = k.categoriaNome || 'Outros';
      if (!catMap.has(catSlug)) catMap.set(catSlug, { slug: catSlug, nome: catNome, ordem: catOrderIdx(catSlug), campos: [] });
      catMap.get(catSlug)!.campos.push({ k, opts });
    }
    top.sort((a, b) => PINNED_TOP.indexOf(a.k.key) - PINNED_TOP.indexOf(b.k.key));
    const cats = [...catMap.values()].sort((a, b) => (a.ordem - b.ordem) || a.nome.localeCompare(b.nome));
    for (const c of cats) c.campos.sort((a, b) => (a.k.ordem ?? 0) - (b.k.ordem ?? 0));
    return { topKeys: top, categorias: cats };
  }, [activeKeys, fichaOptions, selFicha]);

  // Com query: lista plana de {campo, valor} que casam com a busca.
  const searchResults = useMemo(() => {
    if (!query) return [] as { k: FichaFilterKey; v: string }[];
    const out: { k: FichaFilterKey; v: string }[] = [];
    for (const k of activeKeys) {
      if (HIDDEN_KEYS.has(k.key)) continue;
      if (k.categoriaSlug && HIDDEN_CATEGORIAS.has(k.categoriaSlug)) continue;
      for (const v of allOpts(k)) {
        if (v.toLowerCase().includes(query)) out.push({ k, v });
      }
    }
    return out;
  }, [activeKeys, fichaOptions, selFicha, query]);

  const countAtivosCat = (catSlug: string) => {
    const cat = categorias.find(c => c.slug === catSlug);
    if (!cat) return 0;
    return cat.campos.reduce((s, { k }) => s + (selFicha[k.key]?.size || 0), 0);
  };

  // Sempre inicia fechado; nunca auto-expande. Ao fechar o modal, reseta.
  const [expanded, setExpanded] = useState<string[]>([]);
  useEffect(() => {
    if (!open) setExpanded([]);
  }, [open]);

  const nada = !query && topKeys.length === 0 && categorias.length === 0;
  const nadaBusca = !!query && searchResults.length === 0;

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
          {nadaBusca && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma variação corresponde à busca.</p>
          )}
          {query && searchResults.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-2">
              {searchResults.map(({ k, v }) => renderChip(k, v))}
            </div>
          )}
          {!query && topKeys.length > 0 && (
            <div className="space-y-4 pb-2 border-b border-border">
              {topKeys.map(({ k, opts }) => renderCampo(k, opts, true))}
            </div>
          )}
          {!query && categorias.length > 0 && (
            <Accordion type="multiple" value={expanded} onValueChange={setExpanded} className="w-full">
              {categorias.map(cat => {
                const ativos = countAtivosCat(cat.slug);
                const soUmCampo = cat.campos.length === 1;
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
                        {cat.campos.map(({ k, opts }) => renderCampo(k, opts, !soUmCampo))}
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
