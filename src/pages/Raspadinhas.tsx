// src/pages/Raspadinhas.tsx

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

import { useAuth } from '@/contexts/AuthContext';
import { NewNavbar } from '@/components/NewNavbar';
import { Footer } from '@/components/Footer';
import { BuyAndPlayModal } from '@/components/BuyAndPlayModal';
import { DepositModal } from '@/components/DepositModal';
// REMOVIDO: import { LuckyTicketGame } from '@/components/LuckyTicketGame';
import { SimpleHeroCarousel } from "@/components/SimpleHeroCarousel";

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Gift, Play, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { enhanceScratchCard } from '@/lib/scratch-card-utils';

// Interface atualizada para incluir preço e descrição
interface Raspadinha {
  id: string;
  nome: string;
  imagem_url?: string;
  premio: number;
  ativo: boolean;
  preco: number;       // Adicionado
  descricao: string;   // Adicionado
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

export default function Raspadinhas() {
  const { user } = useAuth();
  const [raspadinhas, setRaspadinhas] = useState<Raspadinha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Raspadinha | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);

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

  useEffect(() => {
    const fetchRaspadinhas = async () => {
      try {
        setError(null);
        const { data, error } = await supabase
          .from('raspadinhas')
          .select('*')
          .eq('ativo', true)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          // Mapeia os dados para adicionar preço baseado no tipo de raspadinha
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

    fetchRaspadinhas();
  }, []);
  
  const handleCardClick = (raspadinha: Raspadinha) => {
    setSelectedCard(raspadinha);
    setModalOpen(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent, raspadinha: Raspadinha) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick(raspadinha);
    }
  };

  // --- Renderização ---

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-black/20">
        <NewNavbar />
        
        <div className="container mx-auto px-4 py-12 sm:py-16">
          <div className="max-w-7xl mx-auto">
            {/* Cabeçalho Skeleton */}
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-8 h-8 bg-white/5 rounded animate-pulse"></div>
                <div className="h-8 w-64 bg-white/5 rounded animate-pulse"></div>
              </div>
              <div className="h-4 w-96 bg-white/5 rounded mx-auto animate-pulse"></div>
            </div>

            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          </div>
        </div>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-black/20">
      <NewNavbar />

      {/* Carrossel igual ao da Index */}
      <div className="pt-8 mb-12">
        <SimpleHeroCarousel />
      </div>
      
      <div className="container mx-auto px-4 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto">
          {/* Cabeçalho da Página */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Crown className="w-8 h-8 text-primary" />
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Jogos Disponíveis
              </h1>
            </div>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Escolha entre raspadinhas tradicionais! PIX na hora.
            </p>
          </div>

          {/* REMOVIDO: Novo Jogo: Bilhete da Sorte
          <div className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">ðŸŽ¯ Novo: Bilhete da Sorte</h2>
              <p className="text-gray-300">Compare seus números com os números da sorte e ganhe até R$ 200!</p>
            </div>
            <LuckyTicketGame />
          </div>
          */}

          {/* Mensagem de Erro */}
          {error && (
            <Alert className="mb-6 bg-red-900/20 border-red-500/50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Seção Raspadinhas Tradicionais */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">ðŸŽ° Raspadinhas Tradicionais</h2>
            <p className="text-gray-300">As clássicas raspadinhas com prêmios garantidos</p>
          </div>

          {/* Grid de Raspadinhas */}
          {!error && raspadinhas.length === 0 ? (
            <Card className="text-center py-16 bg-card-dark border-white/10">
              <CardContent>
                <Gift className="h-16 w-16 text-primary/50 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-white mb-2">Nenhuma raspadinha disponível</h3>
                <p className="text-gray-400">
                  Volte em breve para novas oportunidades de ganhar!
                </p>
              </CardContent>
            </Card>
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
                  className="group bg-card-dark border-white/10 hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/20 overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                  style={{ 
                    animation: `fadeInUp 0.5s ease-out ${index * 0.1}s forwards`, 
                    opacity: 0,
                    animationFillMode: 'forwards'
                  }}
                >
                  <div className="relative h-48 bg-primary/10 flex items-center justify-center overflow-hidden">
                    {raspadinha.imagem_url ? (
                      <img 
                        src={raspadinha.imagem_url} 
                        alt={raspadinha.nome} 
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        onError={(e) => {
                          // Fallback se a imagem falhar ao carregar
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = '<div class="text-6xl opacity-20">ðŸŽ°</div>';
                        }}
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
                  </div>

                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors truncate">
                      {raspadinha.nome}
                    </h3>
                    
                    <p className="text-gray-400 text-sm mb-4 h-10 line-clamp-2">
                      {raspadinha.descricao}
                    </p>

                    <div className="space-y-3 mb-6">
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
                    
                    <Button 
                      className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 group"
                      aria-label={`Comprar e jogar ${raspadinha.nome}`}
                    >
                      <Play className="w-4 h-4 mr-2 group-hover:animate-pulse" />
                      Comprar e Jogar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Botão de recarregar em caso de erro */}
          {error && (
            <div className="text-center mt-6">
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-primary/50 hover:bg-primary/10"
              >
                Tentar Novamente
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <DepositModal
        open={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        onSuccess={() => setShowDepositModal(false)}
      />

      {/* Modal unificado */}
      <BuyAndPlayModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedCard(null);
        }}
        scratchCard={selectedCard}
        onRequestDeposit={() => setShowDepositModal(true)}
      />

      <Footer />
    </div>
  );
}

