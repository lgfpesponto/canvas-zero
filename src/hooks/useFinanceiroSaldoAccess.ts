import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchVisibilidade } from '@/lib/revendedorSaldo';

interface AccessInfo {
  loading: boolean;
  isAdminMaster: boolean;
  /** Pode ver a aba do revendedor (Stefany etc.) na fase de teste. */
  canSeeRevendedorView: boolean;
  /** Nome usado no banco como vendedor (igual a profiles.nome_completo). */
  vendedorName: string;
}

export function useFinanceiroSaldoAccess(): AccessInfo {
  const { user, role, loading: authLoading } = useAuth();
  const [allowed, setAllowed] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchVisibilidade()
      .then(rows => {
        if (!active) return;
        setAllowed(new Set(rows.filter(r => r.ativo).map(r => r.vendedor.toLowerCase().trim())));
      })
      .catch(() => { if (active) setAllowed(new Set()); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [user?.id]);

  const vendedorName = user?.nomeCompleto || '';
  const isAdminMaster = role === 'admin_master';
  const canSeeRevendedorView =
    !!vendedorName && allowed.has(vendedorName.toLowerCase().trim());

  return {
    loading: authLoading || !loaded,
    isAdminMaster,
    canSeeRevendedorView,
    vendedorName,
  };
}
