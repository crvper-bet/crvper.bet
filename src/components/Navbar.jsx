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
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-xl border-b border-sky-100 px-3 sm:px-4 py-2.5 shadow-sm shadow-sky-100/50">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Brand Logo - Glacier Sky Blue Style */}
        <div 
          className="flex items-center space-x-2 cursor-pointer select-none shrink-0" 
          onClick={() => {
            sounds.playClick();
            window.location.hash = '';
          }}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 p-[1.5px] shadow-md shadow-sky-400/30">
            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center font-black text-sky-500 text-sm">
              C
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 font-sans">
              CRVPER
            </span>
            <span className="ml-1 text-[10px] font-black uppercase tracking-widest text-sky-600 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-md hidden xs:inline-block">
              BET
            </span>
          </div>
        </div>

        {/* Center / Right Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* Quick Balance & Instant Deposit Pill (If Logged In) */}
          {user && (
            <div className="flex items-center bg-sky-50/80 border border-sky-100 rounded-2xl p-1 shadow-sm">
              <button
                onClick={() => {
                  sounds.playClick();
                  if (onGoToWallet) onGoToWallet();
                }}
                className="flex items-center space-x-1.5 px-2.5 py-1 text-left hover:text-sky-700 transition group"
                title="View Wallet Vault"
              >
                <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                <div className="flex items-baseline space-x-0.5">
                  <span className="text-[11px] font-bold text-slate-400 font-mono">₹</span>
                  <span className="text-xs sm:text-sm font-black font-mono text-slate-800 tracking-tight group-hover:text-sky-600">
                    {balance}
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  sounds.playDeposit();
                  if (onGoToDeposit) onGoToDeposit();
                }}
                className="px-3 py-1 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-600 hover:to-cyan-500 text-white font-black text-xs flex items-center space-x-1 transition shadow-md shadow-sky-400/25 active:scale-95"
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
            className="relative p-2 rounded-xl bg-white hover:bg-sky-50 border border-sky-100 text-slate-600 hover:text-sky-600 transition shadow-sm"
            title="Live Customer Support"
          >
            <Headphones className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-500 ring-2 ring-white" />
          </button>

          {/* User Profile or Login */}
          {user ? (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenProfile();
              }}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white border border-sky-100 hover:border-sky-300 text-slate-700 transition flex items-center space-x-1.5 shadow-sm"
              title="My Account"
            >
              <div className="w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="hidden sm:inline text-xs font-mono font-bold text-slate-800">
                {user.phone ? user.phone.slice(-4) : 'User'}
              </span>
            </button>
          ) : (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenProfile();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-600 hover:to-cyan-500 text-white text-xs font-black transition shadow-md shadow-sky-400/25 active:scale-95"
            >
              Log In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
