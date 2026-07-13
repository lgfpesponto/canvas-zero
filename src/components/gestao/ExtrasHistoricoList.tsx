import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Eye, RotateCcw, History } from 'lucide-react';
import { toast } from 'sonner';

interface Versao {
  id: string;
  versao: number;
  snapshot: any;
  descricao_mudanca: string | null;
  criado_por: string | null;
  ativa: boolean;
  created_at: string;
}

export default function ExtrasHistoricoList() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canRevert = user?.role === 'admin_master';
  const [detalhe, setDetalhe] = useState<Versao | null>(null);
  const [revertTarget, setRevertTarget] = useState<Versao | null>(null);
  const [reverting, setReverting] = useState(false);

  const { data: versoes = [], isLoading } = useQuery({
    queryKey: ['extra_produtos_versoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('extra_produtos_versoes' as any)
        .select('*')
        .order('versao', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Versao[];
    },
  });

  const { data: authorNames = {} } = useQuery({
    queryKey: ['extra_versoes_authors', versoes.map(v => v.criado_por).filter(Boolean).join(',')],
    queryFn: async () => {
      const ids = Array.from(new Set(versoes.map(v => v.criado_por).filter(Boolean))) as string[];
      if (!ids.length) return {} as Record<string, string>;
      const { data } = await supabase.from('profiles').select('id, nome_completo').in('id', ids);
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.id] = p.nome_completo; });
      return map;
    },
    enabled: versoes.length > 0,
  });

  const handleRevert = async () => {
    if (!revertTarget) return;
    setReverting(true);
    try {
      const snap = revertTarget.snapshot as any[];
      if (!Array.isArray(snap)) throw new Error('Snapshot inválido');
      // Apaga tudo e recria a partir do snapshot (trigger vai gerar nova versão)
      const { error: delErr } = await supabase.from('extra_produtos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (delErr) throw delErr;
      const rows = snap.map((r: any) => ({
        id: r.id,
        slug: r.slug,
        nome: r.nome,
        preco_base: r.preco_base,
        preco_label: r.preco_label,
        variacoes: r.variacoes,
        ordem: r.ordem,
        ativo: r.ativo,
      }));
      const { error: insErr } = await supabase.from('extra_produtos').insert(rows);
      if (insErr) throw insErr;
      toast.success(`Revertido para versão ${revertTarget.versao}`);
      qc.invalidateQueries({ queryKey: ['extra_produtos'] });
      qc.invalidateQueries({ queryKey: ['extra_produtos_versoes'] });
      setRevertTarget(null);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao reverter');
    } finally {
      setReverting(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Carregando histórico...</p>;
  }

  if (!versoes.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <History className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">Nenhuma versão registrada ainda.</p>
          <p className="text-xs mt-1">O histórico será criado automaticamente quando um produto extra for editado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {versoes.map(v => {
          const snap = Array.isArray(v.snapshot) ? v.snapshot : [];
          const autor = v.criado_por ? (authorNames[v.criado_por] || '—') : '—';
          return (
            <Card key={v.id}>
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold">v{v.versao}</span>
                    {v.ativa && <Badge className="text-[10px]">ativa</Badge>}
                    <span className="text-xs text-muted-foreground">
                      {new Date(v.created_at).toLocaleString('pt-BR')} · {autor} · {snap.length} produtos
                    </span>
                  </div>
                  {v.descricao_mudanca && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{v.descricao_mudanca}</p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => setDetalhe(v)} className="h-8 gap-1">
                  <Eye className="h-3.5 w-3.5" /> ver
                </Button>
                {canRevert && !v.ativa && (
                  <Button size="sm" variant="ghost" onClick={() => setRevertTarget(v)} className="h-8 gap-1">
                    <RotateCcw className="h-3.5 w-3.5" /> reverter
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!detalhe} onOpenChange={o => !o && setDetalhe(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Versão {detalhe?.versao} — snapshot dos extras</DialogTitle>
          </DialogHeader>
          {detalhe && Array.isArray(detalhe.snapshot) && (
            <div className="space-y-2">
              {(detalhe.snapshot as any[]).map((p: any) => (
                <div key={p.id} className="border rounded p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{p.nome}</span>
                    <span className="text-muted-foreground">
                      R$ {p.preco_base ?? 0} {p.preco_label ? `(${p.preco_label})` : ''}
                    </span>
                  </div>
                  {p.variacoes && Object.keys(p.variacoes).length > 0 && (
                    <div className="mt-1 text-muted-foreground">
                      {Object.entries(p.variacoes).map(([k, v]: [string, any]) => (
                        <div key={k}>
                          <span className="font-medium">{k}:</span>{' '}
                          {Array.isArray(v) ? `${v.length} itens` : JSON.stringify(v)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revertTarget} onOpenChange={o => !o && setRevertTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverter para versão {revertTarget?.versao}?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os produtos extras atuais serão substituídos pelo snapshot desta versão. Uma nova entrada será gerada no histórico documentando a reversão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reverting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevert} disabled={reverting}>
              {reverting ? 'Revertendo...' : 'Reverter'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
