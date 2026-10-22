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

  const eligibility = storage.getWithdrawalEligibility(user?.id);
  const isUnlocked = Boolean(eligibility.hasDeposited);
  const isWageringDone = Boolean(eligibility.hasMetWagering);

  const handleWithdrawRequest = (e) => {
    e.preventDefault();
    setError('');
    sounds.playClick();

    if (!user) return;

    // 1. Mandatory promotional deposit condition
    if (!eligibility.hasDeposited) {
      setError(eligibility.depositMessage || 'A minimum deposit of ₹100 is required to become eligible for withdrawal under this promotion.');
      return;
    }

    // 2. Promotional Wagering requirement condition
    if (!eligibility.hasMetWagering) {
      setError(eligibility.wageringMessage || `You need to wager ₹${eligibility.wageringRemaining.toFixed(2)} more to meet your promotional requirement.`);
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid withdrawal amount.');
      return;
    }

    if (numAmount > eligibility.withdrawableBalance) {
      setError(`Cannot withdraw more than your eligible withdrawable funds (₹${eligibility.withdrawableBalance.toFixed(2)}).`);
      return;
    }

    if (!upiId.trim() && !qrUrl) {
      setError('Please provide your UPI ID or upload your UPI QR code to receive the funds.');
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
      setError(err.message || 'Withdrawal failed');
    } finally {
      setSubmitting(false);
    }
  };

  const withdrawableAmount = eligibility.withdrawableBalance;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-sky-100 p-4 pb-24 selection:bg-sky-400 selection:text-white">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-5">
          <button
            onClick={() => {
              sounds.playClick();
              onBack();
            }}
            className="p-2.5 rounded-2xl bg-white hover:bg-sky-50 border border-sky-100 text-slate-700 transition shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-wide">Withdraw Funds</h1>
            <p className="text-xs text-slate-500">Direct Official UPI Instant Transfer</p>
          </div>
        </div>

        {/* ── 1. DEPOSIT REQUIREMENT NOTICE ── */}
        {!isUnlocked && (
          <div className="mb-4 relative overflow-hidden rounded-3xl border-2 border-amber-300 bg-amber-50/70 p-5 shadow-md shadow-amber-100">
            <div className="relative">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-md shadow-amber-300/40 shrink-0">
                  <ShieldAlert className="w-5 h-5 text-black" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
                    Promotional Requirement
                  </p>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Deposit Condition Incomplete
                  </h3>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                A minimum deposit of ₹100 is required to become eligible for withdrawal under this promotion.
              </p>

              <button
                onClick={() => {
                  sounds.playDeposit();
                  if (onGoToDeposit) onGoToDeposit();
                  else if (onTriggerCompulsoryModal) onTriggerCompulsoryModal();
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs flex items-center justify-center space-x-2 shadow-md shadow-amber-400/30 transition active:scale-95"
              >
                <span>💰 Deposit ₹100 Now</span>
                <span className="text-sm">→</span>
              </button>
            </div>
          </div>
        )}

        {/* ── 2. WAGERING REQUIREMENT NOTICE ── */}
        {isUnlocked && !isWageringDone && (
          <div className="mb-4 relative overflow-hidden rounded-3xl border border-sky-200 bg-white p-5 shadow-md shadow-sky-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-black uppercase text-sky-700 tracking-wider">Promotional Wagering</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600">
                ₹{eligibility.wageringWagered.toFixed(2)} / ₹{eligibility.wageringRequired.toFixed(2)}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              You need to wager ₹{eligibility.wageringRemaining.toFixed(2)} more to meet your promotional requirement.
            </p>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-sky-100 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-500"
                style={{
                  width: `${Math.min(100, eligibility.wageringRequired > 0 ? (eligibility.wageringWagered / eligibility.wageringRequired) * 100 : 100)}%`
                }}
              />
            </div>
          </div>
        )}

        {/* ── 3. FOUR-BALANCE VAULT BREAKDOWN ── */}
        <div className="bg-white border border-sky-100 rounded-3xl p-5 mb-4 shadow-xl shadow-sky-100 space-y-3">
          <div className="flex items-center justify-between border-b border-sky-100 pb-3">
            <div>
              <span className="text-[10px] uppercase font-black text-sky-600 tracking-wider block">
                Withdrawable Funds
              </span>
              <div className="text-2xl font-black font-mono text-slate-900 mt-0.5">
                ₹{withdrawableAmount.toFixed(2)}
              </div>
            </div>
            <button
              onClick={() => setAmount(String(Math.floor(withdrawableAmount)))}
              disabled={withdrawableAmount <= 0}
              className="px-3.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-xs font-bold text-sky-700 border border-sky-200 transition disabled:opacity-40"
            >
              Max Withdrawable
            </button>
          </div>

          {/* Sub-balances breakdown */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="p-2 rounded-xl bg-sky-50/50 border border-sky-100">
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Deposits</span>
              <span className="text-xs font-mono font-black text-slate-800">₹{eligibility.depositBalance.toFixed(2)}</span>
            </div>
            <div className="p-2 rounded-xl bg-purple-50/50 border border-purple-100">
              <span className="text-[9px] uppercase font-bold text-purple-600 block">Bonus</span>
              <span className="text-xs font-mono font-black text-purple-700">₹{eligibility.bonusBalance.toFixed(2)}</span>
            </div>
            <div className="p-2 rounded-xl bg-cyan-50/50 border border-cyan-100">
              <span className="text-[9px] uppercase font-bold text-cyan-600 block">Winnings</span>
              <span className="text-xs font-mono font-black text-cyan-700">₹{eligibility.winningsBalance.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {success ? (
          <div className="bg-white border border-sky-200 rounded-3xl p-6 text-center shadow-xl shadow-sky-100 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Withdrawal Requested!</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Your request for <span className="text-sky-600 font-bold font-mono">₹{amount}</span> has been received and is being processed by the finance desk.
            </p>
            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-3.5 my-4 text-xs text-slate-700 text-left">
              <div className="flex items-center space-x-2 text-sky-700 font-bold mb-1">
                <Clock className="w-4 h-4" />
                <span>Status: Pending Admin Confirmation</span>
              </div>
              <p className="text-[11px] text-slate-500">
                You can track the live progress in your withdrawal history below.
              </p>
            </div>
            <button
              onClick={() => {
                setSuccess(false);
                setAmount('');
              }}
              className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-600 text-white font-black rounded-2xl text-sm transition shadow-md shadow-sky-400/30"
            >
              Make Another Request
            </button>
          </div>
        ) : (
          <form onSubmit={handleWithdrawRequest} className="bg-white border border-sky-100 rounded-3xl p-5 shadow-xl shadow-sky-100 space-y-4">
            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Amount Input */}
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">
                Withdraw Amount (₹)
              </label>
              <div className="relative flex items-center bg-sky-50/50 border border-sky-200 rounded-2xl overflow-hidden focus-within:border-sky-500 focus-within:bg-white transition">
                <span className="pl-4 pr-2 text-xl font-black text-sky-600 font-mono">₹</span>
                <input
                  type="number"
                  min="1"
                  max={withdrawableAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent py-3.5 pr-4 text-xl font-black text-slate-900 font-mono focus:outline-none"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* UPI ID */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Your UPI ID / VPA
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. yourname@oksbi / 9876543210@paytm"
                className="w-full bg-white border border-sky-200 rounded-2xl px-4 py-3 text-sm text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-sm"
              />
            </div>

            {/* Upload Personal UPI QR */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Or Upload Your Personal UPI QR Code
              </label>
              <div className="relative border-2 border-dashed border-sky-200 hover:border-sky-400 rounded-2xl p-4 text-center cursor-pointer transition bg-sky-50/30">
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
                      className="max-h-24 rounded-lg object-contain mb-1 shadow-sm"
                    />
                    <span className="text-[11px] text-sky-700 font-bold">Your QR Uploaded ✓</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-1 text-slate-400">
                    <QrCode className="w-6 h-6 text-sky-500" />
                    <span className="text-xs font-semibold text-slate-700">Upload your UPI QR image</span>
                    <span className="text-[10px] text-slate-400">Fast payout scanning</span>
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
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 text-slate-950 font-black rounded-2xl text-sm transition transform active:scale-95 shadow-md shadow-amber-400/30 flex items-center justify-center space-x-2"
              >
                <span>🔒 Deposit ₹100 to Unlock Withdrawals →</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-400 hover:from-sky-600 text-white font-black rounded-2xl text-sm transition transform active:scale-95 shadow-lg shadow-sky-400/30 flex items-center justify-center space-x-2"
              >
                <span>{submitting ? 'Processing...' : 'Request Withdraw'}</span>
              </button>
            )}
          </form>
        )}

        {/* Withdrawal Transaction History */}
        {withdrawals.length > 0 && (
          <div className="mt-6 bg-white border border-sky-100 rounded-2xl p-4 shadow-md shadow-sky-100">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
              Withdrawal History & Status
            </h4>
            <div className="space-y-2">
              {withdrawals.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-2.5 bg-sky-50/50 border border-sky-100 rounded-xl text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-900 block">₹{w.amount}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Target: {w.upiId}</span>
                  </div>
                  <div>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        (w.status === 'COMPLETED' || w.status === 'CONFIRMED')
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : w.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {(w.status === 'COMPLETED' || w.status === 'CONFIRMED') ? 'CONFIRMED' : w.status}
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
