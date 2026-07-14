import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFichaTipoBySlug } from '@/hooks/useAdminConfig';

interface FichaEditCtx {
  fichaSlug: string;                 // 'bota' | 'cinto' | ...
  fichaTipoId: string | undefined;
  isAdmin: boolean;                  // pode ativar modo edição
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  // Draft do prazo de produção (dias úteis) — só é persistido ao salvar versão.
  pendingLeadTime: number | null;
  setPendingLeadTime: (v: number | null) => void;
  clearPendingLeadTime: () => void;
}

const Ctx = createContext<FichaEditCtx | null>(null);

export function FichaEditProvider({ fichaSlug, children }: { fichaSlug: string; children: ReactNode }) {
  const { user } = useAuth();
  const { data: tipo } = useFichaTipoBySlug(fichaSlug);
  const [editMode, setEditModeRaw] = useState(false);
  const [pendingLeadTime, setPendingLeadTimeRaw] = useState<number | null>(null);

  const isAdmin = !!user && user.role === 'admin_master';

  const setEditMode = useCallback((v: boolean) => {
    if (!isAdmin) { setEditModeRaw(false); return; }
    setEditModeRaw(v);
    if (!v) setPendingLeadTimeRaw(null);
  }, [isAdmin]);

  const setPendingLeadTime = useCallback((v: number | null) => {
    setPendingLeadTimeRaw(v);
  }, []);
  const clearPendingLeadTime = useCallback(() => setPendingLeadTimeRaw(null), []);

  return (
    <Ctx.Provider value={{ fichaSlug, fichaTipoId: tipo?.id, isAdmin, editMode, setEditMode, pendingLeadTime, setPendingLeadTime, clearPendingLeadTime }}>
      {children}
    </Ctx.Provider>
  );
}

export function useFichaEdit() {
  const c = useContext(Ctx);
  if (!c) return { fichaSlug: '', fichaTipoId: undefined, isAdmin: false, editMode: false, setEditMode: () => {}, pendingLeadTime: null, setPendingLeadTime: () => {}, clearPendingLeadTime: () => {} } as FichaEditCtx;
  return c;
}
