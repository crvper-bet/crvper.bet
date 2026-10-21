import React, { useState, useEffect } from 'react';
import { 
  Users, Share2, Copy, Check, DollarSign, ArrowUpRight, TrendingUp, 
  ShieldCheck, ArrowLeft, LogOut, Sparkles, CheckCircle2 
} from 'lucide-react';
import { storage } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';

export default function PromoterPage({ onExit }) {
  const { promoter, loginPromoter, registerPromoter, logoutPromoter } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('');
  const [socialUsername, setSocialUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [payoutRequested, setPayoutRequested] = useState(false);
  const [payoutUpi, setPayoutUpi] = useState('');

  const [livePromoter, setLivePromoter] = useState(promoter);

  useEffect(() => {
    const update = () => {
      setLivePromoter(storage.getCurrentPromoter());
    };
    update();
    window.addEventListener('crvper_promoter_updated', update);
    return () => window.removeEventListener('crvper_promoter_updated', update);
  }, [promoter]);

  const handleAuth = (e) => {
    e.preventDefault();
    setError('');
    sounds.playClick();

    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    if (isRegister) {
      if (!socialUsername.trim()) {
        setError('Please enter your social media handle / channel name.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      try {
        registerPromoter(phone, socialUsername.trim(), password);
        sounds.playWin();
      } catch (err) {
        setError(err.message || 'Registration failed');
      }
    } else {
      try {
        loginPromoter(phone, password);
        sounds.playWin();
      } catch (err) {
        setError(err.message || 'Login failed');
      }
    }
  };

  const inviteLink = livePromoter 
    ? `${window.location.origin}/?ref=${livePromoter.code}` 
    : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    sounds.playClick();
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(livePromoter.code);
    setCopiedCode(true);
    sounds.playClick();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRequestPayout = (e) => {
    e.preventDefault();
    if (!livePromoter || livePromoter.commissionBalance < 100) {
      alert('Minimum promoter commission withdrawal is ₹100.');
      return;
    }
    if (!payoutUpi.trim()) {
      alert('Please enter your UPI ID or Bank details for payout.');
      return;
    }

    // Submit request
    alert(`Commission payout request of ₹${livePromoter.commissionBalance} sent to CRVPER Finance team!`);
    setPayoutRequested(true);
  };

  if (!livePromoter) {
    return (
      <div className="min-h-screen bg-[#090e17] flex flex-col items-center justify-center p-4 selection:bg-purple-500 selection:text-white">
        <div className="w-full max-w-sm bg-[#0f1826] border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
          <div className="text-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto mb-3 shadow-lg shadow-purple-500/20">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-white tracking-wide">
              {isRegister ? 'Become a CRVPER Promoter' : 'Promoter / Influencer Portal'}
            </h2>
            <p className="text-xs text-purple-300 font-semibold mt-1">
              Earn 20% Recurring Commission on Every Deposit!
            </p>
          </div>

          {/* Segmented Switcher for Sign In / Create Account */}
          <div className="grid grid-cols-2 gap-1 bg-[#131f33] p-1 rounded-2xl mb-4 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError('');
              }}
              className={`py-2 rounded-xl text-xs font-black transition ${
                !isRegister ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError('');
              }}
              className={`py-2 rounded-xl text-xs font-black transition ${
                isRegister ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs text-center font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="10-digit mobile number"
                className="w-full bg-[#131f33] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            {isRegister && (
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Social Username (IG / YouTube / Telegram)
                </label>
                <input
                  type="text"
                  value={socialUsername}
                  onChange={(e) => setSocialUsername(e.target.value)}
                  placeholder="@crvper_creator"
                  className="w-full bg-[#131f33] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#131f33] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            {isRegister && (
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#131f33] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-black rounded-xl text-sm transition transform active:scale-95 shadow-lg shadow-purple-500/25"
            >
              {isRegister ? 'Join & Generate Invite Link' : 'Log In to Promoter Dashboard'}
            </button>
          </form>

          <button
            onClick={onExit}
            className="w-full mt-4 text-xs text-slate-500 hover:text-slate-300 transition text-center"
          >
            ← Return to CRVPER Game Platform
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090e17] text-slate-100 p-3 sm:p-4 pb-20 selection:bg-purple-500 selection:text-white">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#0f1826] border border-slate-800 rounded-2xl p-3">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <button
              onClick={onExit}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-black text-white flex items-center space-x-2">
                <span>Promoter Dashboard</span>
                <span className="text-[10px] bg-purple-950 text-purple-400 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                  20% Commission
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">@{livePromoter.socialUsername} ({livePromoter.phone})</p>
            </div>
          </div>

          <button
            onClick={logoutPromoter}
            className="p-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-400 border border-rose-800 transition"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* 20% Commission Wallet Card */}
        <div className="bg-gradient-to-r from-purple-950/80 via-indigo-950/80 to-[#0f1826] border border-purple-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute right-[-20px] top-[-20px] w-40 h-40 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider block">
                Available Commission Wallet
              </span>
              <div className="text-3xl sm:text-4xl font-black font-mono text-white mt-1">
                ₹{Number(livePromoter.commissionBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-purple-200/80 mt-1">
                20% automatic cut on every single deposit by your referred players.
              </p>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <DollarSign className="w-8 h-8" />
            </div>
          </div>

          {/* Withdraw Commission form */}
          <div className="mt-5 pt-4 border-t border-purple-500/20 flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              value={payoutUpi}
              onChange={(e) => setPayoutUpi(e.target.value)}
              placeholder="Your UPI ID or Bank Account for Payout"
              className="flex-1 w-full bg-[#0b0f19]/80 border border-purple-500/40 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
            />
            <button
              onClick={handleRequestPayout}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-black font-black text-xs transition transform active:scale-95 shadow-md flex items-center justify-center space-x-1.5"
            >
              <span>Request Payout</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
          <div className="bg-[#0f1826] border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center space-x-2 text-slate-400 mb-1">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold">Total Players Invited</span>
            </div>
            <span className="text-2xl font-black font-mono text-white">
              {livePromoter.totalInvited || 0}
            </span>
          </div>

          <div className="bg-[#0f1826] border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center space-x-2 text-slate-400 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold">Referred Deposits Volume</span>
            </div>
            <span className="text-2xl font-black font-mono text-emerald-400">
              ₹{(livePromoter.totalDepositsFromInvited || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Unique Invite Link & Promo Code Share */}
        <div className="bg-[#0f1826] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-black text-white flex items-center space-x-2">
            <Share2 className="w-4 h-4 text-purple-400" />
            <span>Your Unique Referral Link</span>
          </h3>

          <div className="bg-[#131f33] border border-slate-700/80 rounded-2xl p-3 flex items-center justify-between">
            <span className="text-xs font-mono text-purple-300 truncate mr-2">
              {inviteLink}
            </span>
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center space-x-1 transition shrink-0"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 block mb-1">
              Your Referral Code
            </span>
            <div className="flex items-center space-x-2">
              <span className="px-4 py-2 rounded-xl bg-purple-950/60 border border-purple-500/40 font-mono font-black text-lg text-purple-300 tracking-wider">
                {livePromoter.code}
              </span>
              <button
                onClick={handleCopyCode}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs text-slate-300 font-bold transition"
              >
                {copiedCode ? 'Copied ✓' : 'Copy Code'}
              </button>
            </div>
          </div>

          <div className="bg-purple-950/20 border border-purple-500/20 rounded-2xl p-3.5 text-xs text-purple-200/80 space-y-1">
            <p className="font-bold text-white">How You Get Paid:</p>
            <p>1. Share your link or code on YouTube, Instagram bio, Telegram, or WhatsApp.</p>
            <p>2. When users click and register, they get ₹150 pre-deposit bonus instantly.</p>
            <p>3. Every time they make a deposit (Min ₹100), <strong>20% of the deposit</strong> is automatically added to your Commission Wallet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
