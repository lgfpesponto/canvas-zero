import { useAuth } from '@/contexts/AuthContext';
import { isOrderEstoque } from '@/lib/orderEstoque';

/**
 * Regra de edição de pedido:
 * - Pedido de Estoque: NUNCA pode ser editado (protege a contagem do estoque;
 *   para alterar, cancele — o cancelamento devolve os pares).
 * - Administradores: sempre podem editar.
 * - vendedor / vendedor_comissao: só o próprio pedido e só enquanto o
 *   progresso for "Em aberto".
 */
export function useCanEditOrder(order: any): boolean {
  const { isAdmin, user } = useAuth();
  if (isOrderEstoque(order)) return false;
  if (isAdmin) return true;
  if (!order || !user) return false;
  const role = user.role;
  if (role !== 'vendedor' && role !== 'vendedor_comissao') return false;
  const isDono = (order.vendedor || '') === (user.nomeCompleto || '');
  return isDono && order.status === 'Em aberto';
}
