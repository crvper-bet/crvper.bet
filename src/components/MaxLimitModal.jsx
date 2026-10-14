import React from 'react';
import { AlertCircle, ArrowRight, ShieldAlert, Trophy, X } from 'lucide-react';

export default function MaxLimitModal({ isOpen, onClose, onGoToWithdraw, onGoToDeposit, hasDeposited }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-[#0f172a] border-2 border-amber-500/60 rounded-3xl p-6 shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Trophy Glow */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/20">
          <Trophy className="w-8 h-8 animate-bounce" />
        </div>

        <h3 className="text-xl font-black text-white tracking-wide">
          Winning Limit Reached
        </h3>

        <div className="my-3 px-3 py-2 rounded-xl bg-amber-950/50 border border-amber-500/30 text-amber-300 font-mono font-black text-lg">
          ₹1,00,000 CAP
        </div>

        <p className="text-sm text-slate-200 font-semibold leading-relaxed">
          You reached your winning limit. Please withdraw your funds.
        </p>

        {!hasDeposited && (
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-3 my-4 text-left">
            <div className="flex items-center space-x-2 text-xs text-rose-300 font-bold">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Withdrawal Notice:</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 pl-6">
              Don't forget: withdrawing requires a 1-time real deposit of at least <strong className="text-amber-400">₹100</strong> to verify your account.
            </p>
          </div>
        )}

        <div className="space-y-2 mt-4">
          <button
            onClick={() => {
              onClose();
              if (hasDeposited) {
                onGoToWithdraw();
              } else {
                onGoToDeposit();
              }
            }}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/25 transition transform active:scale-95"
          >
            <span>{hasDeposited ? 'Withdraw ₹1,00,000 Now' : 'Deposit ₹100 to Unlock ₹1,00,000'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-xs text-slate-400 hover:text-white transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
