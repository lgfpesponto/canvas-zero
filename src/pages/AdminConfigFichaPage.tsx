import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  useFichaTipoBySlug, useFichaCategorias, useStatusEtapas,
  useFichaWorkflow, useToggleWorkflow, useInsertCategoria,
} from '@/hooks/useAdminConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Layers, CheckCircle, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function AdminConfigFichaPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: tipo } = useFichaTipoBySlug(slug || '');
  const { data: categorias } = useFichaCategorias(tipo?.id);
  const { data: etapas } = useStatusEtapas();
  const { data: workflow } = useFichaWorkflow(tipo?.id);
  const toggleWorkflow = useToggleWorkflow();
  const insertCategoria = useInsertCategoria();

  const [novaCategoria, setNovaCategoria] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin_master' && user.role !== 'admin_producao') {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  if (!user || !tipo) return null;

  const workflowMap = new Map(workflow?.map(w => [w.etapa_id, w.ativo]));

  const handleToggleEtapa = (etapaId: string, current: boolean) => {
    toggleWorkflow.mutate({
      ficha_tipo_id: tipo.id,
      etapa_id: etapaId,
      ativo: !current,
    });
  };

  const handleAddCategoria = () => {
    const nome = novaCategoria.trim();
    if (!nome) return;
    const slug = nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const ordem = (categorias?.length ?? 0) + 1;
    insertCategoria.mutate(
      { ficha_tipo_id: tipo.id, slug, nome, ordem },
      {
        onSuccess: () => {
          toast.success('Categoria adicionada');
          setNovaCategoria('');
          setDialogOpen(false);
        },
        onError: () => toast.error('Erro ao adicionar categoria'),
      },
    );
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8">
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        className="mx-auto max-w-4xl"
      >
        {/* Header */}
        <button
          onClick={() => navigate('/admin/configuracoes')}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> configurações
        </button>

        <h1 className="mb-8 font-montserrat text-2xl font-bold text-foreground lowercase">
          {tipo.nome.toLowerCase()}
        </h1>

        {/* Categorias */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <h2 className="font-montserrat text-lg font-semibold text-foreground lowercase">categorias de campo</h2>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  <Plus className="h-4 w-4" /> nova
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-montserrat lowercase">nova categoria</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <Label>Nome</Label>
                  <Input
                    value={novaCategoria}
                    onChange={e => setNovaCategoria(e.target.value)}
                    placeholder="Ex: Couros especiais"
                  />
                  <Button onClick={handleAddCategoria} disabled={insertCategoria.isPending} className="w-full">
                    Adicionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <AnimatePresence>
              {categorias?.map((cat, i) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card
                    className="cursor-pointer border-border/60 transition-all hover:border-primary/40 hover:shadow-sm"
                    onClick={() => navigate(`/admin/configuracoes/${slug}/${cat.id}`)}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <span className="font-medium text-foreground text-sm">{cat.nome}</span>
                      <Badge variant="secondary" className="text-xs">{cat.ordem}</Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Etapas de Produção */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            <h2 className="font-montserrat text-lg font-semibold text-foreground lowercase">etapas de produção</h2>
          </div>

          <Card>
            <CardContent className="divide-y divide-border/40 p-0">
              {etapas?.map(etapa => {
                const ativo = workflowMap.get(etapa.id) ?? false;
                return (
                  <div
                    key={etapa.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-xs text-muted-foreground">{etapa.ordem}</span>
                      <span className="text-sm text-foreground">{etapa.nome}</span>
                    </div>
                    <Switch
                      checked={ativo}
                      onCheckedChange={() => handleToggleEtapa(etapa.id, ativo)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>
      </motion.div>
    </div>
  );
}
