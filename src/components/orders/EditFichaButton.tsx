import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useFichaTipoBySlug } from '@/hooks/useAdminConfig';
import FichaVersaoEditorDialog from '@/components/admin/FichaVersaoEditorDialog';

interface Props {
  fichaSlug: string; // 'bota' | 'cinto' | ...
  size?: 'sm' | 'default';
  variant?: 'outline' | 'default' | 'ghost';
  className?: string;
}

/**
 * Botão de "editar ficha" visível apenas para admin_master e admin_producao.
 * Abre o editor de ficha e permite salvar como nova versão.
 */
export default function EditFichaButton({ fichaSlug, size = 'sm', variant = 'outline', className }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: tipo } = useFichaTipoBySlug(fichaSlug);

  if (!user || (user.role !== 'admin_master' && user.role !== 'admin_producao')) return null;
  if (!tipo) return null;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        title="editar ficha (admin)"
        className={className}
      >
        <Pencil size={16} /> editar ficha
      </Button>
      <FichaVersaoEditorDialog
        open={open}
        onOpenChange={setOpen}
        fichaTipoId={tipo.id}
        fichaTipoNome={tipo.nome}
      />
    </>
  );
}
