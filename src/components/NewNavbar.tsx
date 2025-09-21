import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, User, CreditCard, ArrowRightLeft, LogOut, Home, Grid3X3, Plus, Ticket, UserCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { DepositModal } from "@/components/DepositModal";

export function NewNavbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [realRevenue, setRealRevenue] = useState<number>(0);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const openDepositModal = () => {
    if (user) {
      setIsDepositModalOpen(true);
    } else {
      navigate("/auth");
    }
  };

  const openWithdrawModal = () => {
    // TODO: Implement withdraw modal  
    console.log("Open withdraw modal");
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu on route change
  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname]);

  // Fetch real revenue for admin users
  useEffect(() => {
    const fetchRealRevenue = async () => {
      if ((profile as any)?.role === 'admin') {
        try {
          const { data, error } = await supabase
            .from('credit_purchases')
            .select('amount')
            .eq('status', 'completed')
            .eq('is_simulated', false);
          
          if (!error && data) {
            const total = data.reduce((sum, purchase) => sum + (purchase.amount || 0), 0);
            setRealRevenue(total);
          }
        } catch (error) {
          console.error('Error fetching real revenue:', error);
        }
      }
    };

    fetchRealRevenue();
  }, [profile]);

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden flex items-center justify-center w-10 h-10 text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 hover:scale-105 transition-transform">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/30">
                R
              </div>
              <span className="hidden sm:block text-white font-bold text-xl">RaspeAê</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <Link to="/" className="text-gray-300 hover:text-primary transition-colors">
                Início
              </Link>
              <Link to="/raspadinhas" className="text-gray-300 hover:text-primary transition-colors">
                Raspadinhas
              </Link>
              <Link to="/sobre" className="text-gray-300 hover:text-primary transition-colors">
                Sobre
              </Link>
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-3">
              {user ? (
                <>
                  {/* Balance Display */}
                  <div className="hidden sm:flex items-center space-x-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <span className="text-primary font-semibold">
                      {(profile as any)?.role === 'admin' 
                        ? `Receita: ${formatCurrency(realRevenue)}`
                        : formatCurrency((profile as any)?.saldo || 0)
                      }
                    </span>
                  </div>

                  {/* Deposit Button */}
                  <Button
                    onClick={openDepositModal}
                    className="hidden sm:flex items-center space-x-2 bg-primary hover:bg-primary-glow text-white px-4 py-2 rounded-xl font-semibold transition-all hover:scale-105 shadow-lg shadow-primary/30"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden md:block">Depositar</span>
                  </Button>

                  {/* User Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                      className="flex items-center space-x-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 hover:bg-white/10 transition-colors"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary text-white text-sm">
                          {(profile as any)?.display_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block text-white text-sm font-medium max-w-24 truncate">
                        {(profile as any)?.display_name || user.email?.split('@')[0]}
                      </span>
                    </button>

                    {/* Dropdown Menu */}
                    {isUserDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl py-2 z-50">
                        <Link
                          to="/conta"
                          className="flex items-center space-x-3 px-4 py-2 text-gray-300 hover:text-primary hover:bg-white/5 transition-colors"
                          onClick={() => setIsUserDropdownOpen(false)}
                        >
                          <User className="w-4 h-4" />
                          <span>Minha Conta</span>
                        </Link>
                        {(profile as any)?.role === 'influencer' && (
                          <Link
                            to="/influencer"
                            className="flex items-center space-x-3 px-4 py-2 text-gray-300 hover:text-primary hover:bg-white/5 transition-colors"
                            onClick={() => setIsUserDropdownOpen(false)}
                          >
                            <User className="w-4 h-4" />
                            <span>Painel Influencer</span>
                          </Link>
                        )}
                        {(profile as any)?.role === 'admin' && (
                          <Link
                            to="/admin"
                            className="flex items-center space-x-3 px-4 py-2 text-gray-300 hover:text-primary hover:bg-white/5 transition-colors"
                            onClick={() => setIsUserDropdownOpen(false)}
                          >
                            <User className="w-4 h-4" />
                            <span>Painel Admin</span>
                          </Link>
                         )}
                        <Link
                          to="/raspadinhas"
                          className="flex items-center space-x-3 px-4 py-2 text-gray-300 hover:text-primary hover:bg-white/5 transition-colors"
                          onClick={() => setIsUserDropdownOpen(false)}
                        >
                          <Play className="w-4 h-4" />
                          <span>Jogar</span>
                        </Link>
                        <button
                          onClick={openWithdrawModal}
                          className="flex items-center space-x-3 px-4 py-2 text-gray-300 hover:text-primary hover:bg-white/5 transition-colors w-full text-left"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                          <span>Sacar</span>
                        </button>
                        <div className="border-t border-white/10 my-2"></div>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center space-x-3 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors w-full text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sair</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link to="/auth">
                    <Button variant="ghost" className="text-white hover:bg-white/10">
                      Entrar
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button className="bg-primary hover:bg-primary-glow text-white font-semibold shadow-lg shadow-primary/30">
                      Registrar
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${isMobileMenuOpen ? '' : 'pointer-events-none'}`}>
        {/* Backdrop */}
        <div 
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeMobileMenu}
        />
        
        {/* Sidebar */}
        <aside className={`absolute left-0 top-0 h-full w-80 bg-black/98 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 overflow-y-auto ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <Link to="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-xl flex items-center justify-center text-white font-bold text-lg">
                R
              </div>
              <span className="text-white font-bold text-xl">RaspeAê</span>
            </Link>
            <button
              onClick={closeMobileMenu}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-2">
            {user && (
              <>
                <Link
                  to="/"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-primary hover:bg-white/5 rounded-xl transition-colors"
                  onClick={closeMobileMenu}
                >
                  <Home className="w-5 h-5" />
                  <span>Início</span>
                </Link>
                <Link
                  to="/raspadinhas"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-primary hover:bg-white/5 rounded-xl transition-colors"
                  onClick={closeMobileMenu}
                >
                  <Grid3X3 className="w-5 h-5" />
                  <span>Raspadinhas</span>
                </Link>
                <button
                  onClick={() => { openDepositModal(); closeMobileMenu(); }}
                  className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-primary hover:bg-white/5 rounded-xl transition-colors w-full text-left"
                >
                  <Plus className="w-5 h-5" />
                  <span>Depositar</span>
                </button>
                <button
                  onClick={() => { openWithdrawModal(); closeMobileMenu(); }}
                  className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-primary hover:bg-white/5 rounded-xl transition-colors w-full text-left"
                >
                  <ArrowRightLeft className="w-5 h-5" />
                  <span>Sacar</span>
                </button>
                <div className="border-t border-white/10 my-4"></div>
                <button
                  onClick={() => { handleSignOut(); closeMobileMenu(); }}
                  className="flex items-center space-x-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors w-full text-left"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sair</span>
                </button>
              </>
            )}

            {!user && (
              <>
                <Link
                  to="/"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-primary hover:bg-white/5 rounded-xl transition-colors"
                  onClick={closeMobileMenu}
                >
                  <Home className="w-5 h-5" />
                  <span>Início</span>
                </Link>
                <Link
                  to="/sobre"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-primary hover:bg-white/5 rounded-xl transition-colors"
                  onClick={closeMobileMenu}
                >
                  <span>Sobre</span>
                </Link>
                <div className="border-t border-white/10 my-4"></div>
                <Link
                  to="/auth"
                  className="block w-full bg-primary hover:bg-primary-glow text-white text-center py-3 rounded-xl font-semibold transition-colors"
                  onClick={closeMobileMenu}
                >
                  Entrar / Registrar
                </Link>
              </>
            )}
          </nav>
        </aside>
      </div>

      {/* Bottom Navigation for Mobile */}
      {user && (
        <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-white/5 lg:hidden z-40">
          <div className="flex items-center justify-around py-2">
            <Link
              to="/"
              className="flex flex-col items-center space-y-1 px-3 py-2 text-gray-400 hover:text-primary transition-colors"
            >
              <Home className="w-5 h-5" />
              <span className="text-xs">Início</span>
            </Link>
            <Link
              to="/raspadinhas"
              className="flex flex-col items-center space-y-1 px-3 py-2 text-gray-400 hover:text-primary transition-colors"
            >
              <Grid3X3 className="w-5 h-5" />
              <span className="text-xs">Jogar</span>
            </Link>
            <button
              onClick={openDepositModal}
              className="flex flex-col items-center space-y-1 px-3 py-2 text-primary transition-colors"
            >
              <div className="bg-primary rounded-full p-2">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs">Depositar</span>
            </button>
            <Link
              to="/conta"
              className="flex flex-col items-center space-y-1 px-3 py-2 text-gray-400 hover:text-primary transition-colors"
            >
              <Ticket className="w-5 h-5" />
              <span className="text-xs">Apostas</span>
            </Link>
            <Link
              to="/conta"
              className="flex flex-col items-center space-y-1 px-3 py-2 text-gray-400 hover:text-primary transition-colors"
            >
              <UserCircle className="w-5 h-5" />
              <span className="text-xs">Perfil</span>
            </Link>
          </div>
        </nav>
      )}

      {/* Click outside handler for dropdown */}
      {isUserDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsUserDropdownOpen(false)}
        />
      )}

      {/* Deposit Modal */}
      <DepositModal
        open={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        onSuccess={() => {
          setIsDepositModalOpen(false);
          // Refresh balance or handle success
        }}
      />
    </>
  );
}