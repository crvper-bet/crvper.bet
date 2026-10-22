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
    { id: 'all', label: 'All Games (7)' },
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
      gradient: 'from-[#1e1018] via-[#15101a] to-[#0c121d]',
      border: 'hover:border-rose-500/60 border-rose-900/30',
      activePlayers: '4,120',
      liveBadge: (
        <div className="mt-2.5 flex items-center space-x-1.5 bg-black/50 px-2.5 py-1 rounded-xl border border-rose-500/30 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span className="text-[10px] font-mono font-bold text-slate-400">FLIGHT:</span>
          <span className={`text-xs font-mono font-black ${
            aviatorLive.gameState === 'CRASHED' ? 'text-rose-400' :
            aviatorLive.gameState === 'WAITING' ? 'text-cyan-400' : 'text-emerald-400'
          }`}>
            {aviatorLive.gameState === 'WAITING' ? `Starts ${aviatorLive.countdown}s` :
             aviatorLive.gameState === 'FLYING' ? `${aviatorLive.multiplier.toFixed(2)}x` :
             `Crashed ${aviatorLive.crashPoint.toFixed(2)}x`}
          </span>
          <div className="flex space-x-1 pl-1.5 border-l border-slate-700/60">
            {aviatorRecent.map((c, i) => (
              <span key={i} className="text-[9px] font-mono text-slate-400 font-bold">{c}x</span>
            ))}
          </div>
        </div>
      ),
      previewSvg: (
        <div className="relative">
          <div className="absolute -inset-2 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
          <svg className="w-16 h-16 sm:w-18 sm:h-18 opacity-90 group-hover:scale-110 group-hover:translate-x-1 group-hover:-translate-y-1 transition duration-300 drop-shadow-[0_0_12px_rgba(244,63,94,0.4)]" viewBox="0 0 64 64" fill="none">
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
      gradient: 'from-[#1a102a] via-[#130f24] to-[#0c121d]',
      border: 'hover:border-purple-500/60 border-purple-900/30',
      activePlayers: '3,840',
      liveBadge: (
        <div className="mt-2.5 flex items-center space-x-1.5 bg-black/50 px-2.5 py-1 rounded-xl border border-purple-500/30 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
          <span className="text-[10px] font-mono font-bold text-slate-400">TIMER:</span>
          <span className={`text-xs font-mono font-black ${wingoLive.isLocked ? 'text-rose-400' : 'text-purple-300'}`}>
            00:{wingoLive.secondsLeft < 10 ? `0${wingoLive.secondsLeft}` : wingoLive.secondsLeft}
          </span>
          <div className="flex space-x-1 pl-1.5 border-l border-slate-700/60">
            {wingoRecent.map((h, i) => (
              <span key={i} className={`text-[9px] font-mono font-black px-1.5 py-0.2 rounded ${
                h.color === 'RED' ? 'text-rose-300 bg-rose-950/70 border border-rose-500/30' : 'text-emerald-300 bg-emerald-950/70 border border-emerald-500/30'
              }`}>{h.num}</span>
            ))}
          </div>
        </div>
      ),
      previewSvg: (
        <div className="flex items-center -space-x-2 group-hover:scale-110 transition duration-300 drop-shadow-lg">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-xs font-black text-white shadow-lg border border-purple-400/40">7</div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-xs font-black text-white shadow-lg border border-emerald-400/40">3</div>
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-red-500 to-rose-400 flex items-center justify-center text-[10px] font-black text-white shadow-lg border border-rose-400/40">8</div>
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
      gradient: 'from-[#0d2218] via-[#0d1b1c] to-[#0a141f]',
      border: 'hover:border-emerald-500/60 border-emerald-900/30',
      activePlayers: '2,930',
      liveBadge: (
        <div className="mt-2.5 flex items-center space-x-1.5 bg-black/50 px-2.5 py-1 rounded-xl border border-emerald-500/30 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-slate-400">FAIR:</span>
          <span className="text-xs font-mono font-black text-emerald-400">
            SHA-256 Verified
          </span>
        </div>
      ),
      previewSvg: (
        <div className="flex items-center space-x-2 group-hover:scale-110 transition duration-300">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg">
            <Bomb className="w-6 h-6 animate-pulse" />
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 text-sm font-black shadow-lg">
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
      accentColor: '#06b6d4',
      gradient: 'from-[#0b1b26] via-[#0b1622] to-[#09101b]',
      border: 'hover:border-cyan-500/60 border-cyan-900/30',
      activePlayers: '1,860',
      liveBadge: (
        <div className="mt-2.5 flex items-center space-x-1.5 bg-black/50 px-2.5 py-1 rounded-xl border border-cyan-500/30 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-slate-400">DROPS:</span>
          <span className="text-xs font-mono font-black text-cyan-300">
            Continuous
          </span>
        </div>
      ),
      previewSvg: (
        <div className="w-14 h-12 flex flex-col justify-between items-center group-hover:scale-110 transition duration-300">
          <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#00e5ff] animate-bounce" />
          <div className="flex space-x-1.5 opacity-60">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          </div>
          <div className="flex space-x-1.5 text-[9px] font-mono text-cyan-300 font-bold">
            <span>0.2x</span>
            <span className="text-amber-400 font-black">1000x</span>
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
      accentColor: '#10b981',
      gradient: 'from-[#0d2218] via-[#0b1a1c] to-[#09101b]',
      border: 'hover:border-teal-500/60 border-teal-900/30',
      activePlayers: '1,240',
      liveBadge: (
        <div className="mt-2.5 flex items-center space-x-1.5 bg-black/50 px-2.5 py-1 rounded-xl border border-emerald-500/30 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-slate-400">LEVELS:</span>
          <span className="text-xs font-mono font-black text-emerald-300">
            9 Difficulty Steps
          </span>
        </div>
      ),
      previewSvg: (
        <div className="flex flex-col space-y-1 group-hover:scale-110 transition duration-300">
          <div className="w-12 h-2.5 rounded-md bg-emerald-400 shadow-[0_0_8px_#10b981]" />
          <div className="w-12 h-2.5 rounded-md bg-slate-700/80" />
          <div className="w-12 h-2.5 rounded-md bg-slate-700/80" />
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
      accentColor: '#3b82f6',
      gradient: 'from-[#101b33] via-[#0e1629] to-[#09101b]',
      border: 'hover:border-blue-500/60 border-blue-900/30',
      activePlayers: '2,110',
      liveBadge: (
        <div className="mt-2.5 flex items-center space-x-1.5 bg-black/50 px-2.5 py-1 rounded-xl border border-blue-500/30 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-slate-400">SPEED:</span>
          <span className="text-xs font-mono font-black text-blue-300">
            0.1s Result
          </span>
        </div>
      ),
      previewSvg: (
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-mono font-black text-white text-base shadow-lg group-hover:rotate-12 transition duration-300 border border-blue-400/40">
          88.4
        </div>
      )
    },
    {
      id: 'vertex',
      category: 'originals',
      name: 'VERTEX',
      tag: 'CONCENTRIC ELEMENTAL WHEEL',
      badge: 'NEW RELEASE ⚡',
      rtp: '125x Max',
      accentColor: '#f43f5e',
      gradient: 'from-[#220d1c] via-[#1a0f24] to-[#0c121d]',
      border: 'hover:border-rose-500/60 border-rose-900/30',
      activePlayers: '3,420',
      liveBadge: (
        <div className="mt-2.5 flex items-center space-x-1.5 bg-black/50 px-2.5 py-1 rounded-xl border border-rose-500/30 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
          <span className="text-[10px] font-mono font-bold text-slate-400">BONUS:</span>
          <span className="text-xs font-mono font-black text-rose-300">
            🔥 💧 🌿 Element Surge
          </span>
        </div>
      ),
      previewSvg: (
        <div className="relative flex items-center justify-center w-14 h-14 group-hover:scale-110 transition duration-300">
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-rose-500/60 animate-spin" style={{ animationDuration: '8s' }} />
          <div className="absolute inset-2 rounded-full border border-cyan-400/60 animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }} />
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-[10px] font-black text-white shadow-[0_0_12px_#f43f5e]">
            V
          </div>
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
            <Flame className="w-5 h-5 text-emerald-400 animate-pulse" />
            <h3 className="text-xl font-black text-white tracking-wide font-sans">
              Casino Originals
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Provably Fair • Instant INR Settlements • Zero Latency
          </p>
        </div>

        {/* Live Active Players Beacon */}
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#0e1726] border border-slate-800 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono font-bold text-white">16,080</span>
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
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-[#101929] border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
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
            className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${game.gradient} border ${game.border} p-5 flex items-center justify-between cursor-pointer transition-all duration-200 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/70 active:scale-[0.97]`}
          >
            {/* Ambient Shimmer */}
            <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />

            {/* Left Content */}
            <div className="relative z-10 flex-1 pr-3">
              <div className="flex items-center space-x-2 mb-1.5">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-white/10 text-white tracking-wider">
                  {game.badge}
                </span>
                <span className="text-[10px] font-bold font-mono text-emerald-400">
                  {game.rtp}
                </span>
              </div>

              <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight group-hover:text-emerald-300 transition">
                {game.name}
              </h4>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">
                {game.tag}
              </p>

              {/* Real-time continuous live outcomes ticker */}
              {game.liveBadge}

              <div className="inline-flex items-center space-x-1.5 text-xs font-black text-emerald-400 mt-3 group-hover:text-emerald-300">
                <div className="w-5 h-5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition">
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
