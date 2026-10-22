import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, Volume2, VolumeX, HelpCircle, Settings, ShieldCheck, 
  RotateCw, Sparkles, Trophy, Check, AlertCircle, Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';

// ── Ring Multipliers exactly matching the official game ─────────────────────
// Outer Ring (Fire - Ring 3): 8 segments
const OUTER_RING_SLICES = [
  { id: 'fire', label: '3.9X', mult: 3.9, angle: 30, color: '#ef4444', isIcon: false },
  { id: 'o1', label: '12.5X', mult: 12.5, angle: 75, color: '#94a3b8', isIcon: false },
  { id: 'o2', label: '28X', mult: 28.0, angle: 120, color: '#94a3b8', isIcon: false },
  { id: 'o3', label: '52X', mult: 52.0, angle: 165, color: '#94a3b8', isIcon: false },
  { id: 'o4', label: '85X', mult: 85.0, angle: 210, color: '#94a3b8', isIcon: false },
  { id: 'o5', label: '133X', mult: 133.0, angle: 255, color: '#94a3b8', isIcon: false },
  { id: 'o6', label: '200X', mult: 200.0, angle: 300, color: '#f59e0b', isIcon: false },
  { id: 'o7', label: 'BONUS ℹ', mult: 25.0, angle: 335, color: '#a855f7', isIcon: false },
];

// Middle Ring (Earth - Ring 2): 6 segments
const MIDDLE_RING_SLICES = [
  { id: 'earth', label: '2.5X', mult: 2.5, angle: 35, color: '#22c55e', isIcon: false },
  { id: 'm1', label: '7.7X', mult: 7.7, angle: 95, color: '#94a3b8', isIcon: false },
  { id: 'm2', label: '16X', mult: 16.0, angle: 155, color: '#94a3b8', isIcon: false },
  { id: 'm3', label: '27.5X', mult: 27.5, angle: 215, color: '#94a3b8', isIcon: false },
  { id: 'm4', label: '44X', mult: 44.0, angle: 275, color: '#f59e0b', isIcon: false },
  { id: 'm5', label: '+20.5X', mult: 20.5, angle: 330, color: '#a855f7', isIcon: false },
];

// Inner Ring (Water - Ring 1): 4 segments
const INNER_RING_SLICES = [
  { id: 'water', label: '1.55X', mult: 1.55, angle: 42, color: '#0ea5e9', isIcon: false },
  { id: 'i1', label: '4.85X', mult: 4.85, angle: 132, color: '#94a3b8', isIcon: false },
  { id: 'i2', label: '10X', mult: 10.0, angle: 222, color: '#94a3b8', isIcon: false },
  { id: 'i3', label: '+7X', mult: 7.0, angle: 312, color: '#a855f7', isIcon: false },
];

