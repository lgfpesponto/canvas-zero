import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { QRCodeSVG } from 'qrcode.react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

const PAGE_SIZE = 3;

export default function VariacaoExpandirDialog({ open, onOpenChange, title, items, selected, onToggle }: Props) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [items, page],
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setPage(0); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {pageItems.map(it => (
            <VarCard
              key={it.label}
              item={it}
              checked={selected.includes(it.label)}
              onChange={(c) => onToggle(it.label, c)}
            />
          ))}
        </div>
        <div className="flex items-center justify-between pt-2">
          <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
            <ChevronLeft className="h-4 w-4 mr-1" /> anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button size="sm" variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}>
            próxima <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VarCard({ item, checked, onChange }: { item: ExpandirItem; checked: boolean; onChange: (c: boolean) => void }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div className="border rounded-lg p-2 flex flex-col items-center gap-2 bg-card">
      <div className="relative w-full aspect-square bg-white rounded overflow-hidden border">
        {item.foto_url ? (
          <>
            <QRCodeSVG value={item.foto_url} size={256} className="absolute inset-0 w-full h-full" />
            {imgOk && (
              <img
                src={item.foto_url}
                alt={item.label}
                onError={() => setImgOk(false)}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">Sem foto</div>
        )}
      </div>
      <label className="flex items-center gap-2 w-full cursor-pointer">
        <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
        <span className="text-sm flex-1 truncate">{item.label}</span>
        {item.preco > 0 && <span className="text-xs text-muted-foreground">R${item.preco}</span>}
      </label>
    </div>
  );
}
