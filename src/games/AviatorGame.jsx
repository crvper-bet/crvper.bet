import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, History, Plus, Minus, CheckCircle2, ShieldAlert, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { sounds } from '../services/audio';

export default function AviatorGame({ onBack, onOpenMaxLimitModal }) {
  const { user, modifyBalance } = useAuth();

  // Flight State: 'WAITING' (Boarding) | 'FLYING' | 'CRASHED'
  const [gameState, setGameState] = useState('WAITING');
  const [multiplier, setMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(2.20);
  const [countdown, setCountdown] = useState(5);

  // --- DUAL BET PANEL 1 STATE ---
  const [panel1Amount, setPanel1Amount] = useState('50');
  const [panel1AutoBet, setPanel1AutoBet] = useState(false);
  const [panel1AutoCashout, setPanel1AutoCashout] = useState(false);
  const [panel1AutoCashoutTarget, setPanel1AutoCashoutTarget] = useState('2.00');
  const [panel1ActiveBet, setPanel1ActiveBet] = useState(null); // { amount, cashedOut: false, winAmount: 0 }
  const [panel1QueuedBet, setPanel1QueuedBet] = useState(null);

  // --- DUAL BET PANEL 2 STATE ---
  const [panel2Amount, setPanel2Amount] = useState('100');
  const [panel2AutoBet, setPanel2AutoBet] = useState(false);
  const [panel2AutoCashout, setPanel2AutoCashout] = useState(false);
  const [panel2AutoCashoutTarget, setPanel2AutoCashoutTarget] = useState('1.50');
  const [panel2ActiveBet, setPanel2ActiveBet] = useState(null);
  const [panel2QueuedBet, setPanel2QueuedBet] = useState(null);

  // History strip
  const [crashHistory, setCrashHistory] = useState([
    2.15, 1.85, 3.40, 1.62, 5.80, 2.40, 1.75, 8.20, 1.95, 2.70
  ]);

  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const startTimeRef = useRef(null);
  const currentMultiplierRef = useRef(1.00);
  const crashPointRef = useRef(2.20);

  const isLockedByWinningCap = Boolean(user && Number(user.walletBalance || 0) >= 100000);

  // Check 100k winning limit cap
  const checkWinningCap = () => {
    const freshUser = storage.getCurrentUser();
    if (freshUser && Number(freshUser.walletBalance || 0) >= 100000) {
      if (onOpenMaxLimitModal) onOpenMaxLimitModal();
      return true;
    }
    return false;
  };

  // Pre-deposit Safe Mode helper (Requires at least 200 real deposit to unlock real money mode)
  const checkIsRealDepositor = () => {
    const freshUser = storage.getCurrentUser();
    return Boolean(
      freshUser && 
      freshUser.hasDeposited === true && 
      Number(freshUser.totalDeposited || 0) >= 200
    );
  };

  // Main 5-second countdown timer during WAITING phase
  useEffect(() => {
    let interval = null;

    if (gameState === 'WAITING') {
      currentMultiplierRef.current = 1.00;
      setMultiplier(1.00);

      const freshUser = storage.getCurrentUser();
      const isCapped = Boolean(freshUser && Number(freshUser.walletBalance || 0) >= 100000);

      // Place Panel 1 Bet if queued or auto-bet
      if (!isCapped && (panel1QueuedBet || panel1AutoBet)) {
        const betToPlace = panel1QueuedBet || Number(panel1Amount);
        if (freshUser && freshUser.walletBalance >= betToPlace) {
          modifyBalance(-betToPlace, 'Aviator Bet Panel 1');
          setPanel1ActiveBet({ amount: betToPlace, cashedOut: false });
        }
        setPanel1QueuedBet(null);
      }

      // Place Panel 2 Bet if queued or auto-bet
      if (!isCapped && (panel2QueuedBet || panel2AutoBet)) {
        const betToPlace = panel2QueuedBet || Number(panel2Amount);
        if (freshUser && freshUser.walletBalance >= betToPlace) {
          modifyBalance(-betToPlace, 'Aviator Bet Panel 2');
          setPanel2ActiveBet({ amount: betToPlace, cashedOut: false });
        }
        setPanel2QueuedBet(null);
      }

      let count = 5;
      setCountdown(5);

      interval = setInterval(() => {
        count -= 1;
        setCountdown(count);
        if (count <= 0) {
          clearInterval(interval);
          startFlight();
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState]);

  const startFlight = () => {
    const isRealDepositor = checkIsRealDepositor();

    let point;
    if (!isRealDepositor) {
      // RULE 2: PRE-DEPOSIT BONUS SAFE MODE!
      // Must always go to a minimum of 1.50x! NEVER below 1.50x during this phase!
      const rand = Math.random();
      if (rand < 0.60) {
        point = 1.50 + Math.random() * 1.50; // 1.50x to 3.00x
      } else if (rand < 0.85) {
        point = 3.00 + Math.random() * 4.50; // 3.00x to 7.50x
      } else if (rand < 0.95) {
        point = 7.50 + Math.random() * 15.0; // 7.50x to 22.50x
      } else {
        point = 22.50 + Math.random() * 60.0; // 22.5x to 82.5x+
      }
      // Absolute guarantee clamp
      point = Math.max(1.50, Number(point.toFixed(2)));
    } else {
      // RULE 5: POST-DEPOSIT REAL MONEY MODE!
      // 1.50x rule completely removed!
      // Multiplier acts normally and random: can crash at 1.00x, 1.10x, 1.25x or anywhere else!
      const rand = Math.random();
      if (rand < 0.12) {
        point = 1.00; // Can crash at 1.00x
      } else if (rand < 0.40) {
        point = Number((1.01 + Math.random() * 0.48).toFixed(2)); // 1.01x to 1.49x
      } else if (rand < 0.75) {
        point = Number((1.50 + Math.random() * 2.50).toFixed(2)); // 1.50x to 4.00x
      } else if (rand < 0.92) {
        point = Number((4.00 + Math.random() * 6.00).toFixed(2)); // 4.00x to 10.00x
      } else {
        point = Number((10.00 + Math.random() * 40.0).toFixed(2)); // 10x to 50x+
      }
    }

    crashPointRef.current = point;
    setCrashPoint(point);
    startTimeRef.current = null; // Will initialize on first animation frame
    setGameState('FLYING');
  };

  // Canvas & Multiplier Animation Loop
  useEffect(() => {
    if (gameState !== 'FLYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const animate = (time) => {
      if (!startTimeRef.current) {
        startTimeRef.current = time;
      }

      const elapsed = Math.max(0, (time - startTimeRef.current) / 1000);
      const mult = Number(Math.max(1.00, Math.pow(Math.E, 0.08 * elapsed * 2.5)).toFixed(2));
      currentMultiplierRef.current = mult;
      setMultiplier(mult);

      const isRealDepositor = checkIsRealDepositor();

      // Auto-Cashout Panel 1
      if (
        panel1ActiveBet &&
        !panel1ActiveBet.cashedOut &&
        panel1AutoCashout &&
        panel1AutoCashoutTarget &&
        mult >= Number(panel1AutoCashoutTarget)
      ) {
        handleCashoutPanel(1, Number(panel1AutoCashoutTarget));
      }

      // Auto-Cashout Panel 2
      if (
        panel2ActiveBet &&
        !panel2ActiveBet.cashedOut &&
        panel2AutoCashout &&
        panel2AutoCashoutTarget &&
        mult >= Number(panel2AutoCashoutTarget)
      ) {
        handleCashoutPanel(2, Number(panel2AutoCashoutTarget));
      }

      // STRICT SAFE MODE RULE 2 GUARD:
      // If user has not completed real deposit >= 200, plane CANNOT crash below 1.50x under any circumstance!
      if (!isRealDepositor && mult < 1.50) {
        drawPlaneScene(ctx, canvas.width, canvas.height, mult, elapsed);
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      // Check Crash
      const targetPoint = crashPointRef.current;
      if (mult >= targetPoint) {
        const finalCrash = (!isRealDepositor && targetPoint < 1.50) ? 1.50 : targetPoint;
        handleCrash(finalCrash);
        return;
      }

      drawPlaneScene(ctx, canvas.width, canvas.height, mult, elapsed);
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState, panel1ActiveBet, panel2ActiveBet, panel1AutoCashout, panel2AutoCashout, panel1AutoCashoutTarget, panel2AutoCashoutTarget]);

  const handleCrash = (finalPoint) => {
    sounds.playBomb();
    setMultiplier(finalPoint);
    setGameState('CRASHED');
    setCrashHistory((prev) => [finalPoint, ...prev.slice(0, 9)]);

    if (panel1ActiveBet && !panel1ActiveBet.cashedOut) {
      setPanel1ActiveBet((prev) => ({ ...prev, cashedOut: false, lost: true }));
    }
    if (panel2ActiveBet && !panel2ActiveBet.cashedOut) {
      setPanel2ActiveBet((prev) => ({ ...prev, cashedOut: false, lost: true }));
    }

    setTimeout(() => {
      setGameState('WAITING');
      setCountdown(5);
      setPanel1ActiveBet(null);
      setPanel2ActiveBet(null);
    }, 3200);
  };

  // Cashout for Panel 1 or Panel 2
  const handleCashoutPanel = (panelNumber, explicitMult = null) => {
    const multToAward = explicitMult || currentMultiplierRef.current;

    if (panelNumber === 1 && panel1ActiveBet && !panel1ActiveBet.cashedOut) {
      const winAmount = Number((panel1ActiveBet.amount * multToAward).toFixed(2));
      sounds.playWin();
      modifyBalance(winAmount, `Aviator Cashout Panel 1 (${multToAward}x)`);
      setPanel1ActiveBet({ ...panel1ActiveBet, cashedOut: true, cashoutMult: multToAward, winAmount });
      checkWinningCap();
    }

    if (panelNumber === 2 && panel2ActiveBet && !panel2ActiveBet.cashedOut) {
      const winAmount = Number((panel2ActiveBet.amount * multToAward).toFixed(2));
      sounds.playWin();
      modifyBalance(winAmount, `Aviator Cashout Panel 2 (${multToAward}x)`);
      setPanel2ActiveBet({ ...panel2ActiveBet, cashedOut: true, cashoutMult: multToAward, winAmount });
      checkWinningCap();
    }
  };

  // Bet Click for Panel 1
  const handleBetClickPanel1 = () => {
    if (checkWinningCap()) return;

    const wager = Number(panel1Amount);
    if (!user || user.walletBalance < wager) {
      alert('Insufficient wallet balance!');
      return;
    }
    sounds.playClick();

    if (gameState === 'WAITING') {
      modifyBalance(-wager, 'Aviator Bet Panel 1');
      setPanel1ActiveBet({ amount: wager, cashedOut: false });
    } else {
      setPanel1QueuedBet(wager);
    }
  };

  // Bet Click for Panel 2
  const handleBetClickPanel2 = () => {
    if (checkWinningCap()) return;

    const wager = Number(panel2Amount);
    if (!user || user.walletBalance < wager) {
      alert('Insufficient wallet balance!');
      return;
    }
    sounds.playClick();

    if (gameState === 'WAITING') {
      modifyBalance(-wager, 'Aviator Bet Panel 2');
      setPanel2ActiveBet({ amount: wager, cashedOut: false });
    } else {
      setPanel2QueuedBet(wager);
    }
  };

  // Professional 2D Animated Plane Rendering with Aerodynamic Physics
  const drawPlaneScene = (ctx, w, h, mult, elapsed) => {
    ctx.clearRect(0, 0, w, h);

    // Dark Radar Grid
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Dynamic flight coordinates
    const progress = Math.min(1, elapsed / 8.5);
    const floatWobble = Math.sin(elapsed * 4.5) * 4;
    const planeX = 40 + (w - 110) * Math.min(1, progress * 1.15);
    const planeY = (h - 55) - (h - 110) * Math.pow(progress, 1.35) + floatWobble;

    // Glowing Curve Trail
    ctx.beginPath();
    ctx.moveTo(35, h - 50);
    ctx.quadraticCurveTo(w * 0.35, h - 45, planeX, planeY);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Fill underneath trail
    ctx.lineTo(planeX, h - 50);
    ctx.lineTo(35, h - 50);
    const grad = ctx.createLinearGradient(0, planeY, 0, h - 50);
    grad.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
    grad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // 2D Animated Jet Rendering
    ctx.save();
    ctx.translate(planeX, planeY);
    
    const tilt = -0.32 + Math.sin(elapsed * 4.5) * 0.05;
    ctx.rotate(tilt);

    // Jet Engine Flame Animation
    const flameFlicker = 10 + Math.random() * 8;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-16, -2);
    ctx.lineTo(-16 - flameFlicker, 0);
    ctx.lineTo(-16, 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(-16, -1);
    ctx.lineTo(-16 - (flameFlicker * 0.6), 0);
    ctx.lineTo(-16, 1);
    ctx.closePath();
    ctx.fill();

    // Fuselage / Jet Body
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(6, -4);
    ctx.lineTo(-12, -7);
    ctx.lineTo(-16, -3);
    ctx.lineTo(-16, 3);
    ctx.lineTo(-12, 7);
    ctx.lineTo(6, 4);
    ctx.closePath();
    ctx.fill();

    // Cockpit Glass
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(14, -1);
    ctx.lineTo(6, -3);
    ctx.lineTo(0, -3);
    ctx.lineTo(8, 0);
    ctx.closePath();
    ctx.fill();

    // Wings
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(-10, -20);
    ctx.lineTo(-4, -20);
    ctx.lineTo(8, -1);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(-10, 20);
    ctx.lineTo(-4, 20);
    ctx.lineTo(8, 1);
    ctx.closePath();
    ctx.fill();

    // Tail Fin
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-16, -11);
    ctx.lineTo(-12, -11);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fill();

    // Blinking Wingtip Lights
    const blink = Math.floor(elapsed * 3) % 2 === 0;
    if (blink) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(-8, -20, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(-8, 20, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  return (
    <div className="min-h-screen bg-[#070b14] p-4 pb-28 selection:bg-rose-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Top Header */}
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
                <span>AVIATOR</span>
                <span className="text-[10px] bg-rose-950 text-rose-400 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold">
                  MULTIPLIER CRASH
                </span>
              </h1>
              <p className="text-xs text-slate-400">Cash out before the plane flies away</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-bold">Wallet</span>
            <span className="text-sm font-black font-mono text-cyan-400">
              ₹{user ? Number(user.walletBalance).toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        {/* 100k Limit Banner if capped */}
        {isLockedByWinningCap && (
          <div 
            onClick={checkWinningCap}
            className="p-3 bg-amber-950/70 border border-amber-500/60 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-amber-950/90 transition text-xs text-amber-300"
          >
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-bold">You reached your winning limit. Please withdraw your funds.</span>
            </div>
            <span className="font-black text-amber-400 underline text-[11px]">Withdraw →</span>
          </div>
        )}

        {/* Recent Crash Multipliers History Strip */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl px-3 py-2 flex items-center space-x-2 overflow-x-auto select-none">
          <History className="w-4 h-4 text-slate-500 shrink-0" />
          <div className="flex items-center space-x-2">
            {crashHistory.map((mult, idx) => (
              <span
                key={idx}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-black ${
                  mult < 2.0
                    ? 'bg-blue-950 text-blue-400 border border-blue-500/30'
                    : mult < 10.0
                    ? 'bg-purple-950 text-purple-400 border border-purple-500/30'
                    : 'bg-rose-950 text-rose-400 border border-rose-500/40'
                }`}
              >
                {mult.toFixed(2)}x
              </span>
            ))}
          </div>
        </div>

        {/* Flight Main Stage / Canvas with 2D Animated Plane */}
        <div className="relative bg-[#0c101c] border border-slate-800 rounded-3xl h-64 sm:h-72 overflow-hidden shadow-2xl flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={720}
            height={300}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Center Multiplier Display */}
          <div className="relative z-10 text-center select-none pointer-events-none">
            {gameState === 'WAITING' ? (
              <div className="animate-fade-in">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">
                  NEXT FLIGHT IN
                </span>
                <span className="text-5xl sm:text-6xl font-black font-mono text-white">
                  {countdown}s
                </span>
                <p className="text-[11px] text-cyan-400 font-bold mt-1">
                  Dual betting open! Set Auto-Cashout or Bet below
                </p>
              </div>
            ) : gameState === 'FLYING' ? (
              <div>
                <span className="text-6xl sm:text-7xl font-black font-mono text-white tracking-tight drop-shadow-[0_0_25px_rgba(239,68,68,0.6)]">
                  {multiplier.toFixed(2)}x
                </span>
              </div>
            ) : (
              <div className="animate-shake">
                <span className="text-xs font-black uppercase tracking-widest text-rose-400 block mb-1">
                  FLEW AWAY AT
                </span>
                <span className="text-5xl sm:text-6xl font-black font-mono text-rose-500">
                  {multiplier.toFixed(2)}x
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 2 COUPLE BETTING BARS (DUAL BET PANELS STACKED) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* --- BET PANEL 1 --- */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span>BET PANEL 1</span>
              </span>

              {/* Auto Bet Toggle */}
              <label className="flex items-center space-x-1.5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  disabled={isLockedByWinningCap}
                  checked={panel1AutoBet}
                  onChange={(e) => setPanel1AutoBet(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 bg-slate-900 focus:ring-0 disabled:opacity-40"
                />
                <span className="text-slate-300 font-bold text-[11px]">Auto Bet</span>
              </label>
            </div>

            {/* Stepper & Chips */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Amount (₹)</span>
                <div className="flex space-x-1">
                  {[10, 50, 100, 500].map((amt) => (
                    <button
                      key={amt}
                      disabled={isLockedByWinningCap}
                      onClick={() => setPanel1Amount(String(amt))}
                      className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 disabled:opacity-40"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center bg-[#131b2e] border border-slate-700 rounded-xl overflow-hidden">
                <button
                  disabled={isLockedByWinningCap}
                  onClick={() => setPanel1Amount((p) => String(Math.max(10, Number(p) - 10)))}
                  className="px-3 py-2 text-slate-400 hover:text-white disabled:opacity-40"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min="10"
                  disabled={isLockedByWinningCap}
                  value={panel1Amount}
                  onChange={(e) => setPanel1Amount(e.target.value)}
                  className="w-full text-center bg-transparent py-2 text-sm font-black text-white font-mono focus:outline-none disabled:opacity-40"
                />
                <button
                  disabled={isLockedByWinningCap}
                  onClick={() => setPanel1Amount((p) => String(Number(p) + 10))}
                  className="px-3 py-2 text-slate-400 hover:text-white disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Auto Cashout Controls */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={isLockedByWinningCap}
                  checked={panel1AutoCashout}
                  onChange={(e) => setPanel1AutoCashout(e.target.checked)}
                  className="rounded border-slate-700 text-rose-500 bg-slate-900 focus:ring-0 disabled:opacity-40"
                />
                <span className="text-slate-300 font-bold text-[11px]">Auto Cashout</span>
              </label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  step="0.1"
                  disabled={!panel1AutoCashout || isLockedByWinningCap}
                  value={panel1AutoCashoutTarget}
                  onChange={(e) => setPanel1AutoCashoutTarget(e.target.value)}
                  className="w-16 bg-[#131b2e] border border-slate-700 rounded-lg px-2 py-0.5 text-xs font-mono font-bold text-center text-cyan-400 focus:outline-none disabled:opacity-40"
                />
                <span className="text-slate-500 text-xs">x</span>
              </div>
            </div>

            {/* Action Button 1 */}
            <div>
              {gameState === 'FLYING' && panel1ActiveBet && !panel1ActiveBet.cashedOut ? (
                <button
                  onClick={() => handleCashoutPanel(1)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm shadow-lg shadow-orange-500/25 transition transform active:scale-95 flex flex-col items-center justify-center"
                >
                  <span>CASH OUT</span>
                  <span className="text-xs font-mono font-black mt-0.5">
                    ₹{(panel1ActiveBet.amount * multiplier).toFixed(2)} ({multiplier.toFixed(2)}x)
                  </span>
                </button>
              ) : gameState === 'FLYING' ? (
                <button
                  onClick={handleBetClickPanel1}
                  disabled={isLockedByWinningCap}
                  className={`w-full py-3.5 rounded-xl font-black text-xs transition transform active:scale-95 shadow-md flex flex-col items-center justify-center ${
                    isLockedByWinningCap
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : panel1QueuedBet
                      ? 'bg-purple-950 border border-purple-500 text-purple-300'
                      : 'bg-rose-600 hover:bg-rose-500 text-white'
                  }`}
                >
                  <span>{isLockedByWinningCap ? 'LOCKED (1 LAKH CAP)' : panel1QueuedBet ? 'QUEUED FOR NEXT' : 'BET (NEXT ROUND)'}</span>
                  <span className="text-[10px] font-mono mt-0.5">
                    {panel1QueuedBet ? `₹${panel1QueuedBet}` : `₹${panel1Amount}`}
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleBetClickPanel1}
                  disabled={panel1ActiveBet !== null || isLockedByWinningCap}
                  className={`w-full py-3.5 rounded-xl font-black text-sm transition transform active:scale-95 shadow-md flex flex-col items-center justify-center ${
                    isLockedByWinningCap
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : panel1ActiveBet
                      ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black'
                  }`}
                >
                  <span>{isLockedByWinningCap ? 'LOCKED (1 LAKH CAP)' : panel1ActiveBet ? 'BET PLACED ✓' : 'BET'}</span>
                  <span className="text-[10px] font-mono mt-0.5">
                    ₹{panel1ActiveBet ? panel1ActiveBet.amount : panel1Amount}
                  </span>
                </button>
              )}
            </div>

            {panel1ActiveBet && panel1ActiveBet.cashedOut && (
              <div className="text-[11px] font-bold text-emerald-400 text-center font-mono">
                ✓ Panel 1 Cashed Out: +₹{panel1ActiveBet.winAmount} ({panel1ActiveBet.cashoutMult}x)
              </div>
            )}
          </div>

          {/* --- BET PANEL 2 --- */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                <span>BET PANEL 2</span>
              </span>

              {/* Auto Bet Toggle */}
              <label className="flex items-center space-x-1.5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  disabled={isLockedByWinningCap}
                  checked={panel2AutoBet}
                  onChange={(e) => setPanel2AutoBet(e.target.checked)}
                  className="rounded border-slate-700 text-purple-500 bg-slate-900 focus:ring-0 disabled:opacity-40"
                />
                <span className="text-slate-300 font-bold text-[11px]">Auto Bet</span>
              </label>
            </div>

            {/* Stepper & Chips */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Amount (₹)</span>
                <div className="flex space-x-1">
                  {[10, 50, 100, 500].map((amt) => (
                    <button
                      key={amt}
                      disabled={isLockedByWinningCap}
                      onClick={() => setPanel2Amount(String(amt))}
                      className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 disabled:opacity-40"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center bg-[#131b2e] border border-slate-700 rounded-xl overflow-hidden">
                <button
                  disabled={isLockedByWinningCap}
                  onClick={() => setPanel2Amount((p) => String(Math.max(10, Number(p) - 10)))}
                  className="px-3 py-2 text-slate-400 hover:text-white disabled:opacity-40"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min="10"
                  disabled={isLockedByWinningCap}
                  value={panel2Amount}
                  onChange={(e) => setPanel2Amount(e.target.value)}
                  className="w-full text-center bg-transparent py-2 text-sm font-black text-white font-mono focus:outline-none disabled:opacity-40"
                />
                <button
                  disabled={isLockedByWinningCap}
                  onClick={() => setPanel2Amount((p) => String(Number(p) + 10))}
                  className="px-3 py-2 text-slate-400 hover:text-white disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Auto Cashout Controls */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={isLockedByWinningCap}
                  checked={panel2AutoCashout}
                  onChange={(e) => setPanel2AutoCashout(e.target.checked)}
                  className="rounded border-slate-700 text-rose-500 bg-slate-900 focus:ring-0 disabled:opacity-40"
                />
                <span className="text-slate-300 font-bold text-[11px]">Auto Cashout</span>
              </label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  step="0.1"
                  disabled={!panel2AutoCashout || isLockedByWinningCap}
                  value={panel2AutoCashoutTarget}
                  onChange={(e) => setPanel2AutoCashoutTarget(e.target.value)}
                  className="w-16 bg-[#131b2e] border border-slate-700 rounded-lg px-2 py-0.5 text-xs font-mono font-bold text-center text-purple-400 focus:outline-none disabled:opacity-40"
                />
                <span className="text-slate-500 text-xs">x</span>
              </div>
            </div>

            {/* Action Button 2 */}
            <div>
              {gameState === 'FLYING' && panel2ActiveBet && !panel2ActiveBet.cashedOut ? (
                <button
                  onClick={() => handleCashoutPanel(2)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm shadow-lg shadow-orange-500/25 transition transform active:scale-95 flex flex-col items-center justify-center"
                >
                  <span>CASH OUT</span>
                  <span className="text-xs font-mono font-black mt-0.5">
                    ₹{(panel2ActiveBet.amount * multiplier).toFixed(2)} ({multiplier.toFixed(2)}x)
                  </span>
                </button>
              ) : gameState === 'FLYING' ? (
                <button
                  onClick={handleBetClickPanel2}
                  disabled={isLockedByWinningCap}
                  className={`w-full py-3.5 rounded-xl font-black text-xs transition transform active:scale-95 shadow-md flex flex-col items-center justify-center ${
                    isLockedByWinningCap
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : panel2QueuedBet
                      ? 'bg-purple-950 border border-purple-500 text-purple-300'
                      : 'bg-rose-600 hover:bg-rose-500 text-white'
                  }`}
                >
                  <span>{isLockedByWinningCap ? 'LOCKED (1 LAKH CAP)' : panel2QueuedBet ? 'QUEUED FOR NEXT' : 'BET (NEXT ROUND)'}</span>
                  <span className="text-[10px] font-mono mt-0.5">
                    {panel2QueuedBet ? `₹${panel2QueuedBet}` : `₹${panel2Amount}`}
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleBetClickPanel2}
                  disabled={panel2ActiveBet !== null || isLockedByWinningCap}
                  className={`w-full py-3.5 rounded-xl font-black text-sm transition transform active:scale-95 shadow-md flex flex-col items-center justify-center ${
                    isLockedByWinningCap
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : panel2ActiveBet
                      ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                      : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white'
                  }`}
                >
                  <span>{isLockedByWinningCap ? 'LOCKED (1 LAKH CAP)' : panel2ActiveBet ? 'BET PLACED ✓' : 'BET'}</span>
                  <span className="text-[10px] font-mono mt-0.5">
                    ₹{panel2ActiveBet ? panel2ActiveBet.amount : panel2Amount}
                  </span>
                </button>
              )}
            </div>

            {panel2ActiveBet && panel2ActiveBet.cashedOut && (
              <div className="text-[11px] font-bold text-emerald-400 text-center font-mono">
                ✓ Panel 2 Cashed Out: +₹{panel2ActiveBet.winAmount} ({panel2ActiveBet.cashoutMult}x)
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
