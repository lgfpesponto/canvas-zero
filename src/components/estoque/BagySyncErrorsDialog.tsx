import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProdutoErro {
  id: string;
  nome: string;
  sku_base: string | null;
  bagy_sync_status: string | null;
  bagy_sync_at: string | null;
  bagy_last_sync_error: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSyncNow?: () => void;
  syncing?: boolean;
}

const STATUS_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  erro: { label: 'Erro', variant: 'destructive' },
  pendente: { label: 'Pendente', variant: 'secondary' },
  nao_encontrado_na_bagy: { label: 'Não encontrado na Bagy', variant: 'outline' },
};

const statusBadge = (status: string | null, syncAt: string | null) => {
  if (status && STATUS_LABEL[status]) {
    const cfg = STATUS_LABEL[status];
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  }
  if (!syncAt) return <Badge variant="outline">Nunca sincronizado</Badge>;
  return <Badge variant="secondary">Pendente</Badge>;
};

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return '—';
  }
};

const BagySyncErrorsDialog = ({ open, onOpenChange, onSyncNow, syncing }: Props) => {
  const [produtos, setProdutos] = useState<ProdutoErro[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const navigate = useNavigate();

  const fetchList = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('estoque_produtos' as any)
      .select('id,nome,sku_base,bagy_sync_status,bagy_sync_at,bagy_last_sync_error')
      .eq('ativo', true)
      .not('sku_base', 'is', null)
      .or('bagy_sync_status.is.null,bagy_sync_status.in.(pendente,erro,nao_encontrado_na_bagy),bagy_sync_at.is.null')
      .order('nome', { ascending: true });
    setLoading(false);
    if (error) return;
    setProdutos((data as unknown as ProdutoErro[]) || []);
  };

  useEffect(() => {
    if (!open) return;
    fetchList();
    const ch = supabase
      .channel('bagy-sync-errors-dialog-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_produtos' }, fetchList)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [open]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter(
      (p) => p.nome?.toLowerCase().includes(q) || p.sku_base?.toLowerCase().includes(q),
    );
  }, [produtos, busca]);

  const abrirProduto = (p: ProdutoErro) => {
    onOpenChange(false);
    // Reusa filtro por SKU/nome na página Estoque via query string
    const q = p.sku_base || p.nome;
    if (q) navigate(`/estoque?q=${encodeURIComponent(q)}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Produtos com problema na Bagy
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {filtrados.length} produto{filtrados.length === 1 ? '' : 's'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 items-center">
          <Input
            placeholder="Buscar por nome ou SKU..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="flex-1"
          />
          <Button variant="ghost" size="sm" onClick={fetchList} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </Button>
        </div>

        <div className="flex-1 overflow-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0">
              <tr className="text-left">
                <th className="px-3 py-2">Produto</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Último erro</th>
                <th className="px-3 py-2 whitespace-nowrap">Última tentativa</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    Nenhum produto com problema.
                  </td>
                </tr>
              )}
              {filtrados.map((p) => (
                <tr key={p.id} className="border-t hover:bg-muted/40">
                  <td className="px-3 py-2 font-medium">{p.nome}</td>
                  <td className="px-3 py-2 text-xs font-mono text-muted-foreground">
                    {p.sku_base || '—'}
                  </td>
                  <td className="px-3 py-2">{statusBadge(p.bagy_sync_status, p.bagy_sync_at)}</td>
                  <td className="px-3 py-2 max-w-[280px]">
                    {p.bagy_last_sync_error ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="line-clamp-2 text-destructive text-xs cursor-help">
                              {p.bagy_last_sync_error}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[420px] break-words">
                            {p.bagy_last_sync_error}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {fmtDate(p.bagy_sync_at)}
                  </td>
                  <td className="px-3 py-2">
                    <Button variant="ghost" size="sm" onClick={() => abrirProduto(p)}>
                      <ExternalLink size={14} />
                      Abrir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {onSyncNow && (
            <Button onClick={onSyncNow} disabled={syncing}>
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Sincronizar agora
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BagySyncErrorsDialog;
