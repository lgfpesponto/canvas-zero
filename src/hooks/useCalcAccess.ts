import { useAuth } from '@/contexts/AuthContext';

/** Calculadora de precificação: só o usuário Rancho Chique (site) e admin_master. */
export function useCalcAccess(): boolean {
  const { user, role } = useAuth();
  if (!user) return false;
  return role === 'admin_master' || user.nomeUsuario === 'site' || user.nomeCompleto === 'Rancho Chique';
}
