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
    accent: 'from-[#0b1b2b] via-[#091522] to-[#0a101d]',
    border: 'border-emerald-500/40',
    tagColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
    btnStyle: 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black shadow-lg shadow-emerald-500/25',
    icon: Gift,
    bgGlow: 'rgba(16, 185, 129, 0.25)'
  },
  {
    id: 2,
    tag: 'INSTANT PAYOUTS',
    title: 'DIRECT 1-CLICK UPI DEPOSIT',
    subtitle: 'Scan Admin UPI QR Code using PhonePe, GPay, or Paytm with zero fees (Min ₹100).',
    buttonText: 'Deposit Instant',
    accent: 'from-[#101c2e] via-[#0d1624] to-[#09101a]',
    border: 'border-cyan-500/40',
    tagColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
    btnStyle: 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black shadow-lg shadow-cyan-500/25',
    icon: Zap,
    bgGlow: 'rgba(6, 182, 212, 0.25)'
  },
  {
    id: 3,
    tag: 'AFFILIATE PROGRAM',
    title: 'EARN 20% LIFETIME REVENUE',
    subtitle: 'Invite players using your custom promoter link and get instant 20% on every deposit!',
    buttonText: 'Become Promoter',
    accent: 'from-[#19102c] via-[#120c22] to-[#09101a]',
    border: 'border-purple-500/40',
    tagColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
    btnStyle: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-black shadow-lg shadow-purple-500/25',
    icon: ArrowUpRight,
    bgGlow: 'rgba(168, 85, 247, 0.25)'
  },
  {
    id: 4,
    tag: '24/7 VIP SUPPORT',
    title: 'DEDICATED PLAYER CONCIERGE',
    subtitle: 'Fast deposit verification, dispute resolution, and 24/7 priority live assistance.',
    buttonText: 'Open Live Chat',
    accent: 'from-[#131c26] via-[#0f1720] to-[#080e18]',
    border: 'border-amber-500/40',
    tagColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    btnStyle: 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black shadow-lg shadow-amber-500/25',
    icon: Headphones,
    bgGlow: 'rgba(245, 158, 11, 0.25)'
  }
];

export default function BannerCarousel({ onActionClick }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BANNERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const banner = BANNERS[currentIndex];
  const Icon = banner.icon;

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 mt-3 select-none">
      <div 
        className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br ${banner.accent} border ${banner.border} shadow-2xl transition-all duration-700`}
        style={{ boxShadow: `0 15px 35px -10px ${banner.bgGlow}` }}
      >
        {/* Ambient Corner Blur */}
        <div className="absolute right-[-20px] top-[-20px] w-56 h-56 rounded-full bg-white/[0.04] blur-3xl pointer-events-none" />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-15 sm:opacity-25 pointer-events-none transition-transform duration-500 transform hover:scale-105">
          <Icon className="w-32 h-32 sm:w-44 sm:h-44 text-white" />
        </div>

        <div className="relative z-10 max-w-[75%] sm:max-w-md">
          <div className={`inline-block px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-black tracking-widest uppercase mb-2 ${banner.tagColor}`}>
            {banner.tag}
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            {banner.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-snug line-clamp-2">
            {banner.subtitle}
          </p>

          <button
            onClick={() => {
              sounds.playClick();
              onActionClick(banner.id);
            }}
            className={`mt-4 inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm transition transform active:scale-95 ${banner.btnStyle}`}
          >
            <span>{banner.buttonText}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Carousel Progress Indicators */}
        <div className="absolute bottom-4 right-5 flex items-center space-x-1.5 z-10">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                sounds.playClick();
                setCurrentIndex(i);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex ? 'w-6 bg-emerald-400' : 'w-2 bg-slate-700 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
