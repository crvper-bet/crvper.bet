import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Clock, History, AlertCircle, ChevronUp, Check, X, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { sounds } from '../services/audio';
import { getLiveWinGoState, getWinGoHistory, getWinGoOutcomeForRound } from '../services/globalGameEngine';

const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const PRESET_AMOUNTS = [10, 50, 100, 500, 1000];

export default function WinGoGame({ onBack, onOpenMaxLimitModal }) {
  const { user, modifyBalance } = useAuth();

  // Global Synchronized State
  const initial = getLiveWinGoState();
  const [timeLeft, setTimeLeft] = useState(initial.secondsLeft);
  const [roundId, setRoundId] = useState(initial.roundId);
  const [roundNumber, setRoundNumber] = useState(initial.roundNumber);
  const [isLocked, setIsLocked] = useState(initial.isLocked);

  // Active bets for current round: array of { type, value, amount, multiplier }
  const [currentBets, setCurrentBets] = useState([]);
  
  // Bottom sheet modal state
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [selectedBetType, setSelectedBetType] = useState(null); // 'number'|'color'|'size'
  const [selectedBetValue, setSelectedBetValue] = useState(null); // e.g. 7, 'GREEN', 'BIG'
  const [selectedMultiplier, setSelectedMultiplier] = useState(1);
  const [wagerBase, setWagerBase] = useState(10);

  // Past outcomes history — globally synchronized from UTC epoch
  const [history, setHistory] = useState(() => getWinGoHistory(14));

  const [winningAnnouncement, setWinningAnnouncement] = useState(null);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Persistent refs so betting does not teardown or restart the clock sync loop
  const currentBetsRef = useRef(currentBets);
  currentBetsRef.current = currentBets;
  const lastCheckedRoundRef = useRef(initial.roundNumber);

  // High-Precision Real-Time Worldwide Clock Sync Loop
  useEffect(() => {
    const syncInterval = setInterval(() => {
      const live = getLiveWinGoState();
      setTimeLeft(live.secondsLeft);
      setIsLocked(live.isLocked);
      setRoundId(live.roundId);
      setRoundNumber(live.roundNumber);

      if (live.roundNumber !== lastCheckedRoundRef.current) {
        // Round Transitioned! Evaluate previous round result
        const completedRound = lastCheckedRoundRef.current;
        lastCheckedRoundRef.current = live.roundNumber;

        const result = getWinGoOutcomeForRound(completedRound);
        setHistory(getWinGoHistory(14));

        // Evaluate user's bets for the completed round
        const activeBets = currentBetsRef.current;
        let totalWin = 0;
        activeBets.forEach((bet) => {
          if (bet.type === 'number' && bet.value === result.num) {
            totalWin += bet.amount * 10;
          } else if (bet.type === 'color' && bet.value === result.color) {
            totalWin += bet.amount * 2;
          } else if (bet.type === 'color' && bet.value === 'VIOLET' && result.isViolet) {
            totalWin += bet.amount * 4.5;
          } else if (bet.type === 'size' && bet.value === result.size) {
            totalWin += bet.amount * 2;
          }
        });

        if (totalWin > 0) {
          sounds.playWin();
          modifyBalance(totalWin, `Win Go Round Won (${result.num} ${result.color})`);
          setWinningAnnouncement(`🎉 YOU WON ₹${totalWin}! (Result: ${result.num} ${result.color} ${result.size})`);
        } else if (activeBets.length > 0) {
          sounds.playLoss();
          setWinningAnnouncement(`Round Result: ${result.num} ${result.color} ${result.size}`);
        }

        setTimeout(() => setWinningAnnouncement(null), 5000);
        setCurrentBets([]);
      }
    }, 100);

    return () => clearInterval(syncInterval);
  }, [user, onOpenMaxLimitModal]);

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
    <div className="min-h-screen bg-[#090e17] p-3 sm:p-4 pb-28 selection:bg-emerald-500 selection:text-black">
      <div className="max-w-md mx-auto space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#0f1826] border border-slate-800 rounded-2xl p-3">
          <div className="flex items-center space-x-2.5">
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
                <span>WIN GO</span>
                <span className="text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                  LIVE
                </span>
                <span className="text-[10px] bg-purple-950 text-purple-400 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                  60s
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">{roundId}</p>
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

        {/* 60s Countdown Clock Header */}
        <div className="bg-[#0f1826] border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl text-center relative overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Period Round</span>
              <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono">{roundId}</span>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Betting Status</span>
              <span className={`text-xs font-black uppercase font-mono ${isLocked ? 'text-rose-400 animate-pulse' : 'text-emerald-400 flex items-center justify-end space-x-1'}`}>
                {!isLocked && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1"></span>}
                <span>{isLocked ? '🔒 LOCKED (Last 10s)' : '🟢 OPEN FOR BETS'}</span>
              </span>
            </div>
          </div>

          {/* Large Countdown Pulsing Timer with Neon Ring */}
          <div className="my-2.5 sm:my-3 flex items-center justify-center relative">
            {isLocked && (
              <div className="absolute w-32 h-16 rounded-full bg-rose-600/20 blur-xl animate-pulse pointer-events-none" />
            )}
            <div className={`relative z-10 px-6 py-2 rounded-2xl border transition-all duration-300 ${
              isLocked 
                ? 'bg-gradient-to-r from-rose-950/80 via-red-900/40 to-rose-950/80 border-rose-500 shadow-xl shadow-rose-600/30 text-rose-400 scale-105' 
                : 'bg-[#131f33]/80 border-slate-700/60 text-white shadow-lg'
            }`}>
              <div className="text-3xl sm:text-5xl font-black font-mono tracking-wider drop-shadow-md">
                00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
              </div>
            </div>
          </div>

          {winningAnnouncement && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950 via-indigo-900 to-purple-950 border-2 border-purple-400 text-xs sm:text-sm font-black text-purple-200 animate-win-celebrate shadow-xl shadow-purple-600/40 flex items-center justify-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-300 animate-spin" />
              <span>{winningAnnouncement}</span>
            </div>
          )}
        </div>

        {/* AUTHENTIC LOTTERY NUMBER SELECTION & BETTING INTERFACE */}
        <div className="bg-[#0f1826] border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
          
          {/* 1. NUMBERS (0 - 9) with 10X Payout */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <span>Select Lucky Number</span>
                <span className="text-[10px] text-slate-500">(0-9)</span>
              </span>
              <span className="text-[11px] font-black font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-500/40 shadow-sm animate-pulse">
                10X Payout
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
              {NUMBERS.map((n) => {
                const isEven = n % 2 === 0;
                const isPurple = n === 0 || n === 5;
                return (
                  <button
                    key={n}
                    disabled={isLocked}
                    onClick={() => handleOpenBetSheet('number', n)}
                    className={`relative overflow-hidden py-3 rounded-2xl font-black font-mono text-xl transition-all duration-200 transform active:scale-95 hover:scale-105 border shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                      isPurple
                        ? 'bg-gradient-to-tr from-purple-700 via-indigo-600 to-purple-800 border-purple-400/60 text-white shadow-purple-600/30 hover:border-purple-300'
                        : isEven
                        ? 'bg-gradient-to-tr from-rose-700 via-red-600 to-rose-800 border-rose-400/60 text-white shadow-rose-600/30 hover:border-rose-300'
                        : 'bg-gradient-to-tr from-emerald-700 via-teal-600 to-emerald-800 border-emerald-400/60 text-white shadow-emerald-600/30 hover:border-emerald-300'
                    }`}
                  >
                    <span className="relative z-10">{n}</span>
                    <div className="absolute top-0 right-0 w-8 h-8 bg-white/10 rounded-full blur-sm transform translate-x-2 -translate-y-2 pointer-events-none" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. COLORS (GREEN, VIOLET, RED) */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Color
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-bold">
                2X / 4.5X
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              <button
                disabled={isLocked}
                onClick={() => handleOpenBetSheet('color', 'GREEN')}
                className="py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs sm:text-sm border border-emerald-400/40 shadow-lg shadow-emerald-600/20 disabled:opacity-40 transition transform active:scale-95"
              >
                GREEN 2X
              </button>

              <button
                disabled={isLocked}
                onClick={() => handleOpenBetSheet('color', 'VIOLET')}
                className="py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm border border-purple-400/40 shadow-lg shadow-purple-600/20 disabled:opacity-40 transition transform active:scale-95"
              >
                VIOLET 4.5X
              </button>

              <button
                disabled={isLocked}
                onClick={() => handleOpenBetSheet('color', 'RED')}
                className="py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs sm:text-sm border border-rose-400/40 shadow-lg shadow-rose-600/20 disabled:opacity-40 transition transform active:scale-95"
              >
                RED 2X
              </button>
            </div>
          </div>

          {/* 3. BIG AND SMALL */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Size
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-bold">
                2X Payout
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <button
                disabled={isLocked}
                onClick={() => handleOpenBetSheet('size', 'BIG')}
                className="py-3 rounded-2xl bg-[#131f33] hover:bg-[#18263e] border border-emerald-500/40 text-emerald-300 font-black text-xs sm:text-sm shadow-md disabled:opacity-40 flex flex-col items-center transition transform active:scale-95"
              >
                <span>BIG (5-9)</span>
                <span className="text-[10px] text-emerald-400/80 font-mono font-bold mt-0.5">2.0X Payout</span>
              </button>

              <button
                disabled={isLocked}
                onClick={() => handleOpenBetSheet('size', 'SMALL')}
                className="py-3 rounded-2xl bg-[#131f33] hover:bg-[#18263e] border border-amber-500/40 text-amber-300 font-black text-xs sm:text-sm shadow-md disabled:opacity-40 flex flex-col items-center transition transform active:scale-95"
              >
                <span>SMALL (0-4)</span>
                <span className="text-[10px] text-amber-400/80 font-mono font-bold mt-0.5">2.0X Payout</span>
              </button>
            </div>
          </div>

        </div>

        {/* CURRENT ROUND ACTIVE BETS */}
        {currentBets.length > 0 && (
          <div className="bg-[#0f1826] border border-slate-800 rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Your Locked Bets for this Round:
            </span>
            <div className="flex flex-wrap gap-2">
              {currentBets.map((b, idx) => (
                <span key={idx} className="px-3 py-1 bg-[#131f33] border border-emerald-500/40 rounded-xl text-xs font-mono font-bold text-emerald-300">
                  {b.value}: ₹{b.amount}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 4. PAST OUTCOMES IN BELOW */}
        <div className="bg-[#0f1826] border border-slate-800 rounded-3xl p-4 shadow-xl">
          <div className="flex items-center space-x-2 mb-3">
            <History className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">
              Past Outcomes & Trends
            </h3>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {history.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-xl bg-[#131f33] text-xs"
              >
                <span className="font-mono text-slate-400 font-bold">{h.round}</span>
                <div className="flex items-center space-x-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black font-mono text-white text-xs ${
                    h.color === 'RED' ? 'bg-rose-600' : 'bg-emerald-600'
                  }`}>
                    {h.num}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                    h.size === 'BIG' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
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
          <div className="w-full max-w-md bg-[#0f1826] border-t-2 border-emerald-500 rounded-t-3xl p-5 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Selected Prediction:</span>
                <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                  {selectedBetValue} ({selectedBetType === 'number' ? '10X Payout' : '2X Payout'})
                </div>
              </div>
              <button
                onClick={() => setBetModalOpen(false)}
                className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
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
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'bg-[#131f33] text-slate-300 hover:bg-slate-800'
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
                        : 'bg-[#131f33] text-slate-400'
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
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-2xl text-base shadow-lg shadow-emerald-500/25 transition transform active:scale-95"
              >
                Confirm & Place Bet (₹{totalBetAmount})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Win Go Rules & Provable Fairness Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#0f1826] border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🎲</span>
                <h3 className="text-base font-black text-white">Win Go Rules & Provable Fairness</h3>
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
                <h4 className="font-black text-purple-400 uppercase tracking-wider mb-1">Game Mechanics & Payouts</h4>
                <p>• <strong>Lucky Numbers (0 - 9):</strong> Match exact number for a <strong>10× payout</strong> (9x net profit).</p>
                <p>• <strong>Colors:</strong> Green (1,3,7,9) &amp; Red (2,4,6,8) pay <strong>2×</strong>. Violet (0, 5) pays <strong>4.5×</strong>.</p>
                <p>• <strong>Size:</strong> Big (5-9) &amp; Small (0-4) pay <strong>2×</strong>.</p>
                <p>• <strong>Countdown:</strong> Rounds run on a synchronized 60-second atomic UTC cycle. The final 10 seconds lock bets.</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                <h4 className="font-black text-emerald-400 uppercase tracking-wider mb-1">Provable Fairness & Synchronicity</h4>
                <p>Results are generated using deterministic high-entropy cryptographic avalanche hashing seeded with synchronized global epoch time. Every device worldwide sees the exact same numbers, colors, and countdowns in real-time.</p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200">
                <h4 className="font-black text-amber-400 uppercase tracking-wider mb-1">Winning Limit Policy (Aviator & WinGo)</h4>
                <p>To ensure risk transparency, a profit threshold policy of <strong>3× qualifying deposit</strong> applies to Aviator and WinGo. (Example: ₹100 deposit → ₹300 winning threshold).</p>
                <p className="mt-1">When reached, new wagers on Aviator and WinGo are temporarily paused so you can review your balance and withdraw. <strong>Your funds are 100% safe, never confiscated</strong>, and all other games remain open.</p>
              </div>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition"
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

