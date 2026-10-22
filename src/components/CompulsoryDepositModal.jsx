import React from 'react';
import { AlertTriangle, ArrowRight, ShieldAlert, Sparkles, X } from 'lucide-react';

export default function CompulsoryDepositModal({ isOpen, onClose, onGoToDeposit }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-[#0f172a] border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800/60"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Glowing Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-black text-white tracking-wide">
          Deposit Required
        </h3>

        <p className="text-sm text-slate-200 mt-2 font-semibold leading-relaxed">
          You need to deposit at least minimum <span className="text-amber-400 font-black">₹100</span>.
        </p>

        <div className="bg-[#162032] border border-amber-500/20 rounded-2xl p-3.5 my-4 text-left">
          <div className="flex items-center space-x-2 text-xs text-amber-300 font-medium">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Complete a deposit of ≥ ₹100 to verify and unlock withdrawals.</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 pl-6">
            All your balance and winnings remain 100% safe in your wallet!
          </p>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={() => {
              onClose();
              onGoToDeposit();
            }}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-amber-500/20 transition transform active:scale-95"
          >
            <span>Deposit ₹100 Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs text-slate-400 hover:text-white transition"
          >
            Continue Playing & Win More
          </button>
        </div>
      </div>
    </div>
  );
}
