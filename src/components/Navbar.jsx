import React from 'react';
import { User, Bell, Headphones, Plus, Wallet, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';

export default function Navbar({ 
  onOpenSupport, 
  onOpenProfile, 
  onOpenPromoter, 
  onOpenAdmin,
  onGoToDeposit,
  onGoToWallet 
}) {
  const { user } = useAuth();
  const balance = user ? Number(user.walletBalance || 0).toFixed(2) : '0.00';

  return (
    <header className="sticky top-0 z-40 w-full bg-[#090e17]/95 backdrop-blur-xl border-b border-slate-800/80 px-3 sm:px-4 py-2.5">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Brand Logo - Stake / BC.Game style */}
        <div 
          className="flex items-center space-x-2 cursor-pointer select-none shrink-0" 
          onClick={() => {
            sounds.playClick();
            window.location.hash = '';
          }}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-[1.5px] shadow-lg shadow-emerald-500/25">
            <div className="w-full h-full bg-[#090e17] rounded-[10px] flex items-center justify-center font-black text-emerald-400 text-sm">
              C
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
              CRVPER
            </span>
            <span className="ml-1 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-1.5 py-0.5 rounded-md hidden xs:inline-block">
              BET
            </span>
          </div>
        </div>

        {/* Center / Right Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* Quick Balance & Instant Deposit Pill (If Logged In) */}
          {user && (
            <div className="flex items-center bg-[#0f1826] border border-slate-800/90 rounded-2xl p-1 shadow-inner">
              <button
                onClick={() => {
                  sounds.playClick();
                  if (onGoToWallet) onGoToWallet();
                }}
                className="flex items-center space-x-1.5 px-2.5 py-1 text-left hover:text-white transition group"
                title="View Wallet Vault"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <div className="flex items-baseline space-x-0.5">
                  <span className="text-[11px] font-bold text-slate-400 font-mono">₹</span>
                  <span className="text-xs sm:text-sm font-black font-mono text-white tracking-tight group-hover:text-emerald-300">
                    {balance}
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  sounds.playDeposit();
                  if (onGoToDeposit) onGoToDeposit();
                }}
                className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center space-x-1 transition shadow-md shadow-emerald-500/20 active:scale-95"
                title="Deposit Funds"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span className="hidden xs:inline">Deposit</span>
              </button>
            </div>
          )}

          {/* 24/7 VIP Support Button */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenSupport();
            }}
            className="relative p-2 rounded-xl bg-[#0f1826] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-400 transition"
            title="Live Customer Support"
          >
            <Headphones className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#090e17]" />
          </button>

          {/* User Profile or Login */}
          {user ? (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenProfile();
              }}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#0f1826] border border-slate-800 hover:border-emerald-500/50 text-slate-200 transition flex items-center space-x-1.5"
              title="My Account"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="hidden sm:inline text-xs font-mono font-bold">
                {user.phone ? user.phone.slice(-4) : 'User'}
              </span>
            </button>
          ) : (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenProfile();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-black transition shadow-lg shadow-emerald-500/25 active:scale-95"
            >
              Log In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
