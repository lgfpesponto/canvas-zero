import { useAuth } from '@/contexts/AuthContext';

const NFE_ALLOWED_NAMES = new Set(['Igor', 'Stefany ADM']);

export function useNfeAccess(): boolean {
  const { user, role } = useAuth();
  if (!user) return false;
  if (role === 'admin_master') return true;
  return NFE_ALLOWED_NAMES.has(user.nomeCompleto);
}
