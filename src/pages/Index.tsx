import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { NewNavbar } from "@/components/NewNavbar";
import { SimpleHeroCarousel } from "@/components/SimpleHeroCarousel";
import { NewWinnersSection } from "@/components/NewWinnersSection";
import { DepositModal } from "@/components/DepositModal";
import { AuthModal } from "@/components/AuthModal";
import { BuyAndPlayModal } from "@/components/BuyAndPlayModal";
import { PrizesModal } from "@/components/PrizesModal";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Gift, Play, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { enhanceScratchCard } from "@/lib/scratch-card-utils";

interface Promotion {
  id: string;
  title: string;
  description?: string;
  banner_url: string;
  type: string;
  discount_percentage?: number;
  ends_at: string;
}

interface Raspadinha {
  id: string;
  nome: string;
  imagem_url?: string;
  premio: number;
  ativo: boolean;
  preco: number;
  descricao: string;
}

// Componente de Skeleton Loading
const SkeletonCard = () => (
  <Card className="bg-card-dark border-white/10 animate-pulse">
    <div className="h-48 bg-white/5"></div>
    <CardContent className="p-6">
      <div className="h-6 bg-white/5 rounded mb-2"></div>
      <div className="h-4 bg-white/5 rounded w-3/4 mb-4"></div>
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-white/5 rounded"></div>
        <div className="h-4 bg-white/5 rounded"></div>
      </div>
      <div className="h-10 bg-white/5 rounded"></div>
    </CardContent>
  </Card>
);

export function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [raspadinhas, setRaspadinhas] = useState<Raspadinha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showBuyPlayModal, setShowBuyPlayModal] = useState(false);
  const [showPrizesModal, setShowPrizesModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Raspadinha | null>(null);

  useEffect(() => {
    loadPromotions();
    loadScratchCards();
  }, []);

  // Load promotions from database
  const loadPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .gt('ends_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromotions(data || []);
    } catch (error) {
      console.error('Error loading promotions:', error);
    }
  };

  // Load scratch cards from database
  const loadScratchCards = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('raspadinhas')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const enhancedData = data.map(card => enhanceScratchCard(card));
        setRaspadinhas(enhancedData as Raspadinha[]);
      }
    } catch (error) {
      console.error('Erro ao buscar raspadinhas:', error);
      setError('Erro ao carregar as raspadinhas. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Handle card play
  const handleCardClick = (raspadinha: Raspadinha) => {
    if (!user) {
      setSelectedCard(raspadinha);
      setShowAuthModal(true);
      return;
    }
    
    setSelectedCard(raspadinha);
    setShowBuyPlayModal(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent, raspadinha: Raspadinha) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick(raspadinha);
    }
  };

  const closeBuyAndPlay = () => {
    setShowBuyPlayModal(false);
    setSelectedCard(null);
  };

  // Função para formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Memoização das raspadinhas ordenadas por prêmio
  const sortedRaspadinhas = useMemo(() => {
    return [...raspadinhas].sort((a, b) => b.premio - a.premio);
  }, [raspadinhas]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-black/20">
      <NewNavbar />

      {/* Hero */}
      <div className="pt-16">
        <SimpleHeroCarousel />
      </div>

      {/* Winners */}
      <NewWinnersSection />

      {/* Seção Raspadinhas */}
      <section className="py-16 bg-gradient-to-b from-black/10 to-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Crown className="w-8 h-8 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Raspadinhas Disponíveis
              </h2>
            </div>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Escolha sua raspadinha favorita e ganhe prêmios incríveis! PIX na hora e produtos exclusivos.
            </p>
          </div>

          {/* Mensagem de Erro */}
          {error && (
            <Alert className="mb-6 bg-red-900/20 border-red-500/50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : !error && sortedRaspadinhas.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 opacity-20">ðŸŽ°</div>
              <h3 className="text-white text-xl font-bold mb-2">Nenhuma raspadinha disponível</h3>
              <p className="text-gray-400">Volte em breve para novas oportunidades!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedRaspadinhas.map((raspadinha, index) => (
                <Card 
                  key={raspadinha.id} 
                  onClick={() => handleCardClick(raspadinha)}
                  onKeyPress={(e) => handleKeyPress(e, raspadinha)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Raspadinha ${raspadinha.nome}, prêmio até ${formatCurrency(raspadinha.premio)}, preço ${formatCurrency(raspadinha.preco)}`}
                  className="group bg-card-dark border-white/10 hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/20 overflow-hidden cursor-pointer"
                  style={{
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  <div className="relative">
                    {/* Card Image/Background */}
                    <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center overflow-hidden">
                      {raspadinha.imagem_url ? (
                        <img 
                          src={raspadinha.imagem_url} 
                          alt={raspadinha.nome} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="text-6xl opacity-20">ðŸŽ°</div>
                      )}
                      
                      {/* Badge de destaque para maiores prêmios */}
                      {index === 0 && (
                        <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                          MAIOR PRÊMIO
                        </div>
                      )}

                      {/* Play Overlay */}
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                        <Button onClick={() => handleCardClick(raspadinha)} className="bg-primary hover:bg-primary-glow text-white rounded-full w-16 h-16 p-0 shadow-2xl shadow-primary/50 hover:scale-110 transition-all">
                          <Play className="w-6 h-6 ml-1" />
                        </Button>
                      </div>
                    </div>

                    <CardContent className="p-6">
                      {/* Card Title */}
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
                        {raspadinha.nome}
                      </h3>

                      {/* Description */}
                      <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                        {raspadinha.descricao}
                      </p>

                      {/* Prize & Price */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Prêmio até:</span>
                          <span className="text-primary font-bold text-lg">
                            {formatCurrency(raspadinha.premio)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Preço:</span>
                          <span className="text-white font-semibold">
                            {formatCurrency(raspadinha.preco)}
                          </span>
                        </div>
                      </div>

                      {/* Play Button */}
                      <Button onClick={() => handleCardClick(raspadinha)} className="w-full mt-6 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300">
                        <Play className="w-4 h-4 mr-2" />
                        Jogar Agora
                      </Button>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* View All Button - only show if there are cards */}
          {sortedRaspadinhas.length > 0 && (
            <div className="text-center mt-12">
              <Button 
                variant="outline" 
                className="bg-white/5 backdrop-blur-sm border-white/20 text-white hover:bg-white/10 px-8 py-3 text-lg rounded-full"
                onClick={() => navigate('/raspadinhas')}
              >
                Ver Todas as Raspadinhas
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Espaço para bottom nav mobile */}
      <div className="h-20 lg:h-0" />

      <Footer />

      {/* Modals */}
      <DepositModal
        open={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        onSuccess={() => {
          loadScratchCards();
        }}
      />

      <AuthModal
        open={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setSelectedCard(null);
        }}
      />

      <PrizesModal 
        open={showPrizesModal} 
        onClose={() => setShowPrizesModal(false)} 
      />

      <BuyAndPlayModal
        open={showBuyPlayModal}
        onClose={closeBuyAndPlay}
        scratchCard={selectedCard}
        onRequestDeposit={() => setShowDepositModal(true)}
      />
    </div>
  );
};

export default Index;

