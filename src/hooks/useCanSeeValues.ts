import { useAuth } from '@/contexts/AuthContext';

/**
 * Controla a visibilidade de valores em R$ na interface.
 *
 * admin_producao NÃO vê valores em listas, detalhe do pedido, dashboard,
 * relatórios ou área financeira. Continua vendo nos formulários de
 * criar/editar pedido (para escolher opções) e em Admin → Configurações
 * (onde edita os preços de variações e custom_options).
 */
export function useCanSeeValues(): boolean {
  const { role } = useAuth();
  return role !== 'admin_producao';
}
