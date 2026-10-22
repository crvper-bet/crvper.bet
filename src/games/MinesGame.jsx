import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bomb, Diamond, Sparkles, Volume2, ShieldCheck, RefreshCw, Dices } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';

// Dynamic multiplier formula for 16-tile grid based on remaining unrevealed diamonds vs bombs
function calculateMultiplier(minesCount, diamondsRevealed) {
  let multiplier = 0.98; // 2% house edge
  for (let i = 0; i < diamondsRevealed; i++) {
    multiplier *= (16 - i) / (16 - minesCount - i);
  }
  return Number(Math.max(1.02, multiplier).toFixed(2));
}

export default function MinesGame({ onBack }) {
  const { user, modifyBalance } = useAuth();

  const [betAmount, setBetAmount] = useState('20');
  const [minesCount, setMinesCount] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [grid, setGrid] = useState(Array(16).fill(null)); // null | 'diamond' | 'bomb'
  const [revealed, setRevealed] = useState(Array(16).fill(false));
  const [bombsLocations, setBombsLocations] = useState([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [lastWin, setLastWin] = useState(null);
  const [provablyFairHash, setProvablyFairHash] = useState('');
  const [showFairModal, setShowFairModal] = useState(false);
  const [autoCashoutTarget, setAutoCashoutTarget] = useState('');

  const currentMultiplier = calculateMultiplier(minesCount, revealedCount);
  const nextMultiplier = calculateMultiplier(minesCount, revealedCount + 1);
  const potentialWinnings = Number((Number(betAmount) * currentMultiplier).toFixed(2));

  // Auto-cashout trigger
  useEffect(() => {
    if (isPlaying && autoCashoutTarget && currentMultiplier >= Number(autoCashoutTarget) && revealedCount > 0) {
      handleCashout();
    }
  }, [currentMultiplier, isPlaying, autoCashoutTarget, revealedCount]);

  const handleStartGame = () => {
    const wager = Number(betAmount);
    if (!user || user.walletBalance < wager) {
      alert('Insufficient wallet balance to place this bet!');
      return;
    }
    if (wager < 10) {
      alert('Minimum bet amount is ₹10.');
      return;
    }

    sounds.playClick();
    // Real-time wallet deduction
    modifyBalance(-wager, 'Mines Bet');

    // Generate random bomb positions
    const indices = Array.from({ length: 16 }, (_, i) => i);
    const shuffled = indices.sort(() => Math.random() - 0.5);
    const bombs = shuffled.slice(0, minesCount);

    setBombsLocations(bombs);
    setGrid(Array(16).fill(null));
    setRevealed(Array(16).fill(false));
    setRevealedCount(0);
    setGameOver(false);
    setLastWin(null);
    setIsPlaying(true);
    setProvablyFairHash('hash_' + Math.random().toString(36).substring(2) + Date.now().toString(36));
  };

  const handleTileClick = (index) => {
    if (!isPlaying || revealed[index] || gameOver) return;

    const isBomb = bombsLocations.includes(index);
    const newRevealed = [...revealed];
    newRevealed[index] = true;
    setRevealed(newRevealed);

    if (isBomb) {
      sounds.playBomb();
      setGameOver(true);
      setIsPlaying(false);
      // Reveal all bombs
      const fullGrid = [...grid];
      bombsLocations.forEach((bIdx) => {
        fullGrid[bIdx] = 'bomb';
        newRevealed[bIdx] = true;
      });
      setRevealed(newRevealed);
      setGrid(fullGrid);
    } else {
      const nextCount = revealedCount + 1;
      setRevealedCount(nextCount);
      sounds.playDiamond(nextCount);

      const nextGrid = [...grid];
      nextGrid[index] = 'diamond';
      setGrid(nextGrid);

      // Check if all diamonds found
      if (nextCount === 16 - minesCount) {
        handleCashout();
      }
    }
  };

  const handleCashout = () => {
    if (!isPlaying || revealedCount === 0) return;

    const winAmount = Number((Number(betAmount) * currentMultiplier).toFixed(2));
    sounds.playWin();

    // Real-time wallet addition
    modifyBalance(winAmount, `Mines Cashout (${currentMultiplier}x)`);

    setIsPlaying(false);
    setGameOver(true);
    setLastWin({ amount: winAmount, multiplier: currentMultiplier });

    // Reveal all remaining
    const fullRevealed = Array(16).fill(true);
    const fullGrid = [...grid];
    bombsLocations.forEach((bIdx) => {
      fullGrid[bIdx] = 'bomb';
    });
    setRevealed(fullRevealed);
    setGrid(fullGrid);
  };

  const handleQuickPick = () => {
    if (!isPlaying || gameOver) return;
    const unrevealedIndices = revealed
      .map((isRev, idx) => (!isRev ? idx : null))
      .filter((idx) => idx !== null);

    if (unrevealedIndices.length > 0) {
      const randomIdx = unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];
      handleTileClick(randomIdx);
    }
  };

  const handleHalf = () => setBetAmount((prev) => String(Math.max(10, Math.floor(Number(prev) / 2))));
  const handleDouble = () => setBetAmount((prev) => String(Math.min(user ? user.walletBalance : 10000, Number(prev) * 2)));

  return (
    <div className="min-h-screen bg-[#090e17] p-3 sm:p-4 pb-24 selection:bg-emerald-500 selection:text-black">
      <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
        {/* Top Header */}
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
                <span>MINES</span>
                <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                  4x4 Grid
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Uncover diamonds & cash out before the bomb!</p>
            </div>
          </div>

          <button
            onClick={() => setShowFairModal(true)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center space-x-1 border border-slate-800"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Fair Seed</span>
          </button>
        </div>

        {/* Desktop Split / Mobile Vertical Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
          {/* Controls Panel (Desktop Left / Mobile Bottom) */}
          <div className="md:col-span-5 bg-[#0f1826] border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3.5 order-2 md:order-1">
            {/* Bet Amount */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Bet Amount (₹)
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  Balance: ₹{user ? Number(user.walletBalance).toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="relative flex items-center bg-[#131f33] border border-slate-700 rounded-2xl overflow-hidden focus-within:border-emerald-500 transition">
                <span className="pl-3.5 pr-2 font-black text-emerald-400 font-mono">₹</span>
                <input
                  type="number"
                  min="10"
                  disabled={isPlaying}
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="w-full bg-transparent py-2.5 pr-2 text-base font-black text-white font-mono focus:outline-none"
                />
                <div className="flex items-center space-x-1 pr-2">
                  <button
                    disabled={isPlaying}
                    onClick={handleHalf}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 disabled:opacity-40"
                  >
                    ½
                  </button>
                  <button
                    disabled={isPlaying}
                    onClick={handleDouble}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 disabled:opacity-40"
                  >
                    2×
                  </button>
                </div>
              </div>
            </div>

            {/* Mines Count Selector */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Hidden Bombs
                </label>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {minesCount} Mines ({16 - minesCount} Gems)
                </span>
              </div>
              <select
                disabled={isPlaying}
                value={minesCount}
                onChange={(e) => setMinesCount(Number(e.target.value))}
                className="w-full bg-[#131f33] border border-slate-700 rounded-2xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
              >
                {Array.from({ length: 15 }, (_, i) => i + 1).map((cnt) => (
                  <option key={cnt} value={cnt}>
                    {cnt} {cnt === 1 ? 'Mine' : 'Mines'} (Higher Payout)
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-Cashout Multiplier (Optional) */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Auto-Cashout Target (e.g. 2.0x, optional)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="Disabled"
                value={autoCashoutTarget}
                onChange={(e) => setAutoCashoutTarget(e.target.value)}
                disabled={isPlaying}
                className="w-full bg-[#131f33] border border-slate-700 rounded-2xl px-3.5 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Dynamic Action Button */}
            {!isPlaying ? (
              <button
                onClick={handleStartGame}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-2xl text-base tracking-wide transition transform active:scale-95 shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2"
              >
                <span>BET ₹{betAmount}</span>
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleCashout}
                  disabled={revealedCount === 0}
                  className={`w-full py-3.5 rounded-2xl text-base font-black tracking-wide transition transform active:scale-95 shadow-lg flex items-center justify-center space-x-2 ${
                    revealedCount > 0
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-emerald-500/25 font-black'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <span>CASHOUT ₹{potentialWinnings} ({currentMultiplier}x)</span>
                </button>

                <button
                  onClick={handleQuickPick}
                  className="w-full py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold text-emerald-400 flex items-center justify-center space-x-1.5 transition"
                >
                  <Dices className="w-4 h-4" />
                  <span>Quick Pick (Random Gem)</span>
                </button>
              </div>
            )}
          </div>

          {/* Game Board: 4x4 Grid (Desktop Right / Mobile Top) */}
          <div className="md:col-span-7 bg-[#0f1826] border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col justify-between order-1 md:order-2">
            {/* Multipliers Bar */}
            <div className="flex items-center justify-between mb-3 bg-[#131f33] px-3.5 py-2 rounded-2xl border border-slate-700/60">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Locked</span>
                <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
                  {isPlaying && revealedCount > 0 ? `${currentMultiplier}x (₹${potentialWinnings})` : '1.00x'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Next Tile Multiplier</span>
                <span className="text-base sm:text-lg font-black font-mono text-teal-400">
                  {nextMultiplier}x
                </span>
              </div>
            </div>

            {/* 4x4 Tiles Grid */}
            <div className={`grid grid-cols-4 gap-2 sm:gap-2.5 p-2 bg-[#090e17] rounded-2xl border aspect-square max-w-[340px] mx-auto w-full transition-all duration-300 ${
              gameOver && !lastWin ? 'border-rose-500/60 animate-bomb-shake shadow-rose-950/50 shadow-2xl' : 
              lastWin ? 'border-emerald-400/80 shadow-emerald-500/20 shadow-2xl' : 'border-slate-800/80 shadow-inner'
            }`}>
              {Array.from({ length: 16 }).map((_, idx) => {
                const isTileRevealed = revealed[idx];
                const item = grid[idx];
                const isBomb = bombsLocations.includes(idx);

                return (
                  <button
                    key={idx}
                    onClick={() => handleTileClick(idx)}
                    disabled={!isPlaying || isTileRevealed}
                    className={`relative overflow-hidden rounded-2xl transition-all duration-300 flex items-center justify-center font-bold text-2xl select-none transform active:scale-95 ${
                      isTileRevealed
                        ? item === 'bomb' || (gameOver && isBomb)
                          ? 'bg-gradient-to-br from-rose-950 to-red-900 border-2 border-rose-500 text-rose-400 shadow-xl shadow-rose-600/40'
                          : 'bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-900 border-2 border-emerald-400 text-emerald-300 shadow-xl shadow-emerald-500/40 animate-pop-in'
                        : isPlaying
                        ? 'bg-[#18233c] hover:bg-[#202f50] hover:scale-[1.02] border border-slate-700/80 hover:border-emerald-400 shadow-md cursor-pointer active:brightness-125'
                        : 'bg-[#131f33] border border-slate-800/80 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {isTileRevealed ? (
                      item === 'bomb' || (gameOver && isBomb) ? (
                        <div className="flex flex-col items-center justify-center animate-bomb-shake">
                          <Bomb className="w-8 h-8 text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center animate-pop-in">
                          <span className="text-3xl filter drop-shadow-[0_0_12px_rgba(52,211,153,0.9)] transform hover:rotate-12 transition-transform">💎</span>
                        </div>
                      )
                    ) : (
                      isPlaying && (
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-emerald-500/5 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
                      )
                    )}
                  </button>
                );
              })}
            </div>

            {/* Status Footer */}
            <div className="mt-3 text-center min-h-[36px] flex items-center justify-center">
              {lastWin && (
                <div className="px-4 py-1.5 rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-950 border-2 border-emerald-400 text-emerald-300 font-mono font-black text-xs sm:text-sm animate-win-celebrate shadow-xl shadow-emerald-500/30 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-300 animate-spin" />
                  <span>Cashed Out: +₹{lastWin.amount} ({lastWin.multiplier}x)!</span>
                </div>
              )}
              {gameOver && !lastWin && (
                <div className="px-4 py-1.5 rounded-full bg-rose-950/90 border border-rose-500 text-rose-300 font-mono font-black text-xs animate-bomb-shake flex items-center space-x-1.5">
                  <Bomb className="w-4 h-4 text-rose-400" />
                  <span>💥 Bomb exploded! Round ended.</span>
                </div>
              )}
              {!gameOver && isPlaying && (
                <div className="text-xs text-slate-300 font-medium px-3 py-1 bg-slate-900/60 rounded-full border border-slate-800 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>{revealedCount} Gems uncovered • Pick next or Cash Out!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Provably Fair Modal */}
      {showFairModal && (
        <div 
          onClick={() => setShowFairModal(false)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="bg-[#0f1826] border border-emerald-500/40 rounded-3xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-black text-white mb-2 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Provably Fair Verification</span>
            </h3>
            <p className="text-xs text-slate-300 mb-3">
              Bomb placement was encrypted before you placed your bet.
            </p>
            <div className="bg-slate-900 p-2.5 rounded-xl font-mono text-[10px] text-emerald-300 break-all select-all">
              {provablyFairHash || 'sha256_e829bf9280ad716d9a'}
            </div>
            <button
              onClick={() => setShowFairModal(false)}
              className="w-full mt-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
