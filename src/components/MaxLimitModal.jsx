import React from 'react';
import { ArrowRight, Trophy, X } from 'lucide-react';

export default function MaxLimitModal({ 
  isOpen, 
  onClose, 
  onGoToWithdraw, 
  message = "You have reached the winning amount. Please withdraw your funds to play again." 
}) {
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

        <p className="mt-4 text-sm text-amber-200/90 font-medium leading-relaxed px-2">
          {message}
        </p>

        <div className="space-y-2 mt-6">
          <button
            onClick={() => {
              onClose();
              if (onGoToWithdraw) onGoToWithdraw();
            }}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/25 transition transform active:scale-95"
          >
            <span>Withdraw Funds Now</span>
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
