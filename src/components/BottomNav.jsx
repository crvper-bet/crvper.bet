import React from 'react';
import { Home, LineChart, Wallet, User, Headphones } from 'lucide-react';
import { sounds } from '../services/audio';

export default function BottomNav({ activeTab, onChangeTab, onOpenSupport }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'activity', label: 'Activity', icon: LineChart },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'account', label: 'Account', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0b0f19]/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-2 sm:py-2.5">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                sounds.playClick();
                onChangeTab(tab.id);
              }}
              className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition duration-200 ${
                isActive ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`relative ${isActive ? 'scale-110' : ''} transition-transform`}>
                <Icon className="w-5 h-5" />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#00e5ff]" />
                )}
              </div>
              <span className="text-[10px] font-bold tracking-tight mt-1">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
