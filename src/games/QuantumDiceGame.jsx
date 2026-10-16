import React, { useState, useEffect } from 'react';
import { ArrowLeft, Dices, RotateCcw, TrendingUp, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';

export default function QuantumDiceGame({ onBack }) {
  const { user, modifyBalance } = useAuth();

  const [target, setTarget] = useState(50.0);
  const [rollType, setRollType] = useState('over'); // 'over' | 'under'
  const [betAmount, setBetAmount] = useState('50');
  const [rolling, setRolling] = useState(false);
  const [displayNumber, setDisplayNumber] = useState('50.00');
  const [lastOutcome, setLastOutcome] = useState(null); // { number, won, payout }
  const [history, setHistory] = useState([
    { num: 68.20, won: true },
    { num: 24.15, won: false },
    { num: 88.42, won: true },
    { num: 12.05, won: false },
    { num: 55.30, won: true }
  ]);

  // Math Calculations (with 1.5% house edge)
  const winChance = rollType === 'over' ? 100 - target : target;
  const multiplier = Number((98.5 / Math.max(0.01, winChance)).toFixed(2));
  const potentialProfit = Number((Number(betAmount) * (multiplier - 1)).toFixed(2));

  // Spacebar Hotkey
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !rolling && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        handleRoll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rolling, betAmount, target, rollType, user]);

  const handleRoll = () => {
    const wager = Number(betAmount);
    if (!user || user.walletBalance < wager) {
      alert('Insufficient wallet balance to place this bet!');
      return;
    }
    if (wager < 10) {
      alert('Minimum bet is ₹10.');
      return;
    }

    setRolling(true);
    sounds.playClick();
    // Real-time deduction
    modifyBalance(-wager, 'Quantum Dice Bet');

    // 0.3s Digital number scramble
    let count = 0;
    const interval = setInterval(() => {
      setDisplayNumber((Math.random() * 100).toFixed(2));
      count++;
      if (count > 7) {
        clearInterval(interval);
        finalizeRoll(wager);
      }
    }, 40);
  };

  const finalizeRoll = (wager) => {
    const finalNum = Number((Math.random() * 100).toFixed(2));
    setDisplayNumber(finalNum.toFixed(2));

    const won = rollType === 'over' ? finalNum > target : finalNum < target;

    if (won) {
      const payout = Number((wager * multiplier).toFixed(2));
      sounds.playWin();
      // Real-time credit
      modifyBalance(payout, `Quantum Dice Win (${multiplier}x)`);
      setLastOutcome({ number: finalNum, won: true, payout });
      setHistory((prev) => [{ num: finalNum, won: true }, ...prev.slice(0, 9)]);
    } else {
      sounds.playLoss();
      setLastOutcome({ number: finalNum, won: false, payout: 0 });
      setHistory((prev) => [{ num: finalNum, won: false }, ...prev.slice(0, 9)]);
    }

    setRolling(false);
  };

  const handleHalf = () => setBetAmount((p) => String(Math.max(10, Math.floor(Number(p) / 2))));
  const handleDouble = () => setBetAmount((p) => String(Math.min(user ? user.walletBalance : 10000, Number(p) * 2)));

  return (
    <div className="min-h-screen bg-[#070b14] p-4 pb-24 selection:bg-blue-500 selection:text-white">
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
                <span>QUANTUM DICE</span>
                <span className="text-[10px] bg-blue-950 text-blue-400 border border-blue-500/40 px-2 py-0.5 rounded-full font-bold">
                  100-Point
                </span>
              </h1>
              <p className="text-xs text-slate-400">Zero-latency rapid odds betting</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-bold">Wallet</span>
            <span className="text-sm font-black font-mono text-cyan-400">
              ₹{user ? Number(user.walletBalance).toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        {/* History Strip */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl px-3 py-2 flex items-center space-x-2 overflow-x-auto select-none">
          <div className="flex items-center space-x-2">
            {history.map((h, i) => (
              <span
                key={i}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-black ${
                  h.won
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                }`}
              >
                {h.num.toFixed(2)}
              </span>
            ))}
          </div>
        </div>

        {/* The Massive Digital Target Number Display */}
        <div className={`bg-[#0f172a] border rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden transition-all duration-300 ${
          lastOutcome?.won ? 'border-emerald-500/70 shadow-emerald-500/20' :
          lastOutcome?.won === false ? 'border-rose-500/60 shadow-rose-500/20' : 'border-slate-800'
        }`}>
          {/* Neon background ambient glow */}
          <div className={`absolute inset-0 opacity-15 pointer-events-none transition-all duration-500 ${
            lastOutcome?.won ? 'bg-gradient-to-b from-emerald-500 via-transparent to-emerald-950' :
            lastOutcome?.won === false ? 'bg-gradient-to-b from-rose-600 via-transparent to-red-950' :
            rolling ? 'bg-gradient-to-b from-cyan-500 via-blue-500/10 to-transparent animate-pulse' : 'bg-transparent'
          }`} />

          {/* Cyber scanline sweep when rolling */}
          {rolling && (
            <div className="absolute inset-0 animate-shimmer pointer-events-none opacity-40" />
          )}

          <div className="relative z-10">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
              {rolling ? '🎲 Decrypting Quantum Seed...' : 'Roll Outcome'}
            </span>
            <div className={`text-6xl sm:text-7xl font-black font-mono tracking-tight transition duration-200 ${
              rolling ? 'text-cyan-300 animate-pulse scale-105' :
              lastOutcome?.won ? 'text-emerald-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.8)] animate-win-celebrate' :
              lastOutcome?.won === false ? 'text-rose-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.7)] animate-bomb-shake' : 'text-white'
            }`}>
              {displayNumber}
            </div>

            {/* Win/Loss pill overlay */}
            {lastOutcome && !rolling && (
              <div className="mt-2 flex justify-center">
                {lastOutcome.won ? (
                  <span className="px-3 py-1 rounded-full text-xs font-black font-mono bg-emerald-950/90 border border-emerald-400 text-emerald-300 animate-pop-in shadow-lg shadow-emerald-500/30 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-spin" />
                    <span>WON ₹{lastOutcome.payout} ({multiplier}x)!</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-black font-mono bg-rose-950/90 border border-rose-500 text-rose-300 animate-bomb-shake flex items-center space-x-1">
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>MISSED TARGET</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Interactive Probability Slider */}
          <div className="mt-5 px-2 relative z-10">
            <div className="relative mb-2">
              <input
                type="range"
                min="2.0"
                max="98.0"
                step="1"
                disabled={rolling}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="w-full h-3 bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
            <div className="flex justify-between text-xs font-mono font-bold text-slate-400">
              <span className="text-rose-400">0.00</span>
              <span className="text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 font-black">
                Target: {target.toFixed(2)}
              </span>
              <span className="text-emerald-400">100.00</span>
            </div>
          </div>
        </div>

        {/* Dynamic Odds Calculator Bar */}
        <div className="grid grid-cols-3 gap-2.5 bg-[#0f172a] border border-slate-800 rounded-2xl p-3.5 shadow-xl text-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Multiplier</span>
            <span className="text-lg font-black font-mono text-cyan-400">{multiplier}x</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Win Chance</span>
            <span className="text-lg font-black font-mono text-emerald-400">{winChance.toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Profit on Win</span>
            <span className="text-lg font-black font-mono text-amber-400">₹{potentialProfit}</span>
          </div>
        </div>

        {/* Controls & Roll Action */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          {/* Roll Over / Roll Under Switch */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                sounds.playClick();
                setRollType('over');
              }}
              className={`py-3 rounded-2xl font-black text-xs uppercase transition ${
                rollType === 'over'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-[#131b2e] text-slate-400 hover:bg-slate-800'
              }`}
            >
              Roll Over ({target.toFixed(0)})
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setRollType('under');
              }}
              className={`py-3 rounded-2xl font-black text-xs uppercase transition ${
                rollType === 'under'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-[#131b2e] text-slate-400 hover:bg-slate-800'
              }`}
            >
              Roll Under ({target.toFixed(0)})
            </button>
          </div>

          {/* Bet Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Bet Amount (₹)
              </label>
              <div className="flex space-x-1">
                <button onClick={handleHalf} className="px-2 py-0.5 rounded-lg bg-slate-800 text-[10px] font-bold text-slate-300">½</button>
                <button onClick={handleDouble} className="px-2 py-0.5 rounded-lg bg-slate-800 text-[10px] font-bold text-slate-300">2×</button>
              </div>
            </div>
            <input
              type="number"
              min="10"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="w-full bg-[#131b2e] border border-slate-700 rounded-2xl px-4 py-3 text-base font-black text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Giant Roll Button */}
          <button
            onClick={handleRoll}
            disabled={rolling}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-slate-950 font-black rounded-2xl text-base tracking-wide transition transform active:scale-95 shadow-xl shadow-cyan-500/25 flex items-center justify-center space-x-2"
          >
            <Dices className="w-5 h-5" />
            <span>{rolling ? 'ROLLING...' : `ROLL (SPACEBAR)`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
