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
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-sky-100 flex flex-col items-center justify-center p-4 selection:bg-sky-400 selection:text-white">
      {/* Container - Pure White & Glacier Sky Blue Card */}
      <div className="w-full max-w-[430px] bg-white border border-sky-100 rounded-3xl p-6 sm:p-8 shadow-xl shadow-sky-200/50 relative">
        {/* Ambient Top Sky Glow */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-20 bg-sky-400/20 blur-3xl pointer-events-none" />

        {/* Top Logo */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center space-x-2 tracking-wider mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 p-[1.5px] shadow-md shadow-sky-400/30">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center font-black text-sky-500 text-base">
                C
              </div>
            </div>
            <span className="text-3xl font-black italic text-slate-900 tracking-tight">
              CRVPER<span className="text-sky-500">.BET</span>
            </span>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="grid grid-cols-2 bg-sky-50 border border-sky-100 p-1 rounded-2xl mt-3">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setIsRegister(true);
                setError('');
              }}
              className={`py-2 rounded-xl text-xs font-black transition-all ${
                isRegister
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-400/30'
                  : 'text-slate-500 hover:text-slate-800'
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
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-400/30'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Registration Bonus Pill Banner */}
        {isRegister && (
          <div className="mb-4 p-2.5 rounded-2xl bg-gradient-to-r from-sky-50 via-cyan-50 to-sky-50 border border-sky-200 flex items-center space-x-2 text-xs text-sky-800">
            <span className="text-base">🎁</span>
            <span className="font-bold">
              ₹150 Free Signup Bonus will be credited instantly on registration!
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-bold animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Phone Input with +91 indicator */}
          <div>
            <div className="relative flex items-center bg-sky-50/50 border border-sky-100 focus-within:border-sky-400 focus-within:bg-white rounded-2xl overflow-hidden transition shadow-sm">
              <div className="flex items-center pl-3.5 pr-2.5 py-3 border-r border-sky-100 text-slate-500 text-xs font-mono font-bold select-none">
                <span className="mr-1">🇮🇳</span>
                <span>+91</span>
              </div>
              <input
                type="tel"
                maxLength="10"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="Mobile number"
                className="w-full bg-transparent px-3 py-3 text-slate-900 placeholder:text-slate-400 text-sm font-mono font-bold focus:outline-none"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="relative flex items-center bg-sky-50/50 border border-sky-100 focus-within:border-sky-400 focus-within:bg-white rounded-2xl overflow-hidden transition shadow-sm">
            <div className="pl-3.5 text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 4 characters)"
              className="w-full bg-transparent px-3 py-3 text-slate-900 placeholder:text-slate-400 text-sm font-mono focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="pr-3.5 text-slate-400 hover:text-slate-600 transition"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Confirm Password (Register Only) */}
          {isRegister && (
            <div className="relative flex items-center bg-sky-50/50 border border-sky-100 focus-within:border-sky-400 focus-within:bg-white rounded-2xl overflow-hidden transition shadow-sm">
              <div className="pl-3.5 text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full bg-transparent px-3 py-3 text-slate-900 placeholder:text-slate-400 text-sm font-mono focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="pr-3.5 text-slate-400 hover:text-slate-600 transition"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Invite Code (Register Only) */}
          {isRegister && (
            <div className="relative flex items-center bg-sky-50/50 border border-sky-100 focus-within:border-sky-400 focus-within:bg-white rounded-2xl overflow-hidden transition shadow-sm">
              <div className="pl-3.5 text-slate-400">
                <Users className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Promoter / Referral Code (Optional)"
                className="w-full bg-transparent px-3 py-3 text-slate-900 placeholder:text-slate-400 text-xs font-mono font-bold focus:outline-none"
              />
            </div>
          )}

          {/* Agreement Checkbox (Register Only) */}
          {isRegister && (
            <label className="flex items-center space-x-2 text-xs text-slate-500 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="rounded border-sky-300 text-sky-500 focus:ring-sky-400"
              />
              <span>I confirm I am 18+ and agree to the Service Terms</span>
            </label>
          )}

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-600 hover:to-cyan-500 text-white font-black text-sm tracking-wide transition shadow-lg shadow-sky-400/30 flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">Authenticating...</span>
            ) : isRegister ? (
              <>
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>CLAIM ₹150 &amp; REGISTER</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 stroke-[2.5]" />
                <span>SIGN IN TO CASINO</span>
              </>
            )}
          </button>
        </form>

        {/* Footers for Admin & Promoter Hub */}
        <div className="mt-6 pt-4 border-t border-sky-100 flex items-center justify-between text-xs text-slate-400">
          <button
            type="button"
            onClick={onAdminClick}
            className="hover:text-sky-600 transition font-medium"
          >
            Admin Portal
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={onPromoterClick}
            className="hover:text-sky-600 transition font-medium"
          >
            Promoter Hub (20%)
          </button>
        </div>
      </div>
    </div>
  );
}
