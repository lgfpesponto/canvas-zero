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
import DynamicOrderPage from "./pages/DynamicOrderPage";
import UsersManagementPage from "./pages/UsersManagementPage";
import VerifyCodePage from "./pages/VerifyCodePage";
import AdminConfigPage from "./pages/AdminConfigPage";
import AdminConfigFichaPage from "./pages/AdminConfigFichaPage";
import AdminConfigVariacoesPage from "./pages/AdminConfigVariacoesPage";
import FinanceiroPage from "./pages/FinanceiroPage";
import RevendedorSaldoPage from "./pages/RevendedorSaldoPage";
import GestaoPage from "./pages/GestaoPage";
import { PresenceTracker } from "@/hooks/usePresenceTracker";
import AdminAssistantFab from "@/components/admin/AdminAssistantFab";
import DeployNoticeBanner from "@/components/DeployNoticeBanner";
import BordadoPortalPage from "./pages/BordadoPortalPage";
import NotFound from "./pages/NotFound.tsx";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient();

const BORDADO_ALLOWED = new Set<string>(['/bordado', '/perfil']);

const ChromeWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { role } = useAuth();
  const isBordado = role === 'bordado';
  const isBordadoRoute = location.pathname === '/bordado' || location.pathname.startsWith('/pedido/');
  const hideChrome = location.pathname === '/login' || isBordado;

  // Force redirect bordado users out of disallowed routes
  if (isBordado && !isBordadoRoute && !BORDADO_ALLOWED.has(location.pathname) && location.pathname !== '/login') {
    return <Navigate to="/bordado" replace />;
  }

  return (
    <>
      {!hideChrome && <DeployNoticeBanner />}
      {!hideChrome && <Header />}
      {!hideChrome && <AdminAssistantFab />}
      {children}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SelectedOrdersProvider>
          <PresenceTracker />
          <ChromeWrapper>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/bordado" element={<BordadoPortalPage />} />
            
            
            <Route path="/pedido" element={<OrderPage />} />
            <Route path="/extras" element={<ExtrasPage />} />
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
