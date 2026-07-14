import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useFichaEdit } from '@/contexts/FichaEditContext';
import { salvarNovaVersao } from '@/lib/fichaVersoes';

export default function FichaEditBar() {
  const { editMode, setEditMode, fichaTipoId, pendingLeadTime, clearPendingLeadTime } = useFichaEdit();
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  if (!editMode || !fichaTipoId) return null;

  const handleSalvar = async () => {
    setSaving(true);
    const res = await salvarNovaVersao(fichaTipoId, desc || undefined, pendingLeadTime ?? undefined);
    setSaving(false);
    if (!res.ok) { toast.error(res.error || 'Erro'); return; }
    toast.success(`Versão ${res.versao} salva`);
    setDesc('');
    clearPendingLeadTime();
    qc.invalidateQueries();
    setEditMode(false);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-primary/40 bg-card shadow-lg px-3 py-2 max-w-[95vw]">
      <span className="text-xs font-semibold text-primary hidden sm:inline">modo edição</span>
      <Input
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder="descrição (opcional)"
        className="h-8 text-xs w-40 sm:w-56"
      />
      <Button size="sm" onClick={handleSalvar} disabled={saving} className="h-8 gap-1">
        <Save className="h-3.5 w-3.5" /> {saving ? '...' : 'salvar versão'}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setEditMode(false)} className="h-8">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
