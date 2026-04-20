import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import FinanceiroAReceber from '@/components/financeiro/FinanceiroAReceber';
import FinanceiroAPagar from '@/components/financeiro/FinanceiroAPagar';

const FinanceiroPage = () => {
  const { role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role !== 'admin_master') {
      navigate('/', { replace: true });
    }
  }, [role, loading, navigate]);

  if (loading || role !== 'admin_master') return null;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <h1 className="text-3xl font-bold text-primary mb-6">Financeiro</h1>
      <Tabs defaultValue="receber" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="receber">A Receber</TabsTrigger>
          <TabsTrigger value="pagar">A Pagar</TabsTrigger>
        </TabsList>
        <TabsContent value="receber">
          <FinanceiroAReceber />
        </TabsContent>
        <TabsContent value="pagar">
          <FinanceiroAPagar />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinanceiroPage;
