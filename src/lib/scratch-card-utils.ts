// Utility functions for scratch card pricing and logic

export interface ScratchCardData {
  id: string;
  nome: string;
  premio: number;
  imagem_url?: string;
  ativo: boolean;
  preco?: number;
  descricao?: string;
  categoria?: 'dinheiro' | 'produtos';
}

export interface EnhancedScratchCard extends ScratchCardData {
  preco: number;
  descricao: string;
  categoria?: 'dinheiro' | 'produtos';
}

/**
 * Calculates the price for a scratch card based on its name and prize value
 */
export function calculateScratchCardPrice(cardName: string, prizeAmount: number): number {
  const name = cardName.toLowerCase();
  
  // Casa e Onix - 10 reais
  if (name.includes('casa') || name.includes('onix')) {
    return 10.00;
  }
  
  // High value cards (50 mil, Moto, Casa Própria) - 5 reais
  if (prizeAmount >= 15000 || name.includes('moto') || name.includes('própria')) {
    return 5.00;
  }
  
  // Small prizes (100-500) - 50 centavos
  if (prizeAmount <= 500) {
    return 0.50;
  }
  
  // iPhone 17, 10 mil, 5 mil, 1 mil - 1 real (default)
  return 1.00;
}

/**
 * Enhances scratch card data with calculated price and description
 */
export function enhanceScratchCard(card: ScratchCardData): EnhancedScratchCard {
  const preco = calculateScratchCardPrice(card.nome, card.premio);
  
  return {
    ...card,
    preco,
    categoria: 'dinheiro' as const,
    descricao: `Ganhe até ${new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(card.premio)} via PIX na hora!`
  };
}

/**
 * Validates if a price matches the expected price for a card
 */
export function validateCardPrice(cardName: string, prizeAmount: number, providedPrice: number): boolean {
  const expectedPrice = calculateScratchCardPrice(cardName, prizeAmount);
  return Math.abs(expectedPrice - providedPrice) < 0.01; // Allow for floating point precision
}