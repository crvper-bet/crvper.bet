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
        className="relative overflow-hidden bg-gradient-to-br from-[#101927] via-[#0d1522] to-[#0a101a] border border-slate-800/90 hover:border-slate-700/80 cursor-pointer transition-all duration-200 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-black/60 group"
      >
        {/* Subtle Ambient Emerald Corner Light */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Left Side: Balance & Vault Breakdown */}
          <div className="flex-1">
            <div className="flex items-center justify-between sm:justify-start sm:space-x-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>CASINO VAULT BALANCE</span>
              </span>

              <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => {
                    sounds.playClick();
                    setHideBalance(!hideBalance);
                  }}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-300 transition"
                  title={hideBalance ? "Show Balance" : "Hide Balance"}
                >
                  {hideBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button 
                  onClick={handleRefresh}
                  className="p-1 rounded-lg text-slate-500 hover:text-emerald-400 transition"
                  title="Refresh balance"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${spinning ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Main Balance Row */}
            <div className="mt-1.5 flex items-baseline space-x-2">
              <span className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight drop-shadow-sm">
                <span className="text-emerald-400 mr-1 text-2xl font-mono">₹</span>
                {hideBalance ? '••••••' : balance}
              </span>

              {/* Real-time win/loss delta flash */}
              {walletFlash && (
                <span 
                  className={`text-xs font-black font-mono animate-bounce px-2 py-0.5 rounded-lg ${
                    walletFlash.type === 'up' 
                      ? 'text-emerald-300 bg-emerald-950/90 border border-emerald-500/50' 
                      : 'text-rose-300 bg-rose-950/90 border border-rose-500/50'
                  }`}
                >
                  {walletFlash.amount}
                </span>
              )}
            </div>

            {/* 4-Tier Micro-Vault Breakdown */}
            <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-[#141f33]/70 rounded-xl px-2.5 py-1.5 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Deposited</span>
                <span className="text-xs font-black font-mono text-emerald-400">
                  ₹{eligibility.depositBalance.toFixed(2)}
                </span>
              </div>
              <div className="bg-[#141f33]/70 rounded-xl px-2.5 py-1.5 border border-slate-800/80">
                <span className="text-[10px] text-purple-400 uppercase font-bold block">Bonus</span>
                <span className="text-xs font-black font-mono text-purple-300">
                  ₹{eligibility.bonusBalance.toFixed(2)}
                </span>
              </div>
              <div className="bg-[#141f33]/70 rounded-xl px-2.5 py-1.5 border border-slate-800/80">
                <span className="text-[10px] text-cyan-400 uppercase font-bold block">Winnings</span>
                <span className="text-xs font-black font-mono text-cyan-300">
                  ₹{eligibility.winningsBalance.toFixed(2)}
                </span>
              </div>
              <div className="bg-[#141f33]/70 rounded-xl px-2.5 py-1.5 border border-slate-800/80">
                <span className="text-[10px] text-amber-400 uppercase font-bold block">Withdrawable</span>
                <span className="text-xs font-black font-mono text-white">
                  ₹{eligibility.withdrawableBalance.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Withdrawal Condition Alert Strip */}
            <div className="mt-2.5">
              {user && !eligibility.hasDeposited && (
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                  <span>🔒</span>
                  <span>Deposit ₹100 to unlock withdrawals</span>
                </div>
              )}
              {user && eligibility.hasDeposited && !eligibility.hasMetWagering && (
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-300 text-[11px] font-bold">
                  <span>⏳</span>
                  <span>₹{eligibility.wageringRemaining.toFixed(2)} wagering needed to withdraw</span>
                </div>
              )}
              {user && eligibility.hasDeposited && eligibility.hasMetWagering && (
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                  <span>✓</span>
                  <span>Eligible to withdraw ₹{eligibility.withdrawableBalance.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Dual Action Buttons */}
          <div className="flex sm:flex-col items-stretch gap-2 shrink-0 pt-2 sm:pt-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                sounds.playDeposit();
                onDepositClick();
              }}
              className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-500/25 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Deposit</span>
            </button>

            <button
              onClick={() => {
                sounds.playWithdraw();
                onWithdrawClick();
              }}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-2xl bg-[#172236] hover:bg-[#1d2b45] border border-slate-700/80 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition transform active:scale-95"
            >
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
              <span>Withdraw</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
