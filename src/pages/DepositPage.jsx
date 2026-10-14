import React, { useState, useEffect } from 'react';
import { ArrowLeft, Copy, Check, Upload, QrCode, ShieldCheck, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { storage } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';

const QUICK_AMOUNTS = [200, 500, 1000, 2000, 5000, 10000];

export default function DepositPage({ onBack }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1: Select Amount, 2: Scan QR & Upload Proof
  const [amount, setAmount] = useState('200');
  const [adminSettings, setAdminSettings] = useState(() => storage.getAdminSettings());
  const [copied, setCopied] = useState(false);
  const [utr, setUtr] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [depositHistory, setDepositHistory] = useState([]);

  useEffect(() => {
    const load = () => {
      setAdminSettings(storage.getAdminSettings());
      if (user) {
        const allDeps = storage.getDeposits().filter(d => d.userId === user.id);
        setDepositHistory(allDeps.reverse());
      }
    };
    load();
    window.addEventListener('crvper_deposits_updated', load);
    return () => window.removeEventListener('crvper_deposits_updated', load);
  }, [user]);

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(adminSettings.upiId);
    setCopied(true);
    sounds.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProof = (e) => {
    e.preventDefault();
    if (!user) return;
    if (Number(amount) < 200) {
      alert('Minimum deposit amount is ₹200.');
      return;
    }
    if (!previewUrl) {
      alert('Please upload payment screenshot before submitting!');
      return;
    }

    setSubmitting(true);
    sounds.playClick();

    setTimeout(() => {
      storage.createDepositRequest({
        user_id: user.id,
        userPhone: user.phone,
        amount: Number(amount),
        utr: utr.trim() || 'UPI-REF-' + Math.floor(100000000000 + Math.random() * 900000000000),
        screenshotUrl: previewUrl || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=500&auto=format&fit=crop&q=60',
        promoterCode: user.referredBy
      });
      setSubmitting(false);
      setSubmittedSuccess(true);
      sounds.playWin();
    }, 600);
  };

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
            <h1 className="text-xl font-black text-white tracking-wide">Deposit INR</h1>
            <p className="text-xs text-slate-400">Direct Official UPI Instant Transfer</p>
          </div>
        </div>

        {submittedSuccess ? (
          <div className="bg-[#0f172a] border border-cyan-500/40 rounded-3xl p-6 text-center shadow-2xl animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white">Deposit Submitted!</h2>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Your deposit of <span className="text-emerald-400 font-bold font-mono">₹{amount}</span> and payment screenshot have been submitted to CRVPER Admin verification queue.
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 my-4 text-xs text-slate-400 text-left">
              <div className="flex items-center space-x-2 text-cyan-400 font-semibold mb-1">
                <Clock className="w-4 h-4" />
                <span>Verification Time: 2 - 5 Minutes</span>
              </div>
              <p className="text-[11px]">
                Once approved, your balance will update immediately and unlock full platform withdrawals!
              </p>
            </div>
            <button
              onClick={() => {
                setSubmittedSuccess(false);
                setStep(1);
                onBack();
              }}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-xl text-sm transition"
            >
              Back to Games
            </button>
          </div>
        ) : step === 1 ? (
          /* Step 1: Select Amount */
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Deposit Amount (Min ₹200)
              </label>
              <div className="relative flex items-center bg-[#131b2e] border border-slate-700 rounded-2xl overflow-hidden focus-within:border-cyan-500 transition">
                <span className="pl-4 pr-2 text-xl font-black text-cyan-400 font-mono">₹</span>
                <input
                  type="number"
                  min="200"
                  step="10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent py-3.5 pr-4 text-xl font-black text-white font-mono focus:outline-none"
                  placeholder="200"
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
                    className={`py-2.5 rounded-xl border font-mono font-bold text-xs transition ${
                      amount === String(amt)
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-500/30'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Notice */}
            <div className="bg-cyan-950/30 border border-cyan-800/40 rounded-xl p-3 flex items-start space-x-2.5">
              <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-cyan-200/90 leading-snug">
                Completing a ₹200 real deposit unlocks permanent instant withdrawals and full platform gaming!
              </p>
            </div>

            <button
              onClick={() => {
                if (Number(amount) < 200) {
                  alert('Minimum deposit amount is ₹200.');
                  return;
                }
                sounds.playClick();
                setStep(2);
              }}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-2xl text-sm transition transform active:scale-95 shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2"
            >
              <span>Proceed to Pay ₹{amount}</span>
            </button>
          </div>
        ) : (
          /* Step 2: Show Admin-Uploaded Official UPI QR Code */
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 animate-fade-in">
            <div className="text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                Scan & Pay via any UPI App
              </span>
              <h3 className="text-2xl font-black font-mono text-white mt-0.5">
                ₹{amount}
              </h3>
            </div>

            {/* Full UPI QR Image */}
            <div className="bg-white p-5 rounded-2xl max-w-[280px] mx-auto shadow-2xl flex flex-col items-center justify-center">
              <img
                src={adminSettings.qrImageUrl}
                alt="UPI QR Code"
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-lg"
              />
            </div>

            {/* UPI ID */}
            <div className="bg-[#131b2e] border border-slate-700/80 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">UPI ID</span>
                <span className="text-xs font-bold text-cyan-400 font-mono select-all">
                  {adminSettings.upiId}
                </span>
              </div>
              <button
                onClick={handleCopyUPI}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center space-x-1.5 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Upload Screenshot & Enter UTR form */}
            <form onSubmit={handleSubmitProof} className="space-y-3 pt-2">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Upload Payment Screenshot <span className="text-rose-400">*</span>
                </label>
                <div className={`relative border-2 border-dashed ${
                  previewUrl ? 'border-emerald-500 bg-emerald-950/10' : 'border-slate-700 hover:border-cyan-500 bg-[#131b2e]'
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
                        className="max-h-28 rounded-lg object-contain mb-1"
                      />
                      <span className="text-[11px] text-emerald-400 font-bold">Screenshot Attached ✓</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-1 text-slate-400">
                      <Upload className="w-6 h-6 text-cyan-400" />
                      <span className="text-xs font-semibold text-slate-300">Click to upload payment screenshot</span>
                      <span className="text-[10px] text-slate-500">Must be attached before submitting</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  12-Digit UTR / Transaction Reference Number
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  placeholder="e.g. 429188204912"
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-3 rounded-2xl bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700 transition"
                >
                  Change Amount
                </button>
                <button
                  type="submit"
                  disabled={submitting || !previewUrl}
                  className={`flex-1 py-3 font-black rounded-2xl text-xs sm:text-sm transition transform active:scale-95 shadow-lg ${
                    previewUrl
                      ? 'bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 shadow-cyan-500/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
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
          <div className="mt-6 bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
              Deposit History
            </h4>
            <div className="space-y-2">
              {depositHistory.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-2.5 bg-[#131b2e] rounded-xl text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-white block">₹{d.amount}</span>
                    <span className="text-[10px] text-slate-400">UTR: {d.utr}</span>
                  </div>
                  <div>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        d.status === 'APPROVED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : d.status === 'REJECTED'
                          ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                          : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                      }`}
                    >
                      {d.status}
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
