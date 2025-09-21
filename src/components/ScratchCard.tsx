import React, { useRef, useEffect, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Trophy, Gift } from 'lucide-react';
import { ScratchCardGrid } from './ScratchCardGrid';

interface ScratchCardProps {
  prizeAmount: number;
  won: boolean;
  onComplete: () => void;
  imageUrl?: string;
}

export function ScratchCard({ prizeAmount, won, onComplete, imageUrl }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Fill with scratch-off layer (metallic look)
    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    gradient.addColorStop(0, '#b1b1b1');
    gradient.addColorStop(0.5, '#d6d6d6');
    gradient.addColorStop(1, '#a0a0a0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Add scratching hints
    ctx.fillStyle = '#444';
    ctx.font = '16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🪙 RASPE AQUI 🪙', rect.width / 2, rect.height / 2 - 10);
    ctx.fillText('para revelar o prêmio', rect.width / 2, rect.height / 2 + 15);
  }, []);

  useEffect(() => {
    setupCanvas();
    
    const handleResize = () => setupCanvas();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [setupCanvas]);

  const scratch = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, 2 * Math.PI);
    ctx.fill();

    // Calculate scratch progress
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparentPixels = 0;

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparentPixels++;
    }

    const progress = transparentPixels / (pixels.length / 4);
    setScratchProgress(progress);

    // Complete when 60% is scratched
    if (progress > 0.6 && !isCompleted) {
      setIsCompleted(true);
      // Celebration effect when winning
      if (won) {
        try {
          confetti({ particleCount: 120, spread: 70, origin: { y: 0.3 } });
        } catch {}
      }
      setTimeout(() => {
        onComplete();
      }, 500);
    }
  }, [isCompleted, onComplete, won]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsScratching(true);
    scratch(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isScratching) {
      scratch(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    setIsScratching(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setIsScratching(true);
    scratch(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (isScratching) {
      const touch = e.touches[0];
      scratch(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsScratching(false);
  };

  const revealAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    setIsCompleted(true);
    onComplete();
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <Card className="gaming-card border-primary/30">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold mb-2 flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-primary gaming-glow" />
              Raspadinha Digital
            </h3>
            <p className="text-muted-foreground">
              Raspe para revelar seu prêmio!
            </p>
          </div>

          <ScratchCardGrid
            isWinner={won}
            prizeAmount={prizeAmount}
            onReveal={() => {
              setIsCompleted(true);
              if (won) {
                try {
                  confetti({ particleCount: 120, spread: 70, origin: { y: 0.3 } });
                } catch {}
              }
              setTimeout(() => {
                onComplete();
              }, 500);
            }}
            className="mb-4"
          />

          <div className="text-center">
            {isCompleted && (
              <Button 
                onClick={() => window.location.reload()}
                className="gaming-button"
              >
                Nova Raspadinha
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}