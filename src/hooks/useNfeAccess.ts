import { useAuth } from '@/contexts/AuthContext';

const NFE_ALLOWED_NAMES = new Set(['Igor', 'Stefany ADM', 'Fernanda ADM', 'Mariana ADM']);
const NFE_ALLOWED_ROLES = new Set(['admin_master', 'admin_producao', 'vendedor_comissao']);

export function useNfeAccess(): boolean {
  const { user, role } = useAuth();
  if (!user) return false;
  if (role && NFE_ALLOWED_ROLES.has(role)) return true;
  return NFE_ALLOWED_NAMES.has(user.nomeCompleto);
}
