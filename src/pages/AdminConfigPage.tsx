import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFichaTipos, useFichaCategorias } from '@/hooks/useAdminConfig';
import { motion } from 'framer-motion';
import { Settings, Layers, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect } from 'react';

export default function AdminConfigPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: tipos, isLoading } = useFichaTipos();

  useEffect(() => {
    if (user && user.role !== 'admin_master' && user.role !== 'admin_producao') {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  if (!user || (user.role !== 'admin_master' && user.role !== 'admin_producao')) return null;

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-4xl"
      >
        <div className="mb-8 flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="font-montserrat text-2xl font-bold text-foreground lowercase">
            configurações
          </h1>
        </div>

        <p className="mb-6 text-sm text-muted-foreground">
          Gerencie as variações, categorias e etapas de produção de cada tipo de ficha.
        </p>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {tipos?.map((tipo, i) => (
              <FichaTipoCard key={tipo.id} tipo={tipo} index={i} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function FichaTipoCard({ tipo, index }: { tipo: { id: string; slug: string; nome: string; ativo: boolean }; index: number }) {
  const navigate = useNavigate();
  const { data: categorias } = useFichaCategorias(tipo.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Card
        className="cursor-pointer border-border/60 transition-all hover:border-primary/40 hover:shadow-md"
        onClick={() => navigate(`/admin/configuracoes/${tipo.slug}`)}
      >
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <span className="font-montserrat text-lg font-semibold text-foreground lowercase">
                {tipo.nome.toLowerCase()}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
