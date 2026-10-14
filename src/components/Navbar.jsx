import React from 'react';
import { User, Bell, Headphones, LogOut, ShieldCheck, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onOpenSupport, onOpenProfile, onOpenPromoter, onOpenAdmin }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full bg-[#070b14]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Brand Logo matching screenshot 2 */}
        <div className="flex items-center space-x-2 cursor-pointer select-none" onClick={() => window.location.hash = ''}>
          <div className="flex items-center tracking-wider">
            <span className="text-2xl font-black italic text-white drop-shadow-[0_0_12px_rgba(0,229,255,0.4)]">
              CR<span className="text-cyan-400">V</span>PER
            </span>
            <span className="ml-1 text-xs font-black tracking-widest text-cyan-400 bg-cyan-950/80 border border-cyan-500/40 px-1.5 py-0.5 rounded-md">
              .BET
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* 24/7 VIP Support Button */}
          <button
            onClick={onOpenSupport}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-cyan-400 flex items-center space-x-1.5 text-xs font-semibold transition"
            title="Customer Support"
          >
            <Headphones className="w-4 h-4" />
            <span className="hidden sm:inline">Support</span>
          </button>

          {/* Notifications */}
          <button 
            onClick={() => alert('No new notifications. Your account is verified and ready!')}
            className="relative p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#070b14]" />
          </button>

          {/* User Profile or Login */}
          {user ? (
            <button
              onClick={onOpenProfile}
              className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:border-cyan-400 transition flex items-center space-x-1.5"
              title="My Profile"
            >
              <User className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline text-xs font-mono font-bold">
                {user.phone ? user.phone.slice(-4) : 'User'}
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenProfile}
              className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition shadow-lg shadow-cyan-500/20"
            >
              Log In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
