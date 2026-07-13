import { Button } from '@/components/ui/button';
import { Pencil, Check } from 'lucide-react';
import { useFichaEdit } from '@/contexts/FichaEditContext';

export default function FichaEditToggle() {
  const { isAdmin, editMode, setEditMode, fichaTipoId } = useFichaEdit();
  if (!isAdmin || !fichaTipoId) return null;
  return (
    <Button
      type="button"
      variant={editMode ? 'default' : 'outline'}
      size="sm"
      onClick={() => setEditMode(!editMode)}
      title={editMode ? 'sair do modo edição' : 'editar ficha inline'}
    >
      {editMode ? <><Check size={16} /> editando ficha</> : <><Pencil size={16} /> editar ficha</>}
    </Button>
  );
}
