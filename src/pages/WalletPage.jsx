import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, ArrowDownLeft, ArrowUpRight, Eye, EyeOff, ShieldCheck, ShieldAlert,
  Sparkles, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, 
  CreditCard, ChevronRight, History 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { sounds } from '../services/audio';

const QUICK_TOPUP_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export default function WalletPage({ onBack, onGoToDeposit, onGoToWithdraw, onTriggerCompulsoryModal }) {
  const { user } = useAuth();
  const [hideBalance, setHideBalance] = useState(false);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'deposits' | 'withdrawals'

  const loadData = async () => {
    if (user) {
      const allDeps = (await storage.getDepositsAsync()).filter(d => d.userId === user.id);
      const allWths = (await storage.getWithdrawalsAsync()).filter(w => w.userId === user.id);
      const allTxs = await storage.getTransactionsAsync(user.id);

      setDeposits(allDeps);
      setWithdrawals(allWths);
      setTransactions(allTxs);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('crvper_deposits_updated', loadData);
    window.addEventListener('crvper_withdrawals_updated', loadData);
    window.addEventListener('crvper_wallet_delta', loadData);

    return () => {
      window.removeEventListener('crvper_deposits_updated', loadData);
      window.removeEventListener('crvper_withdrawals_updated', loadData);
      window.removeEventListener('crvper_wallet_delta', loadData);
    };
  }, [user]);

  if (!user) return null;

  const eligibility = storage.getWithdrawalEligibility(user.id);
  const balance = Number(user.walletBalance || 0);
  const totalDep = Number(user.totalDeposited || 0);
  const totalWth = Number(user.totalWithdrawn || 0);

  // Pending totals
  const pendingDeposits = deposits.filter(d => d.status === 'PENDING');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'PENDING');
  const pendingWithdrawSum = pendingWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-sky-100 text-slate-900 pb-28 selection:bg-emerald-500 selection:text-black">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-gradient-to-b from-sky-50 via-white to-sky-100/90 backdrop-blur-xl border-b border-sky-100 px-4 py-3.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              sounds.playClick();
              onBack();
            }}
            className="p-2 rounded-xl bg-slate-900 border border-sky-100 hover:border-sky-200 text-slate-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-base font-black text-slate-900 tracking-wide">WALLET & FUNDS</h1>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Direct INR Vault</p>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              loadData();
            }}
            className="p-2 rounded-xl bg-slate-900 border border-sky-100 hover:border-sky-200 text-slate-700 transition"
            title="Refresh Balance"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">

        {/* Master Glowing Wallet Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0f1826] via-[#090e17] to-[#111826] border-2 border-emerald-500/30 rounded-3xl p-6 shadow-2xl">
          {/* Ambient Glow Orbs */}
          <div className="absolute -top-16 -right-16 w-44 h-44 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>ACTIVE WALLET BALANCE</span>
              </span>
              <button
                onClick={() => {
                  sounds.playClick();
                  setHideBalance(!hideBalance);
                }}
                className="text-slate-500 hover:text-slate-900 p-1 rounded-lg transition"
                title={hideBalance ? 'Show Balance' : 'Hide Balance'}
              >
                {hideBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="mt-2 flex items-baseline space-x-1">
              <span className="text-2xl font-black text-emerald-400 font-mono">₹</span>
              <span className="text-4xl sm:text-5xl font-black font-mono text-slate-900 tracking-tight drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                {hideBalance ? '••••••' : balance.toFixed(2)}
              </span>
              <span className="text-xs font-bold text-slate-500 ml-1">INR</span>
            </div>

            {/* 4-Balance Vault Breakdown */}
            <div className="mt-4 pt-3.5 border-t border-sky-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-sky-50/70 border-sky-100/80 rounded-xl p-2.5 border border-sky-100">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Deposited</span>
                <span className="text-sm font-black font-mono text-emerald-300 mt-0.5 block">
                  ₹{eligibility.depositBalance.toFixed(2)}
                </span>
              </div>
              <div className="bg-sky-50/70 border-sky-100/80 rounded-xl p-2.5 border border-sky-100">
                <span className="text-[10px] text-purple-400 uppercase font-bold block">Promo Bonus</span>
                <span className="text-sm font-black font-mono text-purple-300 mt-0.5 block">
                  ₹{eligibility.bonusBalance.toFixed(2)}
                </span>
              </div>
              <div className="bg-sky-50/70 border-sky-100/80 rounded-xl p-2.5 border border-sky-100">
                <span className="text-[10px] text-teal-400 uppercase font-bold block">Winnings</span>
                <span className="text-sm font-black font-mono text-teal-300 mt-0.5 block">
                  ₹{eligibility.winningsBalance.toFixed(2)}
                </span>
              </div>
              <div className="bg-sky-50/70 border-sky-100/80 rounded-xl p-2.5 border border-sky-100">
                <span className="text-[10px] text-amber-400 uppercase font-bold block">Withdrawable</span>
                <span className="text-sm font-black font-mono text-slate-900 mt-0.5 block">
                  ₹{eligibility.withdrawableBalance.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Dual Main Actions: Deposit (Neon Green) & Withdraw (Neon Rose) */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => {
                  sounds.playDeposit();
                  onGoToDeposit();
                }}
                className="py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-2xl text-sm transition transform active:scale-95 shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>DEPOSIT</span>
              </button>

              <button
                onClick={() => {
                  sounds.playWithdraw();
                  onGoToWithdraw();
                }}
                className="py-3.5 px-4 bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 hover:from-rose-500 hover:to-red-400 text-slate-900 font-black rounded-2xl text-sm transition transform active:scale-95 shadow-lg shadow-rose-600/25 flex items-center justify-center space-x-2"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>WITHDRAW</span>
              </button>
            </div>
          </div>
        </div>

        {/* Promotional Wagering Requirement Tracker */}
        {!eligibility.hasMetWagering && (
          <div className="bg-white border-sky-100 border border-emerald-500/40 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-emerald-400 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Promotional Wagering Condition</span>
              </span>
              <span className="text-slate-700 font-mono">
                ₹{eligibility.wageringWagered.toFixed(2)} / ₹{eligibility.wageringRequired.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed mb-2.5">
              You need to wager ₹{eligibility.wageringRemaining.toFixed(2)} more to meet your promotional requirement.
            </p>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{
                  width: `${Math.min(100, eligibility.wageringRequired > 0 ? (eligibility.wageringWagered / eligibility.wageringRequired) * 100 : 100)}%`
                }}
              />
            </div>
          </div>
        )}

        {/* Deposit Requirement Banner */}
        {!eligibility.hasDeposited && (
          <div 
            onClick={() => {
              sounds.playDeposit();
              onGoToDeposit();
            }}
            className="p-3.5 bg-gradient-to-r from-amber-950/70 via-yellow-950/50 to-amber-950/70 border-2 border-amber-500/60 rounded-2xl flex items-center justify-between cursor-pointer hover:border-amber-400 transition shadow-lg shadow-amber-500/10 text-xs text-amber-300"
          >
            <div className="flex items-center space-x-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
              <div>
                <span className="font-black text-slate-900 block">Promotional Condition</span>
                <span className="text-[11px] text-amber-300/90">A minimum deposit of ₹100 is required to become eligible for withdrawal under this promotion.</span>
              </div>
            </div>
            <span className="font-black text-amber-400 underline text-xs shrink-0">Deposit ₹100 →</span>
          </div>
        )}

        {/* Quick Deposit Top-Up Carousel / Chips */}
        <div className="bg-white border-sky-100 border border-sky-100 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-black text-slate-900 flex items-center space-x-1.5">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Instant UPI Top-Up</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase">Min ₹100</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {QUICK_TOPUP_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => {
                  sounds.playDeposit();
                  onGoToDeposit();
                }}
                className="py-2.5 rounded-xl bg-slate-900 border border-sky-100 hover:border-emerald-500 hover:bg-emerald-950/20 text-slate-900 font-mono font-bold text-xs transition flex items-center justify-center space-x-1"
              >
                <span className="text-emerald-400 font-black">+</span>
                <span>₹{amt}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Pending Requests Tracker if any */}
        {(pendingDeposits.length > 0 || pendingWithdrawals.length > 0) && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 px-1 block">
              Active Processing Queue
            </span>

            {pendingDeposits.map((dep) => (
              <div 
                key={dep.id}
                className="bg-emerald-950/20 border border-emerald-500/40 rounded-2xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Clock className="w-4 h-4 animate-spin" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">
                      Deposit Request: ₹{dep.amount}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      UTR: {dep.utr || 'Pending verification'}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-black text-amber-300">
                  PENDING
                </span>
              </div>
            ))}

            {pendingWithdrawals.map((wth) => (
              <div 
                key={wth.id}
                className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <Clock className="w-4 h-4 animate-spin" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">
                      Withdrawal Request: ₹{wth.amount}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {wth.upiId || 'UPI QR Attached'}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-black text-amber-300">
                  PENDING
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Transaction History & Records */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-slate-900 flex items-center space-x-1.5">
              <History className="w-4 h-4 text-slate-500" />
              <span>Wallet Activity History</span>
            </span>

            {/* Filter Pills */}
            <div className="flex space-x-1 bg-slate-900 p-0.5 rounded-xl border border-sky-100 text-[10px] font-bold">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-2 py-1 rounded-lg transition ${activeTab === 'all' ? 'bg-emerald-500 text-black font-extrabold' : 'text-slate-500 hover:text-slate-900'}`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('deposits')}
                className={`px-2 py-1 rounded-lg transition ${activeTab === 'deposits' ? 'bg-emerald-500 text-black font-extrabold' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Deposits
              </button>
              <button
                onClick={() => setActiveTab('withdrawals')}
                className={`px-2 py-1 rounded-lg transition ${activeTab === 'withdrawals' ? 'bg-rose-500 text-slate-900 font-extrabold' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Withdrawals
              </button>
            </div>
          </div>

          {/* List Entries */}
          <div className="space-y-2">
            {activeTab === 'all' && (
              transactions.length === 0 ? (
                <div className="bg-white border-sky-100 border border-sky-100 rounded-2xl p-6 text-center text-xs text-slate-500">
                  No transaction history yet.
                </div>
              ) : (
                transactions.slice(0, 15).map((tx) => {
                  const isPositive = tx.type === 'BONUS' || tx.type === 'DEPOSIT' || tx.type === 'GAME_WIN' || tx.type === 'REFUND';
                  return (
                    <div key={tx.id} className="bg-white border-sky-100 border border-sky-100 rounded-2xl p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {isPositive ? '+' : '-'}
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-900 block">{tx.description}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {tx.type}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-black font-mono block ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPositive ? '+' : '-'}₹{tx.amount.toFixed(2)}
                        </span>
                        <span className={`text-[9px] font-bold uppercase mt-0.5 inline-block px-1.5 py-0.5 rounded ${
                          (tx.status === 'CONFIRMED' || tx.status === 'COMPLETED' || tx.status === 'APPROVED')
                            ? 'text-emerald-400 bg-emerald-950/60'
                            : tx.status === 'REJECTED'
                            ? 'text-rose-400 bg-rose-950/60'
                            : 'text-amber-400 bg-amber-950/60'
                        }`}>
                          {(tx.status === 'CONFIRMED' || tx.status === 'COMPLETED' || tx.status === 'APPROVED') ? 'CONFIRMED' : (tx.status === 'REJECTED' ? 'REJECTED' : 'PENDING')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )
            )}

            {activeTab === 'deposits' && (
              deposits.length === 0 ? (
                <div className="bg-white border-sky-100 border border-sky-100 rounded-2xl p-6 text-center text-xs text-slate-500">
                  No deposit history found.
                </div>
              ) : (
                deposits.map((dep) => (
                  <div key={dep.id} className="bg-white border-sky-100 border border-sky-100 rounded-2xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-900 block font-mono">₹{dep.amount}</span>
                      <span className="text-[10px] text-slate-500 font-mono">UTR: {dep.utr || 'N/A'}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      (dep.status === 'APPROVED' || dep.status === 'CONFIRMED' || dep.status === 'COMPLETED') ? 'bg-emerald-500/20 text-emerald-400' :
                      dep.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-400' :
                      'bg-amber-500/20 text-amber-300'
                    }`}>
                      {(dep.status === 'APPROVED' || dep.status === 'CONFIRMED' || dep.status === 'COMPLETED') ? 'CONFIRMED' : (dep.status === 'REJECTED' ? 'REJECTED' : 'PENDING')}
                    </span>
                  </div>
                ))
              )
            )}

            {activeTab === 'withdrawals' && (
              withdrawals.length === 0 ? (
                <div className="bg-white border-sky-100 border border-sky-100 rounded-2xl p-6 text-center text-xs text-slate-500">
                  No withdrawal history found.
                </div>
              ) : (
                withdrawals.map((wth) => (
                  <div key={wth.id} className="bg-white border-sky-100 border border-sky-100 rounded-2xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-900 block font-mono">₹{wth.amount}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{wth.upiId || 'UPI QR'}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      (wth.status === 'COMPLETED' || wth.status === 'CONFIRMED' || wth.status === 'APPROVED') ? 'bg-emerald-500/20 text-emerald-400' :
                      wth.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-400' :
                      'bg-amber-500/20 text-amber-300'
                    }`}>
                      {(wth.status === 'COMPLETED' || wth.status === 'CONFIRMED' || wth.status === 'APPROVED') ? 'CONFIRMED' : (wth.status === 'REJECTED' ? 'REJECTED' : 'PENDING')}
                    </span>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* 100% Security Guarantee Badge */}
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-3.5 flex items-start space-x-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-black text-emerald-300 block">Bank-Grade Encryption</span>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              All transactions are secured via instant UPI protocol with 0% platform withdrawal fee.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
