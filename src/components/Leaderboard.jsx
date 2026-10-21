import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Sparkles, ChevronRight, Award } from 'lucide-react';

const TOP_PLAYERS = [
  { rank: 1, name: 'VIP Player 01', phone: '+91 98****3210', won: '₹84,250', game: 'Aviator (18.4x)', color: 'from-amber-400 to-yellow-500', badge: '🥇 1st' },
  { rank: 2, name: 'VIP Player 02', phone: '+91 91****8842', won: '₹52,900', game: 'Win Go (VIOLET 4.5x)', color: 'from-slate-300 to-slate-400', badge: '🥈 2nd' },
  { rank: 3, name: 'Player 03', phone: '+91 87****1109', won: '₹37,400', game: 'Mines (14 Gems)', color: 'from-amber-600 to-amber-700', badge: '🥉 3rd' },
  { rank: 4, name: 'Player 04', phone: '+91 79****4421', won: '₹22,150', game: 'Circuit Plinko (100x)', color: 'from-emerald-500 to-teal-500', badge: '4th' }
];

export default function Leaderboard() {
  const [liveWin, setLiveWin] = useState({
    user: 'Player 88',
    amount: '₹3,200',
    game: 'Aviator (3.2x)'
  });

  useEffect(() => {
    const games = ['Aviator (2.8x)', 'Win Go (GREEN 2X)', 'Mines (6.4x)', 'Quantum Dice (92.4)', 'Circuit Plinko (26x)'];
    const interval = setInterval(() => {
      const randomUser = `Player ${Math.floor(10 + Math.random() * 89)}`;
      const randomAmt = `₹${(Math.floor(20 + Math.random() * 80) * 50).toLocaleString('en-IN')}`;
      const randomGame = games[Math.floor(Math.random() * games.length)];
      setLiveWin({ user: randomUser, amount: randomAmt, game: randomGame });
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-6 select-none">
      {/* Live Win Ticker with Stake-style pulse */}
      <div className="mb-4 bg-[#0d1624] border border-slate-800/90 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs shadow-lg">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Live Win</span>
          <span className="text-white font-black">{liveWin.user}</span>
          <span className="text-emerald-400 font-mono font-black text-sm">+{liveWin.amount}</span>
        </div>
        <span className="text-emerald-300 text-[11px] font-mono font-bold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
          {liveWin.game}
        </span>
      </div>

      {/* Top High-Roller Payouts Table */}
      <div className="bg-[#0f1826] border border-slate-800/90 rounded-3xl p-4 sm:p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-3.5 px-1">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-amber-400 animate-pulse" />
            <h4 className="text-base font-black text-white tracking-wide font-sans">
              Top Winners Today
            </h4>
          </div>
          <span className="text-[11px] font-bold text-slate-400 flex items-center bg-[#152136] px-2.5 py-1 rounded-xl border border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
            <span>Live Audit</span>
          </span>
        </div>

        <div className="space-y-2">
          {TOP_PLAYERS.map((player) => (
            <div
              key={player.rank}
              className="flex items-center justify-between p-3 rounded-2xl bg-[#142033]/80 hover:bg-[#18263d] border border-slate-800/80 transition-all duration-150"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${player.color} flex items-center justify-center text-xs font-black text-slate-950 shadow-md`}>
                  {player.rank}
                </div>
                <div>
                  <div className="text-xs font-black text-white flex items-center space-x-1.5">
                    <span>{player.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({player.phone})</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold font-mono">Game: {player.game}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-mono font-black text-emerald-400 block">
                  {player.won}
                </span>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Settled</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
