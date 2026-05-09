import { useAuth } from '@/contexts/AuthContext';

interface AccessInfo {
  loading: boolean;
  isAdminMaster: boolean;
  /** Pode ver a aba "Comprovantes" — qualquer vendedor logado. */
  canSeeComprovantesView: boolean;
  /** Alias retro-compat (mesmo valor de canSeeComprovantesView). */
  canSeeRevendedorView: boolean;
  /** Nome usado no banco como vendedor (igual a profiles.nome_completo). */
  vendedorName: string;
}

export function useFinanceiroSaldoAccess(): AccessInfo {
  const { user, role, isLoggedIn, loading: authLoading } = useAuth();

  const vendedorName = user?.nomeCompleto || '';
  const isAdminMaster = role === 'admin_master';
  const isVendedor = role === 'vendedor' || role === 'vendedor_comissao';
  const canSeeComprovantesView = !!isLoggedIn && !!vendedorName && isVendedor;

  return {
    loading: authLoading,
    isAdminMaster,
    canSeeComprovantesView,
    canSeeRevendedorView: canSeeComprovantesView,
    vendedorName,
  };
}
