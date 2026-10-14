import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Sparkles, ChevronRight } from 'lucide-react';

const TOP_PLAYERS = [
  { rank: 1, name: 'Player 01', phone: '+91 98****3210', won: '₹84,250', game: 'Aviator', color: 'from-amber-400 to-yellow-500' },
  { rank: 2, name: 'Player 02', phone: '+91 91****8842', won: '₹52,900', game: 'Win Go', color: 'from-slate-300 to-slate-400' },
  { rank: 3, name: 'Player 03', phone: '+91 87****1109', won: '₹37,400', game: 'Mines', color: 'from-amber-600 to-amber-700' },
  { rank: 4, name: 'Player 04', phone: '+91 79****4421', won: '₹22,150', game: 'Plinko', color: 'from-cyan-500 to-blue-500' }
];

export default function Leaderboard() {
  const [liveWin, setLiveWin] = useState({
    user: 'Player 88',
    amount: '₹3,200',
    game: 'Aviator (3.2x)'
  });

  useEffect(() => {
    const games = ['Aviator (2.8x)', 'Win Go (GREEN 2X)', 'Mines (6.4x)', 'Quantum Dice', 'Circuit Plinko (26x)'];
    const interval = setInterval(() => {
      const randomUser = `Player ${Math.floor(10 + Math.random() * 89)}`;
      const randomAmt = `₹${(Math.floor(20 + Math.random() * 80) * 50).toLocaleString('en-IN')}`;
      const randomGame = games[Math.floor(Math.random() * games.length)];
      setLiveWin({ user: randomUser, amount: randomAmt, game: randomGame });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-6 select-none">
      {/* Live Win Ticker */}
      <div className="mb-4 bg-cyan-950/40 border border-cyan-500/20 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-slate-300 font-medium">Live Payout:</span>
          <span className="text-white font-bold">{liveWin.user}</span>
          <span className="text-emerald-400 font-mono font-black">+{liveWin.amount}</span>
        </div>
        <span className="text-cyan-400 text-[11px] font-mono">{liveWin.game}</span>
      </div>

      {/* Top Players Panel matching Screenshot 2 */}
      <div className="bg-[#0f172a]/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h4 className="text-base font-black text-white tracking-wide">
              Top Players Today
            </h4>
          </div>
          <span className="text-xs text-slate-400 flex items-center">
            <span>Real-time</span>
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </span>
        </div>

        <div className="space-y-2">
          {TOP_PLAYERS.map((player) => (
            <div
              key={player.rank}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#162032]/70 hover:bg-[#162032] border border-slate-800/60 transition"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${player.color} flex items-center justify-center text-xs font-black text-slate-950 shadow`}>
                  {player.rank}
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <span>{player.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({player.phone})</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-medium">Game: {player.game}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-black text-emerald-400">
                  {player.won}
                </span>
                <p className="text-[10px] text-slate-400">Total Payout</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
