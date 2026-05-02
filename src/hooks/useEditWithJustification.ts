import { useState, useCallback } from 'react';
import { useAuth, Order } from '@/contexts/AuthContext';

/**
 * Hook que gerencia abertura do dialog de justificativa para admins.
 * - admin_master / admin_producao: abre dialog antes de salvar
 * - demais: salva direto
 *
 * Uso:
 *   const { requestSave, dialogProps } = useEditWithJustification();
 *   ...
 *   await requestSave(orderId, payload, async (id, data, just) => { await updateOrder(id, data, just); afterSave(); });
 *   <JustificativaDialog {...dialogProps} />
 */
export function useEditWithJustification() {
  const { user } = useAuth();
  const requiresJustification =
    user?.role === 'admin_master' || user?.role === 'admin_producao';

  const [pending, setPending] = useState<{
    id: string;
    data: Partial<Order>;
    save: (id: string, data: Partial<Order>, just?: string) => Promise<void> | void;
  } | null>(null);

  const requestSave = useCallback(
    async (
      id: string,
      data: Partial<Order>,
      save: (id: string, data: Partial<Order>, just?: string) => Promise<void> | void,
    ) => {
      if (!requiresJustification) {
        await save(id, data);
        return;
      }
      setPending({ id, data, save });
    },
    [requiresJustification],
  );

  const dialogProps = {
    open: !!pending,
    onConfirm: async (motivo: string) => {
      if (!pending) return;
      const p = pending;
      setPending(null);
      await p.save(p.id, p.data, motivo);
    },
    onCancel: () => setPending(null),
  };

  return { requestSave, dialogProps };
}
