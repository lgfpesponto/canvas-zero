import { useAuth } from '@/contexts/AuthContext';

const NFE_ALLOWED_NAMES = new Set(['Igor', 'Stefany ADM', 'Fernanda ADM', 'Mariana ADM']);
const NFE_ALLOWED_ROLES = new Set(['admin_master', 'admin_producao', 'vendedor_comissao']);

export function useNfeAccess(): boolean {
  const { user, role } = useAuth();
  if (!user) return false;
  if (role && NFE_ALLOWED_ROLES.has(role)) return true;
  return NFE_ALLOWED_NAMES.has(user.nomeCompleto);
}

/** Acesso às páginas "Notas Fiscais" e "Configuração NF-e" — o usuário site (Rancho Chique) não vê. */
export function useNfePagesAccess(): boolean {
  const { user } = useAuth();
  const base = useNfeAccess();
  if (!user || !base) return false;
  return user.nomeUsuario !== 'site' && user.nomeCompleto !== 'Rancho Chique';
}
