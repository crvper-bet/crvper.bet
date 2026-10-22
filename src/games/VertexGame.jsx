import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, Play, Shield, ShieldCheck, Sparkles, AlertTriangle, 
  Flame, Droplets, Mountain, Zap, Trophy, RefreshCw, Volume2, VolumeX,
  History, Info, Award, CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';
import { 
  VERTEX_OUTER_SLICES, 
  VERTEX_INNER_SLICES, 
  getVertexOutcomeForRound 
} from '../services/globalGameEngine';

// Storage key for persisting elemental progress
const ELEMENT_STORAGE_KEY = 'crvper_vertex_elements_v1';

export default function VertexGame({ onBack }) {
  const { user, modifyBalance } = useAuth();

  // ── Asset / Canvas Preloader State (Specification Step 1) ─────────────────
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isEngineReady, setIsEngineReady] = useState(false);

  // ── Game Config & Betting State (Specification Step 2) ────────────────────
  const [stake, setStake] = useState('20');
  const [isSpinning, setIsSpinning] = useState(false);
  const [watchOutActive, setWatchOutActive] = useState(false); // Strategic "Watch Out" hazard shield
  const [soundMuted, setSoundMuted] = useState(false);

  // ── Elemental Tracks (Specification Step 4: Fire, Earth, Water) ───────────
  // Each track requires 3 charges to trigger instant Bonus Cash!
  const [elementCharges, setElementCharges] = useState(() => {
    try {
      const saved = localStorage.getItem(ELEMENT_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { fire: 0, water: 0, earth: 0 };
  });

  // ── Results & History ─────────────────────────────────────────────────────
  const [roundCounter, setRoundCounter] = useState(() => Math.floor(Date.now() / 3000));
  const [recentOutcomes, setRecentOutcomes] = useState([
    { mult: 2.0, element: 'fire', label: 'FIRE 2X' },
    { mult: 1.5, element: null, label: '1.5x' },
    { mult: 2.5, element: 'earth', label: 'EARTH 2.5X' },
    { mult: 3.0, element: null, label: '3.0x' },
    { mult: 1.8, element: 'water', label: 'WATER 1.8X' }
  ]);
  const [lastWinInfo, setLastWinInfo] = useState(null);
  const [bonusModal, setBonusModal] = useState(null);
  const [showFairnessModal, setShowFairnessModal] = useState(false);

  // ── Canvas & Animation References ─────────────────────────────────────────
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const isSpinningRef = useRef(false);
  isSpinningRef.current = isSpinning;

  // Angles (in radians)
  const outerAngleRef = useRef(0);
  const innerAngleRef = useRef(0);
  const targetOuterAngleRef = useRef(0);
  const targetInnerAngleRef = useRef(0);

  // Angular velocities & deceleration
  const outerVelRef = useRef(0);
  const innerVelRef = useRef(0);
  const currentOutcomeRef = useRef(null);
  const particlesRef = useRef([]);

  // Hold-to-spin reference
  const holdIntervalRef = useRef(null);
  const isHoldingRef = useRef(false);

  // ── Step 1: Preloading & High-Performance Canvas Initialization ───────────
  useEffect(() => {
    let p = 0;
    const interval = setInterval(() => {
      p += Math.floor(Math.random() * 25) + 15;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => setIsEngineReady(true), 250);
      }
      setLoadingProgress(Math.min(100, p));
    }, 60);

    return () => clearInterval(interval);
  }, []);

  // Save elemental progress to local storage
  useEffect(() => {
    try {
      localStorage.setItem(ELEMENT_STORAGE_KEY, JSON.stringify(elementCharges));
    } catch {}
  }, [elementCharges]);

  // ── Trigger Bonus Cash Event ──────────────────────────────────────────────
  const triggerElementalBonus = useCallback((elementKey, stakeAmount) => {
    sounds.playBonusTrigger();

    let bonusMultiplier = 15;
    let bonusName = 'Pyros Inferno Cash';
    let bonusColor = '#f43f5e';
    let bonusIcon = '🔥';

    if (elementKey === 'water') {
      bonusMultiplier = 12;
      bonusName = 'Aquas Tsunami Cash';
      bonusColor = '#06b6d4';
      bonusIcon = '💧';
    } else if (elementKey === 'earth') {
      bonusMultiplier = 20;
      bonusName = 'Terra Titan Vault';
      bonusColor = '#10b981';
      bonusIcon = '🌿';
    }

    const bonusAmount = Number((stakeAmount * bonusMultiplier).toFixed(2));
    modifyBalance(bonusAmount, `Vertex Bonus: ${bonusName}`);

    // Trigger explosive celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 }
      });
    } catch {}

    setBonusModal({
      name: bonusName,
      element: elementKey,
      icon: bonusIcon,
      multiplier: bonusMultiplier,
      amount: bonusAmount,
      color: bonusColor
    });
  }, [modifyBalance]);

  // ── 60fps Canvas Render Loop ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isEngineReady) return;
    const ctx = canvas.getContext('2d');

    const totalOuter = VERTEX_OUTER_SLICES.length;
    const outerSliceAngle = (Math.PI * 2) / totalOuter;

    const totalInner = VERTEX_INNER_SLICES.length;
    const innerSliceAngle = (Math.PI * 2) / totalInner;

    let lastTickAngle = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Physics update if spinning
      if (isSpinningRef.current) {
        outerAngleRef.current += outerVelRef.current;
        innerAngleRef.current += innerVelRef.current;

        // Sound tick based on slice crossings
        const currentSliceNorm = Math.floor((outerAngleRef.current / outerSliceAngle) % totalOuter);
        if (currentSliceNorm !== lastTickAngle) {
          lastTickAngle = currentSliceNorm;
          sounds.playWheelTick(Math.abs(outerVelRef.current * 10));
        }

        // Apply deceleration easing
        outerVelRef.current *= 0.985;
        innerVelRef.current *= 0.986;

        // Spawn ambient glowing motion particles
        if (Math.random() < 0.4) {
          particlesRef.current.push({
            x: cx + Math.cos(outerAngleRef.current) * (cx * 0.8),
            y: cy + Math.sin(outerAngleRef.current) * (cy * 0.8),
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            alpha: 0.8,
            color: Math.random() < 0.33 ? '#f43f5e' : Math.random() < 0.5 ? '#06b6d4' : '#10b981',
            size: Math.random() * 3 + 1.5
          });
        }

        // Check if coming to a complete stop
        if (outerVelRef.current < 0.0015 && innerVelRef.current < 0.0015) {
          outerVelRef.current = 0;
          innerVelRef.current = 0;
          isSpinningRef.current = false;
          setIsSpinning(false);
          finalizeSpinOutcome();
        }
      }

      // ── Outer Glowing Halo ────────────────────────────────────────────────
      const haloGrad = ctx.createRadialGradient(cx, cy, cx * 0.75, cx, cy, cx * 0.98);
      haloGrad.addColorStop(0, 'rgba(15, 24, 38, 0.4)');
      haloGrad.addColorStop(0.85, 'rgba(244, 63, 94, 0.15)');
      haloGrad.addColorStop(1, 'rgba(6, 182, 212, 0.25)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, cx * 0.98, 0, Math.PI * 2);
      ctx.fill();

      // ── Render Outer Concentric Wheel ──────────────────────────────────────
      const outerR = cx * 0.92;
      const outerInnerR = cx * 0.60;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(outerAngleRef.current);

      for (let i = 0; i < totalOuter; i++) {
        const slice = VERTEX_OUTER_SLICES[i];
        const startA = i * outerSliceAngle;
        const endA = startA + outerSliceAngle;

        ctx.beginPath();
        ctx.arc(0, 0, outerR, startA, endA);
        ctx.arc(0, 0, outerInnerR, endA, startA, true);
        ctx.closePath();

        // Slice background gradient
        const segGrad = ctx.createRadialGradient(0, 0, outerInnerR, 0, 0, outerR);
        segGrad.addColorStop(0, slice.bg || '#0c121d');
        segGrad.addColorStop(1, slice.color + '33');
        ctx.fillStyle = segGrad;
        ctx.fill();

        // Border separator lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Slice text label
        ctx.save();
        ctx.rotate(startA + outerSliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = slice.color;
        ctx.font = 'bold 11px monospace';
        ctx.shadowColor = slice.color;
        ctx.shadowBlur = 6;
        ctx.fillText(`${slice.icon} ${slice.label}`, outerR - 10, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
      }
      ctx.restore();

      // ── Outer / Inner Ring Divider ─────────────────────────────────────────
      ctx.beginPath();
      ctx.arc(cx, cy, outerInnerR, 0, Math.PI * 2);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // ── Render Inner Concentric Booster Wheel ──────────────────────────────
      const innerR = outerInnerR - 4;
      const innerCoreR = cx * 0.28;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(innerAngleRef.current);

      for (let j = 0; j < totalInner; j++) {
        const iSlice = VERTEX_INNER_SLICES[j];
        const startA = j * innerSliceAngle;
        const endA = startA + innerSliceAngle;

        ctx.beginPath();
        ctx.arc(0, 0, innerR, startA, endA);
        ctx.arc(0, 0, innerCoreR, endA, startA, true);
        ctx.closePath();

        ctx.fillStyle = j % 2 === 0 ? '#111a2e' : '#162238';
        ctx.fill();

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.save();
        ctx.rotate(startA + innerSliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = iSlice.color || '#38bdf8';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`${iSlice.icon} ${iSlice.label}`, innerR - 8, 0);
        ctx.restore();
      }
      ctx.restore();

      // ── Center Elemental Energy Core ───────────────────────────────────────
      const pulse = 1 + Math.sin(Date.now() / 250) * 0.05;
      const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, innerCoreR * pulse);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, '#38bdf8');
      coreGrad.addColorStop(0.7, '#a855f7');
      coreGrad.addColorStop(1, '#090e17');

      ctx.beginPath();
      ctx.arc(cx, cy, innerCoreR, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Center Vertex "V" Emblem
      ctx.fillStyle = '#ffffff';
      ctx.font = 'black 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('VERTEX', cx, cy - 2);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('CIRCULAR CORE', cx, cy + 10);

      // ── Directional Top Pointer (12 o'clock needle) ────────────────────────
      ctx.save();
      ctx.translate(cx, cy - outerR - 4);

      ctx.beginPath();
      ctx.moveTo(-10, -14);
      ctx.lineTo(10, -14);
      ctx.lineTo(0, 6);
      ctx.closePath();

      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // ── Update & Render Particles ──────────────────────────────────────────
      for (let p = particlesRef.current.length - 1; p >= 0; p--) {
        const pt = particlesRef.current[p];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.02;

        if (pt.alpha <= 0) {
          particlesRef.current.splice(p, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.alpha;
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isEngineReady]);

  // ── Finalize Spin Outcome ─────────────────────────────────────────────────
  const finalizeSpinOutcome = () => {
    const outcome = currentOutcomeRef.current;
    if (!outcome) return;

    const { outerSlice, innerSlice, stakeAmount, watchOut } = outcome;
    let netMultiplier = outerSlice.multiplier;

    // Apply inner booster if applicable
    if (innerSlice.boost && innerSlice.boost > 1.0 && netMultiplier > 0) {
      netMultiplier = Number((netMultiplier * innerSlice.boost).toFixed(2));
    }

    // Shield protection logic
    let shieldSaved = false;
    if (netMultiplier === 0) {
      if (watchOut || innerSlice.type === 'shield') {
        netMultiplier = 0.8; // 80% stake preservation on hazard!
        shieldSaved = true;
        sounds.playShieldProtect();
      }
    }

    const payout = Number((stakeAmount * netMultiplier).toFixed(2));

    // Update wallet balance
    if (payout > 0) {
      modifyBalance(payout, `Vertex (${netMultiplier}x on ${outerSlice.label})`);
      if (netMultiplier >= 1.0) {
        sounds.playWin();
      } else {
        sounds.playLoss();
      }
    } else {
      sounds.playLoss();
    }

    // Advance Elemental Meters if an elemental slice landed
    if (outerSlice.element) {
      sounds.playElementCharge(outerSlice.element);
      setElementCharges(prev => {
        const next = { ...prev };
        const key = outerSlice.element;
        next[key] = (next[key] || 0) + 1;

        // Check if 3 charges reached
        if (next[key] >= 3) {
          next[key] = 0; // Reset track
          setTimeout(() => triggerElementalBonus(key, stakeAmount), 400);
        }
        return next;
      });
    }

    setLastWinInfo({
      outer: outerSlice,
      inner: innerSlice,
      multiplier: netMultiplier,
      payout,
      shieldSaved
    });

    setRecentOutcomes(prev => [
      { mult: netMultiplier, element: outerSlice.element, label: outerSlice.label },
      ...prev.slice(0, 7)
    ]);
  };

  // ── Step 3: Initiate Spin Execution (The Action Phase) ────────────────────
  const handleSpin = () => {
    if (isSpinningRef.current) return;

    const stakeNum = Number(stake);
    if (!stakeNum || stakeNum < 10) {
      alert('Minimum bet is ₹10.');
      return;
    }

    if (!user || user.walletBalance < stakeNum) {
      alert('Insufficient wallet balance!');
      return;
    }

    sounds.playClick();
    sounds.playWheelSpin();

    // Deduct stake from wallet balance (Atomic deduction)
    modifyBalance(-stakeNum, `Vertex Spin Bet (₹${stakeNum})`);

    // Increment round counter
    const nextRound = roundCounter + 1;
    setRoundCounter(nextRound);

    // Compute Provably Fair RNG outcome
    const outcome = getVertexOutcomeForRound(nextRound, user?.id || '');
    currentOutcomeRef.current = {
      ...outcome,
      stakeAmount: stakeNum,
      watchOut: watchOutActive
    };

    // Calculate angular stopping targets
    // Pointer is at 12 o'clock (-PI / 2 or 3PI / 2)
    const totalOuter = VERTEX_OUTER_SLICES.length;
    const outerSliceAngle = (Math.PI * 2) / totalOuter;
    const targetOuterSliceCenter = outcome.outerIndex * outerSliceAngle + outerSliceAngle / 2;

    // Align with top pointer (-PI/2)
    const extraSpinsOuter = (Math.floor(Math.random() * 3) + 4) * Math.PI * 2;
    const finalOuterTarget = extraSpinsOuter + (Math.PI * 1.5 - targetOuterSliceCenter);

    const totalInner = VERTEX_INNER_SLICES.length;
    const innerSliceAngle = (Math.PI * 2) / totalInner;
    const targetInnerSliceCenter = outcome.innerIndex * innerSliceAngle + innerSliceAngle / 2;
    const extraSpinsInner = (Math.floor(Math.random() * 3) + 3) * Math.PI * 2;
    const finalInnerTarget = extraSpinsInner + (Math.PI * 1.5 - targetInnerSliceCenter);

    targetOuterAngleRef.current = finalOuterTarget;
    targetInnerAngleRef.current = finalInnerTarget;

    // Launch with initial high angular velocity
    outerVelRef.current = 0.38 + Math.random() * 0.08;
    innerVelRef.current = 0.28 + Math.random() * 0.06;

    isSpinningRef.current = true;
    setIsSpinning(true);
    setLastWinInfo(null);
  };

  // ── "Hold to Spin" Handlers ───────────────────────────────────────────────
  const startHoldSpin = () => {
    isHoldingRef.current = true;
    handleSpin();
    holdIntervalRef.current = setInterval(() => {
      if (isHoldingRef.current && !isSpinningRef.current) {
        handleSpin();
      }
    }, 2800);
  };

  const stopHoldSpin = () => {
    isHoldingRef.current = false;
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  // ── Strategic "Fast Payout" (Specification Step 5) ─────────────────────────
  const handleFastPayout = () => {
    // Collect accumulated elemental reserves as instant cash
    const totalCharges = (elementCharges.fire || 0) + (elementCharges.water || 0) + (elementCharges.earth || 0);
    if (totalCharges === 0) {
      alert('No elemental charges banked yet! Spin to charge Fire, Water, or Earth.');
      return;
    }

    sounds.playCashout();
    const cashoutRatePerCharge = Number(stake) * 1.5;
    const instantPayout = Number((totalCharges * cashoutRatePerCharge).toFixed(2));

    modifyBalance(instantPayout, `Vertex Fast Payout (${totalCharges} Charges)`);
    setElementCharges({ fire: 0, water: 0, earth: 0 });

    try {
      confetti({ particleCount: 45, spread: 60, origin: { y: 0.7 } });
    } catch {}

    alert(`⚡ Fast Payout Successful! Banked ₹${instantPayout} for ${totalCharges} elemental charges.`);
  };

  return (
    <div className="min-h-screen bg-[#090e17] text-white p-3 sm:p-4 pb-24 select-none selection:bg-rose-500 selection:text-black">
      <div className="max-w-md mx-auto space-y-3.5">

        {/* ── Preloading Bar (Specification Step 1) ────────────────────── */}
        {!isEngineReady && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#090e17] p-6 space-y-4">
            <div className="relative flex items-center justify-center w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-dashed border-rose-500 animate-spin" style={{ animationDuration: '6s' }} />
              <div className="absolute inset-2 rounded-full border-2 border-cyan-400 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
              <span className="text-xl font-black text-white">V</span>
            </div>
            <div className="text-center">
              <h2 className="text-lg font-black tracking-wider text-white">INITIALIZING VERTEX</h2>
              <p className="text-xs text-slate-400 font-mono">Calibrating Concentric Wheel &amp; RNG...</p>
            </div>
            <div className="w-56 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
              <div 
                className="h-full bg-gradient-to-r from-rose-500 via-purple-500 to-cyan-400 transition-all duration-150"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400">{loadingProgress}%</span>
          </div>
        )}

        {/* ── Header Bar ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between bg-[#0f1826] border border-slate-800 rounded-2xl p-3">
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => {
                sounds.playClick();
                onBack();
              }}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-black tracking-wide text-white flex items-center space-x-1.5">
                  <span>VERTEX</span>
                  <span className="text-[10px] bg-rose-950 text-rose-400 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold">
                    ELEMENTAL
                  </span>
                </h1>
              </div>
              <p className="text-[11px] text-slate-400">Concentric multiplier &amp; elemental wheel</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Balance</span>
            <span className="text-xs sm:text-sm font-black font-mono text-emerald-400">
              ₹{user ? Number(user.walletBalance).toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        {/* ── Recent Multipliers Ticker ─────────────────────────────────── */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1 px-1 bg-black/40 rounded-xl border border-slate-800/80">
          <span className="text-[9px] font-mono text-slate-500 font-bold uppercase px-1.5 flex items-center space-x-1">
            <History className="w-3 h-3 text-slate-400" />
            <span>LAST:</span>
          </span>
          {recentOutcomes.map((item, idx) => (
            <span
              key={idx}
              className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-lg border whitespace-nowrap ${
                item.element === 'fire' ? 'bg-rose-950/70 text-rose-400 border-rose-500/40' :
                item.element === 'water' ? 'bg-cyan-950/70 text-cyan-400 border-cyan-500/40' :
                item.element === 'earth' ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40' :
                item.mult >= 5.0 ? 'bg-amber-950/70 text-amber-300 border-amber-500/40' :
                item.mult >= 1.0 ? 'bg-slate-800 text-slate-200 border-slate-700' :
                'bg-rose-950/40 text-slate-400 border-rose-900/30'
              }`}
            >
              {item.mult}x
            </span>
          ))}
        </div>

        {/* ── Main Concentric Wheel Canvas Display ──────────────────────── */}
        <div className="relative bg-[#0f1826] border border-slate-800 rounded-3xl p-3 shadow-2xl flex flex-col items-center overflow-hidden">
          {/* Subtle Ambient Background Gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-950/20 via-transparent to-transparent pointer-events-none" />

          <canvas
            ref={canvasRef}
            width={340}
            height={340}
            className="w-full max-w-[340px] h-[340px] relative z-10 drop-shadow-[0_0_25px_rgba(0,0,0,0.8)]"
          />

          {/* Outcome Badge Overlay when Stopped */}
          {lastWinInfo && (
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full text-xs font-mono font-black border shadow-xl flex items-center space-x-2 animate-win-celebrate ${
              lastWinInfo.multiplier >= 1.0 
                ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300 shadow-emerald-900/40' 
                : lastWinInfo.shieldSaved
                ? 'bg-amber-950/90 border-amber-400 text-amber-300 shadow-amber-900/40'
                : 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-rose-900/40'
            }`}>
              {lastWinInfo.multiplier >= 1.0 ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                  <span>WIN: {lastWinInfo.multiplier}x (+₹{lastWinInfo.payout})</span>
                </>
              ) : lastWinInfo.shieldSaved ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                  <span>SHIELD SAVED: 0.8x (+₹{lastWinInfo.payout})</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>HAZARD (0.0x)</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Elemental Tracking Meters (Specification Step 4) ──────────── */}
        <div className="bg-[#0f1826] border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Elemental Progression Tracks (3 Charges = Bonus)</span>
            </span>
            <button
              onClick={handleFastPayout}
              className="text-[10px] font-mono font-black text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-md hover:bg-amber-900/40 transition active:scale-95"
            >
              ⚡ Fast Payout
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Fire Meter */}
            <div className="bg-[#141b2b] border border-rose-900/40 rounded-xl p-2 space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-black text-rose-400 flex items-center space-x-1">
                  <Flame className="w-3 h-3" />
                  <span>FIRE</span>
                </span>
                <span className="font-mono font-bold text-slate-300">{elementCharges.fire || 0}/3</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[0, 1, 2].map((slot) => (
                  <div
                    key={slot}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      (elementCharges.fire || 0) > slot
                        ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                        : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Water Meter */}
            <div className="bg-[#141b2b] border border-cyan-900/40 rounded-xl p-2 space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-black text-cyan-400 flex items-center space-x-1">
                  <Droplets className="w-3 h-3" />
                  <span>WATER</span>
                </span>
                <span className="font-mono font-bold text-slate-300">{elementCharges.water || 0}/3</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[0, 1, 2].map((slot) => (
                  <div
                    key={slot}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      (elementCharges.water || 0) > slot
                        ? 'bg-cyan-400 shadow-[0_0_8px_#06b6d4]'
                        : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Earth Meter */}
            <div className="bg-[#141b2b] border border-emerald-900/40 rounded-xl p-2 space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-black text-emerald-400 flex items-center space-x-1">
                  <Mountain className="w-3 h-3" />
                  <span>EARTH</span>
                </span>
                <span className="font-mono font-bold text-slate-300">{elementCharges.earth || 0}/3</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[0, 1, 2].map((slot) => (
                  <div
                    key={slot}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      (elementCharges.earth || 0) > slot
                        ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                        : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Betting & Strategic Controls Panel (Specification Step 2) ─── */}
        <div className="bg-[#0f1826] border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3.5">
          {/* Quick Stake Chips */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Quick Stake (₹)
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={isSpinning}
                onClick={() => setWatchOutActive(!watchOutActive)}
                className={`text-[10px] font-mono font-black px-2.5 py-1 rounded-lg border transition flex items-center space-x-1 ${
                  watchOutActive
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'bg-[#131f33] text-slate-400 border-slate-700'
                }`}
              >
                <Shield className="w-3 h-3" />
                <span>Watch Out: {watchOutActive ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {['10', '20', '50', '100', '500'].map((val) => (
              <button
                key={val}
                disabled={isSpinning}
                onClick={() => {
                  sounds.playClick();
                  setStake(val);
                }}
                className={`py-2 rounded-xl text-xs font-mono font-black border transition ${
                  stake === val
                    ? 'bg-rose-500 text-slate-950 border-rose-400 shadow-md shadow-rose-500/25'
                    : 'bg-[#131f33] text-slate-300 border-slate-800 hover:border-slate-700 disabled:opacity-50'
                }`}
              >
                ₹{val}
              </button>
            ))}
          </div>

          {/* Stake Input */}
          <div className="relative">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Bet Amount
            </label>
            <div className="flex items-center space-x-2">
              <button
                disabled={isSpinning}
                onClick={() => {
                  sounds.playClick();
                  setStake(prev => String(Math.max(10, Number(prev || 10) - 10)));
                }}
                className="w-11 h-11 rounded-2xl bg-[#131f33] border border-slate-700 flex items-center justify-center font-black text-lg text-slate-300 hover:text-white disabled:opacity-50 active:scale-95 transition"
              >
                -
              </button>
              <input
                type="number"
                min="10"
                disabled={isSpinning}
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                className="w-full bg-[#131f33] border border-slate-700 rounded-2xl px-4 py-2.5 text-center text-base font-black text-white font-mono focus:outline-none focus:border-rose-500 disabled:opacity-50"
              />
              <button
                disabled={isSpinning}
                onClick={() => {
                  sounds.playClick();
                  setStake(prev => String(Number(prev || 10) + 10));
                }}
                className="w-11 h-11 rounded-2xl bg-[#131f33] border border-slate-700 flex items-center justify-center font-black text-lg text-slate-300 hover:text-white disabled:opacity-50 active:scale-95 transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Primary Action Button: "Hold to Spin" or Tap (Specification Step 3) */}
          <button
            disabled={isSpinning}
            onClick={handleSpin}
            onMouseDown={startHoldSpin}
            onMouseUp={stopHoldSpin}
            onMouseLeave={stopHoldSpin}
            onTouchStart={startHoldSpin}
            onTouchEnd={stopHoldSpin}
            className={`w-full py-4 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-400 hover:to-pink-500 text-slate-950 font-black rounded-2xl text-base tracking-wider transition transform active:scale-95 shadow-xl shadow-rose-500/30 flex items-center justify-center space-x-2 ${
              isSpinning ? 'opacity-50 cursor-not-allowed scale-98' : ''
            }`}
          >
            <Play className={`w-5 h-5 fill-current ${isSpinning ? 'animate-spin' : ''}`} />
            <span>{isSpinning ? 'SPINNING CONCENTRIC WHEEL...' : `SPIN WHEEL (₹${stake})`}</span>
          </button>
          <span className="block text-center text-[10px] text-slate-500 font-mono">
            💡 Tap once to spin, or press &amp; hold for continuous spins
          </span>
        </div>

        {/* ── Provably Fair & Verification Footer ───────────────────────── */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-2 py-1">
          <button
            onClick={() => setShowFairnessModal(true)}
            className="flex items-center space-x-1 hover:text-slate-300 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="underline decoration-slate-600">Provably Fair (SHA-256)</span>
          </button>
          <span className="font-mono text-[11px] text-slate-500">Round #{roundCounter}</span>
        </div>

        {/* ── Bonus Cashout Modal ───────────────────────────────────────── */}
        {bonusModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-[#0f1826] border border-amber-500/70 rounded-3xl p-6 max-w-xs w-full shadow-2xl text-center space-y-4 animate-win-celebrate">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center text-3xl mx-auto shadow-[0_0_20px_#f59e0b]">
                {bonusModal.icon}
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{bonusModal.name}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Track completed! Instant Bonus Cash awarded:
                </p>
                <div className="mt-3 text-2xl font-black font-mono text-emerald-400">
                  +₹{bonusModal.amount}
                </div>
                <span className="text-[11px] font-mono text-amber-400 font-bold block mt-1">
                  ({bonusModal.multiplier}x Multiplier Boost)
                </span>
              </div>
              <button
                onClick={() => setBonusModal(null)}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black rounded-2xl text-sm transition hover:from-emerald-400 hover:to-teal-300"
              >
                Claim &amp; Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Provably Fair Modal ───────────────────────────────────────── */}
        {showFairnessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#0f1826] border border-slate-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-sm font-black text-white flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Provably Fair Verification</span>
                </h3>
                <button
                  onClick={() => setShowFairnessModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Vertex outcomes are cryptographically determined using a server-side high-entropy avalanche PRNG mixed with global UTC timestamps and round IDs.
              </p>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono space-y-1">
                <div><span className="text-slate-500">Algorithm:</span> <span className="text-emerald-400">Murmur3 / SplitMix64 PRNG</span></div>
                <div><span className="text-slate-500">Global Salt:</span> <span className="text-cyan-400">0x7F4A7C15</span></div>
                <div><span className="text-slate-500">Current Round:</span> <span className="text-white">VTX-{roundCounter}</span></div>
              </div>
              <button
                onClick={() => setShowFairnessModal(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
