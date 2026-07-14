import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { FICHA_FILTER_KEYS } from '@/lib/fichaFilterKeys';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fichaOptions: Record<string, Set<string>>;
  selFicha: Record<string, Set<string>>;
  onToggle: (k: string, v: string) => void;
  onClear: () => void;
}

export default function FichaFiltersDialog({ open, onOpenChange, fichaOptions, selFicha, onToggle, onClear }: Props) {
  const [q, setQ] = useState('');
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
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {(() => {
            const query = q.trim().toLowerCase();
            const blocos = FICHA_FILTER_KEYS.map(({ key, label }) => {
              let opts = [...(fichaOptions[key] || [])].sort();
              if (query) {
                const labelMatch = label.toLowerCase().includes(query);
                if (!labelMatch) opts = opts.filter(v => v.toLowerCase().includes(query));
              }
              return { key, label, opts };
            }).filter(b => b.opts.length > 0);
            if (blocos.length === 0) {
              return <p className="text-sm text-muted-foreground text-center py-6">Nenhum filtro encontrado.</p>;
            }
            return blocos.map(({ key, label, opts }) => (
              <div key={key}>
                <h4 className="text-sm font-semibold mb-2">{label}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {opts.map(v => {
                    const active = selFicha[key]?.has(v);
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => onToggle(key, v)}
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
            ));
          })()}
        </div>
        <div className="flex justify-between gap-2 pt-2">
          <Button variant="outline" onClick={onClear}>Limpar</Button>
          <Button onClick={() => onOpenChange(false)}>Aplicar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
