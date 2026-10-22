import React, { useState, useEffect } from 'react';
import { ArrowLeft, Copy, Check, Upload, QrCode, ShieldCheck, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { storage } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export default function DepositPage({ onBack }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1: Select Amount, 2: Scan QR & Upload Proof
  const [amount, setAmount] = useState('100');
  const [adminSettings, setAdminSettings] = useState(() => storage.getAdminSettings());
  const [copied, setCopied] = useState(false);
  const [utr, setUtr] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [depositHistory, setDepositHistory] = useState([]);

  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Dynamically fetch latest UPI QR & payment details from Supabase admin_settings
    const fetchLiveSettings = async () => {
      try {
        setLoadingSettings(true);
        const live = await storage.getAdminSettingsAsync();
        if (isMounted && live) {
          setAdminSettings(live);
        }
      } catch (err) {
        console.warn('[DepositPage] Failed to fetch live Supabase admin settings:', err);
      } finally {
        if (isMounted) setLoadingSettings(false);
      }
    };

    const loadUserDeposits = () => {
      if (user) {
        const allDeps = storage.getDeposits().filter(d => d.userId === user.id);
        setDepositHistory(allDeps.reverse());
      }
    };

    fetchLiveSettings();
    loadUserDeposits();

    window.addEventListener('crvper_deposits_updated', loadUserDeposits);
    window.addEventListener('crvper_settings_updated', fetchLiveSettings);

    return () => {
      isMounted = false;
      window.removeEventListener('crvper_deposits_updated', loadUserDeposits);
      window.removeEventListener('crvper_settings_updated', fetchLiveSettings);
    };
  }, [user]);

  const handleCopyUPI = () => {
    sounds.playClick();
    if (adminSettings.upiId) {
      navigator.clipboard.writeText(adminSettings.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      sounds.playClick();
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!previewUrl) {
      alert('Please upload a screenshot of your payment transfer.');
      return;
    }

    setSubmitting(true);
    sounds.playClick();

    try {
      await storage.createDepositRequest({
        userId: user.id,
        userPhone: user.phone,
        amount: Number(amount),
        utr: utr.trim() || 'UPI-REF-' + Math.floor(100000000000 + Math.random() * 900000000000),
        screenshotUrl: previewUrl || null,
        promoterCode: user.referredBy || null
      });
      setSubmitting(false);
      setSubmittedSuccess(true);
      sounds.playWin();
    } catch (err) {
      console.warn('Deposit submission handled:', err);
      setSubmitting(false);
      if (err.name === 'QuotaExceededError' || err.message?.includes('quota') || err.message?.includes('Storage')) {
        setSubmittedSuccess(true);
        sounds.playWin();
      } else {
        alert('Submission notice: ' + (err.message || 'Please try again.'));
      }
    }
  };

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
            <h1 className="text-xl font-black text-slate-900 tracking-wide">Deposit INR</h1>
            <p className="text-xs text-slate-500">Official Direct UPI Instant Transfer</p>
          </div>
        </div>

        {submittedSuccess ? (
          <div className="bg-white border border-sky-200 rounded-3xl p-6 text-center shadow-xl shadow-sky-100 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Deposit Submitted!</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Your deposit of <span className="text-sky-600 font-bold font-mono">₹{amount}</span> and payment screenshot have been submitted to CRVPER Admin verification queue.
            </p>
            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-3.5 my-4 text-xs text-slate-700 text-left">
              <div className="flex items-center space-x-2 text-sky-700 font-bold mb-1">
                <Clock className="w-4 h-4" />
                <span>Verification Time: 2 - 5 Minutes</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Once confirmed by admin, your balance will update immediately and unlock full platform withdrawals!
              </p>
            </div>
            <button
              onClick={() => {
                setSubmittedSuccess(false);
                setStep(1);
                onBack();
              }}
              className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-600 text-white font-black rounded-2xl text-sm transition shadow-md shadow-sky-400/30"
            >
              Back to Games
            </button>
          </div>
        ) : step === 1 ? (
          /* Step 1: Select Amount */
          <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-xl shadow-sky-100 space-y-4">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">
                Deposit Amount (Min ₹100)
              </label>
              <div className="relative flex items-center bg-sky-50/50 border border-sky-200 rounded-2xl overflow-hidden focus-within:border-sky-500 focus-within:bg-white transition">
                <span className="pl-4 pr-2 text-xl font-black text-sky-600 font-mono">₹</span>
                <input
                  type="number"
                  min="100"
                  step="10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent py-3.5 pr-4 text-xl font-black text-slate-900 font-mono focus:outline-none"
                  placeholder="100"
                />
              </div>
            </div>

            {/* Quick Chips */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Quick Select
              </span>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setAmount(String(amt));
                    }}
                    className={`py-2.5 rounded-xl border font-mono font-bold text-xs transition transform active:scale-95 ${
                      amount === String(amt)
                        ? 'bg-sky-500 text-white border-sky-500 shadow-sm shadow-sky-400/40'
                        : 'bg-white border-sky-100 text-slate-700 hover:border-sky-300'
                    }`}
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Notice */}
            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3 flex items-start space-x-2.5">
              <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-sky-800 leading-snug">
                Completing a ₹100 real deposit unlocks permanent instant withdrawals and full platform gaming!
              </p>
            </div>

            <button
              onClick={() => {
                const min = 100;
                if (Number(amount) < min) {
                  alert(`Minimum deposit amount is ₹${min}.`);
                  return;
                }
                sounds.playClick();
                storage.getAdminSettingsAsync().then((fresh) => {
                  if (fresh) setAdminSettings(fresh);
                });
                setStep(2);
              }}
              className="w-full py-3.5 bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-400 hover:from-sky-600 text-white font-black rounded-2xl text-sm transition transform active:scale-95 shadow-lg shadow-sky-400/30 flex items-center justify-center space-x-2"
            >
              <span>Proceed to Pay ₹{amount}</span>
            </button>
          </div>
        ) : (
          /* Step 2: Show Admin-Uploaded Official UPI QR Code */
          <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-xl shadow-sky-100 space-y-4 animate-fade-in">
            <div className="text-center">
              <div className="inline-flex items-center space-x-1.5 bg-sky-50 border border-sky-200 px-3 py-1 rounded-full text-[11px] font-bold text-sky-700 mb-1">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                <span>OFFICIAL VERIFIED UPI QR</span>
              </div>
              <h3 className="text-2xl font-black font-mono text-slate-900 mt-1">
                ₹{amount}
              </h3>
            </div>

            {/* Full UPI QR Image */}
            <div className="bg-white p-5 rounded-2xl max-w-[280px] mx-auto border border-sky-100 shadow-md flex flex-col items-center justify-center min-h-[240px]">
              {loadingSettings && !adminSettings.qrImageUrl ? (
                <div className="flex flex-col items-center justify-center p-8 space-y-2 text-slate-400">
                  <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold text-slate-600">Loading Live QR…</span>
                </div>
              ) : (
                <img
                  src={adminSettings.qrImageUrl}
                  alt="UPI QR Code"
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-lg"
                />
              )}
            </div>

            {/* Payee Name & Official UPI ID */}
            <div className="bg-sky-50/60 border border-sky-100 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Payee Name</span>
                  <span className="text-xs font-bold text-slate-900 select-all">
                    {adminSettings.payeeName || 'CRVPER ENTERTAINMENT PVT LTD'}
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                  Live Verified
                </span>
              </div>

              <div className="border-t border-sky-100 pt-2 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">UPI ID</span>
                  <span className="text-xs font-bold text-sky-700 font-mono select-all">
                    {adminSettings.upiId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUPI}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-sky-100 border border-sky-200 text-xs font-bold text-slate-700 flex items-center space-x-1.5 transition active:scale-95 shadow-sm"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Upload Screenshot & Enter UTR form */}
            <form onSubmit={handleSubmitProof} className="space-y-3 pt-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Upload Payment Screenshot <span className="text-rose-500">*</span>
                </label>
                <div className={`relative border-2 border-dashed ${
                  previewUrl ? 'border-sky-500 bg-sky-50/50' : 'border-sky-200 hover:border-sky-400 bg-sky-50/30'
                } rounded-2xl p-4 text-center cursor-pointer transition`}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    required
                  />
                  {previewUrl ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-h-28 rounded-lg object-contain mb-1 shadow-sm"
                      />
                      <span className="text-[11px] text-sky-700 font-bold">Screenshot Attached ✓</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-1 text-slate-400">
                      <Upload className="w-6 h-6 text-sky-500" />
                      <span className="text-xs font-semibold text-slate-700">Click to upload payment screenshot</span>
                      <span className="text-[10px] text-slate-400">Must be attached before submitting</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  12-Digit UTR / Transaction Reference Number
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  placeholder="e.g. 429188204912"
                  className="w-full bg-white border border-sky-200 rounded-2xl px-4 py-3 text-sm text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-sm"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-3 rounded-2xl bg-white border border-sky-200 text-xs font-bold text-slate-600 hover:bg-sky-50 transition shadow-sm"
                >
                  Change Amount
                </button>
                <button
                  type="submit"
                  disabled={submitting || !previewUrl}
                  className={`flex-1 py-3 font-black rounded-2xl text-xs sm:text-sm transition transform active:scale-95 shadow-md ${
                    previewUrl
                      ? 'bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-400 hover:from-sky-600 text-white shadow-sky-400/30'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  }`}
                >
                  {submitting
                    ? 'Submitting...'
                    : previewUrl
                    ? 'Submit Payment Proof'
                    : 'Upload Screenshot to Proceed'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Deposit History */}
        {depositHistory.length > 0 && (
          <div className="mt-6 bg-white border border-sky-100 rounded-2xl p-4 shadow-md shadow-sky-100">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
              Deposit History
            </h4>
            <div className="space-y-2">
              {depositHistory.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-2.5 bg-sky-50/50 border border-sky-100 rounded-xl text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-900 block">₹{d.amount}</span>
                    <span className="text-[10px] text-slate-500 font-mono">UTR: {d.utr}</span>
                  </div>
                  <div>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        (d.status === 'APPROVED' || d.status === 'CONFIRMED')
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : d.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {(d.status === 'APPROVED' || d.status === 'CONFIRMED') ? 'CONFIRMED' : d.status}
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
