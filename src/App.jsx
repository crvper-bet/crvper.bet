import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';

// Components
import Navbar from './components/Navbar';
import BannerCarousel from './components/BannerCarousel';
import WalletCard from './components/WalletCard';
import GamesGrid from './components/GamesGrid';
import Leaderboard from './components/Leaderboard';
import BottomNav from './components/BottomNav';
import CustomerSupportModal from './components/CustomerSupportModal';
import CompulsoryDepositModal from './components/CompulsoryDepositModal';
import MaxLimitModal from './components/MaxLimitModal';
import ProfileModal from './components/ProfileModal';
import ActivityView from './components/ActivityView';

// Pages
import AuthPage from './pages/AuthPage';
import DepositPage from './pages/DepositPage';
import WithdrawPage from './pages/WithdrawPage';
import AdminPage from './pages/AdminPage';
import PromoterPage from './pages/PromoterPage';
import WalletPage from './pages/WalletPage';
import AccountPage from './pages/AccountPage';

// Games
import MinesGame from './games/MinesGame';
import WinGoGame from './games/WinGoGame';
import AviatorGame from './games/AviatorGame';
import NeonTowerGame from './games/NeonTowerGame';
import QuantumDiceGame from './games/QuantumDiceGame';
import PlinkoGame from './games/PlinkoGame';
import { realtimeSync } from './services/realtimeSync';

