import React, { useState, useEffect } from 'react';
import { 
  History, ArrowDownLeft, ArrowUpRight, Gift, Clock, CheckCircle2, 
  XCircle, RefreshCw, Filter, ShieldCheck 
} from 'lucide-react';
import { storage } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';

export default function ActivityView() {
  const { user } = useAuth();
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'deposits' | 'withdrawals'
  const [transactions, setTransactions] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);

  const loadData = async () => {
    if (user) {
      const txs = await storage.getTransactionsAsync(user.id);
      setTransactions(txs);
      const userDeps = (await storage.getDepositsAsync()).filter((d) => d.userId === user.id);
      setDeposits(userDeps);
      const userWths = (await storage.getWithdrawalsAsync()).filter((w) => w.userId === user.id);
      setWithdrawals(userWths);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('crvper_wallet_delta', loadData);
    window.addEventListener('crvper_deposits_updated', loadData);
    window.addEventListener('crvper_withdrawals_updated', loadData);
    return () => {
      window.removeEventListener('crvper_wallet_delta', loadData);
      window.removeEventListener('crvper_deposits_updated', loadData);
      window.removeEventListener('crvper_withdrawals_updated', loadData);
    };
  }, [user]);

  const handleRefresh = () => {
    sounds.playClick();
    loadData();
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 pb-28 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center space-x-2">
            <History className="w-5 h-5 text-cyan-400" />
            <span>Activity & Orders</span>
          </h2>
          <p className="text-xs text-slate-400">Track all deposits, withdrawals, and game history</p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
          title="Refresh activity"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-3 gap-2 bg-[#0f172a] border border-slate-800 p-1.5 rounded-2xl mb-4">
        {[
          { id: 'all', label: 'All History' },
          { id: 'deposits', label: `Deposits (${deposits.length})` },
          { id: 'withdrawals', label: `Withdrawals (${withdrawals.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              sounds.playClick();
              setFilterTab(tab.id);
            }}
            className={`py-2 rounded-xl text-xs font-bold transition ${
              filterTab === tab.id
                ? 'bg-cyan-500 text-black font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: DEPOSITS ONLY */}
      {filterTab === 'deposits' && (
        <div className="space-y-2.5">
          {deposits.length === 0 ? (
            <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-8 text-center text-slate-500 text-xs">
              No deposit requests found.
            </div>
          ) : (
            deposits.map((dep) => {
              const isApproved = dep.status === 'APPROVED' || dep.status === 'CONFIRMED' || dep.status === 'COMPLETED';
              const isRejected = dep.status === 'REJECTED';
              return (
                <div
                  key={dep.id}
                  className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <ArrowDownLeft className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-black text-white font-mono block">
                        ₹{dep.amount}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        UTR: {dep.utr}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(dep.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        isApproved
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : isRejected
                          ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                          : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                      }`}
                    >
                      {isApproved ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>CONFIRMED</span>
                        </>
                      ) : isRejected ? (
                        <>
                          <XCircle className="w-3 h-3" />
                          <span>REJECTED</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 animate-spin" />
                          <span>PENDING</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: WITHDRAWALS ONLY */}
      {filterTab === 'withdrawals' && (
        <div className="space-y-2.5">
          {withdrawals.length === 0 ? (
            <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-8 text-center text-slate-500 text-xs">
              No withdrawal requests found.
            </div>
          ) : (
            withdrawals.map((wth) => {
              const isCompleted = wth.status === 'COMPLETED' || wth.status === 'CONFIRMED' || wth.status === 'APPROVED';
              const isRejected = wth.status === 'REJECTED';
              return (
                <div
                  key={wth.id}
                  className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-black text-rose-400 font-mono block">
                        ₹{wth.amount}
                      </span>
                      <span className="text-[10px] text-slate-300 font-mono block">
                        To: {wth.upiId}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(wth.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        isCompleted
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : isRejected
                          ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                          : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>CONFIRMED</span>
                        </>
                      ) : isRejected ? (
                        <>
                          <XCircle className="w-3 h-3" />
                          <span>REJECTED</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 animate-spin" />
                          <span>PENDING</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: ALL COMBINED TRANSACTIONS */}
      {filterTab === 'all' && (
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-8 text-center text-slate-500 text-xs">
              No transactions yet. Start playing or make a deposit!
            </div>
          ) : (
            transactions.map((tx) => {
              const isPositive = tx.type === 'BONUS' || tx.type === 'DEPOSIT' || tx.type === 'REFUND';
              return (
                <div
                  key={tx.id}
                  className="bg-[#0f172a] border border-slate-800/80 rounded-2xl p-3.5 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        tx.type === 'BONUS'
                          ? 'bg-amber-500/10 text-amber-400'
                          : tx.type === 'DEPOSIT'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {tx.type === 'BONUS' ? (
                        <Gift className="w-4 h-4" />
                      ) : tx.type === 'DEPOSIT' ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">{tx.description}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(tx.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs font-mono font-black ${
                        isPositive ? 'text-emerald-400' : 'text-slate-200'
                      }`}
                    >
                      {isPositive ? '+' : '-'}₹{tx.amount}
                    </span>
                    <span
                      className={`block text-[9px] font-bold uppercase mt-0.5 ${
                        (tx.status === 'CONFIRMED' || tx.status === 'COMPLETED' || tx.status === 'APPROVED')
                          ? 'text-emerald-400'
                          : tx.status === 'REJECTED'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {(tx.status === 'CONFIRMED' || tx.status === 'COMPLETED' || tx.status === 'APPROVED') ? 'CONFIRMED' : tx.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
