// src/components/DepositModal.tsx

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, CheckCircle, QrCode, Clock, AlertCircle, RefreshCw, Star, Flame } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// --- Interfaces ---
interface DepositModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultAmount?: number;
}

interface PixData {
  correlationId: string;
  pixCode: string;
  qrCodeImage: string;
  amount: number;
  expiresAt: string;
  purchaseId: string;
}

type PaymentStatus = 'pending' | 'completed' | 'expired' | 'failed';

// --- Pacotes de Depósito ---
const depositPackages = [
  { amount: 10, bonus: 5, label: 'APOSTADOR' },
  { amount: 25, bonus: 15, label: 'VETERANO', popular: true },
  { amount: 50, bonus: 35, label: 'MESTRE' },
  { amount: 100, bonus: 80, label: 'LENDA' },
  { amount: 500, bonus: 450, label: 'SUPREMO' },
  { amount: 1000, bonus: 900, label: 'ELITE' },
];

export function DepositModal({ open, onClose, onSuccess, defaultAmount }: DepositModalProps) {
  const { user } = useAuth();
  
  // --- State Management ---
  const [step, setStep] = useState<'select' | 'pay'>('select');
  const [amount, setAmount] = useState(defaultAmount?.toString() || '');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [selectedPackageAmount, setSelectedPackageAmount] = useState<number | null>(defaultAmount || null);

  // --- Utility Functions ---
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Handlers ---
  const handleClose = useCallback(() => {
    setStep('select');
    setAmount('');
    setPixData(null);
    setTimeLeft(0);
    setPaymentStatus('pending');
    setSelectedPackageAmount(null);
    onClose();
  }, [onClose]);

  const selectPackage = (pkg: typeof depositPackages[0]) => {
    setAmount(pkg.amount.toString());
    setSelectedPackageAmount(pkg.amount);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
    setSelectedPackageAmount(null); // Deselect package on custom input
  };

  const copyPixCode = () => {
    if (pixData) {
      navigator.clipboard.writeText(pixData.pixCode);
      toast({ title: "Copiado!", description: "Código PIX copiado para a área de transferência." });
    }
  };

  // --- API Calls & Effects ---
  const generatePix = async () => {
    if (!user) {
      toast({ title: "Login necessário", variant: "destructive" });
      handleClose();
      // Idealmente, usar um hook de navegação ao invés de window.location
      window.location.href = '/auth';
      return;
    }

    const amountValue = parseFloat(amount);
    if (!amount || amountValue < 10) {
      toast({ title: "Valor mínimo de R$ 10,00", variant: "destructive" });
      return;
    }
    if (amountValue > 10000) {
      toast({ title: "Valor máximo de R$ 10.000,00", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-pix', {
        body: { amount: amountValue }
      });

      if (error) throw error;
      if (!data) throw new Error('Nenhuma informação recebida ao gerar o PIX.');

      setPixData(data);
      setPaymentStatus('pending');
      setStep('pay'); // Muda para o passo de pagamento
      toast({ title: "PIX gerado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao gerar PIX", description: "Tente novamente mais tarde.", variant: "destructive" });
      console.error('Error generating PIX:', error);
    } finally {
      setLoading(false);
    }
  };

  // Efeito para o contador de tempo do PIX
  useEffect(() => {
    if (step !== 'pay' || !pixData || paymentStatus !== 'pending') return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, new Date(pixData.expiresAt).getTime() - new Date().getTime());
      setTimeLeft(Math.floor(remaining / 1000));
      if (remaining <= 0) setPaymentStatus('expired');
    }, 1000);

    return () => clearInterval(interval);
  }, [pixData, step, paymentStatus]);

  // Efeito para verificar o status do pagamento
  useEffect(() => {
    if (step !== 'pay' || !pixData || paymentStatus !== 'pending') return;

    const pollInterval = setInterval(async () => {
      const { data: purchase } = await supabase
        .from('credit_purchases')
        .select('status')
        .eq('id', pixData.purchaseId)
        .single();

      if (purchase?.status === 'completed') {
        setPaymentStatus('completed');
        toast({ title: "Pagamento confirmado!", description: `${formatCurrency(pixData.amount)} adicionado ao seu saldo.` });
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      } else if (purchase?.status === 'failed') {
        setPaymentStatus('failed');
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [pixData, step, paymentStatus, onSuccess, handleClose]);

  // --- Renderização dos Componentes de UI ---

  const renderStatus = () => {
    switch (paymentStatus) {
      case 'completed':
        return <div className="flex flex-col items-center gap-4 text-center text-green-500">
          <CheckCircle className="h-16 w-16" />
          <p className="text-xl font-bold">Pagamento Confirmado!</p>
          <p className="text-sm text-muted-foreground">Seu saldo será atualizado em instantes.</p>
        </div>;
      case 'expired':
      case 'failed':
        return <div className="flex flex-col items-center gap-4 text-center text-destructive">
          <AlertCircle className="h-16 w-16" />
          <p className="text-xl font-bold">{paymentStatus === 'expired' ? 'PIX Expirado' : 'Falha no Pagamento'}</p>
          <Button onClick={() => { setStep('select'); setPixData(null); }}>
            <RefreshCw className="mr-2 h-4 w-4" /> Gerar Novo PIX
          </Button>
        </div>;
      default: // pending
        return <>
          <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
            <Clock className="h-5 w-5" />
            <span className="font-medium">Aguardando pagamento</span>
            <span className="text-sm">({formatTime(timeLeft)})</span>
          </div>
          <img src={pixData?.qrCodeImage} alt="QR Code PIX" className="w-48 h-48 mx-auto border rounded-lg p-2 bg-white" />
          <div className="w-full space-y-2">
            <Label>PIX Copia e Cola</Label>
            <div className="relative">
              <Input readOnly value={pixData?.pixCode} className="pr-10 text-xs font-mono h-auto py-3 leading-snug" />
              <Button size="icon" variant="ghost" className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8" onClick={copyPixCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button onClick={copyPixCode} className="w-full" size="lg">
            <Copy className="mr-2 h-4 w-4" /> Copiar Código PIX
          </Button>
        </>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' ? 'Adicionar Saldo' : 'Realizar Pagamento'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' ? 'Passo 1 de 2: Escolha um pacote ou digite um valor.' : 'Passo 2 de 2: Escaneie o QR Code ou copie o código.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {step === 'select' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {depositPackages.map((pkg) => (
                  <button
                    key={pkg.label}
                    onClick={() => selectPackage(pkg)}
                    className={`relative text-left p-3 border-2 rounded-lg transition-all hover:scale-105 ${selectedPackageAmount === pkg.amount ? 'border-primary bg-primary/10' : 'border-border'}`}
                  >
                    {pkg.popular && <div className="absolute -top-3 right-2 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs font-bold animate-pulse"><Flame className="inline h-3 w-3 mr-1"/>Popular</div>}
                    <p className="font-bold">{formatCurrency(pkg.amount)}</p>
                    {pkg.bonus > 0 ? (
                      <p className="text-xs text-primary font-semibold">+{formatCurrency(pkg.bonus)} BÔNUS</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Crédito Simples</p>
                    )}
                  </button>
                ))}
              </div>

              <div className="relative text-center">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Ou</span>
                </div>
              </div>

              <div>
                <Label htmlFor="amount">Valor Personalizado</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Mínimo R$ 10,00"
                  value={amount}
                  onChange={handleAmountChange}
                  min="10"
                  className="text-lg"
                />
              </div>

              <Button onClick={generatePix} disabled={loading} size="lg" className="w-full">
                {loading ? 'Gerando...' : `Gerar PIX de ${formatCurrency(parseFloat(amount) || 0)}`}
              </Button>
            </>
          )}

          {step === 'pay' && (
            <div className="flex flex-col items-center gap-4">
              {renderStatus()}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}