export default function App() {
  const { user, showCompulsoryModal, setShowCompulsoryModal } = useAuth();

  // Initialize global real-time cross-device sync
  React.useEffect(() => {
    realtimeSync.init();
  }, []);

  // Navigation state
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'auth' | 'deposit' | 'withdraw' | 'admin' | 'promoter' | 'activity' | 'account'
  const [activeGame, setActiveGame] = useState(null); // 'mines' | 'wingo' | 'aviator' | 'tower' | 'dice' | 'plinko'

  // Modals
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [showMaxLimitModal, setShowMaxLimitModal] = useState(false);

  // If user is not logged in and wants to play/transact, prompt AuthPage
  const requireAuth = (callback) => {
    if (!user) {
      setCurrentView('auth');
    } else {
      callback();
    }
  };

  // Handle banner clicks
  const handleBannerAction = (bannerId) => {
    if (bannerId === 1) {
      // Daily Bonus -> scroll or open Aviator
      requireAuth(() => setActiveGame('aviator'));
    } else if (bannerId === 2) {
      // How to deposit -> Deposit page
      requireAuth(() => setCurrentView('deposit'));
    } else if (bannerId === 3) {
      // Promoter -> Promoter portal
      setCurrentView('promoter');
    } else if (bannerId === 4) {
      // Support
      setSupportModalOpen(true);
    }
  };

  // ROUTE 1: ADMIN PORTAL
  if (currentView === 'admin') {
    return <AdminPage onExit={() => setCurrentView('home')} />;
  }

  // ROUTE 2: PROMOTER / AFFILIATE PORTAL (20% Commission)
  if (currentView === 'promoter') {
    return <PromoterPage onExit={() => setCurrentView('home')} />;
  }

  // FIRST-VISIT AUTH GATE: Unauthenticated visitors see Registration/Login first
  if (!user || currentView === 'auth') {
    return (
      <AuthPage
        onAdminClick={() => setCurrentView('admin')}
        onPromoterClick={() => setCurrentView('promoter')}
        onComplete={() => setCurrentView('home')}
      />
    );
  }

  // ROUTE 4: DEPOSIT PAGE
  if (currentView === 'deposit') {
    return (
      <DepositPage
        onBack={() => setCurrentView('home')}
      />
    );
  }

  // ROUTE 5: WITHDRAW PAGE
  if (currentView === 'withdraw') {
    return (
      <WithdrawPage
        onBack={() => setCurrentView('home')}
        onGoToDeposit={() => setCurrentView('deposit')}
        onTriggerCompulsoryModal={() => setShowCompulsoryModal(true)}
      />
    );
  }

  // ROUTE 6: FULL WALLET DASHBOARD
  if (currentView === 'wallet') {
    return (
      <WalletPage
        onBack={() => setCurrentView('home')}
        onGoToDeposit={() => setCurrentView('deposit')}
        onGoToWithdraw={() => setCurrentView('withdraw')}
        onTriggerCompulsoryModal={() => setShowCompulsoryModal(true)}
      />
    );
  }

  // ROUTE 7: DEDICATED FULL ACCOUNT PAGE
  if (currentView === 'account') {
    return (
      <AccountPage
        onBack={() => setCurrentView('home')}
        onGoToWallet={() => setCurrentView('wallet')}
        onGoToDeposit={() => setCurrentView('deposit')}
        onGoToWithdraw={() => setCurrentView('withdraw')}
        onGoToActivity={() => setCurrentView('activity')}
        onGoToPromoter={() => setCurrentView('promoter')}
        onOpenSupport={() => setSupportModalOpen(true)}
      />
    );
  }

  // ROUTE 6: ACTIVE GAMES
  if (activeGame === 'mines') {
    return <MinesGame onBack={() => setActiveGame(null)} />;
  }
  if (activeGame === 'wingo') {
    return (
      <>
        <WinGoGame 
          onBack={() => setActiveGame(null)} 
          onOpenMaxLimitModal={() => setShowMaxLimitModal(true)}
        />
        <MaxLimitModal
          isOpen={showMaxLimitModal}
          onClose={() => setShowMaxLimitModal(false)}
          onGoToWithdraw={() => {
            setActiveGame(null);
            setCurrentView('withdraw');
          }}
          onGoToDeposit={() => {
            setActiveGame(null);
            setCurrentView('deposit');
          }}
          hasDeposited={user?.hasDeposited}
        />
      </>
    );
  }
  if (activeGame === 'aviator') {
    return (
      <>
        <AviatorGame 
          onBack={() => setActiveGame(null)} 
          onOpenMaxLimitModal={() => setShowMaxLimitModal(true)} 
        />
        <MaxLimitModal
          isOpen={showMaxLimitModal}
          onClose={() => setShowMaxLimitModal(false)}
          onGoToWithdraw={() => {
            setActiveGame(null);
            setCurrentView('withdraw');
          }}
          onGoToDeposit={() => {
            setActiveGame(null);
            setCurrentView('deposit');
          }}
          hasDeposited={user?.hasDeposited}
        />
      </>
    );
  }
  if (activeGame === 'tower') {
    return <NeonTowerGame onBack={() => setActiveGame(null)} />;
  }
  if (activeGame === 'dice') {
    return <QuantumDiceGame onBack={() => setActiveGame(null)} />;
  }
  if (activeGame === 'plinko') {
    return <PlinkoGame onBack={() => setActiveGame(null)} />;
  }

  // ROUTE 7: ACTIVITY TAB
  if (currentView === 'activity') {
    return (
      <div className="min-h-screen bg-[#070b14]">
        <Navbar
          onOpenSupport={() => setSupportModalOpen(true)}
          onOpenProfile={() => setProfileModalOpen(true)}
          onOpenPromoter={() => setCurrentView('promoter')}
          onOpenAdmin={() => setCurrentView('admin')}
        />
        <ActivityView />
        <BottomNav
          activeTab={currentView}
          onChangeTab={(tab) => setCurrentView(tab)}
          onOpenSupport={() => setSupportModalOpen(true)}
        />
      </div>
    );
  }

  // ROUTE 8: MAIN HOME DASHBOARD
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Top Navbar */}
      <Navbar
        onOpenSupport={() => setSupportModalOpen(true)}
        onOpenProfile={() => {
          if (!user) setCurrentView('auth');
          else setCurrentView('account');
        }}
        onOpenPromoter={() => setCurrentView('promoter')}
        onOpenAdmin={() => setCurrentView('admin')}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-24">
        {/* Carousel Banner */}
        <BannerCarousel onActionClick={handleBannerAction} />

        {/* Live Wallet Card */}
        <WalletCard
          onWalletClick={() => requireAuth(() => setCurrentView('wallet'))}
          onDepositClick={() => requireAuth(() => setCurrentView('deposit'))}
          onWithdrawClick={() => requireAuth(() => {
            if (!user?.hasDeposited) {
              setShowCompulsoryModal(true);
            } else {
              setCurrentView('withdraw');
            }
          })}
        />

        {/* 2x3 Games Grid */}
        <GamesGrid
          onSelectGame={(gameId) => {
            const limitCheck = storage.checkGameWinningLimit(user?.id, gameId);
            if (limitCheck.isLimitReached) {
              setShowMaxLimitModal(true);
              return;
            }
            requireAuth(() => setActiveGame(gameId));
          }}
        />

        {/* Live Leaderboard & Payouts */}
        <Leaderboard />

        {/* Footer Admin & Promoter Links */}
        <div className="max-w-4xl mx-auto px-4 mt-8 mb-6 flex items-center justify-center space-x-6 text-xs text-slate-500">
          <button
            onClick={() => setCurrentView('admin')}
            className="hover:text-cyan-400 transition"
          >
            Admin Control Center (crvvper)
          </button>
          <span>•</span>
          <button
            onClick={() => setCurrentView('promoter')}
            className="hover:text-purple-400 transition"
          >
            Promoter & Influencer Hub (20%)
          </button>
        </div>
      </main>

      {/* Mobile-First Bottom Nav */}
      <BottomNav
        activeTab={currentView}
        onChangeTab={(tab) => {
          if (tab === 'wallet') {
            requireAuth(() => setCurrentView('wallet'));
          } else if (tab === 'account') {
            requireAuth(() => setCurrentView('account'));
          } else {
            setCurrentView(tab);
          }
        }}
        onOpenSupport={() => setSupportModalOpen(true)}
      />

      {/* Compulsory 100rs Deposit Modal */}
      <CompulsoryDepositModal
        isOpen={showCompulsoryModal}
        onClose={() => setShowCompulsoryModal(false)}
        onGoToDeposit={() => setCurrentView('deposit')}
      />

      {/* Maximum 100,000 Win Cap Modal */}
      <MaxLimitModal
        isOpen={showMaxLimitModal}
        onClose={() => setShowMaxLimitModal(false)}
        onGoToWithdraw={() => setCurrentView('withdraw')}
        onGoToDeposit={() => setCurrentView('deposit')}
        hasDeposited={Boolean(user && (user.hasDeposited || Number(user.totalDeposited || 0) >= 100))}
      />

      {/* Customer Support Floating Chat Modal */}
      <CustomerSupportModal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
      />
    </div>
  );
}
