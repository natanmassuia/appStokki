import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CampaignProvider } from "@/contexts/CampaignContext";
import { ImportProvider } from "@/contexts/ImportContext";
import { BulkOperationProvider } from "@/contexts/BulkOperationContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import ForgotPassword from "./pages/ForgotPassword";
import Termos from "./pages/Termos";
import Privacidade from "./pages/Privacidade";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Estoque from "./pages/Estoque";
import OrdersPage from "./pages/OrdersPage";
import Perfil from "./pages/Perfil";
import Catalogos from "./pages/Catalogos";
import Clientes from "./pages/Clientes";
import Fornecedores from "./pages/Fornecedores";
import MinhaLoja from "./pages/MinhaLoja";
import SettingsPage from "./pages/SettingsPage";
import Tutoriais from "./pages/Tutoriais";
import FaleConosco from "./pages/FaleConosco";
import FinancialPage from "./pages/FinancialPage";
import Campanhas from "./pages/Campanhas";
import NotFound from "./pages/NotFound";

import { ThemeProvider } from "@/components/theme-provider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Desabilita refresh automático ao trocar de aba
      retry: 1, // Tenta novamente apenas 1 vez em caso de erro
      staleTime: 1000 * 60 * 5, // Cache dados por 5 minutos (melhora performance)
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <AuthProvider>
          <CampaignProvider>
            <ImportProvider>
              <BulkOperationProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <Routes>
                    <Route path="/login" element={<AuthPage />} />
                    <Route path="/cadastro" element={<AuthPage />} />
                    <Route path="/register" element={<AuthPage />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/termos" element={<Termos />} />
                  <Route path="/terms" element={<Termos />} />
                  <Route path="/privacidade" element={<Privacidade />} />
                  <Route path="/privacy" element={<Privacidade />} />
                  <Route path="/setup-profile" element={<Navigate to="/onboarding" replace />} />
                  <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                  <Route path="/setup" element={<Navigate to="/onboarding" replace />} />
                  <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
                  <Route path="/estoque" element={<ProtectedRoute><Estoque /></ProtectedRoute>} />
                  <Route path="/fornecedores" element={<ProtectedRoute><Fornecedores /></ProtectedRoute>} />
                  <Route path="/catalogos" element={<ProtectedRoute><Catalogos /></ProtectedRoute>} />
                  <Route path="/campanhas" element={<ProtectedRoute><Campanhas /></ProtectedRoute>} />
                  <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
                  <Route path="/financeiro" element={<ProtectedRoute><FinancialPage /></ProtectedRoute>} />
                  <Route path="/minha-loja" element={<ProtectedRoute><MinhaLoja /></ProtectedRoute>} />
                  <Route path="/tutoriais" element={<ProtectedRoute><Tutoriais /></ProtectedRoute>} />
                  <Route path="/fale-conosco" element={<ProtectedRoute><FaleConosco /></ProtectedRoute>} />
                  <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
                  <Route path="/historico" element={<Navigate to="/financeiro" replace />} />
                  <Route path="/gastos" element={<Navigate to="/financeiro" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </TooltipProvider>
            </BulkOperationProvider>
          </ImportProvider>
        </CampaignProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
