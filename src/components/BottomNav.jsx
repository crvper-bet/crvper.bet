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
      <nav className="max-w-md mx-auto bg-white/95 backdrop-blur-xl border border-sky-100 rounded-2xl sm:rounded-3xl p-1.5 shadow-xl shadow-sky-200/50 flex items-center justify-between pointer-events-auto">
        {tabs.map((tab) => {
          if (tab.isCenter) {
            return (
              <div key="center-deposit" className="relative -top-3.5 flex flex-col items-center">
                <button
                  onClick={() => {
                    sounds.playDeposit();
                    onChangeTab('deposit');
                  }}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 via-sky-400 to-cyan-400 hover:from-sky-600 hover:to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-sky-400/40 transition transform active:scale-90 border-2 border-white"
                  title="Instant Deposit"
                >
                  <Plus className="w-6 h-6 stroke-[3]" />
                </button>
                <span className="text-[9px] font-black uppercase tracking-wider text-sky-600 mt-0.5">
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
                  ? 'text-sky-600'
                  : 'text-slate-400 hover:text-slate-600 active:scale-95'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sky-500 shadow-[0_0_8px_#0ea5e9]" />
                )}
              </div>
              <span className={`text-[10px] font-black tracking-tight mt-1 ${isActive ? 'text-sky-700' : 'text-slate-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
