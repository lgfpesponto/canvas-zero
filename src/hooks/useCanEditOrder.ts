import { useAuth } from '@/contexts/AuthContext';

/**
 * Regra de edição de pedido:
 * - Administradores: sempre podem editar.
 * - vendedor / vendedor_comissao: só o próprio pedido e só enquanto o
 *   progresso for "Em aberto".
 */
export function useCanEditOrder(order: any): boolean {
  const { isAdmin, user } = useAuth();
  if (isAdmin) return true;
  if (!order || !user) return false;
  const role = user.role;
  if (role !== 'vendedor' && role !== 'vendedor_comissao') return false;
  const isDono = (order.vendedor || '') === (user.nomeCompleto || '');
  return isDono && order.status === 'Em aberto';
}
