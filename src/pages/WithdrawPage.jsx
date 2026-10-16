import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, QrCode, ShieldAlert, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { storage } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';

export default function WithdrawPage({ onBack, onTriggerCompulsoryModal, onGoToDeposit }) {
  const { user, refreshUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [qrUrl, setQrUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);

  useEffect(() => {
    const load = () => {
      if (user) {
        const allWths = storage.getWithdrawals().filter(w => w.userId === user.id);
        setWithdrawals(allWths.reverse());
      }
    };
    load();
    window.addEventListener('crvper_withdrawals_updated', load);
    return () => window.removeEventListener('crvper_withdrawals_updated', load);
  }, [user]);

  const handleQrUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const isUnlocked = Boolean(user && (user.hasDeposited || Number(user.totalDeposited || 0) >= 100));

  const handleWithdrawRequest = (e) => {
    e.preventDefault();
    setError('');
    sounds.playClick();

    if (!user) return;

    // Check MANDATORY RULE: Must have completed at least 1 deposit >= 100 to unlock withdrawals
    if (!isUnlocked) {
      if (onTriggerCompulsoryModal) {
        onTriggerCompulsoryModal();
      } else if (onGoToDeposit) {
        onGoToDeposit();
      }
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount < 100) {
      setError('Minimum withdrawal amount is ₹100.');
      return;
    }

    if (numAmount > user.walletBalance) {
      setError(`Amount cannot exceed your available wallet balance (₹${user.walletBalance.toFixed(2)}).`);
      return;
    }

    if (!upiId && !qrUrl) {
      setError('Please provide either your UPI ID or upload your UPI QR code.');
      return;
    }

    setSubmitting(true);
    try {
      storage.createWithdrawalRequest({
        userId: user.id,
        userPhone: user.phone,
        amount: numAmount,
        upiId: upiId.trim() || 'UPI QR Attached',
        qrUrl: qrUrl || null
      });

      refreshUser();
      setSuccess(true);
      sounds.playWin();
    } catch (err) {
      if (err.message === 'COMPULSORY_DEPOSIT_REQUIRED') {
        if (onTriggerCompulsoryModal) onTriggerCompulsoryModal();
        else if (onGoToDeposit) onGoToDeposit();
      } else {
        setError(err.message || 'Withdrawal failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const balance = user ? Number(user.walletBalance || 0) : 0;

  return (
    <div className="min-h-screen bg-[#070b14] p-4 pb-24 selection:bg-cyan-500 selection:text-black">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-5">
          <button
            onClick={() => {
              sounds.playClick();
              onBack();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-white tracking-wide">Withdraw Funds</h1>
            <p className="text-xs text-slate-400">Direct to your Bank Account or UPI</p>
          </div>
        </div>

        {/* ── DEPOSIT REQUIRED BANNER ── shown when user has not deposited minimum ₹100 ── */}
        {!isUnlocked && (
          <div className="mb-5 relative overflow-hidden rounded-3xl border-2 border-amber-400/70 shadow-2xl shadow-amber-500/30">
            {/* Animated glow background */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/25 via-yellow-500/15 to-orange-600/20 animate-pulse" />
            <div className="absolute inset-0 bg-[#0f0a00]/60" />

            <div className="relative p-5">
              {/* Top row: icon + title */}
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/40 shrink-0 animate-bounce">
                  <ShieldAlert className="w-6 h-6 text-black" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">
                    ⚠ Account Not Verified
                  </p>
                  <h3 className="text-base font-black text-white leading-tight">
                    Withdrawals are Locked
                  </h3>
                </div>
              </div>

              {/* Body text */}
              <p className="text-sm text-slate-200 leading-relaxed mb-4">
                To be able to withdraw funds, you need to make a <span className="text-amber-300 font-black">minimum deposit of ₹100</span> to verify your account. Your wallet balance is 100% safe!
              </p>

              {/* CTA Button — navigates directly to Deposit page */}
              <button
                onClick={() => {
                  sounds.playDeposit();
                  if (onGoToDeposit) {
                    onGoToDeposit();
                  } else if (onTriggerCompulsoryModal) {
                    onTriggerCompulsoryModal();
                  }
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-extrabold text-sm flex items-center justify-center space-x-2 shadow-xl shadow-amber-500/40 transition active:scale-95"
              >
                <span>💰 Deposit ₹100 &amp; Unlock Withdrawals</span>
                <span className="text-lg">→</span>
              </button>

              {/* Small note */}
              <p className="text-center text-[10px] text-amber-500/80 mt-2 font-semibold">
                Minimum ₹100 deposit • Instant account verification • 100% secure
              </p>
            </div>
          </div>
        )}


        {/* Balance Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Withdrawable Balance
            </span>
            <div className="text-2xl font-black font-mono text-white mt-0.5">
              ₹{balance.toFixed(2)}
            </div>
          </div>
          <button
            onClick={() => setAmount(String(Math.floor(balance)))}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-cyan-400 border border-slate-700 transition"
          >
            Max Amount
          </button>
        </div>

        {success ? (
          <div className="bg-[#0f172a] border border-emerald-500/40 rounded-3xl p-6 text-center shadow-2xl animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white">Withdrawal Requested!</h2>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Your request for <span className="text-emerald-400 font-bold font-mono">₹{amount}</span> has been received and is being processed by the finance desk.
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 my-4 text-xs text-slate-400 text-left">
              <div className="flex items-center space-x-2 text-cyan-400 font-semibold mb-1">
                <Clock className="w-4 h-4" />
                <span>Status: Pending Admin Approval</span>
              </div>
              <p className="text-[11px]">
                You can track the live progress in your withdrawal history below.
              </p>
            </div>
            <button
              onClick={() => {
                setSuccess(false);
                setAmount('');
              }}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-xl text-sm transition"
            >
              Make Another Request
            </button>
          </div>
        ) : (
          <form onSubmit={handleWithdrawRequest} className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Amount Input */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Withdraw Amount (₹)
              </label>
              <div className="relative flex items-center bg-[#131b2e] border border-slate-700 rounded-2xl overflow-hidden focus-within:border-cyan-500 transition">
                <span className="pl-4 pr-2 text-xl font-black text-rose-400 font-mono">₹</span>
                <input
                  type="number"
                  min="1"
                  max={balance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent py-3.5 pr-4 text-xl font-black text-white font-mono focus:outline-none"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* UPI ID */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Your UPI ID / VPA
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. yourname@oksbi / 9876543210@paytm"
                className="w-full bg-[#131b2e] border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Upload Personal UPI QR */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Or Upload Your Personal UPI QR Code
              </label>
              <div className="relative border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-4 text-center cursor-pointer transition bg-[#131b2e]">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {qrUrl ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={qrUrl}
                      alt="Your QR"
                      className="max-h-24 rounded-lg object-contain mb-1"
                    />
                    <span className="text-[11px] text-emerald-400 font-bold">Your QR Uploaded ✓</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-1 text-slate-400">
                    <QrCode className="w-6 h-6 text-cyan-400" />
                    <span className="text-xs font-semibold text-slate-300">Upload your UPI QR image</span>
                    <span className="text-[10px] text-slate-500">Fast payout scanning</span>
                  </div>
                )}
              </div>
            </div>

            {!isUnlocked ? (
              <button
                type="button"
                onClick={() => {
                  sounds.playDeposit();
                  if (onGoToDeposit) onGoToDeposit();
                  else if (onTriggerCompulsoryModal) onTriggerCompulsoryModal();
                }}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-black rounded-2xl text-sm transition transform active:scale-95 shadow-lg shadow-amber-500/30 flex items-center justify-center space-x-2"
              >
                <span>🔒 Deposit ₹100 to Unlock Withdrawals →</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black rounded-2xl text-sm transition transform active:scale-95 shadow-lg shadow-rose-600/25 flex items-center justify-center space-x-2"
              >
                <span>{submitting ? 'Processing...' : 'Request Withdraw'}</span>
              </button>
            )}
          </form>
        )}

        {/* Withdrawal Transaction History */}
        {withdrawals.length > 0 && (
          <div className="mt-6 bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
              Withdrawal History & Status
            </h4>
            <div className="space-y-2">
              {withdrawals.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-2.5 bg-[#131b2e] rounded-xl text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-white block">₹{w.amount}</span>
                    <span className="text-[10px] text-slate-400">Target: {w.upiId}</span>
                  </div>
                  <div>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        w.status === 'COMPLETED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : w.status === 'REJECTED'
                          ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                          : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
