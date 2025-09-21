import { useState, useRef, useEffect } from 'react';
import { useSiteAssets } from '@/hooks/useSiteAssets';
import { formatCurrency } from '@/lib/utils';
interface Prize {
  value: number;
  name: string;
}

interface ScratchCardGridProps {
  isWinner: boolean;
  prizeAmount: number;
  onReveal: () => void;
  className?: string;
}

export function ScratchCardGrid({ isWinner, prizeAmount, onReveal, className }: ScratchCardGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchedPixels, setScratchedPixels] = useState(0);
  const { getAssetUrl } = useSiteAssets();

  // Generate 3x3 grid based on win/lose logic
  const generateGrid = (): Prize[] => {
    const prizes: Prize[] = [1, 5, 10, 25, 50, 100, 500, 1000, 5000].map((v) => ({
      value: v,
      name: formatCurrency(v),
    }));

    const grid: Prize[] = [];

    if (isWinner) {
      // Create winning pattern with 3 matching prizes
      const winningPrize = { value: prizeAmount, name: formatCurrency(prizeAmount) };
      const otherPrizes = prizes.filter(p => p.value !== prizeAmount);
      
      // Add 3 winning prizes in random positions
      const positions = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      const winPositions = positions.sort(() => 0.5 - Math.random()).slice(0, 3);
      
      for (let i = 0; i < 9; i++) {
        if (winPositions.includes(i)) {
          grid.push(winningPrize);
        } else {
          grid.push(otherPrizes[Math.floor(Math.random() * otherPrizes.length)]);
        }
      }
    } else {
      // Create losing pattern - ensure no 3 matches
      const usedPrizes = [...prizes];
      for (let i = 0; i < 9; i++) {
        const availablePrizes = usedPrizes.filter(prize => {
          const currentCount = grid.filter(p => p.value === prize.value).length;
          return currentCount < 2; // Max 2 of same prize to avoid 3 matches
        });
        
        const randomPrize = availablePrizes[Math.floor(Math.random() * availablePrizes.length)];
        grid.push(randomPrize);
      }
    }

    return grid;
  };

  const [gridPrizes] = useState<Prize[]>(generateGrid);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 300;
    canvas.height = 225;

    // Load and draw overlay image
    const overlayImg = new Image();
    overlayImg.crossOrigin = 'anonymous';
    overlayImg.onload = () => {
      ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
    };
    overlayImg.src = getAssetUrl('scratch_overlay');

    // Set up scratching
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 36;
    ctx.lineCap = 'round';
  }, [getAssetUrl]);

  const scratch = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || isRevealed) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (isScratching) {
      ctx.lineTo(x, y);
      ctx.stroke();
      
      // Calculate scratched percentage
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let transparent = 0;
      
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) transparent++;
      }
      
      const percentage = (transparent / (pixels.length / 4)) * 100;
      setScratchedPixels(percentage);
      
      // Auto-reveal when 30% is scratched
      if (percentage > 30 && !isRevealed) {
        setIsRevealed(true);
        onReveal();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const handleMouseDown = () => setIsScratching(true);
  const handleMouseUp = () => setIsScratching(false);

  const scratchTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || isRevealed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
    if (isScratching) {
      ctx.lineTo(x, y);
      ctx.stroke();
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let transparent = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) transparent++;
      }
      const percentage = (transparent / (pixels.length / 4)) * 100;
      setScratchedPixels(percentage);
      if (percentage > 30 && !isRevealed) {
        setIsRevealed(true);
        onReveal();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    setIsScratching(true);
    scratchTouch(e);
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => scratchTouch(e);
  const handleTouchEnd = () => setIsScratching(false);

  return (
    <div className={`relative ${className}`}>
      {/* 3x3 Grid Background */}
      <div className="grid grid-cols-3 gap-1 p-4 bg-card rounded-lg border border-border">
        {gridPrizes.map((prize, index) => (
          <div
            key={index}
            className="bg-background rounded-md p-2 text-center shadow-sm border border-border"
          >
            <div className="text-xs font-bold text-foreground">{prize.name}</div>
          </div>
        ))}
      </div>

      {/* Scratch Overlay */}
      {!isRevealed && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair rounded-lg"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={scratch}
          onMouseLeave={handleMouseUp}
        />
      )}

      {/* Reveal Instructions */}
      {!isRevealed && scratchedPixels < 5 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-foreground/70 text-background px-3 py-1 rounded text-sm">
            Raspe para revelar!
          </div>
        </div>
      )}

      {/* Win/Lose Indicator */}
      {isRevealed && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`px-4 py-2 rounded-lg font-bold text-lg ${
            isWinner 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-secondary text-secondary-foreground'
          }`}>
            {isWinner ? `Você ganhou ${formatCurrency(prizeAmount)}!` : 'Boa tentativa! Continue jogando! 😊'}
          </div>
        </div>
      )}
    </div>
  );
}