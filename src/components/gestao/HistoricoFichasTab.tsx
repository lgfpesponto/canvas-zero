import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFichaTipos } from '@/hooks/useAdminConfig';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, RotateCcw, History } from 'lucide-react';
import { toast } from 'sonner';
import { diffSnapshots, salvarNovaVersao, type FichaSnapshot } from '@/lib/fichaVersoes';
import { useAuth } from '@/contexts/AuthContext';
import ExtrasHistoricoList from './ExtrasHistoricoList';

export default function HistoricoFichasTab() {
  const { data: tipos = [] } = useFichaTipos();
  const [activeTipo, setActiveTipo] = useState<string | null>(null);

  const tiposAtivos = useMemo(() => tipos.filter(t => t.ativo), [tipos]);
  const currentTipoId = activeTipo || tiposAtivos[0]?.id || null;

  if (!tiposAtivos.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <History className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">Nenhum tipo de ficha cadastrado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Histórico das versões salvas de cada ficha de produção. A versão marcada como
        <Badge className="mx-1 text-[10px]">ativa</Badge> é a usada para os próximos pedidos.
      </p>

      <Tabs value={currentTipoId || ''} onValueChange={setActiveTipo}>
        <TabsList>
          {tiposAtivos.map(t => (
            <TabsTrigger key={t.id} value={t.id} className="lowercase">{t.nome}</TabsTrigger>
          ))}
        </TabsList>
        {tiposAtivos.map(t => (
          <TabsContent key={t.id} value={t.id}>
            <VersoesList fichaTipoId={t.id} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function VersoesList({ fichaTipoId }: { fichaTipoId: string }) {
  const { user } = useAuth();
  const canRevert = user?.role === 'admin_master';
  const [detalhe, setDetalhe] = useState<any | null>(null);

  const { data: versoes = [], refetch, isLoading } = useQuery({
    queryKey: ['ficha_versoes', fichaTipoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ficha_versoes')
        .select('*')
        .eq('ficha_tipo_id', fichaTipoId)
        .order('versao', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: authorNames = {} } = useQuery({
    queryKey: ['ficha_versoes_authors', versoes.map((v: any) => v.criado_por).filter(Boolean).join(',')],
    queryFn: async () => {
      const ids = Array.from(new Set(versoes.map((v: any) => v.criado_por).filter(Boolean)));
      if (!ids.length) return {} as Record<string, string>;
      const { data } = await supabase.from('profiles').select('id, nome_completo').in('id', ids);
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.id] = p.nome_completo; });
      return map;
    },
    enabled: versoes.length > 0,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground py-6">Carregando...</p>;
  if (!versoes.length) return <p className="text-sm text-muted-foreground py-6">Nenhuma versão registrada.</p>;

  return (
    <div className="space-y-2">
      {versoes.map((v: any, idx: number) => {
        const prev = versoes[idx + 1];
        const d = diffSnapshots(
          (prev?.snapshot as unknown as FichaSnapshot) || null,
          v.snapshot as unknown as FichaSnapshot,
        );
        return (
          <Card key={v.id} className={v.ativa ? 'border-primary/60' : ''}>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">Versão {v.versao}</span>
                  {v.ativa && <Badge className="text-[10px]">ativa</Badge>}
                  <span className="text-xs text-muted-foreground">
                    {new Date(v.created_at).toLocaleString('pt-BR')}
                  </span>
                  {v.criado_por && (
                    <span className="text-xs text-muted-foreground">
                      · por {authorNames[v.criado_por] || v.criado_por.slice(0, 8)}
                    </span>
                  )}
                </div>
                {v.descricao_mudanca && (
                  <p className="text-xs text-foreground">{v.descricao_mudanca}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Δ categorias: +{d.categoriasAdd}/-{d.categoriasDel} ·
                  Campos: +{d.camposAdd}/-{d.camposDel}/mod {d.camposMod} ·
                  Variações: +{d.variacoesAdd}/-{d.variacoesDel}/mod {d.variacoesMod}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setDetalhe(v)}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> detalhe
                </Button>
                {canRevert && !v.ativa && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (!window.confirm(`Reverter para a versão ${v.versao}? Uma nova versão ativa será criada a partir dessa.`)) return;
                      // Applies snapshot back to DB tables: for now we just create a new active
                      // version pointing to this snapshot; the tabelas atuais permanecem como
                      // "cache" da última edição — no futuro, importar snapshot completo.
                      const { error } = await supabase
                        .from('ficha_versoes')
                        .update({ ativa: false })
                        .eq('ficha_tipo_id', fichaTipoId)
                        .eq('ativa', true);
                      if (error) { toast.error('Erro'); return; }
                      const { data: last } = await supabase
                        .from('ficha_versoes')
                        .select('versao').eq('ficha_tipo_id', fichaTipoId)
                        .order('versao', { ascending: false }).limit(1).maybeSingle();
                      const next = ((last as any)?.versao || 0) + 1;
                      const { data: userRes } = await supabase.auth.getUser();
                      await supabase.from('ficha_versoes').insert({
                        ficha_tipo_id: fichaTipoId,
                        versao: next,
                        snapshot: v.snapshot,
                        descricao_mudanca: `revertido da versão ${v.versao}`,
                        criado_por: userRes?.user?.id || null,
                        ativa: true,
                      });
                      toast.success(`Versão ${next} criada (revertida da ${v.versao})`);
                      refetch();
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> reverter
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={!!detalhe} onOpenChange={() => setDetalhe(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Snapshot — versão {detalhe?.versao}</DialogTitle>
          </DialogHeader>
          {detalhe && (
            <div className="space-y-3 text-xs">
              <SnapshotView snap={detalhe.snapshot as unknown as FichaSnapshot} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SnapshotView({ snap }: { snap: FichaSnapshot }) {
  return (
    <div className="space-y-4">
      {(snap.categorias || []).map((cat: any) => {
        const campos = (snap.campos || []).filter((c: any) => c.categoria_id === cat.id);
        return (
          <div key={cat.id} className="border-l-2 border-primary/40 pl-3">
            <p className="font-semibold text-sm">{cat.nome} <span className="text-muted-foreground">({cat.slug})</span></p>
            {campos.map((campo: any) => {
              const vars = (snap.variacoes || []).filter((v: any) => v.campo_id === campo.id);
              return (
                <div key={campo.id} className="ml-3 my-1">
                  <p className="text-xs font-medium">
                    {campo.nome} <span className="text-muted-foreground">[{campo.tipo}]</span>
                  </p>
                  {vars.length > 0 && (
                    <ul className="ml-4 text-[11px] text-muted-foreground">
                      {vars.map((v: any) => (
                        <li key={v.id}>
                          {v.nome} {Number(v.preco_adicional) ? `— R$ ${Number(v.preco_adicional).toFixed(2)}` : ''}
                          {v.relacionamento && Object.keys(v.relacionamento).length > 0 && (
                            <span className="italic"> · rel: {JSON.stringify(v.relacionamento)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
