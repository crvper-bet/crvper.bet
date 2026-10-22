import React, { useState } from 'react';
import { Wallet, RefreshCw, Plus, ArrowUpRight, Eye, EyeOff, ShieldCheck, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';
import { storage } from '../services/storage';

export default function WalletCard({ onDepositClick, onWithdrawClick, onWalletClick }) {
  const { user, walletFlash, refreshUser } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);

  const balance = user ? Number(user.walletBalance || 0).toFixed(2) : '150.00';
  const eligibility = storage.getWithdrawalEligibility(user?.id);

  const handleRefresh = (e) => {
    e.stopPropagation();
    sounds.playClick();
    setSpinning(true);
    refreshUser();
    setTimeout(() => setSpinning(false), 600);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-3 select-none">
      <div 
        onClick={onWalletClick}
        className="relative overflow-hidden bg-gradient-to-br from-white via-sky-50/60 to-white border border-sky-100 hover:border-sky-300 cursor-pointer transition-all duration-200 rounded-3xl p-4 sm:p-5 shadow-lg shadow-sky-100/70 group"
      >
        {/* Subtle Ambient Sky Blue Corner Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-sky-300/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Left Side: Balance & Vault Breakdown */}
          <div className="flex-1">
            <div className="flex items-center justify-between sm:justify-start sm:space-x-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                <span>CASINO VAULT BALANCE</span>
              </span>

              <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => {
                    sounds.playClick();
                    setHideBalance(!hideBalance);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
                  title={hideBalance ? "Show Balance" : "Hide Balance"}
                >
                  {hideBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button 
                  onClick={handleRefresh}
                  className="p-1 rounded-lg text-slate-400 hover:text-sky-600 transition"
                  title="Refresh balance"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${spinning ? 'animate-spin text-sky-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Main Balance Row */}
            <div className="mt-1.5 flex items-baseline space-x-2">
              <span className="text-3xl sm:text-4xl font-black font-mono text-slate-900 tracking-tight">
                <span className="text-sky-600 mr-1 text-2xl font-mono">₹</span>
                {hideBalance ? '••••••' : balance}
              </span>

              {/* Real-time win/loss delta flash */}
              {walletFlash && (
                <span 
                  className={`text-xs font-black font-mono animate-bounce px-2 py-0.5 rounded-lg ${
                    walletFlash.type === 'up' 
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                      : 'text-rose-700 bg-rose-50 border border-rose-200'
                  }`}
                >
                  {walletFlash.amount}
                </span>
              )}
            </div>

            {/* 4-Vault Segregated Micro Ledger Strip */}
            <div className="mt-3 grid grid-cols-3 gap-2 max-w-sm">
              <div className="bg-sky-50/80 border border-sky-100 rounded-xl p-1.5 px-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Deposit</span>
                <span className="text-xs font-mono font-black text-slate-800">
                  ₹{Number(user?.depositBalance || 0).toFixed(0)}
                </span>
              </div>
              <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-1.5 px-2">
                <span className="text-[10px] text-emerald-600 uppercase font-bold block">Bonus</span>
                <span className="text-xs font-mono font-black text-emerald-700">
                  ₹{Number(user?.bonusBalance || (user ? 0 : 150)).toFixed(0)}
                </span>
              </div>
              <div className="bg-sky-100/60 border border-sky-200 rounded-xl p-1.5 px-2">
                <span className="text-[10px] text-sky-700 uppercase font-bold block">Withdrawable</span>
                <span className="text-xs font-mono font-black text-sky-800">
                  ₹{eligibility.withdrawableBalance.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Withdrawal Condition Alert Strip */}
            <div className="mt-2.5">
              {eligibility.hasDeposited ? (
                eligibility.isWageringDone ? (
                  <div className="flex items-center space-x-1.5 text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                    <span>✓</span>
                    <span>Eligible to withdraw ₹{eligibility.withdrawableBalance.toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1.5 text-[10px] text-sky-700 font-bold bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-xl">
                    <span>⏳</span>
                    <span>₹{eligibility.wageringRemaining.toFixed(2)} wagering needed to withdraw</span>
                  </div>
                )
              ) : (
                <div className="flex items-center space-x-1.5 text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                  <span>⚠</span>
                  <span>Deposit ₹100 to unlock withdrawals</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Primary Deposit & Withdraw CTA Buttons */}
          <div className="flex flex-row md:flex-col items-center justify-end gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-sky-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                sounds.playDeposit();
                onDepositClick();
              }}
              className="flex-1 md:flex-none w-full md:w-36 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-400 hover:from-sky-600 hover:to-cyan-500 text-white font-black text-xs sm:text-sm flex items-center justify-center space-x-1.5 shadow-md shadow-sky-400/30 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Deposit</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                sounds.playWithdraw();
                onWithdrawClick();
              }}
              className="flex-1 md:flex-none w-full md:w-36 py-2.5 sm:py-3 rounded-2xl bg-white hover:bg-sky-50 border border-sky-200 text-slate-800 font-black text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition active:scale-95 shadow-sm"
            >
              <ArrowUpRight className="w-4 h-4 text-sky-600" />
              <span>Withdraw</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
