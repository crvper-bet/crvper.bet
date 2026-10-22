import React, { useState, useEffect } from 'react';
import { Gift, Zap, ShieldCheck, Headphones, ChevronRight, ArrowUpRight, Sparkles } from 'lucide-react';
import { sounds } from '../services/audio';

const BANNERS = [
  {
    id: 1,
    tag: 'SIGNUP BONUS',
    title: 'FREE ₹150 WELCOME VAULT',
    subtitle: 'Credited instantly to all newly registered accounts. Play all 6 casino games!',
    buttonText: 'Claim ₹150 Bonus',
    accent: 'from-white via-sky-50 to-white',
    border: 'border-sky-200',
    tagColor: 'bg-sky-100 text-sky-700 border border-sky-300',
    btnStyle: 'bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-black shadow-md shadow-sky-400/25',
    icon: Gift,
    bgGlow: 'rgba(14, 165, 233, 0.15)'
  },
  {
    id: 2,
    tag: 'INSTANT PAYOUTS',
    title: 'DIRECT 1-CLICK UPI DEPOSIT',
    subtitle: 'Scan Admin UPI QR Code using PhonePe, GPay, or Paytm with zero fees (Min ₹100).',
    buttonText: 'Deposit Instant',
    accent: 'from-white via-cyan-50 to-white',
    border: 'border-cyan-200',
    tagColor: 'bg-cyan-100 text-cyan-800 border border-cyan-300',
    btnStyle: 'bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-600 hover:to-sky-600 text-white font-black shadow-md shadow-cyan-400/25',
    icon: Zap,
    bgGlow: 'rgba(6, 182, 212, 0.15)'
  },
  {
    id: 3,
    tag: 'AFFILIATE PROGRAM',
    title: 'EARN 20% LIFETIME REVENUE',
    subtitle: 'Invite players using your custom promoter link and get instant 20% on every deposit!',
    buttonText: 'Become Promoter',
    accent: 'from-white via-indigo-50 to-white',
    border: 'border-indigo-200',
    tagColor: 'bg-indigo-100 text-indigo-700 border border-indigo-300',
    btnStyle: 'bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-black shadow-md shadow-indigo-400/25',
    icon: ArrowUpRight,
    bgGlow: 'rgba(99, 102, 241, 0.15)'
  },
  {
    id: 4,
    tag: '24/7 VIP SUPPORT',
    title: 'DEDICATED PLAYER CONCIERGE',
    subtitle: 'Fast deposit verification, dispute resolution, and 24/7 priority live assistance.',
    buttonText: 'Open Live Chat',
    accent: 'from-white via-sky-50 to-white',
    border: 'border-sky-200',
    tagColor: 'bg-sky-100 text-sky-800 border border-sky-300',
    btnStyle: 'bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white font-black shadow-md shadow-sky-400/25',
    icon: Headphones,
    bgGlow: 'rgba(14, 165, 233, 0.15)'
  }
];

export default function BannerCarousel({ onActionClick }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % BANNERS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const banner = BANNERS[current];
  const Icon = banner.icon;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-3 select-none">
      <div 
        onClick={() => {
          sounds.playClick();
          onActionClick(banner.id);
        }}
        className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 border ${banner.border} bg-gradient-to-r ${banner.accent} cursor-pointer transition-all duration-300 shadow-lg shadow-sky-100/60`}
      >
        {/* Soft Ambient Glacier Light */}
        <div 
          className="absolute -right-8 -top-8 w-44 h-44 rounded-full blur-3xl pointer-events-none transition-colors duration-500"
          style={{ background: banner.bgGlow }}
        />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-lg">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${banner.tagColor}`}>
              <Sparkles className="w-3 h-3 mr-1" />
              {banner.tag}
            </span>

            <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              {banner.title}
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">
              {banner.subtitle}
            </p>

            <div className="pt-2">
              <button 
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm flex items-center space-x-1.5 transition active:scale-95 ${banner.btnStyle}`}
              >
                <span>{banner.buttonText}</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          <div className="hidden sm:flex items-center justify-center w-24 h-24 rounded-2xl bg-white border border-sky-100 text-sky-500 shadow-md shrink-0">
            <Icon className="w-12 h-12" />
          </div>
        </div>

        {/* Carousel indicators */}
        <div className="absolute bottom-2.5 right-4 flex space-x-1.5 z-20" onClick={(e) => e.stopPropagation()}>
          {BANNERS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                current === idx ? 'w-6 bg-sky-500' : 'w-2 bg-sky-200 hover:bg-sky-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
