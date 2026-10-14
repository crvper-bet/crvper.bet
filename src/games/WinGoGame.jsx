import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, History, AlertCircle, ChevronUp, Check, X, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';

const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const PRESET_AMOUNTS = [10, 50, 100, 500, 1000];

export default function WinGoGame({ onBack }) {
  const { user, modifyBalance } = useAuth();

  // 60-Second Epoch Timer
  const [timeLeft, setTimeLeft] = useState(60);
  const [roundId, setRoundId] = useState(() => 'CRV-' + Math.floor(2026100000 + Math.random() * 90000));
  const [isLocked, setIsLocked] = useState(false);

  // Active bets for current round: array of { type, value, amount, multiplier }
  const [currentBets, setCurrentBets] = useState([]);
  
  // Bottom sheet modal state
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [selectedBetType, setSelectedBetType] = useState(null); // 'number'|'color'|'size'
  const [selectedBetValue, setSelectedBetValue] = useState(null); // e.g. 7, 'GREEN', 'BIG'
  const [selectedMultiplier, setSelectedMultiplier] = useState(1);
  const [wagerBase, setWagerBase] = useState(10);

  // Past outcomes history
  const [history, setHistory] = useState([
    { round: '#1008', num: 7, color: 'GREEN', size: 'BIG' },
    { round: '#1007', num: 2, color: 'RED', size: 'SMALL' },
    { round: '#1006', num: 0, color: 'RED', size: 'SMALL', isViolet: true },
    { round: '#1005', num: 9, color: 'GREEN', size: 'BIG' },
    { round: '#1004', num: 4, color: 'RED', size: 'SMALL' },
    { round: '#1003', num: 5, color: 'GREEN', size: 'BIG', isViolet: true },
    { round: '#1002', num: 8, color: 'RED', size: 'BIG' },
    { round: '#1001', num: 1, color: 'GREEN', size: 'SMALL' },
  ]);

  const [winningAnnouncement, setWinningAnnouncement] = useState(null);

  // Continuous 60s Timer Loop
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Resolve Round
          resolveRound();
          return 60;
        }
        if (prev <= 11) {
          setIsLocked(true);
        } else {
          setIsLocked(false);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentBets, roundId]);

  const resolveRound = () => {
    // Pick winning integer between 0 and 9
    const winningNum = Math.floor(Math.random() * 10);
    const winningColor = winningNum % 2 === 0 ? 'RED' : 'GREEN';
    const isViolet = winningNum === 0 || winningNum === 5;
    const winningSize = winningNum >= 5 ? 'BIG' : 'SMALL';

    const newOutcome = {
      round: roundId,
      num: winningNum,
      color: winningColor,
      size: winningSize,
      isViolet
    };

    setHistory((prev) => [newOutcome, ...prev.slice(0, 14)]);

    // Evaluate current user bets
    let totalWin = 0;
    currentBets.forEach((bet) => {
      if (bet.type === 'number' && bet.value === winningNum) {
        totalWin += bet.amount * 10; // 10X for exact number
      } else if (bet.type === 'color' && bet.value === winningColor) {
        totalWin += bet.amount * 2; // 2X for color
      } else if (bet.type === 'color' && bet.value === 'VIOLET' && isViolet) {
        totalWin += bet.amount * 4.5; // 4.5X for violet
      } else if (bet.type === 'size' && bet.value === winningSize) {
        totalWin += bet.amount * 2; // 2X for Big / Small
      }
    });

    if (totalWin > 0) {
      sounds.playWin();
      modifyBalance(totalWin, `Win Go Round Won (${winningNum} ${winningColor})`);
      setWinningAnnouncement(`🎉 YOU WON ₹${totalWin}! (Result: ${winningNum} ${winningColor} ${winningSize})`);
    } else if (currentBets.length > 0) {
      setWinningAnnouncement(`Round Result: ${winningNum} ${winningColor} ${winningSize}`);
    }

    setTimeout(() => setWinningAnnouncement(null), 5000);

    // Reset for next round
    setCurrentBets([]);
    setRoundId('CRV-' + Math.floor(2026100000 + Math.random() * 90000));
    setIsLocked(false);
  };

  const handleOpenBetSheet = (type, value) => {
    if (isLocked) {
      alert('Betting is locked for the final 10 seconds of this round!');
      return;
    }
    sounds.playClick();
    setSelectedBetType(type);
    setSelectedBetValue(value);
    setSelectedMultiplier(1);
    setWagerBase(10);
    setBetModalOpen(true);
  };

  const totalBetAmount = wagerBase * selectedMultiplier;

  const handleConfirmBet = () => {
    if (!user || user.walletBalance < totalBetAmount) {
      alert('Insufficient wallet balance!');
      return;
    }
    if (isLocked) {
      alert('Betting has been locked for this round.');
      return;
    }

    sounds.playClick();
    // Real-time wallet deduction
    modifyBalance(-totalBetAmount, `Win Go Bet on ${selectedBetValue}`);

    setCurrentBets((prev) => [
      ...prev,
      {
        type: selectedBetType,
        value: selectedBetValue,
        amount: totalBetAmount
      }
    ]);

    setBetModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#070b14] p-4 pb-28 selection:bg-purple-500 selection:text-white">
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
                <span>WIN GO</span>
                <span className="text-[10px] bg-purple-950 text-purple-400 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                  60s Fast Turn
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-mono">{roundId}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-bold">Wallet</span>
            <span className="text-sm font-black font-mono text-cyan-400">
              ₹{user ? Number(user.walletBalance).toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        {/* 60s Countdown Clock Header */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 shadow-xl text-center relative overflow-hidden">
          <div className="flex items-center justify-between px-2">
            <div className="text-left">
              <span className="text-xs font-bold text-slate-400 block">Period Round</span>
              <span className="text-sm font-black text-cyan-400 font-mono">{roundId}</span>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-slate-400 block">Betting Status</span>
              <span className={`text-xs font-black uppercase font-mono ${isLocked ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                {isLocked ? '🔒 LOCKED (Last 10s)' : '🟢 OPEN'}
              </span>
            </div>
          </div>

          {/* Large Countdown Pulsing Timer */}
          <div className="my-3 flex items-center justify-center">
            <div className={`text-5xl sm:text-6xl font-black font-mono tracking-tight transition-all duration-300 ${
              isLocked ? 'text-rose-500 scale-105 animate-pulse' : 'text-white'
            }`}>
              00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
            </div>
          </div>

          {winningAnnouncement && (
            <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-500/50 text-xs font-bold text-purple-300 animate-bounce">
              {winningAnnouncement}
            </div>
          )}
        </div>

        {/* SIMPLIFIED BETTING INTERFACE */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          
          {/* 1. NUMBERS IN UP (0 - 9) with 10X Payout */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Number
              </span>
              <span className="text-[11px] font-black font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-500/30">
                10X Payout
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {NUMBERS.map((n) => {
                const isEven = n % 2 === 0;
                const isPurple = n === 0 || n === 5;
                return (
                  <button
                    key={n}
                    disabled={isLocked}
                    onClick={() => handleOpenBetSheet('number', n)}
                    className={`py-3 rounded-2xl font-black font-mono text-lg transition transform active:scale-90 border shadow-md disabled:opacity-40 ${
                      isPurple
                        ? 'bg-gradient-to-tr from-purple-700 to-indigo-600 border-purple-400/50 text-white'
                        : isEven
                        ? 'bg-gradient-to-tr from-rose-700 to-red-600 border-rose-400/50 text-white'
                        : 'bg-gradient-to-tr from-emerald-700 to-teal-600 border-emerald-400/50 text-white'
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. COLORS IN MIDDLE (GREEN on left/middle, RED on right, VIOLET) */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Color
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-bold">
                2X / 4.5X
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                disabled={isLocked}
                onClick={() => handleOpenBetSheet('color', 'GREEN')}
                className="py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm border border-emerald-400/40 shadow-lg shadow-emerald-600/20 disabled:opacity-40"
              >
                GREEN 2X
              </button>

              <button
                disabled={isLocked}
                onClick={() => handleOpenBetSheet('color', 'VIOLET')}
                className="py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm border border-purple-400/40 shadow-lg shadow-purple-600/20 disabled:opacity-40"
              >
                VIOLET 4.5X
              </button>

              <button
                disabled={isLocked}
                onClick={() => handleOpenBetSheet('color', 'RED')}
                className="py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-sm border border-rose-400/40 shadow-lg shadow-rose-600/20 disabled:opacity-40"
              >
                RED 2X
              </button>
            </div>
          </div>

          {/* 3. BIG AND SMALL IN BELOW */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Size
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-bold">
                2X Payout
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={isLocked}
                onClick={() => handleOpenBetSheet('size', 'BIG')}
                className="py-3.5 rounded-2xl bg-[#162032] hover:bg-[#1c2a44] border border-cyan-500/40 text-cyan-300 font-black text-sm shadow-md disabled:opacity-40 flex flex-col items-center"
              >
                <span>BIG (5-9)</span>
                <span className="text-[10px] text-cyan-400/70 font-mono font-bold mt-0.5">2.0X Payout</span>
              </button>

              <button
                disabled={isLocked}
                onClick={() => handleOpenBetSheet('size', 'SMALL')}
                className="py-3.5 rounded-2xl bg-[#162032] hover:bg-[#1c2a44] border border-amber-500/40 text-amber-300 font-black text-sm shadow-md disabled:opacity-40 flex flex-col items-center"
              >
                <span>SMALL (0-4)</span>
                <span className="text-[10px] text-amber-400/70 font-mono font-bold mt-0.5">2.0X Payout</span>
              </button>
            </div>
          </div>

        </div>

        {/* CURRENT ROUND ACTIVE BETS */}
        {currentBets.length > 0 && (
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Your Locked Bets for this Round:
            </span>
            <div className="flex flex-wrap gap-2">
              {currentBets.map((b, idx) => (
                <span key={idx} className="px-3 py-1 bg-[#131b2e] border border-cyan-500/40 rounded-xl text-xs font-mono font-bold text-cyan-300">
                  {b.value}: ₹{b.amount}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 4. PAST OUTCOMES IN BELOW */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-4 shadow-xl">
          <div className="flex items-center space-x-2 mb-3">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">
              Past Outcomes & Trends
            </h3>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {history.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-xl bg-[#131b2e] text-xs"
              >
                <span className="font-mono text-slate-400 font-bold">{h.round}</span>
                <div className="flex items-center space-x-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black font-mono text-white text-xs ${
                    h.color === 'RED' ? 'bg-rose-600' : 'bg-emerald-600'
                  }`}>
                    {h.num}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                    h.size === 'BIG' ? 'bg-cyan-950 text-cyan-400' : 'bg-amber-950 text-amber-400'
                  }`}>
                    {h.size}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM SHEET BETTING PAD (Slides up smoothly from bottom) */}
      {betModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center animate-fade-in">
          <div className="w-full max-w-md bg-[#0f172a] border-t-2 border-cyan-500 rounded-t-3xl p-5 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Selected Prediction:</span>
                <div className="text-xl font-black text-cyan-400 font-mono mt-0.5">
                  {selectedBetValue} ({selectedBetType === 'number' ? '10X Payout' : '2X Payout'})
                </div>
              </div>
              <button
                onClick={() => setBetModalOpen(false)}
                className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Amount Selection */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1.5">
                Base Chip (₹)
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => {
                      sounds.playClick();
                      setWagerBase(amt);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold font-mono transition ${
                      wagerBase === amt
                        ? 'bg-cyan-500 text-black font-black'
                        : 'bg-[#131b2e] text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Multiplier Quantity (x1, x5, x10, x20) */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1.5">
                Multiplier Quantity
              </span>
              <div className="grid grid-cols-4 gap-2">
                {[1, 5, 10, 20].map((mult) => (
                  <button
                    key={mult}
                    onClick={() => {
                      sounds.playClick();
                      setSelectedMultiplier(mult);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold font-mono transition ${
                      selectedMultiplier === mult
                        ? 'bg-purple-600 text-white font-black'
                        : 'bg-[#131b2e] text-slate-400'
                    }`}
                  >
                    ×{mult}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Summary & Confirm Button */}
            <div className="pt-2">
              <div className="flex justify-between items-center mb-3 text-sm">
                <span className="text-slate-400 font-bold">Total Bet Wager:</span>
                <span className="text-xl font-black font-mono text-emerald-400">
                  ₹{totalBetAmount}
                </span>
              </div>

              <button
                onClick={handleConfirmBet}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 font-black rounded-2xl text-base shadow-lg shadow-cyan-500/25 transition transform active:scale-95"
              >
                Confirm & Place Bet (₹{totalBetAmount})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
