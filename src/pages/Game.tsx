import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NewNavbar } from "@/components/NewNavbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ShoppingCart, Sparkles, Coins, RotateCw } from "lucide-react";
import { ScratchGrid } from "@/components/ScratchGrid";

interface Raspadinha {
  id: string;
  nome: string;
  imagem_url?: string;
  premio: number;
  cash_payout?: number | null;
  preco: number;
  ativo: boolean;
}

interface GameResult {
  won: boolean;
  prizeAmount: number;
  new_balance?: number;
  message?: string;
  gridValues?: number[];
  winningCells?: number[];
}

const DEFAULT_TICKET_COST = 1.0;

export default function Game() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [raspadinha, setRaspadinha] = useState<Raspadinha | null>(null);
  const [loading, setLoading] = useState(true);

  const [purchasing, setPurchasing] = useState(false);
  const [purchased, setPurchased] = useState(searchParams.get("purchased") === "true");
  const [revealed, setRevealed] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [userBalance, setUserBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState<number | null>(null);
  const [overlayImage, setOverlayImage] = useState<string | undefined>();
  const [scratchKey, setScratchKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    fetchRaspadinha();
  }, [id]);

  useEffect(() => {
    if (user) fetchUserBalance();
  }, [user]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  async function fetchRaspadinha() {
    try {
      const { data, error } = await supabase
        .from("raspadinhas")
        .select("id, nome, imagem_url, premio, cash_payout, preco, ativo")
        .eq("id", id)
        .eq("ativo", true)
        .single();

      if (error || !data) {
        toast({
          title: "Raspadinha não encontrada",
          description: "Esta raspadinha não está disponível.",
          variant: "destructive",
        });
        navigate("/raspadinhas");
        return;
      }

      setRaspadinha({
        id: data.id,
        nome: data.nome,
        imagem_url: data.imagem_url,
        premio: Number(data.premio || 0),
        cash_payout: Number(data.cash_payout || 0),
        preco: Number(data.preco || DEFAULT_TICKET_COST),
        ativo: !!data.ativo,
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserBalance() {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("saldo")
      .eq("user_id", user.id)
      .single();
    setUserBalance(Number(data?.saldo || 0));
  }

  async function buyTicket() {
    if (!user || !raspadinha) return;

    setPurchasing(true);
    try {
      setPendingBalance(null);
      const cost = Number(raspadinha.preco || DEFAULT_TICKET_COST) || DEFAULT_TICKET_COST;
      const { data, error } = await supabase.functions.invoke("process-game", {
        body: {
          scratch_card_id: raspadinha.id,
          user_id: user.id,
          card_price: cost,
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

      const round: GameResult = {
        won: !!data.is_winner,
        prizeAmount: Number(data.prize_amount || 0),
        new_balance: Number(data.new_balance ?? userBalance),
        message: data.message,
        gridValues: Array.isArray(data.grid) ? data.grid.map(Number) : undefined,
        winningCells: Array.isArray(data.winning_cells) ? data.winning_cells.map(Number) : undefined,
      };
      setGameResult(round);

      setPendingBalance(
        typeof data.new_balance === "number" ? Number(data.new_balance) : null
      );

      const candidates = [raspadinha.imagem_url].filter(Boolean) as string[];
      setOverlayImage(
        candidates.length
          ? candidates[Math.floor(Math.random() * candidates.length)]
          : "https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=1200&q=60"
      );

      setPurchased(true);
      setRevealed(false);
      setScratchKey((k) => k + 1);
      navigate(`/jogo/${raspadinha.id}?purchased=true`, { replace: true });
    } catch (err: any) {
      toast({
        title: "Erro na compra",
        description: err?.message || "Não foi possível processar sua compra.",
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  }

  function onReveal() {
    setRevealed(true);
    if (gameResult) {
      toast({
        title: gameResult.won ? "Parabéns!" : "Sem sorte desta vez",
        description:
          gameResult.message ||
          (gameResult.won
            ? `Você ganhou R$ ${gameResult.prizeAmount.toFixed(2)}`
            : "Tente novamente!"),
        variant: gameResult.won ? "default" : "destructive",
      });
    }
    if (pendingBalance !== null) {
      setUserBalance(pendingBalance);
      setPendingBalance(null);
    } else {
      fetchUserBalance();
    }
  }

  function goDeposit() {
    navigate("/depositar");
  }

  const ticketCost = Number(raspadinha?.preco || DEFAULT_TICKET_COST) || DEFAULT_TICKET_COST;
  const canAfford = userBalance >= ticketCost;

  const primaryLabel = purchasing
    ? "Processando..."
    : !purchased
      ? canAfford
        ? "Comprar e Raspar"
        : "Adicionar Saldo"
      : !revealed
        ? canAfford
          ? "Comprar Outra"
          : "Adicionar Saldo"
        : canAfford
          ? "Comprar Outra"
          : "Adicionar Saldo";

  async function onPrimaryClick() {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!purchased) {
      if (!canAfford) {
        goDeposit();
        return;
      }
      await buyTicket();
      return;
    }

    if (!canAfford) {
      goDeposit();
      return;
    }

    await buyTicket();
  }

  function resetScratchOnly() {
    setRevealed(false);
    setScratchKey((k) => k + 1);
  }

  if (loading || !raspadinha) {
    return (
      <div className="min-h-screen bg-background">
        <NewNavbar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NewNavbar />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/raspadinhas")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para raspadinhas
        </button>

        <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
          <Card className="gaming-card">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-primary" />
                {raspadinha.nome}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Ganhe prêmios de até {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(raspadinha.premio)}
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex justify-center">
                {purchased ? (
                  <div className="relative">
                    <div className="text-center mb-3 text-sm text-muted-foreground">
                      Raspe a superfície para revelar o resultado
                    </div>
                    <div className="w-[320px] h-[320px]">
              <ScratchGrid
                key={scratchKey}
                isWinner={!!gameResult?.won}
                prizeAmount={Number(gameResult?.prizeAmount || 0)}
                cardName={raspadinha.nome}
                gridValues={gameResult?.gridValues}
                winningCells={gameResult?.winningCells}
                className="w-full h-full"
                locked={false}
                enableScratch={!revealed}
                onReveal={onReveal}
                        overlayImageUrl={overlayImage || raspadinha.imagem_url}
                        revealAt={0.55}
                        showProgress={false}
                        showResultBanner={false}
                        valueScale={0.23}
                      />
                    </div>

                    {!revealed && (
                      <div className="mt-2 text-center">
                        <button
                          onClick={resetScratchOnly}
                          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200"
                        >
                          <RotateCw className="h-4 w-4" /> Raspar novamente
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-video w-[520px] max-w-full rounded-lg overflow-hidden border border-border">
                    <img
                      src={
                        raspadinha.imagem_url ||
                        "https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=1200&q=60"
                      }
                      alt={raspadinha.nome}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-3">
               <Button
                  onClick={onPrimaryClick}
                  disabled={purchasing}
                  size="lg"
                  className={`w-full max-w-sm gaming-button ${gameResult?.won && revealed ? 'ring-2 ring-amber-300/70 shadow-[0_0_25px_rgba(251,191,36,0.4)] animate-pulse' : ''}`}
                >
                  {purchasing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {primaryLabel}
                    </>
                  )}
                </Button>

                {!canAfford && (
                  <p className="text-sm text-destructive">
                    Saldo insuficiente. Adicione {ticketCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Coins className="h-5 w-5" /> Saldo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(userBalance)}
                </div>
              </CardContent>
            </Card>

            <Card className="gaming-card">
              <CardHeader>
                <CardTitle className="text-lg">Como funciona?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>1. Compre a raspadinha com seu saldo</p>
                <p>2. Raspe a superfície para revelar o prêmio</p>
                <p>3. Se ganhar, o valor entra no seu saldo imediatamente</p>
                <p>4. Repita quantas vezes quiser!</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
