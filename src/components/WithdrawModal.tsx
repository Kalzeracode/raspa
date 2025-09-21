import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Minus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface WithdrawModalProps {
  open: boolean;
  onClose: () => void;
  currentBalance: number;
  onSuccess: () => void;
}

export function WithdrawModal({ open, onClose, currentBalance, onSuccess }: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [pixKey, setPixKey] = useState('');

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);
    
    if (!amount || withdrawAmount < 1) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor mínimo de R$ 1,00",
        variant: "destructive"
      });
      return;
    }

    if (!pixKey) {
      toast({
        title: "Chave PIX obrigatória",
        description: "Digite sua chave PIX para receber o saque",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.rpc('create_withdrawal_request_secure', {
        amount_param: withdrawAmount,
        pix_key_param: pixKey
      });

      if (error) {
        toast({
          title: "Erro no saque",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Saque solicitado!",
        description: `Seu saque de R$ ${withdrawAmount.toFixed(2)} foi solicitado e será processado em até 24h`,
      });

      setAmount('');
      setPixKey('');
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns minutos",
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    setAmount('');
    setPixKey('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Minus className="h-5 w-5 text-primary" />
            Sacar via PIX
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center p-3 bg-secondary rounded">
            <p className="text-sm text-muted-foreground">Saldo disponível</p>
            <p className="text-xl font-bold text-primary">
              R$ {currentBalance.toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="withdraw-amount">Valor do saque</Label>
            <Input
              id="withdraw-amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              max={currentBalance}
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              Valor mínimo: R$ 1,00 • Máximo: R$ {currentBalance.toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pix-key">Chave PIX</Label>
            <Input
              id="pix-key"
              placeholder="email@exemplo.com ou CPF"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Email, CPF, telefone ou chave aleatória
            </p>
          </div>

          <div className="bg-muted p-3 rounded text-sm space-y-1">
            <p><strong>Observações:</strong></p>
            <p>• Saques são processados em até 24h</p>
            <p>• Não há taxa para o primeiro saque do mês</p>
            <p>• Valor mínimo de saque: R$ 1,00</p>
          </div>

          <Button 
            onClick={handleWithdraw}
            disabled={!amount || !pixKey || parseFloat(amount) > currentBalance}
            className="w-full gaming-button"
          >
            Solicitar Saque
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}