import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { SelectedOrdersProvider } from "@/hooks/useSelectedOrders";
import Header from "@/components/Header";
import Index from "./pages/Index.tsx";
import LoginPage from "./pages/LoginPage";
import OrderPage from "./pages/OrderPage";
import TrackOrderPage from "./pages/TrackOrderPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import EditOrderPage from "./pages/EditOrderPage";
import EditExtrasPage from "./pages/EditExtrasPage";
import EditBeltPage from "./pages/EditBeltPage";
import ReportsPage from "./pages/ReportsPage";
import PiecesReportPage from "./pages/PiecesReportPage";
import ProfilePage from "./pages/ProfilePage";
import DraftsPage from "./pages/DraftsPage";
import BeltOrderPage from "./pages/BeltOrderPage";
import ExtrasPage from "./pages/ExtrasPage";
import EstoquePage from "./pages/EstoquePage";
import DynamicOrderPage from "./pages/DynamicOrderPage";
import UsersManagementPage from "./pages/UsersManagementPage";
import VerifyCodePage from "./pages/VerifyCodePage";
import AdminConfigPage from "./pages/AdminConfigPage";
import AdminConfigFichaPage from "./pages/AdminConfigFichaPage";
import AdminConfigVariacoesPage from "./pages/AdminConfigVariacoesPage";
import FinanceiroPage from "./pages/FinanceiroPage";
import RevendedorSaldoPage from "./pages/RevendedorSaldoPage";
import GestaoPage from "./pages/GestaoPage";
import SolicitacoesAjustePage from "./pages/SolicitacoesAjustePage";
import ConfiguracoesNFe from "./pages/ConfiguracoesNFe";
import ConfiguracoesTributacao from "./pages/ConfiguracoesTributacao";
import RanchoChiquePedidosPage from "./pages/RanchoChiquePedidosPage";
import { PresenceTracker } from "@/hooks/usePresenceTracker";
import AdminAssistantFab from "@/components/admin/AdminAssistantFab";
// PriceChangeDialog removido — sem congelamento de preço.
import DeployNoticeBanner from "@/components/DeployNoticeBanner";
import BordadoPortalPage from "./pages/BordadoPortalPage";
import MontagemPortalPage from "./pages/MontagemPortalPage";
import PublicTrackingPage from "./pages/PublicTrackingPage";
import GlobalLoadingIndicator from "@/components/GlobalLoadingIndicator";
import PrecoReconciler from "@/components/PrecoReconciler";
import NotFound from "./pages/NotFound.tsx";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient();

const BORDADO_ALLOWED = new Set<string>(['/bordado', '/perfil']);
const MONTAGEM_ALLOWED = new Set<string>(['/montagem', '/perfil']);

// Rotas com valores em R$ — bloqueadas para admin_producao
const VALUE_BLOCKED_PREFIXES = [
  '/financeiro',
  '/admin/solicitacoes-ajuste',
];

const ChromeWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { role, loading: authLoading, isLoggedIn } = useAuth();
  // Enquanto o role hidrata, não renderizar nada — evita flash do dashboard de
  // vendedor para usuários de portal restrito (bordado/montagem) logo após o login.
  if (authLoading && isLoggedIn && location.pathname !== '/login') {
    return <div className="min-h-screen bg-background" />;
  }
  const isBordado = role === 'bordado';
  const isMontagem = role === 'montagem';
  const isAdminProducao = role === 'admin_producao';
  const isPublicRoute = location.pathname.startsWith('/rastreio/');
  const isBordadoRoute = location.pathname === '/bordado' || location.pathname.startsWith('/pedido/');
  const hideChrome = location.pathname === '/login' || isBordado || isMontagem || isPublicRoute;

  // Force redirect bordado users out of disallowed routes (mas /rastreio é público)
  if (isBordado && !isBordadoRoute && !isPublicRoute && !BORDADO_ALLOWED.has(location.pathname) && location.pathname !== '/login') {
    return <Navigate to="/bordado" replace />;
  }

  // Force redirect montagem users out of disallowed routes
  if (isMontagem && !isPublicRoute && !MONTAGEM_ALLOWED.has(location.pathname) && location.pathname !== '/login') {
    return <Navigate to="/montagem" replace />;
  }

  // admin_producao não pode acessar áreas financeiras / de valores
  if (isAdminProducao && VALUE_BLOCKED_PREFIXES.some(p => location.pathname.startsWith(p))) {
    return <Navigate to="/" replace />;
  }


  return (
    <>
      {!hideChrome && <DeployNoticeBanner />}
      {!hideChrome && <Header />}
      {!hideChrome && <AdminAssistantFab />}
      {/* PriceChangeDialog removido — preço atualizado diretamente, reconciliador recalcula pedidos. */}
      {!hideChrome && <PrecoReconciler />}
      {children}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <GlobalLoadingIndicator />
      <BrowserRouter>
        <AuthProvider>
          <SelectedOrdersProvider>
          <PresenceTracker />
          <ChromeWrapper>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/bordado" element={<BordadoPortalPage />} />
            <Route path="/montagem" element={<MontagemPortalPage />} />
            <Route path="/rastreio/:id" element={<PublicTrackingPage />} />
            
            
            
            <Route path="/pedido" element={<OrderPage />} />
            <Route path="/extras" element={<ExtrasPage />} />
            <Route path="/estoque" element={<EstoquePage />} />
            <Route path="/pedido-cinto" element={<BeltOrderPage />} />
            <Route path="/pedido/:id" element={<OrderDetailPage />} />
            <Route path="/pedido/:id/editar" element={<EditOrderPage />} />
            <Route path="/pedido/:id/editar-extra" element={<EditExtrasPage />} />
            <Route path="/pedido/:id/editar-cinto" element={<EditBeltPage />} />
            <Route path="/acompanhar" element={<TrackOrderPage />} />
            <Route path="/relatorios" element={<ReportsPage />} />
            <Route path="/relatorio-pecas" element={<PiecesReportPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/rascunhos" element={<DraftsPage />} />
            <Route path="/usuarios" element={<UsersManagementPage />} />
            <Route path="/verificar" element={<VerifyCodePage />} />
            <Route path="/admin/configuracoes" element={<AdminConfigPage />} />
            <Route path="/admin/configuracoes/:slug" element={<AdminConfigFichaPage />} />
            <Route path="/admin/configuracoes/:slug/:categoriaId" element={<AdminConfigVariacoesPage />} />
            <Route path="/pedido-dinamico/:slug" element={<DynamicOrderPage />} />
            <Route path="/financeiro" element={<FinanceiroPage />} />
            <Route path="/financeiro/saldo" element={<RevendedorSaldoPage />} />
            <Route path="/admin/gestao" element={<GestaoPage />} />
            <Route path="/admin/solicitacoes-ajuste" element={<SolicitacoesAjustePage />} />
            <Route path="/configuracoes/nfe" element={<ConfiguracoesNFe />} />
            <Route path="/configuracoes/tributacao" element={<ConfiguracoesTributacao />} />
            <Route path="/rancho-chique/pedidos" element={<RanchoChiquePedidosPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ChromeWrapper>
          </SelectedOrdersProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
