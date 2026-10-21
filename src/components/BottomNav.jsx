import React from 'react';
import { Flame, LineChart, Wallet, User, Plus, CreditCard } from 'lucide-react';
import { sounds } from '../services/audio';

export default function BottomNav({ activeTab, onChangeTab, onOpenSupport }) {
  const tabs = [
    { id: 'home', label: 'Casino', icon: Flame },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    // Center Deposit Action is rendered custom below
    { id: 'deposit', label: 'Deposit', isCenter: true },
    { id: 'activity', label: 'Activity', icon: LineChart },
    { id: 'account', label: 'Profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-2.5 pt-1 pointer-events-none select-none">
      <nav className="max-w-md mx-auto bg-[#0d1524]/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl sm:rounded-3xl p-1.5 shadow-2xl shadow-black/80 flex items-center justify-between pointer-events-auto">
        {tabs.map((tab) => {
          if (tab.isCenter) {
            return (
              <div key="center-deposit" className="relative -top-3.5 flex flex-col items-center">
                <button
                  onClick={() => {
                    sounds.playDeposit();
                    onChangeTab('deposit');
                  }}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/40 transition transform active:scale-90 border-2 border-[#090e17]"
                  title="Instant Deposit"
                >
                  <Plus className="w-6 h-6 stroke-[3]" />
                </button>
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 mt-0.5">
                  Deposit
                </span>
              </div>
            );
          }

          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                sounds.playClick();
                onChangeTab(tab.id);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition duration-150 ${
                isActive
                  ? 'text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 active:scale-95'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_8px_#00e701]" />
                )}
              </div>
              <span className={`text-[10px] font-black tracking-tight mt-1 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
