import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, ShieldCheck, Sparkles, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';

// Plinko Multiplier Bins: Center bins are 0.4x - 1.2x, outer bins >= 2.0x (97% land in center 0.4x - 1.2x)
const RISK_CONFIG = {
  low: [12, 4, 2, 1.2, 0.7, 0.4, 0.7, 1.2, 2, 4, 12],
  medium: [50, 15, 2.5, 1.1, 0.6, 0.4, 0.6, 1.1, 2.5, 15, 50],
  high: [1000, 100, 2.8, 1.0, 0.5, 0.4, 0.5, 1.0, 2.8, 100, 1000]
};

export default function PlinkoGame({ onBack }) {
  const { user, modifyBalance } = useAuth();

  const [risk, setRisk] = useState('high');
  const [betAmount, setBetAmount] = useState('20');
  const [ballCount, setBallCount] = useState(1);
  const [lastWin, setLastWin] = useState(null);

  const canvasRef = useRef(null);
  const ballsRef = useRef([]);
  const animFrameRef = useRef(null);

  const multipliers = RISK_CONFIG[risk];
  const numBins = multipliers.length;
  const numRows = 10;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const updatePhysics = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;
      const startY = 38;
      const rowSpacing = (h - 85) / numRows;

      // Draw Pegs (Pyramid)
      const pegs = [];
      for (let r = 0; r < numRows; r++) {
        const count = r + 3;
        const totalRowWidth = (count - 1) * 28;
        const startX = (w - totalRowWidth) / 2;
        const y = startY + r * rowSpacing;

        for (let c = 0; c < count; c++) {
          const x = startX + c * 28;
          pegs.push({ x, y, r: 3.5 });

          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#00e5ff';
          ctx.shadowBlur = 4;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Draw Multiplier Bins
      const binWidth = (w - 20) / numBins;
      const binY = h - 35;

      multipliers.forEach((mult, i) => {
        const x = 10 + i * binWidth;
        const isEdge = i === 0 || i === numBins - 1;
        const isCenter = i === 5; // index 5 is center 0.4x

        ctx.fillStyle = isEdge
          ? '#f59e0b'
          : mult >= 2
          ? '#8b5cf6'
          : mult >= 1
          ? '#10b981'
          : '#ef4444';

        ctx.beginPath();
        ctx.roundRect(x + 1, binY, binWidth - 2, 28, 6);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${mult}x`, x + binWidth / 2, binY + 18);
      });

      // Update Balls
      const currentBalls = ballsRef.current;
      for (let i = currentBalls.length - 1; i >= 0; i--) {
        const b = currentBalls[i];

        // Gravitational acceleration
        b.vy += 0.23;

        // Controlled 97% center magnetic steering:
        // Steers 97% of balls smoothly toward target bin (indexes 3, 4, 5, 6, 7)
        const targetX = 10 + (b.targetBin + 0.5) * binWidth;
        const horizontalPull = (targetX - b.x) * 0.015;
        b.vx += horizontalPull;

        b.x += b.vx;
        b.y += b.vy;

        // Peg Collisions
        pegs.forEach((peg) => {
          const dx = b.x - peg.x;
          const dy = b.y - peg.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < b.r + peg.r) {
            const angle = Math.atan2(dy, dx);
            const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy) * 0.6;
            const push = (Math.random() - 0.5) * 0.8;

            b.vx = Math.cos(angle + push) * (speed + 0.3);
            b.vy = Math.abs(Math.sin(angle)) * speed + 0.6;

            b.x = peg.x + Math.cos(angle) * (b.r + peg.r + 0.5);
            b.y = peg.y + Math.sin(angle) * (b.r + peg.r + 0.5);

            sounds.playPeg();
          }
        });

        // Left/Right Wall Bounces
        if (b.x - b.r < 10) {
          b.x = 10 + b.r;
          b.vx = Math.abs(b.vx) * 0.7;
        } else if (b.x + b.r > w - 10) {
          b.x = w - 10 - b.r;
          b.vx = -Math.abs(b.vx) * 0.7;
        }

        // Check Landing in Bins
        if (b.y >= binY) {
          const clampedX = Math.max(10, Math.min(w - 11, b.x));
          const binIndex = Math.min(numBins - 1, Math.max(0, Math.floor((clampedX - 10) / binWidth)));
          const landedMultiplier = multipliers[binIndex];
          const winAmount = Number((b.wager * landedMultiplier).toFixed(2));

          // Real-time wallet addition
          modifyBalance(winAmount, `Plinko (${landedMultiplier}x)`);
          if (landedMultiplier >= 1.0) {
            sounds.playWin();
          } else {
            sounds.playLoss();
          }

          setLastWin({ amount: winAmount, multiplier: landedMultiplier });
          currentBalls.splice(i, 1);
          continue;
        }

        // Draw Ball
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animFrameRef.current = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [risk, numBins]);

  const handleDropBalls = () => {
    const singleWager = Number(betAmount);
    const totalWager = singleWager * ballCount;

    if (!user || user.walletBalance < totalWager) {
      alert('Insufficient wallet balance!');
      return;
    }
    if (singleWager < 10) {
      alert('Minimum bet is ₹10.');
      return;
    }

    sounds.playClick();
    modifyBalance(-totalWager, `Circuit Plinko (${ballCount} Balls)`);

    // Spawn balls with exact 97% logic:
    // 97% of balls target middle bins (0.4x - 1.2x: bins 3, 4, 5, 6, 7)
    // 3% of balls target outer bins >= 2.0x (bins 0, 1, 2, 8, 9, 10)
    for (let i = 0; i < ballCount; i++) {
      setTimeout(() => {
        const isJackpot = Math.random() < 0.03; // Only 3% chance to hit >= 2.0x!
        let chosenBin;
        if (isJackpot) {
          const outerBins = [0, 1, 2, 8, 9, 10];
          chosenBin = outerBins[Math.floor(Math.random() * outerBins.length)];
        } else {
          // 97% probability hits center bins (0.4x to 1.2x)
          const centerBins = [3, 4, 5, 5, 5, 6, 7];
          chosenBin = centerBins[Math.floor(Math.random() * centerBins.length)];
        }

        ballsRef.current.push({
          x: 180 + (Math.random() - 0.5) * 8,
          y: 15,
          vx: (Math.random() - 0.5) * 1.2,
          vy: 1.1,
          r: 5.5,
          wager: singleWager,
          targetBin: chosenBin
        });
      }, i * 220);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] p-4 pb-24 selection:bg-cyan-500 selection:text-black">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                sounds.playClick();
                onBack();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white flex items-center space-x-2">
                <span>CIRCUIT PLINKO</span>
                <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-500/40 px-2 py-0.5 rounded-full font-bold">
                  High Difficulty
                </span>
              </h1>
              <p className="text-xs text-slate-400">Gravitational drop into multiplier bins</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-bold">Wallet</span>
            <span className="text-sm font-black font-mono text-cyan-400">
              ₹{user ? Number(user.walletBalance).toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        {/* Physics Canvas Pegboard */}
        <div className={`bg-[#0c101c] border rounded-3xl p-3 shadow-2xl relative overflow-hidden flex flex-col items-center transition-all duration-300 ${
          lastWin && lastWin.multiplier >= 2 ? 'border-purple-500/80 shadow-purple-900/40' :
          lastWin && lastWin.multiplier >= 1 ? 'border-emerald-500/80 shadow-emerald-900/40' : 'border-slate-800'
        }`}>
          {/* Subtle neon grid background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent pointer-events-none" />

          <canvas
            ref={canvasRef}
            width={360}
            height={380}
            className="w-full max-w-[360px] h-[380px] relative z-10"
          />

          {lastWin && (
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-mono font-black border shadow-xl flex items-center space-x-1.5 z-20 ${
              lastWin.multiplier >= 2 
                ? 'bg-purple-950/95 border-purple-400 text-purple-300 animate-win-celebrate shadow-purple-600/40' 
                : lastWin.multiplier >= 1
                ? 'bg-emerald-950/95 border-emerald-400 text-emerald-300 animate-pop-in shadow-emerald-600/30'
                : 'bg-rose-950/90 border-rose-500/50 text-rose-300'
            }`}>
              {lastWin.multiplier >= 1 && <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin" />}
              <span>Landed: {lastWin.multiplier}x (+₹{lastWin.amount})</span>
            </div>
          )}
        </div>

        {/* Controls Panel */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          {/* Risk Level Selector */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Risk Level & Max Multiplier
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'low', label: 'Low (12x)' },
                { id: 'medium', label: 'Med (50x)' },
                { id: 'high', label: 'High (1000x)' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    sounds.playClick();
                    setRisk(r.id);
                  }}
                  className={`py-2 rounded-xl text-xs font-bold transition ${
                    risk === r.id
                      ? 'bg-cyan-500 text-black font-black shadow-md'
                      : 'bg-[#131b2e] text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Swarm Mode / Ball Count */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Multi-Drop Balls (Swarm)
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {ballCount} {ballCount === 1 ? 'Ball' : 'Balls'}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((cnt) => (
                <button
                  key={cnt}
                  onClick={() => {
                    sounds.playClick();
                    setBallCount(cnt);
                  }}
                  className={`py-1.5 rounded-xl text-xs font-mono font-bold transition ${
                    ballCount === cnt
                      ? 'bg-purple-600 text-white font-black'
                      : 'bg-[#131b2e] text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {cnt}×
                </button>
              ))}
            </div>
          </div>

          {/* Bet Input */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Bet Per Ball (₹)
            </label>
            <input
              type="number"
              min="10"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="w-full bg-[#131b2e] border border-slate-700 rounded-2xl px-4 py-3 text-base font-black text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Drop Button */}
          <button
            onClick={handleDropBalls}
            className="w-full py-4 bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 font-black rounded-2xl text-base tracking-wide transition transform active:scale-95 shadow-xl shadow-cyan-500/25 flex items-center justify-center space-x-2"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>DROP BALLS (₹{Number(betAmount) * ballCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
