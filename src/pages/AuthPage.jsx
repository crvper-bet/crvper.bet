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
    <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-4 selection:bg-cyan-500 selection:text-black">
      {/* Container matching Screenshot 1 */}
      <div className="w-full max-w-[420px] bg-[#0c1220] border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        {/* Glow behind card */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-20 bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* Top Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center tracking-wider mb-2">
            <span className="text-3xl font-black italic text-white drop-shadow-[0_0_15px_rgba(0,229,255,0.5)]">
              CR<span className="text-cyan-400">V</span>PER
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mt-1">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRegister 
              ? 'Get started with CRVPER & get ₹150 free signup bonus.' 
              : 'Log in to your CRVPER account to continue.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs text-center font-medium animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Phone Input with +91 indicator */}
          <div>
            <div className="relative flex items-center bg-[#131b2e] border border-slate-700/80 focus-within:border-cyan-500 rounded-2xl overflow-hidden transition">
              <div className="flex items-center space-x-1.5 px-3.5 py-3 border-r border-slate-700/80 bg-[#16223a] text-xs font-bold text-slate-300 select-none">
                <span className="text-sm">🇮🇳</span>
                <span>+91</span>
              </div>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter your phone number"
                className="w-full bg-transparent px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <div className="relative flex items-center bg-[#131b2e] border border-slate-700/80 focus-within:border-cyan-500 rounded-2xl overflow-hidden transition">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? 'Create a password' : 'Enter your password'}
                className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none"
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
              <div className="relative flex items-center bg-[#131b2e] border border-slate-700/80 focus-within:border-cyan-500 rounded-2xl overflow-hidden transition">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none"
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
              <div className="relative flex items-center bg-[#131b2e] border border-slate-700/80 focus-within:border-cyan-500 rounded-2xl overflow-hidden transition">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Invite code (optional)"
                  className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none font-mono uppercase"
                />
              </div>
              {inviteCode && (
                <p className="text-[10px] text-cyan-400 mt-1 px-1">
                  ✓ Referrer code applied for promoter rewards.
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
                className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-0 bg-slate-900"
              />
              <span className="text-[11px] text-slate-400 leading-tight">
                I agree to the <span className="text-cyan-400">Privacy Policy</span> and <span className="text-cyan-400">Terms of Service</span>.
              </span>
            </label>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 font-black rounded-2xl text-sm transition transform active:scale-95 shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2"
          >
            <span>{isRegister ? 'Create Account' : 'Log In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Toggle Login / Register */}
        <div className="mt-5 text-center">
          <button
            onClick={() => {
              sounds.playClick();
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-xs text-slate-400 hover:text-white transition"
          >
            {isRegister ? (
              <span>Already have an account? <strong className="text-cyan-400 font-bold">Log in</strong></span>
            ) : (
              <span>New to CRVPER? <strong className="text-cyan-400 font-bold">Create account</strong></span>
            )}
          </button>
        </div>

        {/* Footer Subtle Admin & Promoter Portals matching prompt requirements */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <button
            onClick={onAdminClick}
            className="hover:text-cyan-400 transition flex items-center space-x-1"
          >
            <Shield className="w-3.5 h-3.5 text-cyan-500/70" />
            <span>Admin Login</span>
          </button>

          <span className="text-slate-700">•</span>

          <button
            onClick={onPromoterClick}
            className="hover:text-purple-400 transition flex items-center space-x-1"
          >
            <Users className="w-3.5 h-3.5 text-purple-400/70" />
            <span>Promoter Login (20% Comm.)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
