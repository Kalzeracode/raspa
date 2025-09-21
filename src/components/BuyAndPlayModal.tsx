// BuyAndPlayModal.tsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ScratchGrid } from "@/components/ScratchGrid";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Lock, Coins, RotateCw } from "lucide-react";

const SCRATCH_OVERLAY_PLACEHOLDER = "https://images.unsplash.com/photo-1604079628040-94301bb21b11?auto=format&fit=crop&w=600&h=600&q=80";

interface ScratchCard {
  id: string;
  nome: string;
  premio: number;
  imagem_url?: string;
  preco: number;
  cash_payout?: number | null;
}
interface BuyAndPlayModalProps {
  open: boolean;
  onClose: () => void;
  scratchCard: ScratchCard | null;
  onRequestDeposit?: () => void;
}

export const BuyAndPlayModal = ({ open, onClose, scratchCard, onRequestDeposit }: BuyAndPlayModalProps) => {
  const { profile, user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [gameResult, setGameResult] = useState<any>(null);
  const [pendingBalance, setPendingBalance] = useState<number | null>(null);
  const [currentBalance, setCurrentBalance] = useState(profile?.saldo ?? 0);
  const [scratchKey, setScratchKey] = useState(0); // forca reset da camada

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  useEffect(() => {
    if (profile?.saldo !== undefined && profile?.saldo !== null) {
      setCurrentBalance(profile.saldo);
    }
  }, [profile?.saldo, open]);

  useEffect(() => {
    if (!open) {
      setPurchased(false);
      setRevealed(false);
      setGameResult(null);
      setPendingBalance(null);
      setIsPlaying(false);
      setScratchKey(0);
    }
  }, [open]);

  const goDeposit = () => {
    onClose();
    if (onRequestDeposit) {
      onRequestDeposit();
    } else {
      window.location.href = "/depositar"; // ajuste para sua rota de deposito
    }
  };

  const handleReveal = () => {
    setRevealed(true);
    if (pendingBalance !== null) {
      setCurrentBalance(pendingBalance);
      setPendingBalance(null);
    }
  };

  const buyTicket = async () => {
    if (!scratchCard || !user) return;
    setIsPlaying(true);
    try {
      setPendingBalance(null);
      const { data, error } = await supabase.functions.invoke("process-game", {
        body: { scratch_card_id: scratchCard.id, user_id: user.id, card_price: scratchCard.preco },
      });
      if (error) throw error;
      if (!data?.success) return;

      const normalized = {
        ...data,
        grid: Array.isArray(data.grid) ? data.grid.map(Number) : undefined,
        winning_cells: Array.isArray(data.winning_cells) ? data.winning_cells.map(Number) : undefined,
      };
      setGameResult(normalized);
      setPendingBalance(typeof data.new_balance === "number" ? Number(data.new_balance) : null);
      setPurchased(true);
      setRevealed(false);
      setScratchKey((k) => k + 1); // nova camada pra raspar
    } finally {
      setIsPlaying(false);
    }
  };

  const handlePrimary = async () => {
    if (!scratchCard) return;

    const canAfford = currentBalance >= scratchCard.preco;

    // Nao logado -> pede login
    if (!user) {
      window.location.href = "/auth";
      return;
    }

    // 1) ainda nao comprou
    if (!purchased) {
      if (!canAfford) { goDeposit(); return; }
      await buyTicket();
      return;
    }

    // 2) ja comprou mas ainda nao revelou -> "Comprar Outra"
    if (purchased && !revealed) {
      if (!canAfford) { goDeposit(); return; }
      await buyTicket();
      return;
    }

    // 3) revelou -> "Comprar Outra"
    if (revealed) {
      if (!canAfford) { goDeposit(); return; }
      await buyTicket();
      return;
    }
  };

  const resetScratch = () => {
    // so reseta a camada (nao compra outro ticket)
    setRevealed(false);
    setScratchKey((k) => k + 1);
  };

  if (!scratchCard) return null;

  const canAfford = currentBalance >= scratchCard.preco;
  const primaryLabel =
    isPlaying
      ? "Processando..."
      : !purchased
        ? (canAfford ? "Comprar e Raspar" : "Adicionar Saldo")
        : !revealed
          ? (canAfford ? "Comprar Outra" : "Adicionar Saldo")
          : (canAfford ? "Comprar Outra" : "Adicionar Saldo");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[420px] p-0 overflow-hidden border-0 rounded-3xl bg-slate-900/70 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_40px_120px_-40px_rgba(0,0,0,.8)] aurora">
        <div className="relative rounded-3xl p-[1px] gradient-border">
          <div className="rounded-3xl bg-slate-900/70">
            {/* Header */}
            <div className="px-6 pt-6 pb-3 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-200 text-[12px]">
                <Sparkles className="h-3.5 w-3.5" />
                Ache 3 imagens iguais
              </div>
              <h2 className="mt-3 text-xl font-bold text-white tracking-tight">
                {`Ganhe pr\u00eamios de at\u00e9 `}
                <span className="bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
                  {formatCurrency(scratchCard.premio)}
                </span>
              </h2>
              <p className="mt-1 text-[13px] text-slate-300/80">{`Compre uma raspadinha para come\u00e7ar a jogar. Boa sorte!`}</p>
            </div>

            {/* Scratch area */}
            <div className="px-6">
              <div className="relative mx-auto w-[300px] h-[300px] rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_20px_60px_-30px_rgba(0,0,0,.8)] overflow-hidden chrome">
                <div className="absolute left-3 top-3 text-[10px] tracking-wide uppercase text-slate-200/80 bg-slate-900/50 px-2 py-1 rounded border border-white/10">
                  {scratchCard.nome}
                </div>

                {!purchased ? (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <div className="mx-auto mb-2 grid place-items-center h-10 w-10 rounded-full bg-white/8 border border-white/15">
                        <Lock className="h-5 w-5 text-slate-300/90" />
                      </div>
                      <p className="text-slate-200 font-semibold">Bloqueado</p>
                      <p className="text-slate-300/70 text-xs">Compre para jogar</p>
                    </div>
                  </div>
                ) : (
                  <ScratchGrid
                    key={scratchKey}
                    isWinner={Boolean(gameResult?.win)}
                    prizeAmount={Number(gameResult?.prize || 0)}
                    cardName={scratchCard.nome}
                    className="w-full h-full"
                    locked={false}
                    enableScratch={!revealed}
                    onReveal={handleReveal}
                    overlayImageUrl={SCRATCH_OVERLAY_PLACEHOLDER}
                    revealAt={0.87}           // limite de revelacao (sem mensagens)
                    showProgress={false}      // nao exibe "raspe X%"
                    showResultBanner={false}  // nao exibe banner "R$ X no PIX"
                    valueScale={0.18}         // numeros menores (ajuste fino)
                    gridValues={Array.isArray(gameResult?.grid) ? gameResult.grid.map(Number) : undefined}
                    winningCells={Array.isArray(gameResult?.winning_cells) ? gameResult.winning_cells.map(Number) : undefined}
                  />
                )}
              </div>
            </div>

            {/* CTA principal */}
            <div className="px-6 pt-5">
              <Button
                onClick={handlePrimary}
                disabled={isPlaying}
                className={`w-full h-12 text-[15px] font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_10px_30px_-10px_rgba(16,185,129,.6)] relative overflow-hidden shimmer ${gameResult?.win && revealed ? 'ring-2 ring-amber-300/70 shadow-[0_0_25px_rgba(251,191,36,0.4)] animate-pulse' : ''}`}
              >
                {primaryLabel}
              </Button>              

              {/* saldo */}
              <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-800/70 border border-white/10 px-4 py-3">
                <div className="flex items-center gap-2 text-slate-300">
                  <Coins className="h-4 w-4" />
                  <span className="text-xs">Seu saldo</span>
                </div>
                <div className="text-emerald-300 font-bold">{formatCurrency(currentBalance)}</div>
              </div>

              {/* infos */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-slate-300/80">
                <div className="rounded-lg border border-white/10 bg-slate-900/40 p-2">
                  Custo: <span className="font-semibold">{formatCurrency(scratchCard.preco)}</span>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-900/40 p-2">
                  {scratchCard.cash_payout && scratchCard.cash_payout > 0 ? (
                    <>Maximo: <span className="font-semibold">{formatCurrency(scratchCard.cash_payout)}</span></>
                  ) : (
                    <>Prêmio: <span className="font-semibold">{scratchCard.nome}</span></>
                  )}
                </div>
              </div>

              {/* atalhos */}
              <div className="px-1 pt-3 pb-6 text-[11px] text-slate-400/90">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-slate-800/60 border-white/10">Atalhos</Badge>
                  <span><kbd className="kbd">Espaco</kbd> comprar | <kbd className="kbd">Esc</kbd> fechar</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* estilos visuais (mesmos do seu modal anterior) */}
        <style>{`
          .aurora:before,.aurora:after{content:"";position:absolute;inset:-20%;
            background:radial-gradient(40% 30% at 20% 10%, rgba(16,185,129,.18), transparent 60%),
                       radial-gradient(35% 25% at 80% 0%, rgba(59,130,246,.18), transparent 60%),
                       radial-gradient(30% 30% at 50% 100%, rgba(234,179,8,.14), transparent 60%);
            filter:blur(40px);z-index:-1;}
          .gradient-border{background:linear-gradient(135deg, rgba(16,185,129,.7), rgba(59,130,246,.6), rgba(234,179,8,.6)); box-shadow:0 0 0 1px rgba(255,255,255,.06);}
          .chrome{position:relative;}
          .chrome:before{content:"";position:absolute;inset:0;background:linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.02));mix-blend-mode:overlay;pointer-events:none;}
          .shimmer:after{content:"";position:absolute;inset:0;background:linear-gradient(120deg, transparent 0%, rgba(255,255,255,.35) 50%, transparent 100%);transform:translateX(-150%);animation:shimmer 2.2s ease-in-out infinite;}
          @keyframes shimmer {0%{transform:translateX(-150%)}60%,100%{transform:translateX(150%)}}
          .kbd{border:1px solid rgba(255,255,255,.12);padding:2px 6px;border-radius:6px;background:rgba(15,23,42,.6);}
        `}</style>
      </DialogContent>
    </Dialog>
  );
};







