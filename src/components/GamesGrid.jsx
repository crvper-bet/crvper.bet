import React, { useState, useEffect } from 'react';
import { ChevronRight, Flame, Sparkles, TrendingUp, Zap, Shield, Bomb, Play, Users } from 'lucide-react';
import { sounds } from '../services/audio';
import { getLiveAviatorState, getLiveWinGoState, getAviatorHistory, getWinGoHistory } from '../services/globalGameEngine';

export default function GamesGrid({ onSelectGame }) {
  const [selectedCategory, setSelectedCategory] = useState('all');

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

  const CATEGORIES = [
    { id: 'all', label: 'All Games (6)' },
    { id: 'originals', label: '🔥 Originals' },
    { id: 'crash', label: '⚡ Crash' },
    { id: 'numbers', label: '🎲 Numbers' },
  ];

  const GAMES = [
    {
      id: 'aviator',
      category: 'crash',
      name: 'AVIATOR',
      tag: 'MULTIPLIER CRASH',
      badge: 'HOT 🔥',
      rtp: '97% RTP',
      accentColor: '#f43f5e',
      gradient: 'from-white via-rose-50/50 to-white',
      border: 'hover:border-rose-400 border-rose-100',
      activePlayers: '4,120',
      liveBadge: (
        <div className="mt-2.5 flex items-center space-x-1.5 bg-rose-50/80 px-2.5 py-1 rounded-xl border border-rose-200/60 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span className="text-[10px] font-mono font-bold text-slate-500">FLIGHT:</span>
          <span className={`text-xs font-mono font-black ${
            aviatorLive.gameState === 'CRASHED' ? 'text-rose-600' :
            aviatorLive.gameState === 'WAITING' ? 'text-sky-600' : 'text-emerald-600'
          }`}>
            {aviatorLive.gameState === 'WAITING' ? `Starts ${aviatorLive.countdown}s` :
             aviatorLive.gameState === 'FLYING' ? `${aviatorLive.multiplier.toFixed(2)}x` :
             `Crashed ${aviatorLive.crashPoint.toFixed(2)}x`}
          </span>
          <div className="flex space-x-1 pl-1.5 border-l border-rose-200">
            {aviatorRecent.map((c, i) => (
              <span key={i} className="text-[9px] font-mono text-slate-600 font-bold">{c}x</span>
            ))}
          </div>
        </div>
      ),
      previewSvg: (
        <div className="relative">
          <div className="absolute -inset-2 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
          <svg className="w-16 h-16 sm:w-18 sm:h-18 opacity-90 group-hover:scale-110 group-hover:translate-x-1 group-hover:-translate-y-1 transition duration-300 drop-shadow-[0_4px_12px_rgba(244,63,94,0.3)]" viewBox="0 0 64 64" fill="none">
            <path d="M12 50 L28 42 L48 20 C52 16 58 18 56 24 L50 36 L40 40 L34 54 L26 50 L30 42 Z" fill="#f43f5e"/>
            <path d="M4 56 Q20 54 36 44" stroke="#fb7185" strokeWidth="2.5" strokeDasharray="3 3"/>
          </svg>
        </div>
      )
    },
    {
      id: 'wingo',
      category: 'numbers',
      name: 'WIN GO',
      tag: '60S COLOR & NUMBERS',
      badge: 'TOP CHOICE',
      rtp: '10X Payout',
      accentColor: '#a855f7',
      gradient: 'from-white via-purple-50/50 to-white',
      border: 'hover:border-purple-400 border-purple-100',
      activePlayers: '3,840',
      liveBadge: (
        <div className="mt-2.5 flex items-center space-x-1.5 bg-purple-50/80 px-2.5 py-1 rounded-xl border border-purple-200/60 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
          <span className="text-[10px] font-mono font-bold text-slate-500">TIMER:</span>
          <span className={`text-xs font-mono font-black ${wingoLive.isLocked ? 'text-rose-600' : 'text-purple-700'}`}>
            00:{wingoLive.secondsLeft < 10 ? `0${wingoLive.secondsLeft}` : wingoLive.secondsLeft}
          </span>
          <div className="flex space-x-1 pl-1.5 border-l border-purple-200">
            {wingoRecent.map((h, i) => (
              <span key={i} className={`text-[9px] font-mono font-black px-1.5 py-0.2 rounded ${
                h.color === 'RED' ? 'text-rose-700 bg-rose-100 border border-rose-200' : 'text-emerald-700 bg-emerald-100 border border-emerald-200'
              }`}>{h.num}</span>
            ))}
          </div>
        </div>
      ),
      previewSvg: (
        <div className="flex items-center -space-x-2 group-hover:scale-110 transition duration-300 drop-shadow-md">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-xs font-black text-white shadow-md border border-white">7</div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-xs font-black text-white shadow-md border border-white">3</div>
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-red-500 to-rose-400 flex items-center justify-center text-[10px] font-black text-white shadow-md border border-white">8</div>
        </div>
      )
    },
    {
      id: 'mines',
      category: 'originals',
      name: 'MINES',
      tag: '4x4 PROVABLY FAIR GEMS',
      badge: '99% RTP',
      rtp: '10,000x Max',
      accentColor: '#10b981',
      gradient: 'from-white via-emerald-50/50 to-white',
      border: 'hover:border-emerald-400 border-emerald-100',
      activePlayers: '2,930',
      liveBadge: (
        <div className="mt-2.5 flex items-center space-x-1.5 bg-emerald-50/80 px-2.5 py-1 rounded-xl border border-emerald-200/60 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-slate-500">FAIR:</span>
          <span className="text-xs font-mono font-black text-emerald-700">
            SHA-256 Verified
          </span>
        </div>
      ),
      previewSvg: (
        <div className="flex items-center space-x-2 group-hover:scale-110 transition duration-300">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-amber-300 flex items-center justify-center text-amber-500 shadow-sm">
            <Bomb className="w-6 h-6 animate-pulse" />
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600 text-sm font-black shadow-sm">
            💎
          </div>
        </div>
      )
    },
    {
      id: 'plinko',
      category: 'originals',
      name: 'CIRCUIT PLINKO',
      tag: 'PHYSICS PEG BOARD',
      badge: '1000X MULTIPLIER',
      rtp: '99% RTP',
      accentColor: '#0ea5e9',
      gradient: 'from-white via-sky-50/50 to-white',
      border: 'hover:border-sky-400 border-sky-100',
      activePlayers: '1,860',
      liveBadge: (
        <div className="mt-2.5 flex items-center space-x-1.5 bg-sky-50/80 px-2.5 py-1 rounded-xl border border-sky-200/60 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-slate-500">DROPS:</span>
          <span className="text-xs font-mono font-black text-sky-700">
            Continuous
          </span>
        </div>
      ),
      previewSvg: (
        <div className="w-14 h-12 flex flex-col justify-between items-center group-hover:scale-110 transition duration-300">
          <div className="w-3.5 h-3.5 rounded-full bg-sky-500 shadow-[0_0_10px_#0ea5e9] animate-bounce" />
          <div className="flex space-x-1.5 opacity-60">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          </div>
          <div className="flex space-x-1.5 text-[9px] font-mono text-sky-700 font-bold">
            <span>0.2x</span>
            <span className="text-amber-500 font-black">1000x</span>
          </div>
        </div>
      )
    },
    {
      id: 'tower',
      category: 'originals',
      name: 'NEON TOWER',
      tag: '9-ROW RISK CLIMBER',
      badge: 'HIGH STAKES',
      rtp: '100x Max',
      accentColor: '#0284c7',
      gradient: 'from-white via-cyan-50/50 to-white',
      border: 'hover:border-cyan-400 border-cyan-100',
      activePlayers: '1,240',
      liveBadge: (
        <div className="mt-2.5 flex items-center space-x-1.5 bg-cyan-50/80 px-2.5 py-1 rounded-xl border border-cyan-200/60 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-slate-500">LEVELS:</span>
          <span className="text-xs font-mono font-black text-cyan-700">
            9 Difficulty Steps
          </span>
        </div>
      ),
      previewSvg: (
        <div className="flex flex-col space-y-1 group-hover:scale-110 transition duration-300">
          <div className="w-12 h-2.5 rounded-md bg-cyan-500 shadow-[0_0_8px_#06b6d4]" />
          <div className="w-12 h-2.5 rounded-md bg-slate-200" />
          <div className="w-12 h-2.5 rounded-md bg-slate-200" />
        </div>
      )
    },
    {
      id: 'dice',
      category: 'numbers',
      name: 'QUANTUM DICE',
      tag: 'RAPID 100-PT SLIDER',
      badge: 'INSTANT WIN',
      rtp: '99% RTP',
      accentColor: '#0ea5e9',
      gradient: 'from-white via-blue-50/50 to-white',
      border: 'hover:border-blue-400 border-blue-100',
      activePlayers: '2,110',
      liveBadge: (
        <div className="mt-2.5 flex items-center space-x-1.5 bg-blue-50/80 px-2.5 py-1 rounded-xl border border-blue-200/60 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-slate-500">SPEED:</span>
          <span className="text-xs font-mono font-black text-blue-700">
            0.1s Result
          </span>
        </div>
      ),
      previewSvg: (
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center font-mono font-black text-white text-base shadow-md group-hover:rotate-12 transition duration-300 border border-white">
          88.4
        </div>
      )
    }
  ];

  const filteredGames = GAMES.filter((g) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'originals') return g.category === 'originals' || g.id === 'aviator';
    return g.category === selectedCategory;
  });

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-6 select-none">
      {/* Lobby Header with Active Players Beacon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 px-1">
        <div>
          <div className="flex items-center space-x-2">
            <Flame className="w-5 h-5 text-sky-500 animate-pulse" />
            <h3 className="text-xl font-black text-slate-900 tracking-wide font-sans">
              Casino Originals
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Provably Fair • Instant INR Settlements • Zero Latency
          </p>
        </div>

        {/* Live Active Players Beacon */}
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white border border-sky-100 text-xs text-slate-600 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono font-bold text-slate-800">16,080</span>
          <span className="text-[11px] text-slate-400">Online</span>
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              sounds.playClick();
              setSelectedCategory(cat.id);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition transform active:scale-95 ${
              selectedCategory === cat.id
                ? 'bg-sky-500 text-white shadow-md shadow-sky-400/30'
                : 'bg-white border border-sky-100 text-slate-600 hover:text-slate-900 hover:border-sky-300 shadow-sm'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 2x3 Grid matching user layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {filteredGames.map((game) => (
          <div
            key={game.id}
            onClick={() => {
              sounds.playClick();
              onSelectGame(game.id);
            }}
            className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${game.gradient} border ${game.border} p-5 flex items-center justify-between cursor-pointer transition-all duration-200 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-100/80 active:scale-[0.97] shadow-sm`}
          >
            {/* Ambient Shimmer */}
            <div className="absolute inset-0 bg-sky-400/[0.04] opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />

            {/* Left Content */}
            <div className="relative z-10 flex-1 pr-3">
              <div className="flex items-center space-x-2 mb-1.5">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-slate-900/5 text-slate-700 border border-slate-200/50 tracking-wider">
                  {game.badge}
                </span>
                <span className="text-[10px] font-bold font-mono text-sky-600">
                  {game.rtp}
                </span>
              </div>

              <h4 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight group-hover:text-sky-600 transition">
                {game.name}
              </h4>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">
                {game.tag}
              </p>

              {/* Real-time continuous live outcomes ticker */}
              {game.liveBadge}

              <div className="inline-flex items-center space-x-1.5 text-xs font-black text-sky-600 mt-3 group-hover:text-sky-700">
                <div className="w-5 h-5 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 group-hover:scale-110 transition shadow-sm">
                  <Play className="w-2.5 h-2.5 fill-current" />
                </div>
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
