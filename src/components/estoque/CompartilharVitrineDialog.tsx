import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Copy, Share2, ExternalLink, Search } from 'lucide-react';
import { toast } from 'sonner';
import { encodeVitrineToken, type VitrinePayload } from '@/lib/vitrineToken';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
  search: string;
  tamanhos: Set<string>;
  ficha: Record<string, Set<string>>;
  totalProdutos: number;
  /** admin_master vê toggles de preço/desconto; demais roles não. */
  canTogglePrecos: boolean;
  /** Tamanhos disponíveis (com estoque) para oferecer como filtro no diálogo. */
  tamanhosDisponiveis?: string[];
  /** Recalcula quantos produtos entrariam no link ao aplicar filtros locais. */
  getPreviewCount?: (searchLocal: string, tamanhosLocal: Set<string>) => number;
}

const CompartilharVitrineDialog = ({
  open,
  onClose,
  search,
  tamanhos,
  ficha,
  totalProdutos,
  canTogglePrecos,
  tamanhosDisponiveis = [],
  getPreviewCount,
}: Props) => {
  const [mostrarPreco, setMostrarPreco] = useState(false);
  const [mostrarDesconto, setMostrarDesconto] = useState(false);
  const [searchLocal, setSearchLocal] = useState(search);
  const [tamanhosLocal, setTamanhosLocal] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  // Reset locais quando abre o diálogo (herda o search atual da página; tamanhos começam vazios)
  useEffect(() => {
    if (open) {
      setSearchLocal(search);
      setTamanhosLocal(new Set());
    }
  }, [open, search]);

  const titulo = (user?.nomeLoja || '').trim() || 'Vitrine 7ESTRIVOS';

  // Mostra chips de tamanho SÓ se a página não tem filtro de tamanho ativo
  const mostrarFiltroTamanho = tamanhos.size === 0 && tamanhosDisponiveis.length > 0;

  // Tamanhos efetivos que vão no link: da página se houver, senão os locais
  const tamanhosEfetivos = tamanhos.size > 0 ? tamanhos : tamanhosLocal;

  const url = useMemo(() => {
    const payload: VitrinePayload = {
      search: searchLocal.trim(),
      tamanhos: Array.from(tamanhosEfetivos),
      ficha: Object.fromEntries(Object.entries(ficha).map(([k, v]) => [k, Array.from(v)])),
      mostrarPreco: canTogglePrecos ? mostrarPreco : false,
      mostrarDesconto: canTogglePrecos ? mostrarDesconto : false,
      titulo,
    };
    const token = encodeVitrineToken(payload);
    return `${window.location.origin}/vitrine/${token}`;
  }, [searchLocal, tamanhosEfetivos, ficha, mostrarPreco, mostrarDesconto, titulo, canTogglePrecos]);

  const previewCount = useMemo(() => {
    if (getPreviewCount) return getPreviewCount(searchLocal, tamanhosEfetivos);
    return totalProdutos;
  }, [getPreviewCount, searchLocal, tamanhosEfetivos, totalProdutos]);

  const toggleTamLocal = (t: string) => {
    setTamanhosLocal(prev => {
      const nx = new Set(prev);
      if (nx.has(t)) nx.delete(t);
      else nx.add(t);
      return nx;
    });
  };

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
            <b>{previewCount}</b> produto(s) com os filtros atuais serão incluídos no link.
            O link se atualiza sozinho conforme o estoque muda.
          </p>

          <div className="text-xs">
            <span className="font-semibold">Título: </span>
            <span className="text-muted-foreground">{titulo}</span>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Buscar modelo</label>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchLocal}
                onChange={(e) => setSearchLocal(e.target.value)}
                placeholder="Nome do modelo ou SKU"
                className="h-8 text-xs pl-7"
              />
            </div>
          </div>

          {mostrarFiltroTamanho && (
            <div>
              <label className="text-xs font-semibold block mb-1">Tamanhos</label>
              <div className="flex flex-wrap gap-1.5">
                {tamanhosDisponiveis.map(t => {
                  const on = tamanhosLocal.has(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTamLocal(t)}
                      className={`h-7 min-w-[36px] px-2 rounded-md text-xs font-semibold border transition ${
                        on
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:bg-muted'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              {tamanhosLocal.size > 0 && (
                <button
                  type="button"
                  onClick={() => setTamanhosLocal(new Set())}
                  className="text-[11px] text-muted-foreground hover:text-foreground mt-1 underline"
                >
                  limpar tamanhos
                </button>
              )}
            </div>
          )}

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
