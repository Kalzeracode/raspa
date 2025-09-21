import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { NewNavbar } from '@/components/NewNavbar';
import { Footer } from '@/components/Footer';
import { Sparkles, ArrowLeft, Crown, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ScratchCard {
  id: string;
  nome: string;
  premio: number;
  cash_payout?: number | null;
  imagem_url: string;
  preco: number;
  ativo: boolean;
}

interface Promotion {
  id: string;
  title: string;
  description: string;
  discount_percentage: number;
  ends_at: string;
}

const Comprar = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [card, setCard] = useState<ScratchCard | null>(null);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    loadCardData();
  }, [id, user, navigate]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const loadCardData = async () => {
    if (!id) return;

    try {
      // Load card data
      const { data: cardData } = await supabase
        .from('raspadinhas')
        .select('id, nome, premio, cash_payout, imagem_url, preco, ativo')
        .eq('id', id)
        .eq('ativo', true)
        .single();

      if (!cardData) {
        toast({
          title: 'Erro',
          description: 'Raspadinha não encontrada',
          variant: 'destructive'
        });
        navigate('/raspadinhas');
        return;
      }

      setCard({
        id: cardData.id,
        nome: cardData.nome,
        premio: Number(cardData.premio || 0),
        cash_payout: Number(cardData.cash_payout || 0),
        imagem_url: cardData.imagem_url,
        preco: Number(cardData.preco || 1),
        ativo: !!cardData.ativo,
      });

      // Check for active promotions for this card
      const { data: promoData } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .eq('type', 'CARD_DISCOUNT')
        .gt('ends_at', new Date().toISOString())
        .contains('target_card_ids', [id])
        .order('discount_percentage', { ascending: false })
        .limit(1)
        .single();

      if (promoData) {
        setPromotion(promoData);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!card || !user) return;

    setPurchasing(true);

    try {
      const finalPrice = getFinalPrice();
      const { data, error } = await supabase.functions.invoke("process-game", {
        body: {
          scratch_card_id: card.id,
          user_id: user.id,
          card_price: finalPrice,
        },
      });

      if (error) throw error;

      if (!data?.success) {
        toast({
          title: "Erro",
          description: data?.error || "Falha na compra.",
          variant: "destructive",
        });
        return;
      }

      if (data.is_winner) {
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        toast({
          title: "Parabéns!",
          description: data.message || `Você ganhou ${formatCurrency(data.prize_amount || 0)}!`,
        });
      } else {
        toast({
          title: "Não foi desta vez",
          description: data.message || "Tente novamente!",
          variant: "destructive",
        });
      }

      setTimeout(() => {
        navigate(`/jogo/${card.id}?purchased=true`);
      }, 1500);
    } catch (error: any) {
      console.error("Erro na compra:", error);
      toast({
        title: "Erro na compra",
        description: error?.message || "Erro interno do servidor",
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const getOriginalPrice = () => (card ? Number(card.preco || 1) : 1);
  const getFinalPrice = () => {
    const originalPrice = getOriginalPrice();
    if (promotion) {
      return originalPrice * (1 - promotion.discount_percentage / 100);
    }
    return originalPrice;
  };

  const getTimeRemaining = (endTime: string) => {
    const end = new Date(endTime).getTime();
    const now = new Date().getTime();
    const distance = end - now;

    if (distance < 0) return null;

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Raspadinha não encontrada</h1>
          <Button onClick={() => navigate('/raspadinhas')}>
            Voltar às Raspadinhas
          </Button>
        </div>
      </div>
    );
  }

  const originalPrice = getOriginalPrice();
  const finalPrice = getFinalPrice();
  const hasDiscount = promotion && promotion.discount_percentage > 0;
  const timeLeft = promotion ? getTimeRemaining(promotion.ends_at) : null;

  return (
    <div className="min-h-screen bg-background py-8 px-4" style={{ scrollBehavior: 'smooth' }}>
      <NewNavbar />
      <div className="container mx-auto max-w-4xl" style={{ scrollMarginTop: '2rem' }}>
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/raspadinhas')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar às Raspadinhas
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Card Preview */}
          <div className="space-y-4">
            {/* Premium Card Preview */}
            <div className="group">
              <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
                {/* Image Section with Overlay Effects */}
                <div className="relative h-64 overflow-hidden">
                  {/* Background Effects */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-green-600/20"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)]"></div>
                  
                  {/* Prize Image */}
                  <img 
                    src={card.imagem_url || 'https://sibdsejxpjgdlpdzcgej.supabase.co/storage/v1/object/public/raspadinhas/default-scratch.jpg'} 
                    alt={card.nome}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Discount Badge - Top Right */}
                  {hasDiscount && (
                    <div className="absolute top-4 right-4">
                      <div className="bg-red-500 text-white px-3 py-1 rounded-full font-bold text-lg shadow-lg">
                        -{promotion.discount_percentage}%
                      </div>
                    </div>
                  )}
                  
                  {/* Prize Badge - Top Left */}
                  <div className="absolute top-4 left-4">
                    <div className="bg-green-500 text-white px-3 py-1 rounded-full font-bold text-sm shadow-lg flex items-center gap-1">
                      <span>ðŸ‘‘</span>
                      {formatCurrency(card.premio)}
                    </div>
                  </div>
                  
                  {/* Title Overlay - Center */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <h1 className="text-white text-3xl font-bold text-center px-4 drop-shadow-2xl [text-shadow:_2px_2px_4px_rgb(0_0_0_/_80%)]">
                      {card.nome.toUpperCase()}
                    </h1>
                  </div>
                  
                  {/* Light Effects */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                </div>
                
                {/* Content Section */}
                <div className="p-6 space-y-4">
                  {/* Title and Description */}
                  <div>
                    <h2 className="text-white text-2xl font-bold">{card.nome}</h2>
                    <p className="text-gray-300 mb-4">
                      Raspe e descubra se você ganhou o prêmio máximo de {formatCurrency(card.premio)}!
                    </p>
                    <p className="text-yellow-400 text-sm flex items-center gap-1">
                      <span>â­</span> Prêmio máximo
                    </p>
                  </div>
                  
                  {/* Prize Details */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Prêmio máximo:</span>
                      <span className="font-bold text-green-400">{formatCurrency(card.premio)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Resultado:</span>
                      <span className="font-medium text-white flex items-center gap-1">
                        <span>âš¡</span>
                        Instantâneo
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Pagamento:</span>
                      <span className="font-medium text-green-400 flex items-center gap-1">
                        <span>ðŸ’³</span>
                        PIX Automático
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Promotion Info */}
            {promotion && timeLeft && (
              <Card className="gaming-card border-primary/50">
                <CardHeader>
                  <CardTitle className="text-lg text-primary">
                    ðŸ”¥ {promotion.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{promotion.description}</p>
                  <div className="bg-primary/10 rounded-lg p-3">
                    <p className="text-sm font-medium text-center">
                      â° Oferta termina em: {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Purchase Panel */}
          <div className="space-y-6">
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle className="text-xl">Confirmar Compra</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Pricing */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Preço da raspadinha:</span>
                    {hasDiscount ? (
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground line-through">
                          {formatCurrency(originalPrice)}
                        </div>
                        <div className="font-bold text-lg text-primary">
                          {formatCurrency(finalPrice)}
                        </div>
                      </div>
                    ) : (
                      <span className="font-bold text-lg">{formatCurrency(finalPrice)}</span>
                    )}
                  </div>
                  
                  {hasDiscount && (
                    <div className="flex justify-between items-center text-green-400">
                      <span>Desconto:</span>
                      <span className="font-bold">
                        -{formatCurrency(originalPrice - finalPrice)} ({promotion.discount_percentage}%)
                      </span>
                    </div>
                  )}
                  
                  <hr className="border-border" />
                  
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">{formatCurrency(finalPrice)}</span>
                  </div>
                </div>

                {/* User Balance */}
                <div className="bg-secondary/30 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Seu saldo:</span>
                    <span className="font-bold">{formatCurrency(profile?.saldo || 0)}</span>
                  </div>
                  
                  {profile && profile.saldo < finalPrice && (
                    <p className="text-sm text-destructive mt-2">
                      Saldo insuficiente. Adicione mais {formatCurrency(finalPrice - profile.saldo)} para continuar.
                    </p>
                  )}
                </div>

                {/* Purchase Button */}
                <Button 
                  onClick={handlePurchase}
                  disabled={purchasing || !profile || profile.saldo < finalPrice}
                  className="w-full gaming-button text-lg py-6"
                  size="lg"
                >
                  {purchasing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Processando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Comprar e Jogar
                    </>
                  )}
                </Button>

                {/* Info */}
                <div className="text-xs text-muted-foreground text-center space-y-1">
                  <p>âœ… Resultado instantâneo após a compra</p>
                  <p>ðŸ’³ Prêmios pagos automaticamente via PIX</p>
                  <p>ðŸ”’ Transação segura e criptografada</p>
                </div>
              </CardContent>
            </Card>

            {/* Game Rules */}
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle className="text-lg">Como Funciona</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">1</div>
                    <p>Clique em "Comprar e Jogar" para adquirir a raspadinha</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">2</div>
                    <p>O resultado é calculado instantaneamente pelo sistema</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">3</div>
                    <p>Se ganhar, o prêmio é creditado automaticamente no seu saldo</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">4</div>
                    <p>Você pode sacar via PIX a qualquer momento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Comprar;
