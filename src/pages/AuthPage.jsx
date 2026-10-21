import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Phone, UserPlus, LogIn, Shield, Users, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';

export default function AuthPage({ onAdminClick, onPromoterClick, onComplete }) {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('ref') || '';
  });
  const [agreed, setAgreed] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    sounds.playClick();

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!password || password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    if (isRegister) {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (!agreed) {
        setError('Please agree to terms and conditions.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(cleanPhone, password, inviteCode);
        sounds.playRegister();
      } else {
        await login(cleanPhone, password);
        sounds.playLogin();
      }
      if (onComplete) onComplete();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090e17] flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-black">
      {/* Container - Stake / BC.Game Luxury Dark Card */}
      <div className="w-full max-w-[430px] bg-[#0f1826] border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        {/* Ambient Top Glow */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-20 bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* Top Logo */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center space-x-2 tracking-wider mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-[1.5px] shadow-lg shadow-emerald-500/30">
              <div className="w-full h-full bg-[#090e17] rounded-[10px] flex items-center justify-center font-black text-emerald-400 text-base">
                C
              </div>
            </div>
            <span className="text-3xl font-black italic text-white tracking-tight">
              CRVPER<span className="text-emerald-400">.BET</span>
            </span>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="grid grid-cols-2 bg-[#090e17] border border-slate-800 p-1 rounded-2xl mt-3">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setIsRegister(true);
                setError('');
              }}
              className={`py-2 rounded-xl text-xs font-black transition-all ${
                isRegister
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setIsRegister(false);
                setError('');
              }}
              className={`py-2 rounded-xl text-xs font-black transition-all ${
                !isRegister
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Registration Bonus Pill Banner */}
        {isRegister && (
          <div className="mb-4 p-2.5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-teal-950/50 to-emerald-950/70 border border-emerald-500/40 flex items-center space-x-2 text-xs text-emerald-300">
            <span className="text-base">🎁</span>
            <span className="font-bold">
              ₹150 Free Signup Bonus will be credited instantly on registration!
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs text-center font-bold animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Phone Input with +91 indicator */}
          <div>
            <div className="relative flex items-center bg-[#131f33] border border-slate-700/80 focus-within:border-emerald-500 rounded-2xl overflow-hidden transition">
              <div className="flex items-center space-x-1.5 px-3.5 py-3 border-r border-slate-700/80 bg-[#17253d] text-xs font-bold text-slate-300 select-none">
                <span className="text-sm">🇮🇳</span>
                <span className="font-mono">+91</span>
              </div>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 10-digit mobile number"
                className="w-full bg-transparent px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none font-mono font-bold"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <div className="relative flex items-center bg-[#131f33] border border-slate-700/80 focus-within:border-emerald-500 rounded-2xl overflow-hidden transition">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? 'Create secure password' : 'Enter your password'}
                className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none font-medium"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="p-3 text-slate-400 hover:text-white transition"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (only on register) */}
          {isRegister && (
            <div>
              <div className="relative flex items-center bg-[#131f33] border border-slate-700/80 focus-within:border-emerald-500 rounded-2xl overflow-hidden transition">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="p-3 text-slate-400 hover:text-white transition"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Invite Code (optional) */}
          {isRegister && (
            <div>
              <div className="relative flex items-center bg-[#131f33] border border-slate-700/80 focus-within:border-emerald-500 rounded-2xl overflow-hidden transition">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Referral / Invite Code (optional)"
                  className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none font-mono uppercase"
                />
              </div>
              {inviteCode && (
                <p className="text-[10px] text-emerald-400 mt-1 px-1 font-bold">
                  ✓ Referrer reward will be activated upon your first deposit.
                </p>
              )}
            </div>
          )}

          {/* Terms Checkbox */}
          {isRegister && (
            <label className="flex items-start space-x-2.5 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-900"
              />
              <span className="text-[11px] text-slate-400 leading-tight">
                I am 18+ and agree to the <span className="text-emerald-400 font-bold">Terms of Service</span> & Fair Play Rules.
              </span>
            </label>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-2xl text-sm transition transform active:scale-95 shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Please wait...' : (isRegister ? 'Register & Claim ₹150' : 'Sign In to Casino')}</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </form>

        {/* Footer Subtle Admin & Promoter Portals */}
        <div className="mt-7 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <button
            onClick={onAdminClick}
            className="hover:text-emerald-400 transition flex items-center space-x-1"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-500/70" />
            <span>Admin Portal</span>
          </button>

          <span className="text-slate-700">•</span>

          <button
            onClick={onPromoterClick}
            className="hover:text-purple-400 transition flex items-center space-x-1"
          >
            <Users className="w-3.5 h-3.5 text-purple-400/70" />
            <span>Promoter Portal (20%)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
