import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Sparkles, ChevronRight, Award } from 'lucide-react';

const TOP_PLAYERS = [
  { rank: 1, name: 'VIP Player 01', phone: '+91 98****3210', won: '₹84,250', game: 'Aviator (18.4x)', color: 'from-amber-400 to-yellow-500', badge: '🥇 1st' },
  { rank: 2, name: 'VIP Player 02', phone: '+91 91****8842', won: '₹52,900', game: 'Win Go (VIOLET 4.5x)', color: 'from-slate-400 to-slate-500', badge: '🥈 2nd' },
  { rank: 3, name: 'Player 03', phone: '+91 87****1109', won: '₹37,400', game: 'Mines (14 Gems)', color: 'from-amber-600 to-amber-700', badge: '🥉 3rd' },
  { rank: 4, name: 'Player 04', phone: '+91 79****4421', won: '₹22,150', game: 'Circuit Plinko (100x)', color: 'from-sky-500 to-cyan-500', badge: '4th' }
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
      {/* Live Win Ticker with Glacier Sky pulse */}
      <div className="mb-4 bg-white border border-sky-100 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs shadow-sm shadow-sky-100">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Live Win</span>
          <span className="text-slate-900 font-black">{liveWin.user}</span>
          <span className="text-emerald-600 font-mono font-black text-sm">+{liveWin.amount}</span>
        </div>
        <span className="text-sky-700 text-[11px] font-mono font-bold bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-lg">
          {liveWin.game}
        </span>
      </div>

      {/* Top High-Roller Payouts Table */}
      <div className="bg-white border border-sky-100 rounded-3xl p-4 sm:p-5 shadow-lg shadow-sky-100/60">
        <div className="flex items-center justify-between mb-3.5 px-1">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-amber-500 animate-pulse" />
            <h4 className="text-base font-black text-slate-900 tracking-wide font-sans">
              Top Winners Today
            </h4>
          </div>
          <span className="text-[11px] font-bold text-slate-500 flex items-center bg-sky-50 px-2.5 py-1 rounded-xl border border-sky-100">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-1.5" />
            <span>Live Audit</span>
          </span>
        </div>

        <div className="space-y-2">
          {TOP_PLAYERS.map((player) => (
            <div
              key={player.rank}
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-sky-50/50 via-white to-sky-50/30 border border-sky-100/80 hover:border-sky-300 transition shadow-sm"
            >
              <div className="flex items-center space-x-3">
                <span className="text-sm font-black w-8 text-center">{player.badge}</span>
                <div>
                  <h5 className="text-xs sm:text-sm font-black text-slate-900">{player.name}</h5>
                  <p className="text-[10px] text-slate-400 font-mono">{player.phone}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs sm:text-sm font-black font-mono text-emerald-600 block">
                  {player.won}
                </span>
                <span className="text-[10px] text-sky-700 font-bold bg-sky-50 px-1.5 py-0.2 rounded border border-sky-100">
                  {player.game}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
