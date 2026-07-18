import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Copy, Share2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { encodeVitrineToken, type VitrinePayload } from '@/lib/vitrineToken';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  search: string;
  tamanhos: Set<string>;
  ficha: Record<string, Set<string>>;
  totalProdutos: number;
  /** admin_master vê toggles de preço/desconto; demais roles não. */
  canTogglePrecos: boolean;
}

const CompartilharVitrineDialog = ({ open, onClose, search, tamanhos, ficha, totalProdutos, canTogglePrecos }: Props) => {
  const [mostrarPreco, setMostrarPreco] = useState(false);
  const [mostrarDesconto, setMostrarDesconto] = useState(false);
  const { user } = useAuth();

  const titulo = (user?.nomeLoja || '').trim() || 'Vitrine 7ESTRIVOS';

  const url = useMemo(() => {
    const payload: VitrinePayload = {
      search: search.trim(),
      tamanhos: Array.from(tamanhos),
      ficha: Object.fromEntries(Object.entries(ficha).map(([k, v]) => [k, Array.from(v)])),
      mostrarPreco: canTogglePrecos ? mostrarPreco : false,
      mostrarDesconto: canTogglePrecos ? mostrarDesconto : false,
      titulo,
    };
    const token = encodeVitrineToken(payload);
    const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    return `https://${projectRef}.functions.supabase.co/vitrine-preview?t=${token}`;

  }, [search, tamanhos, ficha, mostrarPreco, mostrarDesconto, titulo, canTogglePrecos]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const abrir = () => window.open(url, '_blank');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 size={16} /> Compartilhar vitrine
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground">
            <b>{totalProdutos}</b> produto(s) com os filtros atuais serão incluídos no link.
            O link se atualiza sozinho conforme o estoque muda.
          </p>

          <div className="text-xs">
            <span className="font-semibold">Título: </span>
            <span className="text-muted-foreground">{titulo}</span>
          </div>

          {canTogglePrecos ? (
            <div className="space-y-2 border border-border rounded-md p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold">Mostrar preços</label>
                <Switch checked={mostrarPreco} onCheckedChange={setMostrarPreco} />
              </div>
              <div className="flex items-center justify-between">
                <label className={`text-xs font-semibold ${!mostrarPreco ? 'opacity-40' : ''}`}>Mostrar descontos</label>
                <Switch checked={mostrarDesconto && mostrarPreco} onCheckedChange={setMostrarDesconto} disabled={!mostrarPreco} />
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">
              Esta vitrine será compartilhada sem preços (regra para vendedores).
            </p>
          )}

          <div>
            <label className="text-xs font-semibold block mb-1">Link</label>
            <div className="flex gap-2">
              <Input value={url} readOnly className="h-8 text-xs font-mono" onFocus={(e) => e.currentTarget.select()} />
              <Button size="sm" variant="outline" onClick={copiar} title="Copiar"><Copy size={14} /></Button>
              <Button size="sm" variant="outline" onClick={abrir} title="Abrir"><ExternalLink size={14} /></Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CompartilharVitrineDialog;
