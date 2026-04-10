import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFichaTipos, useFichaCategorias, useStatusEtapas } from '@/hooks/useAdminConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Layers, ChevronRight, Plus, Trash2, BarChart3, Package, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import FichaBuilder from '@/components/admin/FichaBuilder';

export default function AdminConfigPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: tipos, isLoading, refetch } = useFichaTipos();
  const { data: etapas } = useStatusEtapas();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin_master' && user.role !== 'admin_producao') {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  if (!user || (user.role !== 'admin_master' && user.role !== 'admin_producao')) return null;

  const handleDeactivate = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('ficha_tipos').update({ ativo: false }).eq('id', deleteTarget.id);
    if (error) { toast.error('Erro ao desativar ficha'); return; }
    toast.success(`"${deleteTarget.nome}" desativada`);
    setDeleteTarget(null);
    refetch();
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-5xl"
      >
        <div className="mb-8 flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="font-montserrat text-2xl font-bold text-foreground lowercase">
            configurações
          </h1>
        </div>

        <Tabs defaultValue="fichas" className="space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="fichas" className="gap-1.5 lowercase">
              <Layers className="h-4 w-4" /> ficha de produção
            </TabsTrigger>
            <TabsTrigger value="extras" className="gap-1.5 lowercase">
              <Package className="h-4 w-4" /> extras
            </TabsTrigger>
            <TabsTrigger value="progresso" className="gap-1.5 lowercase">
              <Activity className="h-4 w-4" /> progresso de produção
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="gap-1.5 lowercase">
              <BarChart3 className="h-4 w-4" /> relatórios
            </TabsTrigger>
          </TabsList>

          {/* ─── Fichas de Produção ─── */}
          <TabsContent value="fichas">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Gerencie as variações, categorias e etapas de produção de cada tipo de ficha.
              </p>
              <Button size="sm" className="gap-1.5" onClick={() => setBuilderOpen(true)}>
                <Plus className="h-4 w-4" /> criar nova ficha
              </Button>
            </div>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <AnimatePresence>
                  {tipos?.map((tipo, i) => (
                    <FichaTipoCard
                      key={tipo.id}
                      tipo={tipo}
                      index={i}
                      onDelete={() => setDeleteTarget({ id: tipo.id, nome: tipo.nome })}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* ─── Extras (placeholder) ─── */}
          <TabsContent value="extras">
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Package className="mx-auto mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">Gestão de extras será implementada em breve.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Progresso de Produção ─── */}
          <TabsContent value="progresso">
            <p className="mb-4 text-sm text-muted-foreground">
              Etapas de produção cadastradas no sistema. Vincule-as a cada tipo de ficha na tela de edição.
            </p>
            <Card>
              <CardContent className="divide-y divide-border/40 p-0">
                {etapas?.map(etapa => (
                  <div key={etapa.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-8 text-center text-xs font-medium text-muted-foreground">{etapa.ordem}</span>
                    <span className="text-sm text-foreground">{etapa.nome}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">{etapa.slug}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Relatórios (placeholder) ─── */}
          <TabsContent value="relatorios">
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BarChart3 className="mx-auto mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">Relatórios administrativos serão implementados em breve.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-montserrat lowercase">desativar ficha</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar "{deleteTarget?.nome}"? Ela não aparecerá mais para novos pedidos, mas pedidos existentes não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Builder dialog */}
      <FichaBuilder open={builderOpen} onOpenChange={setBuilderOpen} onCreated={() => refetch()} />
    </div>
  );
}

function FichaTipoCard({ tipo, index, onDelete }: {
  tipo: { id: string; slug: string; nome: string; ativo: boolean };
  index: number;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const { data: categorias } = useFichaCategorias(tipo.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.08 }}
    >
      <Card className={`border-border/60 transition-all hover:shadow-md ${!tipo.ativo ? 'opacity-50' : ''}`}>
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <div
              className="flex flex-1 cursor-pointer items-center gap-2"
              onClick={() => navigate(`/admin/configuracoes/${tipo.slug}`)}
            >
              <Layers className="h-5 w-5 text-primary" />
              <span className="font-montserrat text-lg font-semibold text-foreground lowercase">
                {tipo.nome.toLowerCase()}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={e => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <ChevronRight
                className="h-4 w-4 cursor-pointer text-muted-foreground"
                onClick={() => navigate(`/admin/configuracoes/${tipo.slug}`)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {categorias?.length ?? '…'} categorias
            </Badge>
            {!tipo.ativo && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                inativo
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