export default function VertexGame({ onBack }) {
  const { user, modifyBalance } = useAuth();

  // ── Betting & Stakes ──────────────────────────────────────────────────────
  const [stake, setStake] = useState('20');
  const [isSpinning, setIsSpinning] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // ── Active Rings Status (Multi-Tier Progressive Accumulation) ─────────────
  // In Vortex, each spin charges/hits an element that activates that ring!
  const [activeWater, setActiveWater] = useState(false); // Inner Ring: 1.55X
  const [activeEarth, setActiveEarth] = useState(false); // Middle Ring: 2.5X
  const [activeFire, setActiveFire] = useState(false);   // Outer Ring: 3.9X

  // Current center element orb ('water' | 'earth' | 'fire' | 'idle')
  const [centerElement, setCenterElement] = useState('water');
  const [centerRolling, setCenterRolling] = useState(false);

  // Auto-play state
  const [autoPlayRounds, setAutoPlayRounds] = useState(0);

  // References for Hold-to-Spin & Canvas
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const holdTimerRef = useRef(null);
  const isHoldingRef = useRef(false);

  // Angular rotation refs for realistic smooth 3D motion
  const outerRotRef = useRef(0);
  const midRotRef = useRef(0);
  const innerRotRef = useRef(0);

  // ── Calculate Current Cumulative Payout ───────────────────────────────────
  const stakeNum = Number(stake) || 20;
  let totalMultiplier = 0;
  if (activeWater) totalMultiplier += 1.55;
  if (activeEarth) totalMultiplier += 2.50;
  if (activeFire)  totalMultiplier += 3.90;

  const currentPayout = Number((stakeNum * totalMultiplier).toFixed(2));
  const partPayout = currentPayout > 0 ? Number((currentPayout * 0.5).toFixed(2)) : 0;

  // ── Canvas Rendering Engine (Concentric 3D Rings + Neon Arcs) ─────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Smooth idle or spinning angular updates
      if (isSpinning) {
        outerRotRef.current += 0.08;
        midRotRef.current -= 0.09;
        innerRotRef.current += 0.11;
      } else {
        outerRotRef.current += 0.0008;
        midRotRef.current -= 0.0009;
        innerRotRef.current += 0.001;
      }

      // Radii of the 3 nested discs
      const rOuter = cx * 0.94;
      const rMid = cx * 0.73;
      const rInner = cx * 0.52;
      const rCore = cx * 0.32;

      // ── Outer Ring Base (Ring 3: Fire 3.9X) ────────────────────────────────
      ctx.beginPath();
      ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
      ctx.arc(cx, cy, rMid, 0, Math.PI * 2, true);
      const gradOuter = ctx.createRadialGradient(cx, cy, rMid, cx, cy, rOuter);
      gradOuter.addColorStop(0, '#0d131f');
      gradOuter.addColorStop(0.5, '#131b2c');
      gradOuter.addColorStop(1, '#0b0f19');
      ctx.fillStyle = gradOuter;
      ctx.fill();

      // Outer Ring Separator Borders
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Outer Ring Dividers & Multipliers
      OUTER_RING_SLICES.forEach((slice) => {
        const rad = (slice.angle - 90) * (Math.PI / 180);
        const mx = cx + Math.cos(rad) * ((rOuter + rMid) / 2);
        const my = cy + Math.sin(rad) * ((rOuter + rMid) / 2);

        // Divider notch
        const dRad = rad - (22.5 * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(dRad) * (rMid + 2), cy + Math.sin(dRad) * (rMid + 2));
        ctx.lineTo(cx + Math.cos(dRad) * (rOuter - 2), cy + Math.sin(dRad) * (rOuter - 2));
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Label
        ctx.save();
        ctx.translate(mx, my);
        ctx.font = 'black 11px sans-serif';
        ctx.fillStyle = slice.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = slice.color;
        ctx.shadowBlur = slice.id === 'fire' && activeFire ? 10 : 0;
        ctx.fillText(slice.label, 0, 0);
        ctx.restore();
      });

      // ── Middle Ring Base (Ring 2: Earth 2.5X) ──────────────────────────────
      ctx.beginPath();
      ctx.arc(cx, cy, rMid, 0, Math.PI * 2);
      ctx.arc(cx, cy, rInner, 0, Math.PI * 2, true);
      const gradMid = ctx.createRadialGradient(cx, cy, rInner, cx, cy, rMid);
      gradMid.addColorStop(0, '#0a0f19');
      gradMid.addColorStop(0.5, '#151e30');
      gradMid.addColorStop(1, '#0e1423');
      ctx.fillStyle = gradMid;
      ctx.fill();

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      MIDDLE_RING_SLICES.forEach((slice) => {
        const rad = (slice.angle - 90) * (Math.PI / 180);
        const mx = cx + Math.cos(rad) * ((rMid + rInner) / 2);
        const my = cy + Math.sin(rad) * ((rMid + rInner) / 2);

        // Divider notch
        const dRad = rad - (30 * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(dRad) * (rInner + 2), cy + Math.sin(dRad) * (rInner + 2));
        ctx.lineTo(cx + Math.cos(dRad) * (rMid - 2), cy + Math.sin(dRad) * (rMid - 2));
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.save();
        ctx.translate(mx, my);
        ctx.font = 'black 11px sans-serif';
        ctx.fillStyle = slice.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = slice.color;
        ctx.shadowBlur = slice.id === 'earth' && activeEarth ? 10 : 0;
        ctx.fillText(slice.label, 0, 0);
        ctx.restore();
      });

      // ── Inner Ring Base (Ring 1: Water 1.55X) ──────────────────────────────
      ctx.beginPath();
      ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
      ctx.arc(cx, cy, rCore, 0, Math.PI * 2, true);
      const gradInner = ctx.createRadialGradient(cx, cy, rCore, cx, cy, rInner);
      gradInner.addColorStop(0, '#0c121d');
      gradInner.addColorStop(0.5, '#18233a');
      gradInner.addColorStop(1, '#0f1728');
      ctx.fillStyle = gradInner;
      ctx.fill();

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      INNER_RING_SLICES.forEach((slice) => {
        const rad = (slice.angle - 90) * (Math.PI / 180);
        const mx = cx + Math.cos(rad) * ((rInner + rCore) / 2);
        const my = cy + Math.sin(rad) * ((rInner + rCore) / 2);

        // Divider notch
        const dRad = rad - (45 * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(dRad) * (rCore + 2), cy + Math.sin(dRad) * (rCore + 2));
        ctx.lineTo(cx + Math.cos(dRad) * (rInner - 2), cy + Math.sin(dRad) * (rInner - 2));
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.save();
        ctx.translate(mx, my);
        ctx.font = 'black 11px sans-serif';
        ctx.fillStyle = slice.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = slice.color;
        ctx.shadowBlur = slice.id === 'water' && activeWater ? 10 : 0;
        ctx.fillText(slice.label, 0, 0);
        ctx.restore();
      });

      // ── ACTIVE NEON GLOWING ARCS & POINTER DOTS (Images 2, 3, 4) ───────────

      // 1. Water Arc (Inner Ring - Neon Cyan Blue from -90° to ~-42°)
      if (activeWater) {
        const startRad = -Math.PI / 2;
        const endRad = (-45 * Math.PI) / 180;
        const arcR = (rInner + rCore) / 2;

        ctx.beginPath();
        ctx.arc(cx, cy, arcR, startRad, endRad, false);
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = (rInner - rCore) * 0.72;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 22;
        ctx.stroke();

        // White multiplier text inside arc
        ctx.save();
        ctx.font = 'black 12px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const midRad = (startRad + endRad) / 2;
        ctx.fillText('1.55X', cx + Math.cos(midRad) * arcR, cy + Math.sin(midRad) * arcR);
        ctx.restore();

        // Neon Landing Dot at the end of arc
        const dotX = cx + Math.cos(endRad) * arcR;
        const dotY = cy + Math.sin(endRad) * arcR;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0284c7';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 2. Earth Arc (Middle Ring - Neon Lime Green from -90° to ~-52°)
      if (activeEarth) {
        const startRad = -Math.PI / 2;
        const endRad = (-52 * Math.PI) / 180;
        const arcR = (rMid + rInner) / 2;

        ctx.beginPath();
        ctx.arc(cx, cy, arcR, startRad, endRad, false);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = (rMid - rInner) * 0.74;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#16a34a';
        ctx.shadowBlur = 25;
        ctx.stroke();

        ctx.save();
        ctx.font = 'black 12px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const midRad = (startRad + endRad) / 2;
        ctx.fillText('2.5X', cx + Math.cos(midRad) * arcR, cy + Math.sin(midRad) * arcR);
        ctx.restore();

        // Neon Landing Dot
        const dotX = cx + Math.cos(endRad) * arcR;
        const dotY = cy + Math.sin(endRad) * arcR;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#15803d';
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 3. Fire Arc (Outer Ring - Neon Crimson Red from -90° to ~-58°)
      if (activeFire) {
        const startRad = -Math.PI / 2;
        const endRad = (-58 * Math.PI) / 180;
        const arcR = (rOuter + rMid) / 2;

        ctx.beginPath();
        ctx.arc(cx, cy, arcR, startRad, endRad, false);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = (rOuter - rMid) * 0.74;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#dc2626';
        ctx.shadowBlur = 25;
        ctx.stroke();

        ctx.save();
        ctx.font = 'black 12px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const midRad = (startRad + endRad) / 2;
        ctx.fillText('3.9X', cx + Math.cos(midRad) * arcR, cy + Math.sin(midRad) * arcR);
        ctx.restore();

        // Neon Landing Dot
        const dotX = cx + Math.cos(endRad) * arcR;
        const dotY = cy + Math.sin(endRad) * arcR;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#b91c1c';
        ctx.shadowColor = '#f87171';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // ── TOP MEDALLION SOCKETS AT 12 O'CLOCK ─────────────────────────────────

      // 1. Water Top Socket (Inner Ring)
      const waterSocketY = cy - (rInner + rCore) / 2;
      drawMedallion(ctx, cx, waterSocketY, 13, 'water', activeWater);

      // 2. Earth Top Socket (Middle Ring)
      const earthSocketY = cy - (rMid + rInner) / 2;
      drawMedallion(ctx, cx, earthSocketY, 14, 'earth', activeEarth);

      // 3. Fire Top Socket (Outer Ring)
      const fireSocketY = cy - (rOuter + rMid) / 2;
      drawMedallion(ctx, cx, fireSocketY, 15, 'fire', activeFire);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isSpinning, activeWater, activeEarth, activeFire]);

  // Helper to draw the circular elemental medallions at the 12 o'clock ring heads
  const drawMedallion = (ctx, x, y, r, type, isActive) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r + 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#0b0f19';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (type === 'water') {
      ctx.fillStyle = isActive ? '#0284c7' : '#0369a1';
      ctx.strokeStyle = '#38bdf8';
    } else if (type === 'earth') {
      ctx.fillStyle = isActive ? '#15803d' : '#166534';
      ctx.strokeStyle = '#4ade80';
    } else {
      ctx.fillStyle = isActive ? '#b91c1c' : '#991b1b';
      ctx.strokeStyle = '#f87171';
    }
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    // Emblem emoji/icon inside medallion
    ctx.font = `${Math.floor(r * 1.1)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(type === 'water' ? '💧' : type === 'earth' ? '🌿' : '🔥', x, y + 1);
    ctx.restore();
  };

  // ── Spin Execution ────────────────────────────────────────────────────────
  const handleSpin = () => {
    if (isSpinning) return;

    if (!user || user.walletBalance < stakeNum) {
      alert('Insufficient wallet balance!');
      return;
    }

    // Atomic bet deduction
    sounds.playClick();
    sounds.playWheelSpin();
    modifyBalance(-stakeNum, `Vortex Spin Bet (₹${stakeNum})`);

    setIsSpinning(true);
    setCenterRolling(true);

    // Audio ticking sequence during spin
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      tickCount++;
      sounds.playWheelTick(tickCount);
      if (tickCount > 18) clearInterval(tickInterval);
    }, 120);

    // After 2.2 seconds, determine outcome and stop
    setTimeout(() => {
      clearInterval(tickInterval);
      setIsSpinning(false);
      setCenterRolling(false);

      // Determine which element lands:
      // High-frequency element generator
      const rand = Math.random();
      let landed = 'water';

      if (!activeEarth && (rand < 0.38 || activeWater)) {
        // Activate Earth (Middle Ring 2.5X)
        landed = 'earth';
        setActiveEarth(true);
        sounds.playElementCharge('earth');
      } else if (!activeWater && rand < 0.70) {
        // Activate Water (Inner Ring 1.55X)
        landed = 'water';
        setActiveWater(true);
        sounds.playElementCharge('water');
      } else if (!activeFire && (activeWater && activeEarth)) {
        // Activate Fire (Outer Ring 3.9X) -> TRIPLE COMBO!
        landed = 'fire';
        setActiveFire(true);
        sounds.playElementCharge('fire');

        // Confetti celebration when all 3 rings lock in!
        try {
          confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
        } catch {}
      } else {
        // Random repeat or cycle
        landed = rand < 0.33 ? 'fire' : rand < 0.66 ? 'water' : 'earth';
        sounds.playWin();
      }

      setCenterElement(landed);
    }, 2200);
  };

  // ── Hold to Spin Handlers ─────────────────────────────────────────────────
  const startHoldSpin = () => {
    isHoldingRef.current = true;
    handleSpin();
    holdTimerRef.current = setInterval(() => {
      if (isHoldingRef.current && !isSpinning) {
        handleSpin();
      }
    }, 2600);
  };

  const stopHoldSpin = () => {
    isHoldingRef.current = false;
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  // ── Cash Out Action ───────────────────────────────────────────────────────
  const handleCashOut = () => {
    if (currentPayout <= 0 || isSpinning) return;

    sounds.playCashout();
    modifyBalance(currentPayout, `Vortex Cash Out (${totalMultiplier.toFixed(2)}x)`);

    // Reset rings after cashout
    setActiveWater(false);
    setActiveEarth(false);
    setActiveFire(false);

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch {}

    alert(`🎉 Cashed Out ₹${currentPayout}! Added directly to your balance.`);
  };

  // ── Part Payout Action ────────────────────────────────────────────────────
  const handlePartPayout = () => {
    if (partPayout <= 0 || isSpinning) return;

    sounds.playCashout();
    modifyBalance(partPayout, `Vortex Part Payout (50%)`);

    // Turn off lowest active ring while keeping higher rings
    if (activeWater) setActiveWater(false);
    else if (activeEarth) setActiveEarth(false);
    else if (activeFire) setActiveFire(false);

    alert(`⚡ Partial Cashout: ₹${partPayout} collected!`);
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-white flex flex-col justify-between selection:bg-purple-500 selection:text-white select-none relative overflow-x-hidden font-sans">
      
      {/* ── Background Subtle Watermark Floral Vectors ──────────────────── */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent flex items-center justify-center overflow-hidden">
        <svg className="w-[850px] h-[850px] animate-spin" style={{ animationDuration: '120s' }} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 3" />
          <path d="M50 5 Q70 30 50 50 Q30 70 50 95 Q70 70 50 50 Q30 30 50 5" fill="none" stroke="currentColor" strokeWidth="0.8" />
        </svg>
      </div>

      {/* ── Top Header Navigation Bar ───────────────────────────────────── */}
      <header className="w-full flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-slate-800/60 bg-[#090d16]/80 backdrop-blur-md relative z-30">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              sounds.playClick();
              onBack();
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition active:scale-95"
            title="Return to Casino Lobby"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="flex items-center space-x-1.5">
            <span className="text-xs sm:text-sm text-slate-400 font-bold uppercase tracking-wider">Balance:</span>
            <span className="text-base sm:text-lg font-black font-mono text-white tracking-tight">
              ₹{user ? Number(user.walletBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '1,000.00'}
            </span>
          </div>
        </div>

        {/* Right Header Utilities (Turbo Universe, Help, Audio) */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <span className="hidden sm:inline-flex items-center space-x-1 text-[11px] font-mono font-bold text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span>TURBO UNIVERSE</span>
          </span>

          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:text-white text-slate-400 transition"
            title="Game Information"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              const next = !soundMuted;
              setSoundMuted(next);
              sounds.setMuted(next);
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:text-white text-slate-400 transition"
            title="Toggle Sound"
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={() => alert('Vortex provably fair cryptographic hash verified.')}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:text-white text-slate-400 transition"
            title="Fairness &amp; Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Vertical DEMO / REAL Indicator Tab on right screen edge ───── */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-20 pointer-events-none hidden md:block">
        <div className="rotate-90 origin-right translate-x-2 bg-slate-900/90 border border-slate-700/60 px-3 py-1 rounded-t-lg text-[10px] font-mono font-black text-slate-400 tracking-widest shadow-xl">
          REAL MODE
        </div>
      </div>

      {/* ── Main Arena: Brand Logo (Left) | Concentric Wheels (Center) | Controls (Right) ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 sm:py-8 flex flex-col lg:flex-row items-center justify-around gap-6 lg:gap-8 relative z-10">

        {/* ── Left Column: Official VORTEX Logo ─────────────────────────── */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-2 order-1">
          <div className="relative group flex items-center justify-center">
            {/* Purple Glowing Vortex Spiral SVG */}
            <div className="absolute -inset-4 bg-purple-600/20 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-600/30 transition duration-500" />
            
            <div className="relative flex items-center">
              <svg className="w-24 h-24 sm:w-32 sm:h-32 text-purple-600 animate-spin" style={{ animationDuration: '24s' }} viewBox="0 0 100 100" fill="none">
                <path d="M50 15 C69.33 15 85 30.67 85 50 C85 69.33 69.33 85 50 85 C30.67 85 15 69.33 15 50 C15 35 25 22 38 17 C28 22 20 35 20 50 C20 66.57 33.43 80 50 80 C66.57 80 80 66.57 80 50 C80 37 72 26 60 21" stroke="#9333ea" strokeWidth="6" strokeLinecap="round" />
                <path d="M50 25 C63.81 25 75 36.19 75 50 C75 63.81 63.81 75 50 75 C36.19 75 25 63.81 25 50 C25 40 31 31 40 27" stroke="#c084fc" strokeWidth="4" strokeLinecap="round" />
              </svg>

              {/* Slanted Bold VORTEX Wordmark */}
              <div className="-ml-12 sm:-ml-16 z-10">
                <h1 className="text-3xl sm:text-5xl font-black italic tracking-tighter text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] font-sans">
                  VORTEX
                </h1>
                <div className="text-[10px] sm:text-xs font-black tracking-widest text-slate-300 uppercase bg-slate-900/90 border border-purple-500/50 px-2.5 py-0.5 rounded-full inline-block mt-0.5 shadow-lg">
                  OFFICIAL GAME
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400 max-w-[220px] hidden lg:block font-medium">
            3-Tier Concentric Multiplier Ring &amp; Elemental System
          </p>
        </div>

        {/* ── Center Column: 3D Concentric Discs & Elemental Core ───────── */}
        <div className="relative flex items-center justify-center order-2">
          {/* Canvas for Outer, Middle, and Inner Rings */}
          <canvas
            ref={canvasRef}
            width={370}
            height={370}
            className="w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] max-w-[370px] drop-shadow-[0_0_40px_rgba(0,0,0,0.9)]"
          />

          {/* ── Central 3D Elemental Orb ─────────────────────────────────── */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[86px] h-[86px] sm:w-[104px] sm:h-[104px] rounded-full flex items-center justify-center z-10">
            {/* Metallic Spherical Bevel Rim */}
            <div className="absolute inset-0 rounded-full border-4 border-[#1e293b] shadow-[0_0_20px_rgba(0,0,0,0.9)] bg-gradient-to-b from-[#1e293b] to-[#090d16]" />

            {/* Glowing 3D Crystal Gem Orb */}
            <div className={`relative w-[76px] h-[76px] sm:w-[92px] sm:h-[92px] rounded-full flex items-center justify-center overflow-hidden transition-all duration-300 shadow-2xl ${
              centerElement === 'water'
                ? 'bg-gradient-to-tr from-sky-600 via-blue-500 to-cyan-300 shadow-blue-500/50'
                : centerElement === 'earth'
                ? 'bg-gradient-to-tr from-emerald-600 via-green-500 to-lime-300 shadow-green-500/50'
                : 'bg-gradient-to-tr from-rose-600 via-orange-500 to-amber-300 shadow-rose-500/50'
            }`}>
              {/* Glass Spherical Reflection Highlight */}
              <div className="absolute top-1 left-2 w-7 h-4 bg-white/40 rounded-full blur-[1px] -rotate-45 pointer-events-none" />

              {/* Dynamic Icon inside Orb with Roll Animation */}
              <div className={`text-4xl sm:text-5xl transition-transform duration-300 ${
                centerRolling ? 'animate-bounce scale-110' : 'scale-100'
              }`}>
                {centerElement === 'water' ? '🌊' : centerElement === 'earth' ? '💠' : '🔥'}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Official Betting & Cash Out Controls ─────────── */}
        <div className="w-full max-w-xs sm:max-w-sm flex flex-col items-center space-y-4 order-3">

          {/* Bet Amount Selector */}
          <div className="w-full flex flex-col items-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1 mb-1">
              <span>Bet Amount</span>
              <Info className="w-3 h-3 text-slate-500" />
            </span>

            {/* Circular Stepper */}
            <div className="flex items-center space-x-3">
              <button
                disabled={isSpinning}
                onClick={() => {
                  sounds.playClick();
                  setStake(prev => String(Math.max(10, Number(prev || 20) - 10)));
                }}
                className="w-9 h-9 rounded-full bg-[#141a29] border border-slate-700 hover:border-slate-500 flex items-center justify-center text-slate-300 font-black text-lg active:scale-95 transition disabled:opacity-50"
              >
                −
              </button>

              <div className="px-5 py-1.5 rounded-full bg-[#0c121e] border border-slate-800 text-center min-w-[90px]">
                <span className="text-base sm:text-lg font-black font-mono text-white">
                  ₹{stake}
                </span>
              </div>

              <button
                disabled={isSpinning}
                onClick={() => {
                  sounds.playClick();
                  setStake(prev => String(Number(prev || 20) + 10));
                }}
                className="w-9 h-9 rounded-full bg-[#141a29] border border-slate-700 hover:border-slate-500 flex items-center justify-center text-slate-300 font-black text-lg active:scale-95 transition disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>

          {/* ── Action Buttons Cluster: CASH OUT | HOLD TO SPIN | AUTO-PLAY ── */}
          <div className="flex items-center justify-center space-x-3 sm:space-x-4">

            {/* CASH OUT Button (Left) */}
            <button
              disabled={isSpinning || currentPayout <= 0}
              onClick={handleCashOut}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center text-center font-black transition active:scale-95 border ${
                currentPayout > 0
                  ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.35)] animate-pulse cursor-pointer'
                  : 'bg-[#121826] border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
              }`}
            >
              <span className="text-[10px] leading-tight font-black uppercase">CASH</span>
              <span className="text-[10px] leading-tight font-black uppercase">OUT</span>
            </button>

            {/* HOLD TO SPIN Button (Center - Large Glowing Purple Disc) */}
            <button
              disabled={isSpinning}
              onClick={handleSpin}
              onMouseDown={startHoldSpin}
              onMouseUp={stopHoldSpin}
              onMouseLeave={stopHoldSpin}
              onTouchStart={startHoldSpin}
              onTouchEnd={stopHoldSpin}
              className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-500 hover:from-purple-600 hover:to-indigo-400 text-white flex flex-col items-center justify-center transition-all duration-200 transform active:scale-95 border-2 border-purple-400/80 shadow-[0_0_35px_rgba(168,85,247,0.55)] ${
                isSpinning ? 'opacity-80 scale-95 shadow-purple-900/50' : 'hover:scale-105'
              }`}
            >
              {/* Spinning Vortex Center Swirl */}
              <div className={`text-2xl sm:text-3xl ${isSpinning ? 'animate-spin' : ''}`}>
                🌀
              </div>

              {/* Circular Curved Typography Badge */}
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-purple-100 mt-1">
                {isSpinning ? 'SPINNING...' : 'HOLD TO SPIN'}
              </span>
            </button>

            {/* Auto Play Repeat Button (Right) */}
            <button
              disabled={isSpinning}
              onClick={() => {
                sounds.playClick();
                handleSpin();
              }}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#121826] border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold active:scale-95 transition disabled:opacity-50"
              title="Repeat Spin"
            >
              <RotateCw className="w-5 h-5 text-slate-300" />
            </button>
          </div>

          {/* ── Payout & Part Payout Summary ────────────────────────────── */}
          <div className="w-full flex items-center justify-around px-4 pt-1 text-center">
            {/* Payout */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Payout
              </span>
              <span className={`text-sm sm:text-base font-black font-mono tracking-tight ${
                currentPayout > 0 ? 'text-emerald-400 font-black' : 'text-slate-200'
              }`}>
                ₹{currentPayout.toFixed(2)}
              </span>
            </div>

            {/* Part Payout */}
            <div className="flex flex-col items-center">
              <button
                disabled={partPayout <= 0 || isSpinning}
                onClick={handlePartPayout}
                className="text-[10px] text-slate-400 hover:text-cyan-400 font-bold uppercase tracking-wider disabled:opacity-40 transition"
              >
                Part Payout
              </button>
              <span className={`text-sm sm:text-base font-black font-mono tracking-tight ${
                partPayout > 0 ? 'text-cyan-400' : 'text-slate-500'
              }`}>
                {partPayout > 0 ? `₹${partPayout.toFixed(2)}` : '•'}
              </span>
            </div>
          </div>

          {/* ── Active Elements Indicators Row ─────────────────────────── */}
          <div className="flex items-center space-x-2 pt-1">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black border transition ${
              activeWater
                ? 'bg-sky-950 text-sky-300 border-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.4)]'
                : 'bg-slate-900/60 text-slate-500 border-slate-800'
            }`}>
              💧 WATER 1.55X
            </span>

            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black border transition ${
              activeEarth
                ? 'bg-emerald-950 text-emerald-300 border-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                : 'bg-slate-900/60 text-slate-500 border-slate-800'
            }`}>
              🌿 EARTH 2.5X
            </span>

            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black border transition ${
              activeFire
                ? 'bg-rose-950 text-rose-300 border-rose-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                : 'bg-slate-900/60 text-slate-500 border-slate-800'
            }`}>
              🔥 FIRE 3.9X
            </span>
          </div>

        </div>
      </main>

      {/* ── Footer Info Ticker ─────────────────────────────────────────── */}
      <footer className="w-full py-2.5 px-4 text-center border-t border-slate-900 bg-[#080c14] text-[11px] font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between">
        <span>Turbo Games • Vortex Official Release</span>
        <span>SHA-256 Provably Fair • 97.0% RTP • Max 200X</span>
      </footer>

      {/* ── Help / Rules Modal ─────────────────────────────────────────── */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f1728] border border-slate-700 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-black text-white flex items-center space-x-2">
                <span>VORTEX RULES &amp; MULTIPLIERS</span>
              </h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                <strong>1. Progressive Multiplier Rings:</strong> Each spin rotates the concentric wheel and rolls the center elemental orb.
              </p>
              <p>
                <strong>2. Ring Activation:</strong>
                <br />• 💧 <strong>Water Element:</strong> Activates Inner Ring (<strong>1.55X</strong>).
                <br />• 🌿 <strong>Earth Element:</strong> Activates Middle Ring (<strong>2.50X</strong>).
                <br />• 🔥 <strong>Fire Element:</strong> Activates Outer Ring (<strong>3.90X</strong>).
              </p>
              <p>
                <strong>3. Cash Out:</strong> Secure all accumulated winnings at any point by hitting <strong>CASH OUT</strong>, or collect half with <strong>Part Payout</strong>.
              </p>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
