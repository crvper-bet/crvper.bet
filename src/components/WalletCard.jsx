import React, { useState } from 'react';
import { Wallet, RefreshCw, Plus, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';
import { storage } from '../services/storage';

export default function WalletCard({ onDepositClick, onWithdrawClick, onWalletClick }) {
  const { user, walletFlash, refreshUser } = useAuth();
  const [spinning, setSpinning] = useState(false);

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
    <div className="w-full max-w-4xl mx-auto px-4 mt-4 select-none">
      <div 
        onClick={onWalletClick}
        className="relative bg-[#0f172a]/95 hover:border-slate-700 cursor-pointer transition border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
      >
        
        {/* Left Side: Wallet Balance Info */}
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Wallet className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Wallet Balance (Tap to Open)
              </span>
              <button 
                onClick={handleRefresh}
                className="text-slate-500 hover:text-cyan-400 p-0.5 transition"
                title="Refresh balance"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${spinning ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>

            <div className="relative flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                ₹{balance}
              </span>

              {/* Floating Real-Time Delta Flash */}
              {walletFlash && (
                <span 
                  className={`text-xs font-black font-mono animate-bounce px-1.5 py-0.5 rounded ${
                    walletFlash.type === 'up' 
                      ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-500/40' 
                      : 'text-rose-400 bg-rose-950/80 border border-rose-500/40'
                  }`}
                >
                  {walletFlash.amount}
                </span>
              )}
            </div>

            {user && !eligibility.hasDeposited && (
              <span className="text-[10px] text-amber-400 font-bold flex items-center space-x-1">
                <span>🔒 Deposit ₹100 to unlock withdrawals</span>
              </span>
            )}
            {user && eligibility.hasDeposited && !eligibility.hasMetWagering && (
              <span className="text-[10px] text-cyan-400 font-bold flex items-center space-x-1">
                <span>⏳ ₹{eligibility.wageringRemaining.toFixed(2)} wagering needed to withdraw</span>
              </span>
            )}
            {user && eligibility.hasDeposited && eligibility.hasMetWagering && (
              <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                <span>✓ Withdrawable: ₹{eligibility.withdrawableBalance.toFixed(2)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Deposit & Withdraw Buttons matching user colors */}
        <div className="flex items-center space-x-2.5 sm:space-x-3" onClick={(e) => e.stopPropagation()}>
          {/* Deposit Button (Cyan / Green Gradient) */}
          <button
            onClick={() => {
              sounds.playDeposit();
              onDepositClick();
            }}
            className="flex-1 sm:flex-none px-5 py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-500/20 transition transform active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Deposit</span>
          </button>

          {/* Withdraw Button (Red / Crimson Accent) */}
          <button
            onClick={() => {
              sounds.playWithdraw();
              onWithdrawClick();
            }}
            className="flex-1 sm:flex-none px-5 py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-sm flex items-center justify-center space-x-1.5 shadow-lg shadow-rose-600/20 transition transform active:scale-95"
          >
            <ArrowUpRight className="w-4 h-4 stroke-[3]" />
            <span>Withdraw</span>
          </button>
        </div>

      </div>
    </div>
  );
}
