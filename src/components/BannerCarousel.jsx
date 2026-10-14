import React, { useState, useEffect } from 'react';
import { Gift, Zap, ShieldCheck, Headphones, ChevronRight, ArrowUpRight } from 'lucide-react';

const BANNERS = [
  {
    id: 1,
    tag: 'DAILY BONUS',
    title: 'FREE ₹150 BONUS',
    subtitle: 'Instant credit on registration for new players. Play all 6 games!',
    buttonText: 'CLAIM & PLAY',
    accent: 'from-blue-600 via-indigo-700 to-cyan-500',
    icon: Gift,
    bgGlow: 'rgba(59, 130, 246, 0.25)'
  },
  {
    id: 2,
    tag: 'HOW TO DEPOSIT',
    title: 'INSTANT UPI PAY',
    subtitle: 'Scan Admin UPI QR Code using PhonePe, GPay, or Paytm (Min ₹100).',
    buttonText: 'VIEW GUIDE',
    accent: 'from-emerald-600 via-teal-700 to-cyan-600',
    icon: Zap,
    bgGlow: 'rgba(16, 185, 129, 0.25)'
  },
  {
    id: 3,
    tag: 'PROMOTER EARN',
    title: '20% LIFETIME SHARE',
    subtitle: 'Refer players via your invite link and earn 20% on every deposit!',
    buttonText: 'JOIN PROMOTER',
    accent: 'from-purple-600 via-violet-700 to-fuchsia-600',
    icon: ArrowUpRight,
    bgGlow: 'rgba(168, 85, 247, 0.25)'
  },
  {
    id: 4,
    tag: '24/7 VIP DESK',
    title: 'CUSTOMER SUPPORT',
    subtitle: 'Fast manual dispute resolution and instant live chat assistance.',
    buttonText: 'CHAT NOW',
    accent: 'from-cyan-600 via-blue-700 to-sky-500',
    icon: Headphones,
    bgGlow: 'rgba(6, 182, 212, 0.25)'
  }
];

export default function BannerCarousel({ onActionClick }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BANNERS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const banner = BANNERS[currentIndex];
  const Icon = banner.icon;

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 mt-3 select-none">
      <div 
        className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-6 bg-gradient-to-r ${banner.accent} border border-white/10 shadow-xl transition-all duration-700`}
        style={{ boxShadow: `0 10px 30px -5px ${banner.bgGlow}` }}
      >
        {/* Dynamic Background Graphics */}
        <div className="absolute right-[-20px] top-[-20px] w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 sm:opacity-30 pointer-events-none">
          <Icon className="w-32 h-32 sm:w-44 sm:h-44 text-white" />
        </div>

        <div className="relative z-10 max-w-[70%] sm:max-w-md">
          <div className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] sm:text-xs font-black tracking-wider text-white uppercase mb-1.5">
            {banner.tag}
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            {banner.title}
          </h2>
          <p className="text-xs sm:text-sm text-white/80 mt-1 leading-snug line-clamp-2">
            {banner.subtitle}
          </p>

          <button
            onClick={() => onActionClick(banner.id)}
            className="mt-3.5 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white text-slate-900 text-xs sm:text-sm font-black hover:bg-slate-100 transition transform active:scale-95 shadow-md"
          >
            <span>{banner.buttonText}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Carousel indicators */}
        <div className="absolute bottom-3 right-4 flex items-center space-x-1.5 z-10">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
