import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import FinanceiroAReceber from '@/components/financeiro/FinanceiroAReceber';
import FinanceiroAPagar from '@/components/financeiro/FinanceiroAPagar';
import FinanceiroSaldoRevendedor from '@/components/financeiro/saldo/FinanceiroSaldoRevendedor';

const VALID_TABS = ['receber', 'pagar', 'saldo'] as const;
type TabValue = typeof VALID_TABS[number];

const FinanceiroPage = () => {
  const { role, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const initialTab: TabValue = (VALID_TABS as readonly string[]).includes(tabFromUrl || '')
    ? (tabFromUrl as TabValue)
    : 'receber';

  useEffect(() => {
    if (!loading && role !== 'admin_master') {
      navigate('/', { replace: true });
    }
  }, [role, loading, navigate]);

  // Scroll para a seção de comprovantes do vendedor se houver hash
  useEffect(() => {
    if (window.location.hash === '#comprovantes-revendedor') {
      setTimeout(() => {
        document.getElementById('comprovantes-revendedor')?.scrollIntoView({
          behavior: 'smooth', block: 'start',
        });
      }, 300);
    }
  }, [initialTab]);

  if (loading || role !== 'admin_master') return null;

  const handleTabChange = (v: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', v);
      return next;
    }, { replace: true });
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <h1 className="text-3xl font-bold text-primary mb-6">Financeiro</h1>
      <Tabs value={initialTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="receber">A Receber</TabsTrigger>
          <TabsTrigger value="pagar">A Pagar</TabsTrigger>
          <TabsTrigger value="saldo">Saldo do Vendedor</TabsTrigger>
        </TabsList>
        <TabsContent value="receber">
          <FinanceiroAReceber />
        </TabsContent>
        <TabsContent value="pagar">
          <FinanceiroAPagar />
        </TabsContent>
        <TabsContent value="saldo">
          <FinanceiroSaldoRevendedor />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinanceiroPage;
