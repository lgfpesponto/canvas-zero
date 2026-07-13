import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Search, X, Check } from 'lucide-react';
import { ScannedQr } from '@/components/ficha/VariacaoFotoIcon';
import { useIsMobile } from '@/hooks/use-mobile';

export interface ExpandirItem {
  label: string;
  preco: number;
  foto_url?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  items: ExpandirItem[];
  selected: string[];
  onToggle: (label: string, checked: boolean) => void;
}

export default function VariacaoExpandirDialog({ open, onOpenChange, title, items, selected, onToggle }: Props) {
  const isMobile = useIsMobile();
  const pageSize = isMobile ? 2 : 6;
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');

  useEffect(() => { setPage(0); }, [query, isMobile]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => i.label.toLowerCase().includes(q));
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(
    () => filtered.slice(page * pageSize, page * pageSize + pageSize),
    [filtered, page, pageSize],
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setPage(0); setQuery(''); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="pr-16">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-base">{title}</DialogTitle>
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-7 px-3 gap-1 mr-6"
            >
              <Check className="h-3.5 w-3.5" /> OK
            </Button>
          </div>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Pesquisar variação..."
            className="pl-8 h-8 text-sm"
          />
        </div>

        {selected.length > 0 && (
          <div className="border rounded-md p-2 bg-muted/40">
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-flex items-center rounded-full bg-primary/15 text-primary text-[11px] font-bold px-2 py-0.5">
                {selected.length} selecionada{selected.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {selected.map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onToggle(name, false)}
                  className="inline-flex items-center gap-1 bg-background border border-border rounded-full px-2 py-0.5 text-[11px] hover:bg-destructive/10 hover:border-destructive/40 transition-colors"
                  title="Remover"
                >
                  <span className="truncate max-w-[160px]">{name}</span>
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
          {pageItems.length === 0 && (
            <p className="col-span-full text-center text-sm text-muted-foreground py-6">
              Nenhuma variação encontrada.
            </p>
          )}
          {pageItems.map(it => (
            <VarCard
              key={it.label}
              item={it}
              checked={selected.includes(it.label)}
              onChange={(c) => onToggle(it.label, c)}
            />
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} className="h-7 text-xs">
            <ChevronLeft className="h-3 w-3 mr-1" /> anterior
          </Button>
          <span className="text-[11px] text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button size="sm" variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} className="h-7 text-xs">
            próxima <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VarCard({ item, checked, onChange }: { item: ExpandirItem; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <div className="border rounded-md p-1.5 flex flex-col items-center gap-1 bg-card">
      <div className="w-full h-28">
        {item.foto_url ? (
          <ScannedQr fotoUrl={item.foto_url} nome={item.label} className="w-full h-full" />
        ) : (
          <div className="w-full h-full bg-white rounded overflow-hidden border flex items-center justify-center text-[11px] text-muted-foreground">
            Sem foto
          </div>
        )}
      </div>
      <label className="flex items-center gap-1.5 w-full cursor-pointer">
        <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
        <span className="text-xs flex-1 truncate">{item.label}</span>
        {item.preco > 0 && <span className="text-[10px] text-muted-foreground">R${item.preco}</span>}
      </label>
    </div>
  );
}
