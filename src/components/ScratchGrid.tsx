import React, { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

type Props = {
  isWinner: boolean;
  prizeAmount: number;
  cardName?: string;
  className?: string;
  locked?: boolean;
  enableScratch?: boolean;
  onReveal?: () => void;

  overlayImageUrl?: string;   // imagem da camada raspavel (opcional)
  overlayText?: string;       // texto no overlay (opcional)
  revealAt?: number;          // fracao para revelar (0..1). default 0.55
  showProgress?: boolean;     // exibe barra de progresso. default false
  showResultBanner?: boolean; // exibe selo pos-reveal. default false
  valueScale?: number;        // escala dos numeros nos tiles. default 0.24
  gridValues?: number[];      // valores vindos do backend para montar o grid
  winningCells?: number[];    // indices (1-based) que devem destacar como vencedores
};

const VALUES = [10, 20, 50, 100, 500, 1000, 5000, 25000, 250000];
const DEFAULT_OVERLAY =
  "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=600&h=600&q=80";

export const ScratchGrid: React.FC<Props> = ({
  isWinner,
  prizeAmount,
  cardName,
  className,
  locked,
  enableScratch = true,
  onReveal,
  overlayImageUrl = DEFAULT_OVERLAY,
  overlayText = "RASPE AQUI",
  revealAt = 0.87,
  showProgress = false,
  showResultBanner = false,
  valueScale = 0.24,
  gridValues,
  winningCells,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const scratchRef = useRef<HTMLCanvasElement>(null);
  const particlesCanvasRef = useRef<HTMLCanvasElement>(null);

  const [revealed, setRevealed] = useState(false);
  const [percent, setPercent] = useState(0);
  const [pendingReveal, setPendingReveal] = useState(false);
  const [tileSize, setTileSize] = useState(90);

  // pincel grande e traco continuo (raspa facil)
  const BRUSH = 28;

  // embaralha uma vez a grade 3x3
  const grid = useMemo(() => {
    if (gridValues && gridValues.length === 9) {
      return [...gridValues];
    }
    const arr = [...VALUES];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [gridValues]);

  const winningSet = useMemo(() => {
    if (!winningCells || winningCells.length === 0) return new Set<number>();
    return new Set(winningCells.map((cell) => cell - 1));
  }, [winningCells]);

  // ajusta fonte ao tamanho do tile
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      const size = Math.floor(Math.min(width, height) / 3) - 3;
      setTileSize(Math.max(56, size));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ===== Particulas (ref) =====
  type Particle = { x: number; y: number; vx: number; vy: number; life: number; ttl: number; size: number };
  const particles = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);

  function addSparkles(x: number, y: number, burst = false) {
    const count = burst ? 60 : 12;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = burst ? 3 + Math.random() * 4 : 1 + Math.random() * 2;
      particles.current.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (burst ? 1 : 0), life: 0, ttl: (burst ? 60 : 35) + Math.random() * 20, size: burst ? 2 + Math.random() * 3 : 1 + Math.random() * 2 });
    }
  }

  function drawParticles() {
    const canvas = particlesCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth * dpr, h = canvas.clientHeight * dpr;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i];
      p.life++;
      p.x += p.vx; p.y += p.vy; p.vy += 0.05;
      const alpha = 1 - p.life / p.ttl;
      if (alpha <= 0) { particles.current.splice(i, 1); continue; }
      const hue = ((p.x + p.y + p.life) % 360) | 0;
      ctx.beginPath();
      ctx.arc(p.x * dpr, p.y * dpr, p.size * dpr, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 90%, 60%, ${alpha})`;
      ctx.shadowColor = `hsla(${hue}, 90%, 70%, ${alpha})`;
      ctx.shadowBlur = 12 * dpr;
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    rafRef.current = requestAnimationFrame(drawParticles);
  }

  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawParticles);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // ===== Scratch overlay =====
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  function getCanvasPos(e: PointerEvent | MouseEvent | TouchEvent) {
    const canvas = scratchRef.current!;
    const rect = canvas.getBoundingClientRect();
    let clientX = 0, clientY = 0;
    if ("touches" in e && e.touches.length) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
    else if ("clientX" in e) { clientX = (e as MouseEvent).clientX; clientY = (e as MouseEvent).clientY; }
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  async function initScratch() {
    const canvas = scratchRef.current; if (!canvas) return;
    canvas.style.removeProperty("display");
    canvas.style.opacity = "1";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    const particlesLayer = particlesCanvasRef.current;
    if (particlesLayer) {
      particlesLayer.style.width = "100%";
      particlesLayer.style.height = "100%";
    }
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth * dpr, h = canvas.clientHeight * dpr;
    canvas.width = w; canvas.height = h;
    if (particlesLayer) {
      particlesLayer.width = w;
      particlesLayer.height = h;
    }

    // imagem de fundo (cover)
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = overlayImageUrl || DEFAULT_OVERLAY;
    await new Promise<void>((res) => { const done = () => res(); img.onload = done; img.onerror = done; });

    if (img.width && img.height) {
      ctx.drawImage(img, 0, 0, w, h);
      const overlay = ctx.createLinearGradient(0, 0, w, h);
      overlay.addColorStop(0, 'rgba(255,255,255,0.18)');
      overlay.addColorStop(0.6, 'rgba(180,200,255,0.08)');
      overlay.addColorStop(1, 'rgba(20,20,40,0.25)');
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, w, h);
    }

    // lamina foil opaca (cobre completamente o grid)
    const foil = ctx.createLinearGradient(0, 0, w, h);
    foil.addColorStop(0, "#D7DBE3"); foil.addColorStop(0.5, "#BDC6D1"); foil.addColorStop(1, "#DDE2E8");
    ctx.fillStyle = foil; ctx.fillRect(0, 0, w, h);

    // veios de brilho
    const streaks = ctx.createLinearGradient(0, 0, w, 0);
    streaks.addColorStop(0.0, "rgba(255,255,255,0.05)");
    streaks.addColorStop(0.5, "rgba(255,255,255,0.10)");
    streaks.addColorStop(1.0, "rgba(255,255,255,0.05)");
    ctx.fillStyle = streaks;
    for (let i = -w; i < w; i += Math.max(40, w / 10)) {
      ctx.fillRect(i, 0, Math.max(18, w / 25), h);
    }

    // texto central
    if (overlayText) {
      ctx.fillStyle = "rgba(20,25,35,.9)";
      ctx.font = `${Math.max(22, Math.floor(w * 0.045))}px ui-sans-serif, system-ui, -apple-system`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(overlayText, w / 2, h / 2);
    }
  }

  function eraseLine(x: number, y: number) {
    const canvas = scratchRef.current!, ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = BRUSH * 2 * dpr;

    const curr = { x: x * dpr, y: y * dpr };
    if (!lastPos.current) {
      lastPos.current = curr;
      ctx.beginPath();
      ctx.arc(curr.x, curr.y, BRUSH * dpr, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
      lastPos.current = curr;
    }
    ctx.restore();
  }

  function computeReveal() {
    const canvas = scratchRef.current!;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const dpr = window.devicePixelRatio || 1;
    const step = 8 * dpr;
    const { width: w, height: h } = canvas;
    const data = ctx.getImageData(0, 0, w, h).data;
    let cleared = 0, total = 0;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const a = data[(y * w + x) * 4 + 3];
        total++; if (a < 16) cleared++;
      }
    }
    const ratio = cleared / total; setPercent(ratio); return ratio;
  }

  function triggerCelebrate() {
    addSparkles(
      (particlesCanvasRef.current?.clientWidth || 0) / 2,
      (particlesCanvasRef.current?.clientHeight || 0) / 2,
      true
    );
  }

  function revealAll(delay = 0) {
    if (revealed || pendingReveal) return;
    if (delay > 0) {
      setPendingReveal(true);
      setTimeout(() => {
        setPendingReveal(false);
        revealAll(0);
      }, delay);
      return;
    }
    setRevealed(true);
    triggerCelebrate();
    onReveal?.();
    const canvas = scratchRef.current!;
    canvas.style.transition = "opacity .35s ease";
    canvas.style.opacity = "0";
    setTimeout(() => { if (canvas) canvas.style.display = "none"; }, 380);
  }

  useEffect(() => { initScratch(); setPercent(0); setRevealed(false); lastPos.current = null; }, [locked, enableScratch, overlayImageUrl, overlayText]);

  // listeners
  useEffect(() => {
    const canvas = scratchRef.current;
    if (!canvas || revealed || locked || !enableScratch) return;

    const onDown = (e: PointerEvent) => {
      const { x, y } = getCanvasPos(e);
      eraseLine(x, y);
      addSparkles(x, y, true);
      computeReveal();
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!canvas.hasPointerCapture?.(e.pointerId)) return;
      const { x, y } = getCanvasPos(e);
      eraseLine(x, y);
      addSparkles(x, y);
      if (computeReveal() >= revealAt) revealAll(200);
    };
    const onUp = (e: PointerEvent) => {
      lastPos.current = null;
      canvas.releasePointerCapture?.(e.pointerId);
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [revealed, locked, enableScratch, revealAt]);

  // tamanhos responsivos
  const labelSize  = Math.max(11, Math.floor(tileSize * 0.12));
  const bigValue   = Math.max(16, Math.floor(tileSize * (valueScale + 0.015))); // para >= 1000
  const smallValue = Math.max(14, Math.floor(tileSize * Math.max(valueScale - 0.03, 0.1))); // para < 1000
  const suffixSize = Math.max(10, Math.floor(tileSize * 0.12));
  const starSize   = Math.max(14, Math.floor(tileSize * 0.2));

  const prizeLabel = "PREMIO";

  const currency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const formatLargeValue = (value: number, highlight = false) => {
    const thousands = Math.round(value / 1000);
    const formatted = thousands.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
    const digits = formatted.length;
    const effectiveBig = Math.max(14, bigValue - (digits > 3 ? 4 : 0));
    const effectiveSuffix = Math.max(9, suffixSize - (digits > 3 ? 1 : 0));
    return (
      <div
        className={clsx(
          "mt-1 flex flex-col items-center leading-none drop-shadow",
          highlight ? "text-slate-900" : "text-amber-300"
        )}
      >
        <span className="font-black" style={{ fontSize: effectiveBig }}>
          {formatted}
        </span>
        <span
          className={clsx(
            "uppercase tracking-[0.18em] font-black italic",
            highlight ? "text-slate-900/80" : "text-amber-200/90"
          )}
          style={{ fontSize: effectiveSuffix }}
        >
          MIL
        </span>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={clsx(
        "relative select-none rounded-2xl border border-slate-600 bg-slate-900/50 p-2 overflow-hidden",
        "shadow-[0_0_0_1px_rgba(255,255,255,.06),0_10px_40px_-20px_rgba(0,0,0,.7)]",
        "neon-frame",
        isWinner ? "ring-2 ring-amber-300/60 shadow-[0_0_35px_rgba(251,191,36,0.35)]" : "",
        className
      )}
    >
      {/* grade 3x3 */}
      <div ref={gridRef} className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-[2px] p-[2px]">
        {grid.map((v, idx) => {
          const highlight = winningSet.has(idx);
          const isLarge = v >= 1000 && v !== 1000 && v !== 5000;
          return (
            <div
              key={idx}
              className={clsx(
                "relative flex items-center justify-center rounded-[10px]",
                highlight
                  ? "bg-gradient-to-br from-[#fff7e6] via-[#ffd27f] to-[#ff9b4b] ring-2 ring-amber-300/70 shadow-[0_0_25px_rgba(251,191,36,0.45)] animate-[winnerPulse_1.6s_ease-in-out_infinite]"
                  : "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 ring-1 ring-white/10",
                "shine-tile"
              )}
            >
              <div className="text-center leading-tight">
                <div className="text-slate-300/70 uppercase tracking-wide" style={{ fontSize: labelSize }}>
                  {prizeLabel}
                </div>
                {isLarge ? (
                  formatLargeValue(v, highlight)
                ) : (
                  <div
                    className={clsx(
                      "mt-0.5 font-black drop-shadow",
                      highlight ? "text-slate-900" : v >= 1000 ? "text-amber-300" : "text-slate-200"
                    )}
                    style={{ fontSize: v >= 1000 ? Math.max(bigValue - 2, 14) : smallValue }}
                  >
                    {currency(v)}
                  </div>
                )}
              </div>
              <span
                className={clsx(
                  "pointer-events-none absolute -top-2 -right-2",
                  highlight ? "star-glow" : "star-muted"
                )}
                style={{ width: starSize, height: starSize }}
              />
            </div>
          );
        })}
      </div>

      {/* overlay raspavel (canvas) */}
      <canvas
        ref={scratchRef}
        className={clsx(
          "absolute inset-0 w-full h-full",
          !enableScratch || locked ? "pointer-events-none opacity-60" : "opacity-100",
          "cursor-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2332%22 viewBox=%220 0 24 24%22><path fill=%22%23bbb%22 d=%22M7 21q-.425 0-.713-.288T6 20q0-.425.288-.713T7 19h3v-3H7q-.425 0-.713-.288T6 15q0-.425.288-.713T7 14h3v-3H7q-.425 0-.713-.288T6 10q0-.425.288-.713T7 9h3V6H7q-.425 0-.713-.288T6 5q0-.425.288-.713T7 4h10q.425 0 .713.288T18 5q0 .425-.288.713T17 6h-3v3h3q.425 0 .713.288T18 10q0 .425-.288.713T17 11h-3v3h3q.425 0 .713.288T18 15q0 .425-.288.713T17 16h-3v3h3q.425 0 .713.288T18 20q0 .425-.288.713T17 21z%22/></svg>')_16_16, auto]"
        )}
        style={{
          backgroundImage: overlayImageUrl ? `url(${overlayImageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      />

      {/* particulas */}
      <canvas ref={particlesCanvasRef} className="absolute inset-0 pointer-events-none" />

      {/* progresso opcional */}
      {showProgress && !revealed && enableScratch && !locked && (
        <div className="absolute bottom-2 left-2 right-2">
          <div className="h-2 rounded bg-slate-800/70 border border-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-500 transition-[width] duration-300"
              style={{ width: `${Math.min(100, Math.floor(percent * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* selo de resultado (opcional) */}
      {showResultBanner && revealed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={clsx(
              "px-4 py-2 rounded-full border backdrop-blur-md shadow-lg",
              isWinner ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-200" : "bg-rose-500/10 border-rose-400/30 text-rose-200"
            )}
            style={{ fontSize: Math.max(12, Math.floor(tileSize * 0.26)) }}
          >
            {isWinner ? ` Voce ganhou ${currency(prizeAmount)}!` : ":( Nao foi dessa vez"}
          </div>
        </div>
      )}

      {/* glow nas bordas */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl glow-edges" />

      <style>{`
        .neon-frame {
          box-shadow: 0 0 0 1px rgba(255,255,255,.06),
                      inset 0 0 30px rgba(255,215,0,.05),
                      0 10px 50px -20px rgba(255,196,0,.25);
        }
        .glow-edges { box-shadow: inset 0 0 50px rgba(255,255,255,.06), inset 0 0 120px rgba(255,215,0,.08); }
        .shine-tile::before {
          content:""; position:absolute; inset:0;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,.06) 50%, transparent 100%);
          transform: translateX(-120%); animation: shine 4s ease-in-out infinite;
        }
        .shine-tile:hover::before { animation-duration: 1.8s; }
        @keyframes shine { 0%{transform:translateX(-120%)} 60%,100%{transform:translateX(120%)} }
        .star-glow {
          background: radial-gradient(circle, rgba(255,255,255,.9) 0%, rgba(255,255,255,.2) 50%, transparent 60%);
          filter: drop-shadow(0 0 8px rgba(255,255,255,.7));
          border-radius: 50%; animation: twinkle 2.4s ease-in-out infinite;
        }
        .star-muted { opacity: .45; filter: drop-shadow(0 0 4px rgba(255,255,255,.3)); border-radius: 50%; }
        @keyframes twinkle { 0%,100%{ transform:scale(.7) rotate(0); opacity:.7 } 50%{ transform:scale(1.1) rotate(45deg); opacity:1 } }
        @keyframes winnerPulse {
          0%, 100% { box-shadow: 0 0 0 rgba(250,204,21,0.0); }
          50% { box-shadow: 0 0 25px rgba(250,204,21,0.45); }
        }
      `}</style>
    </div>
  );
};


