import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Info, Trophy, Sparkles } from 'lucide-react';

interface Prize {
  id: string;
  name: string;
  value: number;
  description: string;
  imageUrl: string;
  category: 'cash' | 'bonus' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const mockPrizes: Prize[] = [
  {
    id: '1',
    name: 'Prêmio Instantâneo',
    value: 50,
    description: 'Ganhe R$ 50 na sua conta imediatamente via PIX.',
    imageUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=300',
    category: 'cash',
    rarity: 'common'
  },
  {
    id: '2',
    name: 'Super Prêmio',
    value: 100,
    description: 'Prêmio especial de R$ 100 creditado automaticamente.',
    imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=300',
    category: 'cash',
    rarity: 'rare'
  },
  {
    id: '3',
    name: 'Prêmio Premium',
    value: 250,
    description: 'Excelente prêmio de R$ 250 para continuar jogando.',
    imageUrl: 'https://images.unsplash.com/photo-1565372195458-9de0b320ef04?w=300',
    category: 'cash',
    rarity: 'epic'
  },
  {
    id: '4',
    name: 'Mega Prêmio',
    value: 500,
    description: 'Grande prêmio de R$ 500! Uma conquista incrível.',
    imageUrl: 'https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=300',
    category: 'cash',
    rarity: 'legendary'
  },
  {
    id: '5',
    name: 'Jackpot',
    value: 1000,
    description: 'O maior prêmio! R$ 1.000 para os mais sortudos.',
    imageUrl: 'https://images.unsplash.com/photo-1614736674679-62d8cdcc8886?w=300',
    category: 'special',
    rarity: 'legendary'
  }
];

const rarityColors = {
  common: 'bg-gray-500',
  rare: 'bg-blue-500',
  epic: 'bg-purple-500',
  legendary: 'bg-yellow-500'
};

const rarityLabels = {
  common: 'Comum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário'
};

interface PrizesModalProps {
  open: boolean;
  onClose: () => void;
}

export function PrizesModal({ open, onClose }: PrizesModalProps) {
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Gift className="w-4 h-4 mr-2" />
          Ver Todos os Prêmios
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="w-6 h-6 text-gaming-gold" />
            Possíveis Prêmios
          </DialogTitle>
          <DialogDescription>
            Descubra todos os prêmios que você pode ganhar em nossas raspadinhas
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {mockPrizes.map((prize) => (
            <Card 
              key={prize.id} 
              className="gaming-card cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setSelectedPrize(prize)}
            >
              <div className="relative">
                <img 
                  src={prize.imageUrl} 
                  alt={prize.name}
                  className="w-full h-32 object-cover rounded-t-lg"
                />
                <Badge 
                  className={`absolute top-2 right-2 ${rarityColors[prize.rarity]} text-white`}
                >
                  {rarityLabels[prize.rarity]}
                </Badge>
              </div>
              
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  {prize.name}
                  <Badge variant="secondary" className="bg-primary/20 text-primary">
                    R$ {prize.value}
                  </Badge>
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {prize.description}
                </p>
                <Button size="sm" className="w-full gaming-button">
                  <Info className="w-3 h-3 mr-1" />
                  Ver Detalhes
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedPrize && (
          <Dialog open={!!selectedPrize} onOpenChange={() => setSelectedPrize(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-gaming-gold" />
                  {selectedPrize.name}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <img 
                  src={selectedPrize.imageUrl} 
                  alt={selectedPrize.name}
                  className="w-full h-48 object-cover rounded-lg"
                />
                
                <div className="flex items-center justify-between">
                  <Badge className={`${rarityColors[selectedPrize.rarity]} text-white`}>
                    {rarityLabels[selectedPrize.rarity]}
                  </Badge>
                  <Badge variant="secondary" className="bg-primary/20 text-primary text-lg font-bold">
                    R$ {selectedPrize.value}
                  </Badge>
                </div>
                
                <p className="text-muted-foreground">
                  {selectedPrize.description}
                </p>
                
                <div className="bg-secondary/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Regras Básicas:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Prêmios são creditados automaticamente</li>
                    <li>• PIX instantâneo para prêmios em dinheiro</li>
                    <li>• Todos os resultados são transparentes</li>
                    <li>• Suporte 24/7 para dúvidas</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}