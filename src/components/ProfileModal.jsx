import React from 'react';
import { User, ShieldCheck, LogOut, X, Gift, Phone, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, logout } = useAuth();

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-white border-sky-200 border border-sky-100 rounded-3xl p-6 shadow-2xl relative space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 rounded-full bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Avatar & Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-cyan-500/10 border-2 border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/20">
            <User className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-white">Player Profile</h3>
          <p className="text-xs font-mono text-cyan-400 mt-0.5">+91 {user.phone}</p>
        </div>

        {/* Status Pills */}
        <div className="bg-[#131b2e] border border-sky-200/80 rounded-2xl p-3.5 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Withdrawal Verification:</span>
            <span className={`font-bold font-mono px-2 py-0.5 rounded-full ${
              user.hasDeposited 
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' 
                : 'bg-amber-950 text-amber-400 border border-amber-500/30'
            }`}>
              {user.hasDeposited ? 'VERIFIED (Unlocked)' : '100₹ DEPOSIT REQUIRED'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500">Wallet Balance:</span>
            <span className="font-mono font-bold text-white">₹{Number(user.walletBalance).toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500">Invited By:</span>
            <span className="font-mono text-cyan-400 font-bold">{user.referredBy || 'Direct'}</span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => {
            sounds.playClick();
            logout();
            onClose();
          }}
          className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30 font-bold text-xs flex items-center justify-center space-x-2 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out of CRVPER</span>
        </button>
      </div>
    </div>
  );
}
