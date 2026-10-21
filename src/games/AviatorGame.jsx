import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, History, Plus, Minus, CheckCircle2, ShieldAlert, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { sounds } from '../services/audio';
import { getLiveAviatorState, getAviatorHistory } from '../services/globalGameEngine';

export default function AviatorGame({ onBack, onOpenMaxLimitModal }) {
  const { user, modifyBalance } = useAuth();

  // Global Synchronized State from Epoch
  const initial = getLiveAviatorState();
  const [gameState, setGameState] = useState(initial.gameState);
  const [multiplier, setMultiplier] = useState(initial.multiplier);
  const [crashPoint, setCrashPoint] = useState(initial.crashPoint);
  const [countdown, setCountdown] = useState(initial.countdown);
  const [currentRoundId, setCurrentRoundId] = useState(initial.roundId);

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

  // History strip — globally synchronized across all devices
  const [crashHistory, setCrashHistory] = useState(() => getAviatorHistory(10));

  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const currentMultiplierRef = useRef(initial.multiplier);
  const crashPointRef = useRef(initial.crashPoint);
  const gameStateRef = useRef(initial.gameState);
  gameStateRef.current = gameState;

  const [showRulesModal, setShowRulesModal] = useState(false);

  const limitInfo = storage.checkGameWinningLimit(user?.id, 'Aviator');
  const isLockedByWinningCap = Boolean(limitInfo.isLimitReached);

  // Check winning limit cap
  const checkWinningCap = () => {
    const freshUser = storage.getCurrentUser();
    const freshLimit = storage.checkGameWinningLimit(freshUser?.id, 'Aviator');
    if (freshLimit.isLimitReached) {
      if (onOpenMaxLimitModal) onOpenMaxLimitModal();
      return true;
    }
    return false;
  };

  // Persistent live refs so sync interval never resets on user bet changes
  const panel1ActiveBetRef = useRef(panel1ActiveBet);
  panel1ActiveBetRef.current = panel1ActiveBet;
  const panel2ActiveBetRef = useRef(panel2ActiveBet);
  panel2ActiveBetRef.current = panel2ActiveBet;
  const panel1AutoCashoutRef = useRef(panel1AutoCashout);
  panel1AutoCashoutRef.current = panel1AutoCashout;
  const panel2AutoCashoutRef = useRef(panel2AutoCashout);
  panel2AutoCashoutRef.current = panel2AutoCashout;
  const panel1AutoCashoutTargetRef = useRef(panel1AutoCashoutTarget);
  panel1AutoCashoutTargetRef.current = panel1AutoCashoutTarget;
  const panel2AutoCashoutTargetRef = useRef(panel2AutoCashoutTarget);
  panel2AutoCashoutTargetRef.current = panel2AutoCashoutTarget;
  const panel1QueuedBetRef = useRef(panel1QueuedBet);
  panel1QueuedBetRef.current = panel1QueuedBet;
  const panel2QueuedBetRef = useRef(panel2QueuedBet);
  panel2QueuedBetRef.current = panel2QueuedBet;
  const panel1AutoBetRef = useRef(panel1AutoBet);
  panel1AutoBetRef.current = panel1AutoBet;
  const panel2AutoBetRef = useRef(panel2AutoBet);
  panel2AutoBetRef.current = panel2AutoBet;
  const panel1AmountRef = useRef(panel1Amount);
  panel1AmountRef.current = panel1Amount;
  const panel2AmountRef = useRef(panel2Amount);
  panel2AmountRef.current = panel2Amount;

  // ── High-Precision Global Engine Sync Loop (Persistent, never resets on bet) ──
  useEffect(() => {
    let lastRoundId = initial.roundId;
    let lastState = initial.gameState;

    const syncInterval = setInterval(() => {
      const live = getLiveAviatorState();
      crashPointRef.current = live.crashPoint;
      setCrashPoint(live.crashPoint);
      setCurrentRoundId(live.roundId);

      // Round Transition (New round has arrived!)
      if (live.roundId !== lastRoundId) {
        lastRoundId = live.roundId;
        setCrashHistory(getAviatorHistory(10));
      }

      // Handle Game State Transitions
      if (live.gameState !== lastState) {
        lastState = live.gameState;
        setGameState(live.gameState);

        if (live.gameState === 'WAITING') {
          // Reset bets and process queues for new flight
          const freshUser = storage.getCurrentUser();
          const freshLimit = storage.checkGameWinningLimit(freshUser?.id, 'Aviator');
          const isCapped = Boolean(freshLimit.isLimitReached);

          // Panel 1 auto/queued placement
          const q1 = panel1QueuedBetRef.current;
          const a1 = panel1AutoBetRef.current;
          if (!isCapped && (q1 || a1)) {
            const betToPlace = q1 || Number(panel1AmountRef.current);
            if (freshUser && freshUser.walletBalance >= betToPlace && betToPlace >= 10) {
              modifyBalance(-betToPlace, 'Aviator Bet Panel 1');
              setPanel1ActiveBet({ amount: betToPlace, cashedOut: false });
            } else if (a1) {
              setPanel1AutoBet(false);
            }
            setPanel1QueuedBet(null);
          } else {
            setPanel1ActiveBet(null);
          }

          // Panel 2 auto/queued placement
          const q2 = panel2QueuedBetRef.current;
          const a2 = panel2AutoBetRef.current;
          if (!isCapped && (q2 || a2)) {
            const betToPlace = q2 || Number(panel2AmountRef.current);
            const freshAfterP1 = storage.getCurrentUser();
            if (freshAfterP1 && freshAfterP1.walletBalance >= betToPlace && betToPlace >= 10) {
              modifyBalance(-betToPlace, 'Aviator Bet Panel 2');
              setPanel2ActiveBet({ amount: betToPlace, cashedOut: false });
            } else if (a2) {
              setPanel2AutoBet(false);
            }
            setPanel2QueuedBet(null);
          } else {
            setPanel2ActiveBet(null);
          }
        } else if (live.gameState === 'CRASHED') {
          // Play crash sound ONLY if the player placed a bet and did not cash out
          const p1 = panel1ActiveBetRef.current;
          const p2 = panel2ActiveBetRef.current;
          const hasActiveLoss = Boolean((p1 && !p1.cashedOut) || (p2 && !p2.cashedOut));
          if (hasActiveLoss) {
            sounds.playLoss();
          }
          // Note: Spectators (no active bet) hear neither win nor lose sound!

          if (p1 && !p1.cashedOut) {
            setPanel1ActiveBet((prev) => (prev ? { ...prev, cashedOut: false, lost: true } : null));
          }
          if (p2 && !p2.cashedOut) {
            setPanel2ActiveBet((prev) => (prev ? { ...prev, cashedOut: false, lost: true } : null));
          }
        }
      }

      // Update Sub-second state
      if (live.gameState === 'WAITING') {
        setCountdown(live.countdown);
        setMultiplier(1.00);
        currentMultiplierRef.current = 1.00;
      } else if (live.gameState === 'FLYING') {
        setMultiplier(live.multiplier);
        currentMultiplierRef.current = live.multiplier;

        // Auto Cashout checks
        const p1 = panel1ActiveBetRef.current;
        if (
          p1 &&
          !p1.cashedOut &&
          panel1AutoCashoutRef.current &&
          panel1AutoCashoutTargetRef.current &&
          live.multiplier >= Number(panel1AutoCashoutTargetRef.current)
        ) {
          handleCashoutPanel(1, Number(panel1AutoCashoutTargetRef.current));
        }

        const p2 = panel2ActiveBetRef.current;
        if (
          p2 &&
          !p2.cashedOut &&
          panel2AutoCashoutRef.current &&
          panel2AutoCashoutTargetRef.current &&
          live.multiplier >= Number(panel2AutoCashoutTargetRef.current)
        ) {
          handleCashoutPanel(2, Number(panel2AutoCashoutTargetRef.current));
        }
      } else if (live.gameState === 'CRASHED') {
        setMultiplier(live.crashPoint);
        currentMultiplierRef.current = live.crashPoint;
      }
    }, 50);

    return () => clearInterval(syncInterval);
  }, []);

  // Canvas Drawing Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const animate = () => {
      const live = getLiveAviatorState();
      drawPlaneScene(ctx, canvas.width, canvas.height, live.multiplier, live.elapsedFlight);
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  // Cashout for Panel 1 or Panel 2
  const handleCashoutPanel = (panelNumber, explicitMult = null) => {
    const multToAward = explicitMult || currentMultiplierRef.current;

    const p1 = panel1ActiveBetRef.current;
    if (panelNumber === 1 && p1 && !p1.cashedOut) {
      const winAmount = Number((p1.amount * multToAward).toFixed(2));
      sounds.playWin();
      sounds.playCashout();
      modifyBalance(winAmount, `Aviator Cashout Panel 1 (${multToAward}x)`);
      setPanel1ActiveBet({ ...p1, cashedOut: true, cashoutMult: multToAward, winAmount });
      checkWinningCap();
    }

    const p2 = panel2ActiveBetRef.current;
    if (panelNumber === 2 && p2 && !p2.cashedOut) {
      const winAmount = Number((p2.amount * multToAward).toFixed(2));
      sounds.playWin();
      sounds.playCashout();
      modifyBalance(winAmount, `Aviator Cashout Panel 2 (${multToAward}x)`);
      setPanel2ActiveBet({ ...p2, cashedOut: true, cashoutMult: multToAward, winAmount });
      checkWinningCap();
    }
  };

  // Bet Click for Panel 1
  const handleBetClickPanel1 = () => {
    if (checkWinningCap()) return;

    const wager = Number(panel1Amount);
    if (isNaN(wager) || wager < 10) {
      alert('Minimum bet amount is ₹10.');
      return;
    }

    const freshUser = storage.getCurrentUser();
    const currentBalance = freshUser ? Number(freshUser.walletBalance || 0) : 0;
    const panel2Queued = panel2QueuedBet ? Number(panel2QueuedBet) : 0;
    const availableForPanel1 = Math.max(0, currentBalance - panel2Queued);

    if (wager > availableForPanel1) {
      alert(`Insufficient balance! Your total bets across both panels cannot exceed your wallet balance (₹${currentBalance.toFixed(2)}).`);
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
    if (isNaN(wager) || wager < 10) {
      alert('Minimum bet amount is ₹10.');
      return;
    }

    const freshUser = storage.getCurrentUser();
    const currentBalance = freshUser ? Number(freshUser.walletBalance || 0) : 0;
    const panel1Queued = panel1QueuedBet ? Number(panel1QueuedBet) : 0;
    const availableForPanel2 = Math.max(0, currentBalance - panel1Queued);

    if (wager > availableForPanel2) {
      alert(`Insufficient balance! Your total bets across both panels cannot exceed your wallet balance (₹${currentBalance.toFixed(2)}).`);
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

    // Dynamic flight coordinates - properly bounded within canvas
    const progress = Math.min(1, Math.max(0, elapsed / 8.5));
    const floatWobble = Math.sin(elapsed * 4.5) * 3;
    // Bounded coordinates so jet never exits canvas
    const planeX = 35 + (w - 95) * Math.min(0.92, progress * 0.95);
    const planeY = Math.max(30, Math.min(h - 35, (h - 45) - (h - 95) * Math.pow(progress, 1.25) + floatWobble));

    // Glowing Curve Trail
    ctx.beginPath();
    ctx.moveTo(25, h - 35);
    ctx.quadraticCurveTo(w * 0.35, h - 35, planeX, planeY);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = 'rgba(16, 185, 129, 0.8)';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Fill underneath trail
    ctx.lineTo(planeX, h - 35);
    ctx.lineTo(25, h - 35);
    const grad = ctx.createLinearGradient(0, planeY, 0, h - 35);
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
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
    <div className="min-h-screen bg-[#090e17] p-3 sm:p-4 pb-28 selection:bg-emerald-500 selection:text-black">
      <div className="max-w-5xl mx-auto space-y-3 sm:space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between bg-[#0f1826] border border-slate-800 rounded-2xl p-3">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <button
              onClick={() => {
                sounds.playClick();
                onBack();
              }}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-black text-white flex items-center space-x-2">
                <span>AVIATOR</span>
                <span className="text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                  LIVE
                </span>
                <span className="text-[10px] bg-slate-900 text-slate-400 border border-slate-700/60 px-2 py-0.5 rounded-full font-mono font-bold">
                  {currentRoundId}
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Cash out before the plane flies away</p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => {
                sounds.playClick();
                setShowRulesModal(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700 transition"
              title="Game Rules & Provable Fairness"
            >
              ⚖ Rules
            </button>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Balance</span>
              <span className="text-xs sm:text-sm font-black font-mono text-emerald-400">
                ₹{user ? Number(user.walletBalance).toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Winning Limit Banner if limit reached */}
        {isLockedByWinningCap && (
          <div 
            onClick={checkWinningCap}
            className="p-3.5 bg-gradient-to-r from-amber-950/90 to-yellow-950/90 border-2 border-amber-500/70 rounded-2xl flex items-center justify-between cursor-pointer hover:border-amber-400 transition text-xs text-amber-200 shadow-lg shadow-amber-950/40"
          >
            <div className="flex items-center space-x-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
              <span className="font-bold leading-tight">
                You have reached the winning amount. Please withdraw your funds to play again.
              </span>
            </div>
            <span className="font-black text-amber-400 underline text-xs shrink-0 ml-3">Withdraw →</span>
          </div>
        )}

        {/* Recent Crash Multipliers History Strip */}
        <div className="bg-[#0f1826] border border-slate-800 rounded-2xl px-3 py-2 flex items-center space-x-2 overflow-x-auto select-none no-scrollbar">
          <History className="w-4 h-4 text-slate-500 shrink-0" />
          <div className="flex items-center space-x-2">
            {crashHistory.map((mult, idx) => (
              <span
                key={idx}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-black shrink-0 ${
                  mult < 2.0
                    ? 'bg-blue-950/80 text-blue-400 border border-blue-500/30'
                    : mult < 10.0
                    ? 'bg-purple-950/80 text-purple-400 border border-purple-500/30'
                    : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                }`}
              >
                {mult.toFixed(2)}x
              </span>
            ))}
          </div>
        </div>

        {/* Unified Responsive Container: Stage on Left (or Top on Mobile), Dual Bets on Right (or Bottom on Mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
          
          {/* LEFT SECTION (approx 55% on lg): Flight Main Stage / Canvas with 2D Animated Plane */}
          <div className="lg:col-span-7 flex flex-col">
            <div className={`relative bg-[#0f1826] border rounded-3xl h-64 sm:h-80 lg:h-full min-h-[260px] overflow-hidden shadow-2xl flex items-center justify-center transition-all duration-300 ${
              gameState === 'CRASHED' ? 'border-rose-600/80 shadow-rose-950/60' :
              gameState === 'FLYING' ? 'border-emerald-500/30 shadow-emerald-950/20' : 'border-slate-800'
            }`}>
              <canvas
                ref={canvasRef}
                width={720}
                height={320}
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Crashed red shockwave overlay */}
              {gameState === 'CRASHED' && (
                <div className="absolute inset-0 bg-red-950/30 animate-pulse pointer-events-none" />
              )}

              {/* Center Multiplier Display */}
              <div className="relative z-10 text-center select-none pointer-events-none px-4">
                {gameState === 'WAITING' ? (
                  <div className="animate-pop-in">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                      NEXT FLIGHT IN
                    </span>
                    <div className="relative inline-block">
                      <span className="text-5xl sm:text-6xl font-black font-mono text-white tracking-wider">
                        {countdown}s
                      </span>
                      <div className="w-16 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent mx-auto mt-1 animate-pulse" />
                    </div>
                    <p className="text-[11px] text-emerald-400 font-bold mt-2 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-700/80 shadow-sm">
                      ⚡ Dual betting open! Set Auto-Cashout or Bet below
                    </p>
                  </div>
                ) : gameState === 'FLYING' ? (
                  <div className="transform transition-transform">
                    <span className={`text-6xl sm:text-7xl font-black font-mono tracking-tight transition-all duration-150 ${
                      multiplier >= 10.0 
                        ? 'text-amber-400 drop-shadow-[0_0_35px_rgba(245,158,11,0.9)] scale-110' 
                        : multiplier >= 5.0
                        ? 'text-purple-400 drop-shadow-[0_0_30px_rgba(168,85,247,0.8)]'
                        : multiplier >= 2.0
                        ? 'text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.7)]'
                        : 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]'
                    }`}>
                      {multiplier.toFixed(2)}x
                    </span>
                  </div>
                ) : (
                  <div className="animate-bomb-shake">
                    <span className="text-xs font-black uppercase tracking-widest text-rose-400 block mb-1">
                      💥 FLEW AWAY AT
                    </span>
                    <span className="text-5xl sm:text-6xl font-black font-mono text-rose-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]">
                      {multiplier.toFixed(2)}x
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SECTION (approx 45% on lg): Dual Betting Controls Panel */}
          <div className="lg:col-span-5 flex flex-col space-y-3 sm:space-y-4">
            
            {/* --- BET PANEL 1 --- */}
            <div className="bg-[#0f1826] border border-slate-800 rounded-3xl p-3.5 sm:p-4 shadow-xl space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>BET PANEL 1</span>
                </span>

                {/* Auto Bet Toggle */}
                <label className="flex items-center space-x-1.5 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    disabled={isLockedByWinningCap}
                    checked={panel1AutoBet}
                    onChange={(e) => setPanel1AutoBet(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-500 bg-slate-900 focus:ring-0 disabled:opacity-40"
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
                        className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] font-mono text-slate-300 disabled:opacity-40"
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center bg-[#131f33] border border-slate-700 rounded-xl overflow-hidden">
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
                    className="rounded border-slate-700 text-emerald-500 bg-slate-900 focus:ring-0 disabled:opacity-40"
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
                    className="w-16 bg-[#131f33] border border-slate-700 rounded-lg px-2 py-0.5 text-xs font-mono font-bold text-center text-emerald-400 focus:outline-none disabled:opacity-40"
                  />
                  <span className="text-slate-500 text-xs">x</span>
                </div>
              </div>

              {/* Action Button 1 */}
              <div>
                {gameState === 'FLYING' && panel1ActiveBet && !panel1ActiveBet.cashedOut ? (
                  <button
                    onClick={() => handleCashoutPanel(1)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm shadow-lg shadow-orange-500/25 transition transform active:scale-95 flex flex-col items-center justify-center"
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
                    className={`w-full py-3 rounded-xl font-black text-xs transition transform active:scale-95 shadow-md flex flex-col items-center justify-center ${
                      isLockedByWinningCap
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : panel1QueuedBet
                        ? 'bg-purple-950 border border-purple-500 text-purple-300'
                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                  >
                    <span>{isLockedByWinningCap ? 'WINNING LIMIT REACHED' : panel1QueuedBet ? 'QUEUED FOR NEXT' : 'BET (NEXT ROUND)'}</span>
                    <span className="text-[10px] font-mono mt-0.5">
                      {panel1QueuedBet ? `₹${panel1QueuedBet}` : `₹${panel1Amount}`}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={handleBetClickPanel1}
                    disabled={panel1ActiveBet !== null || isLockedByWinningCap}
                    className={`w-full py-3 rounded-xl font-black text-sm transition transform active:scale-95 shadow-md flex flex-col items-center justify-center ${
                      isLockedByWinningCap
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : panel1ActiveBet
                        ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black'
                    }`}
                  >
                    <span>{isLockedByWinningCap ? 'WINNING LIMIT REACHED' : panel1ActiveBet ? 'BET PLACED ✓' : 'BET'}</span>
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
            <div className="bg-[#0f1826] border border-slate-800 rounded-3xl p-3.5 sm:p-4 shadow-xl space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-teal-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                  <span>BET PANEL 2</span>
                </span>

                {/* Auto Bet Toggle */}
                <label className="flex items-center space-x-1.5 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    disabled={isLockedByWinningCap}
                    checked={panel2AutoBet}
                    onChange={(e) => setPanel2AutoBet(e.target.checked)}
                    className="rounded border-slate-700 text-teal-500 bg-slate-900 focus:ring-0 disabled:opacity-40"
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
                        className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] font-mono text-slate-300 disabled:opacity-40"
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center bg-[#131f33] border border-slate-700 rounded-xl overflow-hidden">
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
                    className="rounded border-slate-700 text-teal-500 bg-slate-900 focus:ring-0 disabled:opacity-40"
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
                    className="w-16 bg-[#131f33] border border-slate-700 rounded-lg px-2 py-0.5 text-xs font-mono font-bold text-center text-teal-400 focus:outline-none disabled:opacity-40"
                  />
                  <span className="text-slate-500 text-xs">x</span>
                </div>
              </div>

              {/* Action Button 2 */}
              <div>
                {gameState === 'FLYING' && panel2ActiveBet && !panel2ActiveBet.cashedOut ? (
                  <button
                    onClick={() => handleCashoutPanel(2)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm shadow-lg shadow-orange-500/25 transition transform active:scale-95 flex flex-col items-center justify-center"
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
                    className={`w-full py-3 rounded-xl font-black text-xs transition transform active:scale-95 shadow-md flex flex-col items-center justify-center ${
                      isLockedByWinningCap
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : panel2QueuedBet
                        ? 'bg-purple-950 border border-purple-500 text-purple-300'
                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                  >
                    <span>{isLockedByWinningCap ? 'WINNING LIMIT REACHED' : panel2QueuedBet ? 'QUEUED FOR NEXT' : 'BET (NEXT ROUND)'}</span>
                    <span className="text-[10px] font-mono mt-0.5">
                      {panel2QueuedBet ? `₹${panel2QueuedBet}` : `₹${panel2Amount}`}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={handleBetClickPanel2}
                    disabled={panel2ActiveBet !== null || isLockedByWinningCap}
                    className={`w-full py-3 rounded-xl font-black text-sm transition transform active:scale-95 shadow-md flex flex-col items-center justify-center ${
                      isLockedByWinningCap
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : panel2ActiveBet
                        ? 'bg-teal-950 border border-teal-500 text-teal-300'
                        : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black font-black'
                    }`}
                  >
                    <span>{isLockedByWinningCap ? 'WINNING LIMIT REACHED' : panel2ActiveBet ? 'BET PLACED ✓' : 'BET'}</span>
                    <span className="text-[10px] font-mono mt-0.5">
                      ₹{panel2ActiveBet ? panel2ActiveBet.amount : panel2Amount}
                    </span>
                  </button>
                )}
              </div>

              {panel2ActiveBet && panel2ActiveBet.cashedOut && (
                <div className="text-[11px] font-bold text-teal-400 text-center font-mono">
                  ✓ Panel 2 Cashed Out: +₹{panel2ActiveBet.winAmount} ({panel2ActiveBet.cashoutMult}x)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Game Rules & Provable Fairness Modal */}
        {showRulesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#0f172a] border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">✈</span>
                  <h3 className="text-base font-black text-white">Aviator Rules & Provable Fairness</h3>
                </div>
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                  <h4 className="font-black text-rose-400 uppercase tracking-wider mb-1">How To Play</h4>
                  <p>1. Place one or two bets before the round starts during the 5-second countdown.</p>
                  <p>2. Watch the plane climb — the multiplier starts at 1.00x and increases exponentially.</p>
                  <p>3. Hit <strong className="text-amber-400">Cash Out</strong> before the plane crashes to lock in your winnings.</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                  <h4 className="font-black text-cyan-400 uppercase tracking-wider mb-1">Provable Fairness & Synchronicity</h4>
                  <p>Every round is generated deterministically using a cryptographic non-linear avalanche hash combined with synchronized global atomic UTC time. Outcomes are completely identical on every device across the world in real-time, mathematically unmanipulated, and protected from prediction.</p>
                </div>

                <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200">
                  <h4 className="font-black text-amber-400 uppercase tracking-wider mb-1">Winning Limit Policy (Aviator & WinGo)</h4>
                  <p>To ensure transparent risk controls, a profit threshold policy of <strong>3× qualifying deposit</strong> applies to Aviator and WinGo. (Example: ₹100 deposit → ₹300 winning threshold).</p>
                  <p className="mt-1">When reached, new wagers on Aviator and WinGo are temporarily paused so you can review your balance and withdraw. <strong>Your funds are 100% safe, never confiscated</strong>, and all other games (Mines, Dice, Plinko, Tower) remain accessible.</p>
                </div>
              </div>

              <button
                onClick={() => setShowRulesModal(false)}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs transition"
              >
                I Understand
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
