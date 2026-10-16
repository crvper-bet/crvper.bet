import React, { useState } from 'react';
import { 
  ArrowLeft, Shield, Wallet, ArrowDownLeft, ArrowUpRight, Copy, Check, 
  Volume2, VolumeX, Headphones, Key, LogOut, Trophy, Award, Gift, 
  ExternalLink, Sparkles, ChevronRight, CheckCircle2 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';
import { storage } from '../services/storage';

export default function AccountPage({ 
  onBack, 
  onGoToWallet, 
  onGoToDeposit, 
  onGoToWithdraw, 
  onGoToActivity, 
  onGoToPromoter,
  onOpenSupport 
}) {
  const { user, logout, refreshUser } = useAuth();
  const [copiedId, setCopiedId] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [isMuted, setIsMuted] = useState(() => sounds.isMuted());
  
  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);

  if (!user) return null;

  const handleCopyId = () => {
    sounds.playClick();
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyRef = () => {
    sounds.playClick();
    const refCode = user.id.slice(-6).toUpperCase();
    navigator.clipboard.writeText(refCode);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleToggleSound = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    sounds.setMuted(nextState);
    if (!nextState) {
      sounds.playClick();
    }
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess(false);

    if (oldPassword !== user.password) {
      setPassError('Current password does not match.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setPassError('New password must be at least 4 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    // Update in storage
    const users = storage.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx].password = newPassword;
      storage.saveUsers(users);
      user.password = newPassword;
      storage.setCurrentUser(user);
      refreshUser();
      setPassSuccess(true);
      sounds.playWin();
      setTimeout(() => {
        setShowPasswordModal(false);
        setPassSuccess(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 1500);
    }
  };

  // VIP Tier Calculation based on deposit
  const totalDep = Number(user.totalDeposited || 0);
  let vipTier = 'BRONZE VIP';
  let tierColor = 'from-amber-700 to-amber-900 border-amber-600/50 text-amber-300';
  let nextTier = 'Silver VIP (₹500)';
  let progressPct = Math.min(100, Math.floor((totalDep / 500) * 100));

  if (totalDep >= 10000) {
    vipTier = 'DIAMOND VIP';
    tierColor = 'from-cyan-500 to-blue-600 border-cyan-400 text-cyan-200';
    nextTier = 'MAX VIP TIER';
    progressPct = 100;
  } else if (totalDep >= 2500) {
    vipTier = 'PLATINUM VIP';
    tierColor = 'from-purple-500 to-indigo-600 border-purple-400 text-purple-200';
    nextTier = 'Diamond VIP (₹10,000)';
    progressPct = Math.min(100, Math.floor((totalDep / 10000) * 100));
  } else if (totalDep >= 500) {
    vipTier = 'SILVER VIP';
    tierColor = 'from-slate-400 to-slate-600 border-slate-300 text-slate-100';
    nextTier = 'Platinum VIP (₹2,500)';
    progressPct = Math.min(100, Math.floor((totalDep / 2500) * 100));
  }

  // Mask phone
  const maskedPhone = user.phone ? `${user.phone.slice(0, 2)}••••••${user.phone.slice(-2)}` : 'N/A';
  const memberDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '2026';

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 pb-28 selection:bg-cyan-500 selection:text-black">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-[#0c1220]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              sounds.playClick();
              onBack();
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-base font-black text-white tracking-wide">MY ACCOUNT</h1>
            <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">VIP Player Profile</p>
          </div>
          <button
            onClick={handleToggleSound}
            className={`p-2 rounded-xl border transition ${
              isMuted 
                ? 'bg-rose-950/60 border-rose-500/40 text-rose-300' 
                : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
            }`}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        
        {/* User Identity Hero Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0e172a] via-[#0c1424] to-[#121124] border border-slate-800 rounded-3xl p-5 shadow-2xl">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-cyan-500/10 blur-3xl pointer-events-none rounded-full" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-purple-500/10 blur-3xl pointer-events-none rounded-full" />

          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20">
                  <div className="w-full h-full bg-[#090d16] rounded-2xl flex items-center justify-center text-2xl font-black text-white">
                    {user.phone ? user.phone.slice(-2) : 'CR'}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-[#090d16]" title="Active Online" />
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-black text-white tracking-wide font-mono">
                    +91 {maskedPhone}
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <button 
                    onClick={handleCopyId}
                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700/80 text-[10px] font-mono text-slate-300 hover:text-white transition"
                  >
                    <span>ID: {user.id.slice(0, 10)}...</span>
                    {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>
                  <span className="text-[10px] text-slate-500">Since {memberDate}</span>
                </div>
              </div>
            </div>

            {/* VIP Tier Badge */}
            <div className={`px-2.5 py-1 rounded-xl bg-gradient-to-r ${tierColor} border text-[10px] font-black tracking-wider uppercase shadow-md flex items-center space-x-1`}>
              <Trophy className="w-3 h-3" />
              <span>{vipTier}</span>
            </div>
          </div>

          {/* VIP Progress Bar */}
          <div className="mt-4 pt-3.5 border-t border-slate-800/80">
            <div className="flex justify-between text-[11px] mb-1.5 font-bold">
              <span className="text-slate-400">VIP Level Progress</span>
              <span className="text-cyan-400 font-mono">{progressPct}% • {nextTier}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-700 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Fast Balance Bar */}
          <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Total Wallet Balance
              </span>
              <span className="text-2xl font-black font-mono text-white mt-0.5 block">
                ₹{Number(user.walletBalance || 0).toFixed(2)}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  sounds.playDeposit();
                  onGoToDeposit();
                }}
                className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs transition transform active:scale-95 shadow-md shadow-emerald-500/20 flex items-center space-x-1"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Deposit</span>
              </button>
              <button
                onClick={() => {
                  sounds.playWithdraw();
                  onGoToWithdraw();
                }}
                className="px-3 py-2 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-black rounded-xl text-xs transition transform active:scale-95 shadow-md shadow-rose-500/20 flex items-center space-x-1"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Withdraw</span>
              </button>
            </div>
          </div>
        </div>

        {/* Financial Lifetime Performance Matrix */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0c1220] border border-slate-800/80 rounded-2xl p-3.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Total Deposited
            </span>
            <span className="text-lg font-black font-mono text-emerald-400 mt-1 block">
              ₹{Number(user.totalDeposited || 0).toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Verified Payments</span>
          </div>

          <div className="bg-[#0c1220] border border-slate-800/80 rounded-2xl p-3.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Total Withdrawn
            </span>
            <span className="text-lg font-black font-mono text-rose-400 mt-1 block">
              ₹{Number(user.totalWithdrawn || 0).toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Direct Bank / UPI</span>
          </div>
        </div>

        {/* Invite Friends Referral Card */}
        <div className="bg-gradient-to-r from-purple-950/40 via-[#0e1424] to-indigo-950/40 border border-purple-500/30 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-black text-purple-300 flex items-center space-x-1.5">
                <Gift className="w-4 h-4 text-purple-400" />
                <span>Invite Friends & Earn Rewards</span>
              </span>
              <p className="text-[11px] text-slate-300 leading-snug">
                Share your referral code to earn bonuses & 20% commission on invited player deposits.
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center space-x-2">
            <div className="flex-1 bg-black/50 border border-purple-500/30 rounded-xl px-3 py-2 font-mono font-black text-xs text-white">
              {user.id.slice(-6).toUpperCase()}
            </div>
            <button
              onClick={handleCopyRef}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex items-center space-x-1"
            >
              {copiedRef ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedRef ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        {/* Menu Navigation Sections */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1 block">
            Wallet & Activities
          </span>

          {/* Full Wallet Dashboard */}
          <button
            onClick={() => {
              sounds.playClick();
              onGoToWallet();
            }}
            className="w-full bg-[#0c1220] hover:bg-[#11192d] border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between transition group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-xs font-black text-white block">Full Wallet Dashboard</span>
                <span className="text-[10px] text-slate-400">Balance breakdown, quick deposit & history</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition" />
          </button>

          {/* Transaction History */}
          <button
            onClick={() => {
              sounds.playClick();
              onGoToActivity();
            }}
            className="w-full bg-[#0c1220] hover:bg-[#11192d] border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between transition group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                <Award className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-xs font-black text-white block">Game Activity & History</span>
                <span className="text-[10px] text-slate-400">Wins, losses, multiplier records</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
          </button>

          {/* Promoter Hub */}
          <button
            onClick={() => {
              sounds.playClick();
              onGoToPromoter();
            }}
            className="w-full bg-[#0c1220] hover:bg-[#11192d] border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between transition group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-xs font-black text-white block">Promoter & Influencer Hub</span>
                <span className="text-[10px] text-purple-400 font-bold">20% Direct Commission Program</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition" />
          </button>
        </div>

        {/* Preferences & Security */}
        <div className="space-y-2 pt-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1 block">
            Settings & Support
          </span>

          {/* Sound Toggle */}
          <div className="bg-[#0c1220] border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </div>
              <div className="text-left">
                <span className="text-xs font-black text-white block">Game Sound FX</span>
                <span className="text-[10px] text-slate-400">Custom dynamic casino audio effects</span>
              </div>
            </div>
            <button
              onClick={handleToggleSound}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                !isMuted ? 'bg-cyan-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  !isMuted ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Change Password */}
          <button
            onClick={() => {
              sounds.playClick();
              setShowPasswordModal(true);
            }}
            className="w-full bg-[#0c1220] hover:bg-[#11192d] border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between transition group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
                <Key className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-xs font-black text-white block">Security & Password</span>
                <span className="text-[10px] text-slate-400">Update your account login password</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition" />
          </button>

          {/* Customer Support */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenSupport();
            }}
            className="w-full bg-[#0c1220] hover:bg-[#11192d] border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between transition group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-105 transition">
                <Headphones className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-xs font-black text-white block">24/7 VIP Customer Support</span>
                <span className="text-[10px] text-emerald-400 font-bold">● Active Online Support Desk</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition" />
          </button>

          {/* Logout Action */}
          <button
            onClick={() => {
              if (confirm('Are you sure you want to log out of your CRVPER account?')) {
                sounds.playClick();
                logout();
              }
            }}
            className="w-full mt-4 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-500/30 rounded-2xl p-3.5 flex items-center justify-center space-x-2 text-rose-300 font-black text-xs transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Account</span>
          </button>
        </div>

      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-white mb-1">Change Password</h3>
            <p className="text-xs text-slate-400 mb-4">Set a new secure password for your CRVPER account.</p>

            {passError && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-bold text-center">
                {passError}
              </div>
            )}

            {passSuccess && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center flex items-center justify-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Password updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Current Password</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs transition"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
