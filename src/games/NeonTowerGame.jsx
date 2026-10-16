import React, { useState } from 'react';
import { ArrowLeft, Skull, Shield, Sparkles, Trophy, ArrowUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';

const DIFFICULTY_CONFIG = {
  easy: {
    tilesPerRow: 4,
    hazardsPerRow: 1,
    multipliers: [1.25, 1.60, 2.05, 2.65, 3.45, 4.50, 5.90, 7.80, 10.50]
  },
  medium: {
    tilesPerRow: 3,
    hazardsPerRow: 1,
    multipliers: [1.45, 2.15, 3.20, 4.80, 7.20, 10.80, 16.50, 25.00, 38.00]
  },
  hard: {
    tilesPerRow: 2,
    hazardsPerRow: 1,
    multipliers: [1.95, 3.85, 7.60, 15.00, 30.00, 60.00, 120.00, 240.00, 500.00]
  }
};

export default function NeonTowerGame({ onBack }) {
  const { user, modifyBalance } = useAuth();

  const [difficulty, setDifficulty] = useState('medium');
  const [betAmount, setBetAmount] = useState('50');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentRow, setCurrentRow] = useState(0); // 0 to 8 (9 rows total)
  
  // Grid state: array of 9 rows, each row has array of tiles { isHazard, revealed }
  const [towerGrid, setTowerGrid] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [lastWin, setLastWin] = useState(null);

  const config = DIFFICULTY_CONFIG[difficulty];
  const currentMultiplier = currentRow > 0 ? config.multipliers[currentRow - 1] : 1.00;
  const potentialWinnings = Number((Number(betAmount) * currentMultiplier).toFixed(2));

  const handleStartGame = () => {
    const wager = Number(betAmount);
    if (!user || user.walletBalance < wager) {
      alert('Insufficient wallet balance!');
      return;
    }
    if (wager < 10) {
      alert('Minimum bet is ₹10.');
      return;
    }

    sounds.playClick();
    modifyBalance(-wager, 'Neon Tower Bet');

    // Generate tower rows with predetermined random hazards
    const newGrid = [];
    for (let r = 0; r < 9; r++) {
      const rowTiles = [];
      const hazardIdx = Math.floor(Math.random() * config.tilesPerRow);
      for (let t = 0; t < config.tilesPerRow; t++) {
        rowTiles.push({
          isHazard: t === hazardIdx,
          revealed: false,
          chosen: false
        });
      }
      newGrid.push(rowTiles);
    }

    setTowerGrid(newGrid);
    setCurrentRow(0);
    setIsPlaying(true);
    setGameOver(false);
    setLastWin(null);
  };

  const handleTileClick = (rowIndex, tileIndex) => {
    if (!isPlaying || rowIndex !== currentRow || gameOver) return;

    const newGrid = [...towerGrid];
    const tile = newGrid[rowIndex][tileIndex];
    tile.revealed = true;
    tile.chosen = true;

    if (tile.isHazard) {
      // Skull Hit -> Game Over
      sounds.playBomb();
      // Reveal entire row
      newGrid[rowIndex].forEach((t) => (t.revealed = true));
      setTowerGrid(newGrid);
      setGameOver(true);
      setIsPlaying(false);
    } else {
      // Safe Tile!
      const nextRow = currentRow + 1;
      sounds.playDiamond(nextRow);
      setTowerGrid(newGrid);
      setCurrentRow(nextRow);

      // Cleared Top Row! Max Payout
      if (nextRow === 9) {
        handleCashout(config.multipliers[8]);
      }
    }
  };

  const handleCashout = (overrideMult = null) => {
    if (!isPlaying || currentRow === 0) return;

    const mult = overrideMult || currentMultiplier;
    const winAmount = Number((Number(betAmount) * mult).toFixed(2));

    sounds.playWin();
    modifyBalance(winAmount, `Neon Tower Win (${mult}x)`);

    setIsPlaying(false);
    setGameOver(true);
    setLastWin({ amount: winAmount, multiplier: mult });
  };

  return (
    <div className="min-h-screen bg-[#070b14] p-4 pb-24 selection:bg-emerald-500 selection:text-black">
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
                <span>NEON TOWER</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  Max {config.multipliers[8]}x
                </span>
              </h1>
              <p className="text-xs text-slate-400">Step-by-step risk ladder</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-bold">Wallet</span>
            <span className="text-sm font-black font-mono text-cyan-400">
              ₹{user ? Number(user.walletBalance).toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        {/* 9-Row Vertical Tower Stage */}
        <div className={`bg-[#0f172a] border rounded-3xl p-4 shadow-2xl space-y-1.5 select-none transition-all duration-300 ${
          gameOver && !lastWin ? 'border-rose-500/60 shadow-rose-950/40 animate-bomb-shake' :
          lastWin ? 'border-emerald-400/80 shadow-emerald-500/30' : 'border-slate-800'
        }`}>
          {Array.from({ length: 9 }).map((_, rIdx) => {
            const rowIndex = 8 - rIdx; // Render row 8 at top, row 0 at bottom
            const rowMult = config.multipliers[rowIndex];
            const isActiveRow = isPlaying && currentRow === rowIndex;
            const isCompletedRow = isPlaying && currentRow > rowIndex;
            const rowTiles = towerGrid[rowIndex] || Array(config.tilesPerRow).fill({ revealed: false, isHazard: false });

            return (
              <div
                key={rowIndex}
                className={`relative flex items-center space-x-2 p-1.5 rounded-2xl transition-all duration-300 ${
                  isActiveRow
                    ? 'bg-gradient-to-r from-emerald-950/60 via-teal-900/30 to-emerald-950/60 border-2 border-emerald-400 shadow-lg shadow-emerald-500/30 scale-[1.02] z-10'
                    : isCompletedRow
                    ? 'bg-[#131b2e]/70 border border-emerald-500/30 opacity-90'
                    : 'bg-[#0b101c]/40 border border-slate-900/80 opacity-40'
                }`}
              >
                {/* Active Row Indicator Arrow */}
                {isActiveRow && (
                  <div className="absolute -left-2 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}

                {/* Row Multiplier Badge */}
                <span className={`w-14 text-center font-mono font-black text-xs py-1.5 rounded-xl transition-all ${
                  isActiveRow
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-300 text-slate-950 shadow-md shadow-emerald-500/40 scale-105'
                    : isCompletedRow
                    ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-500/40'
                    : 'text-slate-500 bg-slate-900/50'
                }`}>
                  {rowMult}x
                </span>

                {/* Tiles in Row */}
                <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${config.tilesPerRow}, minmax(0, 1fr))` }}>
                  {rowTiles.map((tile, tIdx) => (
                    <button
                      key={tIdx}
                      disabled={!isActiveRow}
                      onClick={() => handleTileClick(rowIndex, tIdx)}
                      className={`h-10 rounded-xl font-bold transition-all transform active:scale-90 flex items-center justify-center text-lg select-none ${
                        tile.revealed
                          ? tile.isHazard
                            ? 'bg-gradient-to-br from-rose-600 to-red-800 text-white shadow-lg shadow-rose-600/50 border border-rose-400 animate-bomb-shake'
                            : 'bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/50 border border-emerald-300 animate-pop-in'
                          : isActiveRow
                          ? 'bg-[#1e2d4d] hover:bg-[#273a63] hover:scale-105 border-2 border-emerald-400/60 shadow-md cursor-pointer animate-pulse active:bg-emerald-500'
                          : isCompletedRow
                          ? 'bg-[#10192e] border border-slate-800 text-slate-600 cursor-not-allowed'
                          : 'bg-[#0d1424] border border-slate-900 cursor-not-allowed'
                      }`}
                    >
                      {tile.revealed ? (
                        tile.isHazard ? (
                          <Skull className="w-5 h-5 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                        ) : (
                          <span className="text-xl filter drop-shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pop-in">💎</span>
                        )
                      ) : (
                        isActiveRow && (
                          <span className="text-[10px] text-emerald-400/60 font-black tracking-widest font-mono">?</span>
                        )
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Controls & Action Button */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          {/* Difficulty Toggles */}
          {!isPlaying && (
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Difficulty Level
              </span>
              <div className="grid grid-cols-3 gap-2">
                {['easy', 'medium', 'hard'].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => {
                      sounds.playClick();
                      setDifficulty(diff);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold uppercase transition ${
                      difficulty === diff
                        ? 'bg-emerald-500 text-black font-black shadow-md'
                        : 'bg-[#131b2e] text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bet Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Bet Amount (₹)
              </label>
              <div className="flex space-x-1">
                {[10, 50, 100, 500].map((amt) => (
                  <button
                    key={amt}
                    disabled={isPlaying}
                    onClick={() => setBetAmount(String(amt))}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 text-[10px] font-mono text-slate-300 disabled:opacity-40"
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              min="10"
              disabled={isPlaying}
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="w-full bg-[#131b2e] border border-slate-700 rounded-2xl px-4 py-3 text-base font-black text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Action Button */}
          {!isPlaying ? (
            <button
              onClick={handleStartGame}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black rounded-2xl text-base tracking-wide transition transform active:scale-95 shadow-lg shadow-emerald-500/25"
            >
              BET ₹{betAmount}
            </button>
          ) : (
            <button
              onClick={() => handleCashout()}
              disabled={currentRow === 0}
              className={`w-full py-4 rounded-2xl font-black text-base tracking-wide transition transform active:scale-95 shadow-xl flex flex-col items-center justify-center ${
                currentRow > 0
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>CASH OUT</span>
              <span className="text-xs font-mono font-black mt-0.5">
                ₹{potentialWinnings} ({currentMultiplier}x)
              </span>
            </button>
          )}

          {lastWin && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500 rounded-xl text-center text-xs font-mono font-black text-emerald-400 animate-bounce">
              🎉 Cashed Out: +₹{lastWin.amount} ({lastWin.multiplier}x)!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
