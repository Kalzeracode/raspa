import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Trophy, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LuckyTicketGameProps {
  onBalanceUpdate?: () => void;
}

interface TicketResult {
  success: boolean;
  ticket_id?: string;
  lucky_numbers?: number[];
  user_numbers?: number[];
  winning_cells?: number[];
  prize_amount?: number;
  win_count?: number;
  message?: string;
}

export const LuckyTicketGame: React.FC<LuckyTicketGameProps> = ({ onBalanceUpdate }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [ticketResult, setTicketResult] = useState<TicketResult | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const { toast } = useToast();

  const generateTicket = useCallback(async () => {
    setIsGenerating(true);
    setTicketResult(null);
    setIsRevealed(false);

    try {
      const { data, error } = await supabase.rpc('generate_lucky_ticket', {
        ticket_cost_param: 1.00
      });

      if (error) throw error;

      const result = data as unknown as TicketResult;
      setTicketResult(result);
      
      if (result.success) {
        toast({
          title: "Bilhete Gerado!",
          description: "Seu bilhete da sorte foi criado. Clique em 'Revelar' para ver o resultado!",
        });
      } else {
        toast({
          title: "Erro",
          description: result.message || "Erro ao gerar bilhete",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao gerar bilhete:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar bilhete. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [toast]);

  const revealTicket = useCallback(() => {
    setIsRevealed(true);
    
    if (ticketResult?.win_count && ticketResult.win_count > 0) {
      // Trigger confetti for wins
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      toast({
        title: "Parabéns!",
        description: ticketResult.message,
      });
    } else {
      toast({
        title: "Resultado",
        description: ticketResult?.message || "Não foi desta vez!",
      });
    }

    if (onBalanceUpdate) {
      onBalanceUpdate();
    }
  }, [ticketResult, toast, onBalanceUpdate]);

  const newGame = useCallback(() => {
    setTicketResult(null);
    setIsRevealed(false);
  }, []);

  const renderCell = (number: number, index: number) => {
    const isWinning = ticketResult?.winning_cells?.includes(index + 1);
    const cellClass = isRevealed && isWinning 
      ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 shadow-lg transform scale-105" 
      : "bg-muted text-muted-foreground";
    
    return (
      <div
        key={index}
        className={`
          w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg
          transition-all duration-300 ${cellClass}
        `}
      >
        {number}
      </div>
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <Sparkles className="h-6 w-6 text-primary" />
          Bilhete da Sorte
          <Sparkles className="h-6 w-6 text-primary" />
        </CardTitle>
        <p className="text-muted-foreground">
          Compare seus números com os números da sorte e ganhe prêmios!
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Lucky Numbers Section */}
        {ticketResult?.lucky_numbers && (
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h3 className="text-lg font-semibold">Números da Sorte</h3>
            </div>
            <div className="flex justify-center gap-3">
              {ticketResult.lucky_numbers.map((number, index) => (
                <div
                  key={index}
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 flex items-center justify-center font-bold text-xl shadow-lg"
                >
                  {number}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Numbers Section */}
        {ticketResult?.user_numbers && (
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Seus Números</h3>
            </div>
            <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto">
              {ticketResult.user_numbers.map((number, index) => renderCell(number, index))}
            </div>
          </div>
        )}

        {/* Prize Information */}
        {ticketResult && isRevealed && (
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Badge variant={ticketResult.win_count && ticketResult.win_count > 0 ? "default" : "secondary"}>
                {ticketResult.win_count || 0} acertos
              </Badge>
              {ticketResult.prize_amount && ticketResult.prize_amount > 0 && (
                <Badge variant="default" className="bg-green-500">
                  Prêmio: {new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  }).format(ticketResult.prize_amount)}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {!ticketResult && (
            <Button 
              onClick={generateTicket} 
              disabled={isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? "Gerando..." : "Gerar Bilhete (R$ 1,00)"}
            </Button>
          )}

          {ticketResult && !isRevealed && (
            <Button 
              onClick={revealTicket}
              className="w-full"
              size="lg"
              variant="default"
            >
              Revelar Resultado
            </Button>
          )}

          {ticketResult && isRevealed && (
            <Button 
              onClick={newGame}
              className="w-full"
              size="lg"
              variant="outline"
            >
              Jogar Novamente
            </Button>
          )}
        </div>

        {/* Game Rules */}
        <div className="mt-6 p-4 bg-muted rounded-lg text-sm text-muted-foreground">
          <h4 className="font-semibold mb-2">Como jogar:</h4>
          <ul className="space-y-1">
            <li>• Custo: R$ 1,00 por bilhete</li>
            <li>• Compare seus 10 números com os 2 números da sorte</li>
            <li>• Prêmios: 1 acerto = R$ 2,00 | 2 acertos = R$ 10,00 | 3 acertos = R$ 50,00 | 4 acertos = R$ 200,00</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

