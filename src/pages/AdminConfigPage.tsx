import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFichaTipos, useFichaCategorias, useStatusEtapas } from '@/hooks/useAdminConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Layers, ChevronRight, Plus, Trash2, BarChart3, Package, Activity, Users, RefreshCw, Wallet, FileText, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UsersManagementInner } from './UsersManagementPage';
import { GestaoInner } from './GestaoPage';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import FichaBuilder from '@/components/admin/FichaBuilder';
import HistoricoFichasTab from '@/components/gestao/HistoricoFichasTab';
import AtacadoSyncPanel from '@/components/admin/AtacadoSyncPanel';
import { FinanceiroInner } from './FinanceiroPage';
import ConfiguracoesNFe from './ConfiguracoesNFe';
import { useNfeAccess } from '@/hooks/useNfeAccess';

type SectionKey =
  | 'historico-fichas' | 'extras' | 'progresso' | 'relatorios'
  | 'usuarios' | 'gestao' | 'atacado-sync' | 'financeiro' | 'nfe';

export default function AdminConfigPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: tipos, isLoading, refetch } = useFichaTipos();
  const { data: etapas } = useStatusEtapas();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const hasNfeAccess = useNfeAccess();
  const [searchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const currentTab = (rawTab || null) as SectionKey | null;

  useEffect(() => {
    if (user && user.role !== 'admin_master' && user.role !== 'admin_producao') {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  if (!user || (user.role !== 'admin_master' && user.role !== 'admin_producao')) return null;

  const isAdminMaster = user.role === 'admin_master';

  const handleDeactivate = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('ficha_tipos').update({ ativo: false }).eq('id', deleteTarget.id);
    if (error) { toast.error('Erro ao desativar ficha'); return; }
    toast.success(`"${deleteTarget.nome}" desativada`);
    setDeleteTarget(null);
    refetch();
  };

  const sections: { key: SectionKey; label: string; Icon: typeof Layers; visible: boolean }[] = [
    { key: 'historico-fichas', label: 'ficha de produção', Icon: Layers, visible: true },
    { key: 'extras', label: 'extras', Icon: Package, visible: true },
    { key: 'progresso', label: 'progresso de produção', Icon: Activity, visible: true },
    { key: 'relatorios', label: 'relatórios', Icon: BarChart3, visible: true },
    { key: 'usuarios', label: 'usuários', Icon: Users, visible: isAdminMaster },
    { key: 'gestao', label: 'gestão', Icon: Activity, visible: isAdminMaster },
    { key: 'atacado-sync', label: 'sincronização atacado', Icon: RefreshCw, visible: isAdminMaster },
    { key: 'financeiro', label: 'financeiro', Icon: Wallet, visible: isAdminMaster },
    { key: 'nfe', label: 'nf-e', Icon: FileText, visible: isAdminMaster && hasNfeAccess },
  ];

  const activeSection = sections.find(s => s.key === currentTab && s.visible);
  const pageTitle = activeSection?.label ?? 'configurações';
  const PageIcon = activeSection?.Icon ?? Settings;

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-7xl"
      >
        <div className="mb-8 flex items-center gap-3">
          {activeSection && (
            <Link
              to="/admin/configuracoes"
              className="mr-1 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="voltar para configurações"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <PageIcon className="h-6 w-6 text-primary" />
          <h1 className="font-montserrat text-2xl font-bold text-foreground lowercase">
            {pageTitle}
          </h1>
        </div>

        {/* ── Menu (quando não há aba selecionada) ── */}
        {!activeSection && (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {sections.filter(s => s.visible).map(s => (
              <Link key={s.key} to={`/admin/configuracoes?tab=${s.key}`}>
                <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
                  <CardContent className="flex items-center justify-between gap-3 p-5">
                    <div className="flex items-center gap-3">
                      <s.Icon className="h-5 w-5 text-primary" />
                      <span className="font-montserrat text-base font-semibold lowercase">{s.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* ── Seções ── */}
        {activeSection?.key === 'historico-fichas' && (
          <HistoricoFichasTab />
        )}

        {activeSection?.key === 'extras' && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm">Gestão de extras será implementada em breve.</p>
            </CardContent>
          </Card>
        )}

        {activeSection?.key === 'progresso' && (
          <>
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
          </>
        )}

        {activeSection?.key === 'relatorios' && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <BarChart3 className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm">Mais relatórios administrativos em breve.</p>
            </CardContent>
          </Card>
        )}

        {activeSection?.key === 'usuarios' && <UsersManagementInner />}
        {activeSection?.key === 'gestao' && <GestaoInner />}
        {activeSection?.key === 'atacado-sync' && <AtacadoSyncPanel />}
        {activeSection?.key === 'financeiro' && <FinanceiroInner />}
        {activeSection?.key === 'nfe' && <ConfiguracoesNFe />}
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

function FichaTipoCard({ tipo, index, canDelete = false, onDelete }: {
  tipo: { id: string; slug: string; nome: string; ativo: boolean };
  index: number;
  canDelete?: boolean;
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
              {canDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={e => { e.stopPropagation(); onDelete(); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
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
