import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../services/storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => storage.getCurrentUser());
  const [adminLoggedIn, setAdminLoggedIn] = useState(() => {
    return localStorage.getItem('crvper_admin_auth') === 'true';
  });
  const [promoter, setPromoter] = useState(() => storage.getCurrentPromoter());
  const [showCompulsoryModal, setShowCompulsoryModal] = useState(false);
  const [walletFlash, setWalletFlash] = useState(null); // { amount, type: 'up' | 'down' }

  // Listen to cross-component wallet updates
  useEffect(() => {
    const handleWalletDelta = (e) => {
      const { newBalance, deltaAmount } = e.detail;
      setUser(prev => prev ? { ...prev, walletBalance: newBalance } : null);
      if (deltaAmount > 0) {
        setWalletFlash({ amount: `+₹${deltaAmount.toFixed(2)}`, type: 'up' });
      } else if (deltaAmount < 0) {
        setWalletFlash({ amount: `-₹${Math.abs(deltaAmount).toFixed(2)}`, type: 'down' });
      }
      setTimeout(() => setWalletFlash(null), 1800);
    };

    const handleUserUpdate = () => {
      setUser(storage.getCurrentUser());
    };

    const handlePromoterUpdate = () => {
      setPromoter(storage.getCurrentPromoter());
    };

    window.addEventListener('crvper_wallet_delta', handleWalletDelta);
    window.addEventListener('crvper_user_updated', handleUserUpdate);
    window.addEventListener('crvper_promoter_updated', handlePromoterUpdate);

    return () => {
      window.removeEventListener('crvper_wallet_delta', handleWalletDelta);
      window.removeEventListener('crvper_user_updated', handleUserUpdate);
      window.removeEventListener('crvper_promoter_updated', handlePromoterUpdate);
    };
  }, []);

  const login = (phone, password) => {
    const logged = storage.loginUser(phone, password);
    setUser(logged);
    return logged;
  };

  const register = (phone, password, inviteCode) => {
    const created = storage.registerUser({ phone, password, inviteCode });
    setUser(created);
    return created;
  };

  const logout = () => {
    storage.setCurrentUser(null);
    setUser(null);
  };

  const loginAdmin = (username, password) => {
    if (username === 'crvvper' && password === 'crvvper@123') {
      localStorage.setItem('crvper_admin_auth', 'true');
      setAdminLoggedIn(true);
      return true;
    }
    throw new Error('Invalid Admin Credentials!');
  };

  const logoutAdmin = () => {
    localStorage.removeItem('crvper_admin_auth');
    setAdminLoggedIn(false);
  };

  const loginPromoter = (phone, password) => {
    const p = storage.loginPromoter(phone, password);
    setPromoter(p);
    return p;
  };

  const registerPromoter = (phone, socialUsername, password) => {
    const p = storage.registerPromoter({ phone, socialUsername, password });
    setPromoter(p);
    return p;
  };

  const logoutPromoter = () => {
    storage.setCurrentPromoter(null);
    setPromoter(null);
  };

  // Direct wallet modifier with immediate reactive broadcast
  const modifyBalance = (deltaAmount, reason) => {
    if (!user) return null;
    return storage.updateWalletBalance(user.id, deltaAmount, reason);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        adminLoggedIn,
        promoter,
        walletFlash,
        showCompulsoryModal,
        setShowCompulsoryModal,
        login,
        register,
        logout,
        loginAdmin,
        logoutAdmin,
        loginPromoter,
        registerPromoter,
        logoutPromoter,
        modifyBalance,
        refreshUser: () => setUser(storage.getCurrentUser())
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
