import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Trash2, Copy, Send, FileText, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';

interface Plano {
  id: string;
  titulo: string;
  conteudo?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendToChat?: (content: string) => void;
}

export default function AdminAssistantPlanosDialog({ open, onOpenChange, onSendToChat }: Props) {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<Plano | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('admin_assistant_planos' as any)
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(100);
    if (busca.trim()) q = q.ilike('titulo', `%${busca.trim()}%`);
    const { data, error } = await q;
    setLoading(false);
    if (error) { toast.error('Erro ao carregar planos'); return; }
    setPlanos((data || []) as any);
  };

  useEffect(() => { if (open) { load(); setSelecionado(null); } }, [open]);

  const apagar = async (id: string) => {
    if (!confirm('Apagar este plano?')) return;
    const { error } = await supabase.from('admin_assistant_planos' as any).delete().eq('id', id);
    if (error) { toast.error('Erro ao apagar'); return; }
    toast.success('Plano apagado');
    setSelecionado(null);
    load();
  };

  const copiar = (texto: string) => {
    navigator.clipboard.writeText(texto);
    toast.success('Conteúdo copiado');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            {selecionado ? (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelecionado(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <FileText className="h-4 w-4" /> {selecionado.titulo}
              </>
            ) : (
              <><FileText className="h-4 w-4" /> Planos salvos da IA</>
            )}
          </DialogTitle>
        </DialogHeader>

        {!selecionado ? (
          <>
            <div className="px-4 py-2 border-b">
              <Input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && load()}
                placeholder="Buscar por título..."
                className="h-9"
              />
            </div>
            <ScrollArea className="flex-1 max-h-[60vh]">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : planos.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Nenhum plano salvo ainda. Peça à IA: "salva esse roteiro como plano".
                </p>
              ) : (
                <ul className="divide-y">
                  {planos.map(p => (
                    <li key={p.id} className="px-4 py-3 hover:bg-accent/50 cursor-pointer" onClick={() => setSelecionado(p)}>
                      <div className="font-medium text-sm">{p.titulo}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Atualizado {format(parseISO(p.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </div>
                      {p.tags?.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {p.tags.map(t => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{t}</span>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </>
        ) : (
          <>
            <ScrollArea className="flex-1 max-h-[55vh] px-4 py-3">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{selecionado.conteudo || ''}</ReactMarkdown>
              </div>
            </ScrollArea>
            <div className="px-4 py-3 border-t flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => copiar(selecionado.conteudo || '')}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
              </Button>
              {onSendToChat && (
                <Button variant="outline" size="sm" onClick={() => {
                  onSendToChat(selecionado.conteudo || '');
                  onOpenChange(false);
                  toast.success('Plano colado no chat');
                }}>
                  <Send className="h-3.5 w-3.5 mr-1" /> Mandar pro chat
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={() => apagar(selecionado.id)}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Apagar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
