import React, { useState, useEffect } from 'react';
import { ChevronRight, Flame, Sparkles, TrendingUp, Zap, Shield, Bomb } from 'lucide-react';
import { sounds } from '../services/audio';
import { getLiveAviatorState, getLiveWinGoState, getAviatorHistory, getWinGoHistory } from '../services/globalGameEngine';

export default function GamesGrid({ onSelectGame }) {
  // Live continuous game engine states (synchronized with all players worldwide)
  const [aviatorLive, setAviatorLive] = useState(() => getLiveAviatorState());
  const [wingoLive, setWingoLive] = useState(() => getLiveWinGoState());
  const [aviatorRecent, setAviatorRecent] = useState(() => getAviatorHistory(3));
  const [wingoRecent, setWingoRecent] = useState(() => getWinGoHistory(3));

  useEffect(() => {
    const interval = setInterval(() => {
      setAviatorLive(getLiveAviatorState());
      setWingoLive(getLiveWinGoState());
      setAviatorRecent(getAviatorHistory(3));
      setWingoRecent(getWinGoHistory(3));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const GAMES = [
    {
      id: 'aviator',
      name: 'AVIATOR',
      tag: 'MULTIPLIER CRASH',
      badge: 'HOT 🔥',
      gradient: 'from-rose-950/70 via-red-900/40 to-slate-900',
      border: 'hover:border-rose-500/60',
      iconBg: 'bg-rose-500/20 text-rose-400',
      liveBadge: (
        <div className="mt-2.5 flex items-center space-x-1.5 bg-black/40 px-2 py-1 rounded-lg border border-rose-500/30">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          <span className="text-[10px] font-mono font-bold text-slate-300">LIVE:</span>
          <span className={`text-[11px] font-mono font-black ${
            aviatorLive.gameState === 'CRASHED' ? 'text-rose-400' :
            aviatorLive.gameState === 'WAITING' ? 'text-cyan-400' : 'text-emerald-400'
          }`}>
            {aviatorLive.gameState === 'WAITING' ? `Starts ${aviatorLive.countdown}s` :
             aviatorLive.gameState === 'FLYING' ? `${aviatorLive.multiplier.toFixed(2)}x` :
             `Crashed ${aviatorLive.crashPoint.toFixed(2)}x`}
          </span>
          <div className="flex space-x-1 pl-1 border-l border-slate-700/60">
            {aviatorRecent.map((c, i) => (
              <span key={i} className="text-[9px] font-mono text-slate-400">{c}x</span>
            ))}
          </div>
        </div>
      ),
      previewSvg: (
        <svg className="w-16 h-16 opacity-85 group-hover:scale-110 group-hover:translate-x-1 group-hover:-translate-y-1 transition duration-300" viewBox="0 0 64 64" fill="none">
          <path d="M12 50 L28 42 L48 20 C52 16 58 18 56 24 L50 36 L40 40 L34 54 L26 50 L30 42 Z" fill="#f43f5e"/>
          <path d="M4 56 Q20 54 36 44" stroke="#fb7185" strokeWidth="2" strokeDasharray="3 3"/>
        </svg>
      )
    },
    {
      id: 'wingo',
      name: 'WINGO',
      tag: '60S COLOR & NUMBERS',
      badge: 'POPULAR',
      gradient: 'from-purple-950/70 via-indigo-900/40 to-slate-900',
      border: 'hover:border-purple-500/60',
      iconBg: 'bg-purple-500/20 text-purple-400',
      liveBadge: (
        <div className="mt-2.5 flex items-center space-x-1.5 bg-black/40 px-2 py-1 rounded-lg border border-purple-500/30">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
          <span className="text-[10px] font-mono font-bold text-slate-300">TIMER:</span>
          <span className={`text-[11px] font-mono font-black ${wingoLive.isLocked ? 'text-rose-400' : 'text-purple-300'}`}>
            00:{wingoLive.secondsLeft < 10 ? `0${wingoLive.secondsLeft}` : wingoLive.secondsLeft}
          </span>
          <div className="flex space-x-1 pl-1 border-l border-slate-700/60">
            {wingoRecent.map((h, i) => (
              <span key={i} className={`text-[9px] font-mono font-bold px-1 rounded ${
                h.color === 'RED' ? 'text-rose-400 bg-rose-950/50' : 'text-emerald-400 bg-emerald-950/50'
              }`}>{h.num}</span>
            ))}
          </div>
        </div>
      ),
      previewSvg: (
        <div className="flex items-center -space-x-2 group-hover:scale-110 transition duration-300">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-xs font-black text-white shadow-lg">7</div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-xs font-black text-white shadow-lg">3</div>
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-red-500 to-rose-400 flex items-center justify-center text-[10px] font-black text-white shadow-lg">8</div>
        </div>
      )
    },
    {
      id: 'mines',
      name: 'MINES',
      tag: '4x4 PROVABLY FAIR GEMS',
      badge: 'HIGH MULTIPLIER',
      gradient: 'from-amber-950/70 via-yellow-900/40 to-slate-900',
      border: 'hover:border-amber-500/60',
      iconBg: 'bg-amber-500/20 text-amber-400',
      previewSvg: (
        <div className="flex items-center space-x-2 group-hover:scale-110 transition duration-300">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg">
            <Bomb className="w-6 h-6 animate-pulse" />
          </div>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 text-xs font-black">
            💎
          </div>
        </div>
      )
    },
    {
      id: 'plinko',
      name: 'CIRCUIT PLINKO',
      tag: 'PHYSICS PEG BOARD 1000X',
      badge: 'ARCADE',
      gradient: 'from-cyan-950/70 via-sky-900/40 to-slate-900',
      border: 'hover:border-cyan-500/60',
      iconBg: 'bg-cyan-500/20 text-cyan-400',
      previewSvg: (
        <div className="w-14 h-12 flex flex-col justify-between items-center group-hover:scale-110 transition duration-300">
          <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#00e5ff] animate-bounce" />
          <div className="flex space-x-1.5 opacity-60">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          </div>
          <div className="flex space-x-1 text-[9px] font-mono text-cyan-300 font-bold">
            <span>0.2x</span>
            <span className="text-amber-400">100x</span>
          </div>
        </div>
      )
    },
    {
      id: 'tower',
      name: 'NEON TOWER',
      tag: '9-ROW RISK CLIMBER',
      badge: 'NEW',
      gradient: 'from-emerald-950/70 via-teal-900/40 to-slate-900',
      border: 'hover:border-emerald-500/60',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
      previewSvg: (
        <div className="flex flex-col space-y-1 group-hover:scale-110 transition duration-300">
          <div className="w-12 h-2.5 rounded bg-emerald-400 shadow-[0_0_6px_#10b981]" />
          <div className="w-12 h-2.5 rounded bg-slate-700/80" />
          <div className="w-12 h-2.5 rounded bg-slate-700/80" />
        </div>
      )
    },
    {
      id: 'dice',
      name: 'QUANTUM DICE',
      tag: '100-POINT RAPID SLIDER',
      badge: 'INSTANT WIN',
      gradient: 'from-blue-950/70 via-indigo-900/40 to-slate-900',
      border: 'hover:border-blue-500/60',
      iconBg: 'bg-blue-500/20 text-blue-400',
      previewSvg: (
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-mono font-black text-white text-base shadow-lg group-hover:rotate-12 transition duration-300">
          88.4
        </div>
      )
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-6 select-none">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center space-x-2">
          <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
          <h3 className="text-lg font-black text-white tracking-wide">
            Our Games
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          6 Live Real-Money Games
        </span>
      </div>

      {/* 2x3 Grid matching user layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {GAMES.map((game) => (
          <div
            key={game.id}
            onClick={() => {
              sounds.playClick();
              onSelectGame(game.id);
            }}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${game.gradient} border border-slate-800/80 ${game.border} p-4 sm:p-5 flex items-center justify-between cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]`}
          >
            {/* Background Glow */}
            <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition" />

            {/* Left Content */}
            <div className="relative z-10 flex-1 pr-2">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-white/10 text-cyan-300 tracking-wider">
                  {game.badge}
                </span>
              </div>
              <h4 className="text-xl font-black text-white tracking-wide group-hover:text-cyan-400 transition">
                {game.name}
              </h4>
              <p className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">
                {game.tag}
              </p>

              {/* Real-time continuous live outcomes ticker */}
              {game.liveBadge}

              <div className="inline-flex items-center space-x-1 text-xs font-bold text-cyan-400 mt-2.5 group-hover:underline">
                <span>Play Now</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </div>
            </div>

            {/* Right Graphic Preview */}
            <div className="relative z-10 shrink-0 pl-2">
              {game.previewSvg}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
