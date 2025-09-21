import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Game from "./pages/Game";
import Comprar from "./pages/Comprar";
import Auth from "./pages/Auth";
import Conta from "./pages/Conta";
import Raspadinhas from "./pages/Raspadinhas";
import Admin from "./pages/Admin";
import Influencer from "./pages/Influencer";
import NotFound from "./pages/NotFound";
import Sobre from "./pages/Sobre";
import Termos from "./pages/Termos";
import Privacidade from "./pages/Privacidade";
import Contato from "./pages/Contato";
import Regras from "./pages/Regras";
import Afiliados from "./pages/Afiliados";
import { Footer } from "@/components/Footer";
import { ScrollToTop } from "@/components/ScrollToTop";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <div className="min-h-screen bg-dark-gradient">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/sobre" element={<Sobre />} />
                <Route path="/termos" element={<Termos />} />
                <Route path="/privacidade" element={<Privacidade />} />
                <Route path="/contato" element={<Contato />} />
                <Route path="/regras" element={<Regras />} />
                <Route path="/afiliados" element={<Afiliados />} />
                
                {/* Protected Routes */}
                <Route path="/jogo/:id" element={
                  <ProtectedRoute>
                    <Game />
                  </ProtectedRoute>
                } />
                <Route path="/comprar/:id" element={
                  <ProtectedRoute>
                    <Comprar />
                  </ProtectedRoute>
                } />
                <Route path="/conta" element={
                  <ProtectedRoute>
                    <Conta />
                  </ProtectedRoute>
                } />
                <Route path="/raspadinhas" element={<Raspadinhas />} />
                
                {/* Role-specific Routes */}
                <Route path="/admin" element={
                  <ProtectedRoute requiredRole="admin">
                    <Admin />
                  </ProtectedRoute>
                } />
                <Route path="/influencer" element={
                  <ProtectedRoute requiredRole="influencer">
                    <Influencer />
                  </ProtectedRoute>
                } />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;



