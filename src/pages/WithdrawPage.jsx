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

  // Live countdown timer for 12-hour limit reset
  const [resetCountdown, setResetCountdown] = useState(eligibility.resetTimeFormatted);

  useEffect(() => {
    if (!eligibility.isLimitReached || !eligibility.resetTimeRemainingMs) {
      setResetCountdown(null);
      return;
    }

    const interval = setInterval(() => {
      const fresh = storage.getWithdrawalEligibility(user?.id);
      if (!fresh.isLimitReached) {
        setResetCountdown(null);
        refreshUser();
      } else {
        setResetCountdown(fresh.resetTimeFormatted);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [eligibility.isLimitReached, eligibility.resetTimeRemainingMs, user?.id]);

  const handleWithdrawRequest = (e) => {
    e.preventDefault();
    setError('');
    sounds.playClick();

    if (!user) return;

    // 1. Mandatory promotional deposit condition
    if (!eligibility.hasDeposited) {
      setError('You must make a minimum deposit of ₹100 before you can withdraw. Bonus winnings cannot be withdrawn without a real deposit.');
      return;
    }

    // 2. Promotional Wagering requirement condition
    if (!eligibility.hasMetWagering) {
      setError(eligibility.wageringMessage || `You need to wager ₹${eligibility.wageringRemaining.toFixed(2)} more to meet your promotional requirement.`);
      return;
    }

    // 3. Platform Limit: Max 3 withdrawal requests
    if (eligibility.withdrawalCount >= eligibility.maxWithdrawalRequests) {
      setError(`You have reached the maximum limit of ${eligibility.maxWithdrawalRequests} withdrawal requests.`);
      return;
    }

    // 4. Platform Limit: Max ₹5,000 combined total withdrawal limit per 12h
    if (eligibility.remainingCombinedWithdrawal <= 0) {
      setError(`You have reached the maximum combined withdrawal limit of ₹${eligibility.maxCombinedWithdrawal.toLocaleString()} in 12 hours.`);
      return;
    }

    const effectiveMin = Math.min(100, eligibility.remainingCombinedWithdrawal);
    const numAmount = Number(amount);
    if (!numAmount || numAmount < effectiveMin) {
      setError(`Minimum withdrawal amount is ₹${effectiveMin}.`);
      return;
    }

    if (numAmount > eligibility.remainingCombinedWithdrawal) {
      setError(`Amount exceeds your remaining withdrawal limit. You have ₹${eligibility.remainingCombinedWithdrawal.toFixed(2)} remaining out of your ₹${eligibility.maxCombinedWithdrawal.toLocaleString()} combined limit across ${eligibility.maxWithdrawalRequests} requests.`);
      return;
    }

    if (numAmount > eligibility.rawWithdrawableBalance) {
      setError(`Amount cannot exceed your withdrawable balance (₹${eligibility.rawWithdrawableBalance.toFixed(2)}). Promotional bonus cannot be withdrawn directly.`);
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
      setError(err.message || 'Withdrawal failed');
    } finally {
      setSubmitting(false);
    }
  };

  const withdrawableAmount = eligibility.withdrawableBalance;

  return (
    <div className="min-h-screen bg-[#090e17] p-4 pb-24 selection:bg-emerald-500 selection:text-black">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-5">
          <button
            onClick={() => {
              sounds.playClick();
              onBack();
            }}
            className="p-2.5 rounded-2xl bg-[#0f1826] hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-white tracking-wide">Withdraw Funds</h1>
            <p className="text-xs text-slate-400">Direct Official UPI Instant Transfer</p>
          </div>
        </div>

        {/* ── 1. DEPOSIT REQUIREMENT NOTICE ── */}
        {!isUnlocked && (
          <div className="mb-4 relative overflow-hidden rounded-3xl border-2 border-amber-400/70 shadow-2xl shadow-amber-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/25 via-yellow-500/15 to-orange-600/20 animate-pulse" />
            <div className="absolute inset-0 bg-[#0f0a00]/70" />

            <div className="relative p-5">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/40 shrink-0">
                  <ShieldAlert className="w-5 h-5 text-black" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                    Promotional Requirement
                  </p>
                  <h3 className="text-sm font-black text-white leading-tight">
                    Deposit Condition Incomplete
                  </h3>
                </div>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed mb-4">
                You must make a minimum deposit of <span className="text-amber-300 font-bold">₹100</span> to unlock withdrawals. Bonus winnings cannot be withdrawn without a real deposit.
              </p>

              <button
                onClick={() => {
                  sounds.playDeposit();
                  if (onGoToDeposit) onGoToDeposit();
                  else if (onTriggerCompulsoryModal) onTriggerCompulsoryModal();
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-black text-xs flex items-center justify-center space-x-2 shadow-xl shadow-amber-500/30 transition active:scale-95"
              >
                <span>💰 Deposit ₹100 Now</span>
                <span className="text-sm">→</span>
              </button>
            </div>
          </div>
        )}

        {/* ── 2. WAGERING REQUIREMENT NOTICE ── */}
        {isUnlocked && !isWageringDone && (
          <div className="mb-4 relative overflow-hidden rounded-3xl border-2 border-blue-500/60 shadow-2xl shadow-blue-500/20 bg-[#0d1627] p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-black uppercase text-blue-400 tracking-wider">Betting Requirement</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-300">
                ₹{eligibility.wageringWagered.toFixed(2)} / ₹{eligibility.wageringRequired.toFixed(2)}
              </span>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed mb-3">
              You must bet <span className="text-emerald-400 font-bold">50% of your wallet balance</span> (₹{eligibility.wageringRequired.toFixed(2)} total) before withdrawal. 
              ₹{eligibility.wageringRemaining.toFixed(2)} remaining to wager.
            </p>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
                style={{
                  width: `${Math.min(100, eligibility.wageringRequired > 0 ? (eligibility.wageringWagered / eligibility.wageringRequired) * 100 : 100)}%`
                }}
              />
            </div>
          </div>
        )}

        {/* ── 3. WITHDRAWAL POLICY LIMIT NOTICE ── */}
        <div className="bg-[#0f1826] border border-slate-800 rounded-3xl p-4 mb-4 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider flex items-center space-x-1.5">
              <span>⚡</span>
              <span>Withdrawal Limit Policy</span>
            </span>
            <span className="text-[10px] text-slate-400 font-bold">
              Max 3 Requests • ₹5,000 Combined • Resets in 12h
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center pt-1">
            <div className="p-2.5 rounded-2xl bg-[#131f33] border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Requests Count</span>
              <span className={`text-sm font-mono font-black ${eligibility.withdrawalCount >= eligibility.maxWithdrawalRequests ? 'text-rose-400' : 'text-emerald-400'}`}>
                {eligibility.withdrawalCount} / {eligibility.maxWithdrawalRequests}
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                {eligibility.remainingWithdrawalRequests} request{eligibility.remainingWithdrawalRequests === 1 ? '' : 's'} remaining
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-[#131f33] border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Combined Total</span>
              <span className={`text-sm font-mono font-black ${eligibility.remainingCombinedWithdrawal <= 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                ₹{eligibility.totalWithdrawnAmount.toFixed(0)} / ₹{eligibility.maxCombinedWithdrawal.toLocaleString()}
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                ₹{eligibility.remainingCombinedWithdrawal.toFixed(2)} remaining limit
              </span>
            </div>
          </div>

          {eligibility.isLimitReached && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/80 via-yellow-950/50 to-amber-950/80 border border-amber-500/50 text-amber-200 text-xs space-y-2 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center space-x-1.5 text-amber-300">
                  <Clock className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                  <span>Maximum Limit Hit (12-Hour Cooldown)</span>
                </span>
                {resetCountdown && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-black/70 border border-amber-400/50 text-amber-300 font-mono font-black text-xs shadow-inner">
                    ⏳ {resetCountdown}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {eligibility.limitMessage} Your 3-request allowance and ₹5,000 limit automatically refresh after the 12-hour period.
              </p>
            </div>
          )}
        </div>

        {/* ── 4. FOUR-BALANCE VAULT BREAKDOWN ── */}
        <div className="bg-[#0f1826] border border-slate-800/90 rounded-3xl p-5 mb-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] uppercase font-black text-emerald-400 tracking-wider block">
                Withdrawable Funds
              </span>
              <div className="text-2xl font-black font-mono text-white mt-0.5">
                ₹{withdrawableAmount.toFixed(2)}
              </div>
            </div>
            <button
              onClick={() => setAmount(String(Math.floor(withdrawableAmount)))}
              disabled={withdrawableAmount <= 0}
              className="px-3.5 py-1.5 rounded-xl bg-[#142135] hover:bg-[#1a2b45] text-xs font-bold text-emerald-300 border border-slate-700 transition disabled:opacity-40"
            >
              Max Withdrawable
            </button>
          </div>

          {/* Sub-balances breakdown */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="p-2 rounded-xl bg-[#131f33] border border-slate-800/80">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Deposits</span>
              <span className="text-xs font-mono font-black text-emerald-300">₹{eligibility.depositBalance.toFixed(2)}</span>
            </div>
            <div className="p-2 rounded-xl bg-[#131f33] border border-slate-800/80">
              <span className="text-[9px] uppercase font-bold text-purple-400 block">Bonus</span>
              <span className="text-xs font-mono font-black text-purple-300">₹{eligibility.bonusBalance.toFixed(2)}</span>
            </div>
            <div className="p-2 rounded-xl bg-[#131f33] border border-slate-800/80">
              <span className="text-[9px] uppercase font-bold text-cyan-400 block">Winnings</span>
              <span className="text-xs font-mono font-black text-cyan-300">₹{eligibility.winningsBalance.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {success ? (
          <div className="bg-[#0f1826] border border-emerald-500/40 rounded-3xl p-6 text-center shadow-2xl animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white">Withdrawal Requested!</h2>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Your request for <span className="text-emerald-400 font-bold font-mono">₹{amount}</span> has been received and is being processed by the finance desk.
            </p>
            <div className="bg-[#142033] border border-slate-800 rounded-2xl p-3.5 my-4 text-xs text-slate-300 text-left">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold mb-1">
                <Clock className="w-4 h-4" />
                <span>Status: Pending Admin Confirmation</span>
              </div>
              <p className="text-[11px] text-slate-400">
                You can track the live progress in your withdrawal history below.
              </p>
            </div>
            <button
              onClick={() => {
                setSuccess(false);
                setAmount('');
              }}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 font-black rounded-2xl text-sm transition shadow-lg shadow-emerald-500/25"
            >
              Make Another Request
            </button>
          </div>
        ) : (
          <form onSubmit={handleWithdrawRequest} className="bg-[#0f1826] border border-slate-800/90 rounded-3xl p-5 shadow-2xl space-y-4">
            {error && (
              <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs flex items-center space-x-2 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Amount Input */}
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">
                Withdraw Amount (₹)
              </label>
              <div className="relative flex items-center bg-[#131f33] border border-slate-700/80 rounded-2xl overflow-hidden focus-within:border-emerald-500 transition">
                <span className="pl-4 pr-2 text-xl font-black text-emerald-400 font-mono">₹</span>
                <input
                  type="number"
                  min="1"
                  max={withdrawableAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent py-3.5 pr-4 text-xl font-black text-white font-mono focus:outline-none"
                  placeholder="0.00"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 pl-1 flex items-center justify-between">
                <span>Allowance: <strong className="text-amber-400 font-mono">₹{eligibility.remainingCombinedWithdrawal.toFixed(2)}</strong> limit remaining</span>
                <span className="text-[10px] text-slate-500">({eligibility.remainingWithdrawalRequests} of {eligibility.maxWithdrawalRequests} requests left)</span>
              </p>
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
                className="w-full bg-[#131f33] border border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Upload Personal UPI QR */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Or Upload Your Personal UPI QR Code
              </label>
              <div className="relative border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer transition bg-[#131f33]">
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
                    <QrCode className="w-6 h-6 text-emerald-400" />
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
            ) : eligibility.isLimitReached ? (
              <button
                type="button"
                disabled
                className="w-full py-3.5 bg-slate-800/80 border border-slate-700 text-slate-400 font-black rounded-2xl text-xs cursor-not-allowed flex items-center justify-center space-x-2 shadow-md"
              >
                <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                <span>🔒 Max Limit Hit — Resets in {resetCountdown || eligibility.resetTimeFormatted || '12 hours'}</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 text-slate-950 font-black rounded-2xl text-sm transition transform active:scale-95 shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2"
              >
                <span>{submitting ? 'Processing...' : 'Request Withdraw'}</span>
              </button>
            )}
          </form>
        )}

        {/* Withdrawal Transaction History */}
        {withdrawals.length > 0 && (
          <div className="mt-6 bg-[#0f1826] border border-slate-800/90 rounded-2xl p-4 shadow-xl">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
              Withdrawal History & Status
            </h4>
            <div className="space-y-2">
              {withdrawals.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-2.5 bg-[#131f33] rounded-xl text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-white block">₹{w.amount}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Target: {w.upiId}</span>
                  </div>
                  <div>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        (w.status === 'COMPLETED' || w.status === 'CONFIRMED')
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : w.status === 'REJECTED'
                          ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                          : 'bg-amber-950 text-amber-400 border border-amber-500/40'
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
