import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ShieldCheck, Users, ArrowDownLeft, ArrowUpRight, QrCode, Headphones, 
  Trash2, Send, CheckCircle2, XCircle, LogOut, RefreshCw, Eye, Edit3, DollarSign, Activity,
  Volume2, Play, Upload, RotateCcw, Music, Sparkles, Search, Filter, Calendar, TrendingUp,
  AlertCircle, ExternalLink, Copy, Check, ChevronLeft, ChevronRight, Info, Lock, Unlock,
  MessageSquare, UserCheck, Wallet, Clock, ArrowRight
} from 'lucide-react';
import { storage } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';
import { soundStorage } from '../services/soundStorage';

export default function AdminPage({ onExit }) {
  const { adminLoggedIn, loginAdmin, logoutAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'deposits', 'withdrawals', 'users', 'promoters', 'support', 'promotions', 'qr', 'audio'

  // Admin login form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Live state with immediate cache pre-fill
  const [deposits, setDeposits] = useState(() => {
    try { return (storage.getDeposits() || []).reverse(); } catch { return []; }
  });
  const [withdrawals, setWithdrawals] = useState(() => {
    try { return (storage.getWithdrawals() || []).reverse(); } catch { return []; }
  });
  const [users, setUsers] = useState(() => {
    try { return (storage.getUsers() || []).reverse(); } catch { return []; }
  });
  const [promoters, setPromoters] = useState(() => {
    try { return storage.getPromoters() || []; } catch { return []; }
  });
  const [adminSettings, setAdminSettings] = useState(() => {
    try { return storage.getAdminSettings(); } catch { return null; }
  });
  const [supportChats, setSupportChats] = useState(() => {
    try { return storage.getSupportChats() || []; } catch { return []; }
  });
  const [transactions, setTransactions] = useState(() => {
    try { return storage.getTransactions() || []; } catch { return []; }
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Support chat state
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [adminReply, setAdminReply] = useState('');
  const [supportSearch, setSupportSearch] = useState('');
  const chatMessagesEndRef = useRef(null);

  // Modals
  const [viewScreenshot, setViewScreenshot] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null); // For Player Details & Ledger Modal
  const [rejectionModal, setRejectionModal] = useState(null); // { type: 'deposit' | 'withdrawal', id: string, defaultReason: string }
  const [rejectionReason, setRejectionReason] = useState('');
  const [copiedText, setCopiedText] = useState('');
  const [confirmationModal, setConfirmationModal] = useState(null);

  // Filters, Searching, Sorting, and Pagination
  // Deposits Tab
  const [depositFilter, setDepositFilter] = useState('ALL'); // ALL, PENDING, APPROVED, REJECTED
  const [depositSearch, setDepositSearch] = useState('');
  const [depositPage, setDepositPage] = useState(1);
  const itemsPerPage = 12;

  // Withdrawals Tab
  const [withdrawalFilter, setWithdrawalFilter] = useState('ALL'); // ALL, PENDING, COMPLETED, REJECTED
  const [withdrawalSearch, setWithdrawalSearch] = useState('');
  const [withdrawalPage, setWithdrawalPage] = useState(1);

  // Players / Users Tab
  const [userFilter, setUserFilter] = useState('ALL'); // ALL, DEPOSITED, LOCKED, HIGH_BALANCE
  const [userSearch, setUserSearch] = useState('');
  const [userSort, setUserSort] = useState('NEWEST'); // NEWEST, OLDEST, BALANCE_DESC, DEPOSITED_DESC
  const [userPage, setUserPage] = useState(1);

  // Promoters Tab
  const [promoterSearch, setPromoterSearch] = useState('');

  // Overview Timeframe
  const [overviewTimeframe, setOverviewTimeframe] = useState('ALL'); // ALL, TODAY, 7D, 30D

  // Settings states
  const [newUpiId, setNewUpiId] = useState('');
  const [newPayeeName, setNewPayeeName] = useState('');
  const [newQrImage, setNewQrImage] = useState(null);
  const [audioFeedback, setAudioFeedback] = useState('');
  const [customSoundMeta, setCustomSoundMeta] = useState({});
  const [soundModes, setSoundModes] = useState(() => storage.getAdminSettings()?.soundModes || {});

  // Promotional and Risk Controls State
  const [promoActive, setPromoActive] = useState(() => storage.getAdminSettings()?.promoActive ?? true);
  const [signupBonus, setSignupBonus] = useState(() => storage.getAdminSettings()?.signupBonus ?? 150);
  const [minQualifyingDeposit, setMinQualifyingDeposit] = useState(() => storage.getAdminSettings()?.minQualifyingDeposit ?? 100);
  const [wageringPercentage, setWageringPercentage] = useState(() => storage.getAdminSettings()?.wageringPercentage ?? 50);
  const [aviatorWingoLimitMultiplier, setAviatorWingoLimitMultiplier] = useState(() => storage.getAdminSettings()?.aviatorWingoLimitMultiplier ?? 3.0);
  const [promoFeedback, setPromoFeedback] = useState('');

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const loadAudioMeta = async () => {
    try {
      const all = await soundStorage.getAllSounds();
      const meta = {};
      for (const [key, val] of Object.entries(all)) {
        meta[key] = { name: val.name, size: val.size, type: val.type, updatedAt: val.updatedAt };
      }
      setCustomSoundMeta(meta);
      const latestModes = soundStorage.getSoundModes();
      if (latestModes && Object.keys(latestModes).length > 0) {
        setSoundModes(prev => ({ ...prev, ...latestModes }));
      }
    } catch (e) {
      console.warn('[AdminPage] loadAudioMeta error:', e);
    }
  };

  const loadData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const results = await Promise.allSettled([
        storage.getDepositsAsync(),
        storage.getWithdrawalsAsync(),
        storage.getUsersAsync(),
        storage.getPromotersAsync(),
        storage.getAdminSettingsAsync(),
        storage.getSupportChatsAsync(),
        storage.getTransactionsAsync()
      ]);

      const deps = results[0].status === 'fulfilled' ? results[0].value : storage.getDeposits();
      const withs = results[1].status === 'fulfilled' ? results[1].value : storage.getWithdrawals();
      const usrs = results[2].status === 'fulfilled' ? results[2].value : storage.getUsers();
      const proms = results[3].status === 'fulfilled' ? results[3].value : storage.getPromoters();
      const settings = results[4].status === 'fulfilled' ? results[4].value : storage.getAdminSettings();
      const chats = results[5].status === 'fulfilled' ? results[5].value : storage.getSupportChats();
      const txs = results[6].status === 'fulfilled' ? results[6].value : storage.getTransactions();

      if (deps && Array.isArray(deps)) setDeposits([...deps].reverse());
      if (withs && Array.isArray(withs)) setWithdrawals([...withs].reverse());
      if (usrs && Array.isArray(usrs)) setUsers([...usrs].reverse());
      if (proms && Array.isArray(proms)) setPromoters(proms);
      if (settings) {
        setAdminSettings(settings);
        setSoundModes(settings?.soundModes || {});
        setNewUpiId(settings?.upiId || '');
        setNewPayeeName(settings?.payeeName || '');
        setPromoActive(settings?.promoActive ?? true);
        setSignupBonus(settings?.signupBonus ?? 150);
        setMinQualifyingDeposit(settings?.minQualifyingDeposit ?? 100);
        setWageringPercentage(settings?.wageringPercentage ?? 50);
        setAviatorWingoLimitMultiplier(settings?.aviatorWingoLimitMultiplier ?? 3.0);
      }
      if (chats && Array.isArray(chats)) {
        setSupportChats(chats);
        setSelectedChatUser(prev => {
          if (!prev) return null;
          const fresh = chats.find(c => c.userId === prev.userId);
          return fresh || prev;
        });
      }
      if (txs && Array.isArray(txs)) setTransactions(txs);
      setLastUpdated(new Date());

      if (usrs && Array.isArray(usrs)) {
        setSelectedPlayer(prev => {
          if (!prev) return null;
          const fresh = usrs.find(u => u.id === prev.id);
          return fresh || prev;
        });
      }
    } catch (e) {
      console.warn('[AdminPage] loadData error:', e);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (adminLoggedIn) {
      loadData();
      soundStorage.syncFromRemote().then(() => loadAudioMeta());

      // Active polling every 5 seconds to ensure multi-device sync
      const pollTimer = setInterval(() => {
        loadData(true);
      }, 5000);

      const handleEventRefresh = () => loadData(true);
      window.addEventListener('crvper_deposits_updated', handleEventRefresh);
      window.addEventListener('crvper_deposits_changed', handleEventRefresh);
      window.addEventListener('crvper_withdrawals_updated', handleEventRefresh);
      window.addEventListener('crvper_withdrawals_changed', handleEventRefresh);
      window.addEventListener('crvper_support_updated', handleEventRefresh);
      window.addEventListener('crvper_promoter_updated', handleEventRefresh);
      window.addEventListener('crvper_user_updated', handleEventRefresh);
      window.addEventListener('crvper_sound_updated', loadAudioMeta);
      window.addEventListener('crvper_settings_updated', loadAudioMeta);
      window.addEventListener('focus', handleEventRefresh);

      return () => {
        clearInterval(pollTimer);
        window.removeEventListener('crvper_deposits_updated', handleEventRefresh);
        window.removeEventListener('crvper_deposits_changed', handleEventRefresh);
        window.removeEventListener('crvper_withdrawals_updated', handleEventRefresh);
        window.removeEventListener('crvper_withdrawals_changed', handleEventRefresh);
        window.removeEventListener('crvper_support_updated', handleEventRefresh);
        window.removeEventListener('crvper_promoter_updated', handleEventRefresh);
        window.removeEventListener('crvper_user_updated', handleEventRefresh);
        window.removeEventListener('crvper_sound_updated', loadAudioMeta);
        window.removeEventListener('crvper_settings_updated', loadAudioMeta);
        window.removeEventListener('focus', handleEventRefresh);
      };
    }
  }, [adminLoggedIn]);

  useEffect(() => {
    if (selectedChatUser) {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedChatUser?.messages?.length]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      loginAdmin(username.trim(), password.trim());
      sounds.playWin();
      await loadData();
    } catch (err) {
      setLoginError(err.message || 'Invalid admin credentials');
    }
  };

  const handleApproveDeposit = (id) => {
    const dep = deposits.find(d => d.id === id);
    setConfirmationModal({
      title: 'Approve Deposit',
      message: `Are you sure you want to approve deposit of ₹${dep?.amount || ''} for ${dep?.userPhone || 'player'}? Player's database wallet will be credited and promoter commission will be awarded.`,
      onConfirm: async () => {
        await storage.approveDeposit(id);
        sounds.playWin();
        await loadData();
      }
    });
  };

  const openRejectionModal = (type, id, defaultReason) => {
    setRejectionModal({ type, id, defaultReason });
    setRejectionReason(defaultReason);
  };

  const handleConfirmRejection = async () => {
    if (!rejectionModal) return;
    const { type, id } = rejectionModal;
    const finalReason = rejectionReason.trim() || rejectionModal.defaultReason;
    
    if (type === 'deposit') {
      await storage.rejectDeposit(id, finalReason);
    } else if (type === 'withdrawal') {
      await storage.rejectWithdrawal(id, finalReason);
    }
    sounds.playClick();
    setRejectionModal(null);
    setRejectionReason('');
    await loadData();
  };

  const handleApproveWithdrawal = (id) => {
    const wth = withdrawals.find(w => w.id === id);
    setConfirmationModal({
      title: 'Confirm Withdrawal Sent',
      message: `Mark payout of ₹${wth?.amount || ''} to UPI ${wth?.upiId || ''} as Sent / Completed?`,
      onConfirm: async () => {
        await storage.approveWithdrawal(id);
        sounds.playWin();
        await loadData();
      }
    });
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await storage.updateAdminSettings({
        upiId: newUpiId,
        payeeName: newPayeeName,
        ...(newQrImage ? { qrImageUrl: newQrImage } : {})
      });
      alert('Admin UPI Payment details successfully updated! Players will now see this new QR.');
    } catch (err) {
      alert('Failed to save settings: ' + (err.message || 'Error occurred'));
    }
  };

  const handleQrUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewQrImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Sound FX Handlers
  const handleTestSound = (soundKey) => {
    switch (soundKey) {
      case 'deposit': sounds.playDeposit(); break;
      case 'withdraw': sounds.playWithdraw(); break;
      case 'login': sounds.playLogin(); break;
      case 'register': sounds.playRegister(); break;
      case 'win': sounds.playWin(); break;
      case 'loss': sounds.playLoss(); break;
      case 'cashout': sounds.playCashout(); break;
      case 'click': sounds.playClick(); break;
      default: break;
    }
    const mode = soundModes[soundKey] || 'default';
    setAudioFeedback(`▶ Testing ${soundKey.toUpperCase()} — mode: ${mode.toUpperCase()}`);
    setTimeout(() => setAudioFeedback(''), 2500);
  };

  const handleSetSoundMode = async (soundKey, newMode) => {
    try {
      await soundStorage.setSoundMode(soundKey, newMode);
      const updatedModes = { ...soundModes, [soundKey]: newMode };
      setSoundModes(updatedModes);
      storage.updateAdminSettings({ soundModes: updatedModes });
      setAudioFeedback(`✓ ${soundKey.toUpperCase()} → ${newMode.toUpperCase()} (synced to all devices)`);
      setTimeout(() => setAudioFeedback(''), 3000);
    } catch (err) {
      setAudioFeedback(`❌ Mode change failed: ${err.message}`);
      setTimeout(() => setAudioFeedback(''), 3000);
    }
  };

  const handleUploadSound = async (soundKey, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAudioFeedback(`❌ File too large (max 5 MB). "${file.name}" is ${(file.size / 1048576).toFixed(1)} MB`);
      setTimeout(() => setAudioFeedback(''), 4000);
      return;
    }
    try {
      setAudioFeedback(`⏳ Uploading "${file.name}" to cloud…`);
      await soundStorage.saveSound(soundKey, file);
      const updatedModes = { ...soundModes, [soundKey]: 'custom' };
      setSoundModes(updatedModes);
      storage.updateAdminSettings({ soundModes: updatedModes });
      await loadAudioMeta();
      setAudioFeedback(`✅ "${file.name}" saved to cloud — ${soundKey.toUpperCase()} is now CUSTOM (live for all users)`);
      setTimeout(() => setAudioFeedback(''), 5000);
    } catch (err) {
      console.error('[Admin] Upload failed:', err);
      setAudioFeedback(`❌ Upload failed: ${err.message}`);
      setTimeout(() => setAudioFeedback(''), 4000);
    }
  };

  const handleResetSound = async (soundKey) => {
    try {
      setAudioFeedback(`⏳ Removing custom sound for ${soundKey.toUpperCase()}…`);
      await soundStorage.deleteSound(soundKey);
      const updatedModes = { ...soundModes, [soundKey]: 'default' };
      setSoundModes(updatedModes);
      storage.updateAdminSettings({ soundModes: updatedModes });
      await loadAudioMeta();
      setAudioFeedback(`✓ ${soundKey.toUpperCase()} reset to DEFAULT synthesizer (synced to all devices)`);
      setTimeout(() => setAudioFeedback(''), 3000);
    } catch (err) {
      setAudioFeedback(`❌ Reset failed: ${err.message}`);
      setTimeout(() => setAudioFeedback(''), 3000);
    }
  };

  const handleResetAllSounds = () => {
    setConfirmationModal({
      title: 'Reset All Custom Sounds',
      message: 'This will delete all custom uploaded sound effects and revert to built-in synthesizers for all players.',
      onConfirm: async () => {
        setAudioFeedback('⏳ Resetting all sounds…');
        await soundStorage.clearAll();
        const defaultModes = {
          deposit: 'default', withdraw: 'default', login: 'default', register: 'default',
          win: 'default', loss: 'default', cashout: 'default', click: 'default'
        };
        storage.updateAdminSettings({ soundModes: defaultModes });
        setSoundModes(defaultModes);
        await loadAudioMeta();
        setAudioFeedback('✓ All sounds reset to built-in synthesizers (synced to all devices)');
        setTimeout(() => setAudioFeedback(''), 3000);
      }
    });
  };

  const handleSavePromotions = async (e) => {
    e.preventDefault();
    setPromoFeedback('⏳ Saving & logging changes to audit log...');
    try {
      const cur = adminSettings || storage.getAdminSettings();
      if (cur.promoActive !== promoActive) {
        await storage.logAdminSettingChange('crvvper (Admin)', 'Promotion Active', cur.promoActive, promoActive);
      }
      if (Number(cur.signupBonus) !== Number(signupBonus)) {
        await storage.logAdminSettingChange('crvvper (Admin)', 'Registration Bonus', `₹${cur.signupBonus}`, `₹${signupBonus}`);
      }
      if (Number(cur.minQualifyingDeposit) !== Number(minQualifyingDeposit)) {
        await storage.logAdminSettingChange('crvvper (Admin)', 'Min Qualifying Deposit', `₹${cur.minQualifyingDeposit}`, `₹${minQualifyingDeposit}`);
      }
      if (Number(cur.wageringPercentage) !== Number(wageringPercentage)) {
        await storage.logAdminSettingChange('crvvper (Admin)', 'Wagering Requirement %', `${cur.wageringPercentage}%`, `${wageringPercentage}%`);
      }
      if (Number(cur.aviatorWingoLimitMultiplier) !== Number(aviatorWingoLimitMultiplier)) {
        await storage.logAdminSettingChange('crvvper (Admin)', 'Aviator/WinGo Limit Multiplier', `${cur.aviatorWingoLimitMultiplier}x`, `${aviatorWingoLimitMultiplier}x`);
      }

      await storage.updateAdminSettings({
        promoActive,
        signupBonus: Number(signupBonus),
        minQualifyingDeposit: Number(minQualifyingDeposit),
        wageringPercentage: Number(wageringPercentage),
        aviatorWingoLimitMultiplier: Number(aviatorWingoLimitMultiplier)
      });

      const fresh = await storage.getAdminSettingsAsync();
      setAdminSettings(fresh);
      setPromoFeedback('✓ Promotional and limit controls updated & logged successfully!');
      setTimeout(() => setPromoFeedback(''), 4000);
    } catch (err) {
      setPromoFeedback(`❌ Error saving promotional controls: ${err.message}`);
      setTimeout(() => setPromoFeedback(''), 4000);
    }
  };

  const handleSendAdminReply = async (e) => {
    e.preventDefault();
    if (!adminReply.trim() || !selectedChatUser) return;
    const replyText = adminReply.trim();
    setAdminReply('');
    await storage.sendSupportMessage(selectedChatUser.userId, selectedChatUser.userPhone, replyText, 'admin');
    const freshChats = await storage.getSupportChatsAsync();
    setSupportChats(freshChats || []);
    const updated = (freshChats || []).find(c => c.userId === selectedChatUser.userId);
    if (updated) setSelectedChatUser(updated);
  };

  const handleQuickCannedReply = async (text) => {
    if (!selectedChatUser) return;
    await storage.sendSupportMessage(selectedChatUser.userId, selectedChatUser.userPhone, text, 'admin');
    const freshChats = await storage.getSupportChatsAsync();
    setSupportChats(freshChats || []);
    const updated = (freshChats || []).find(c => c.userId === selectedChatUser.userId);
    if (updated) setSelectedChatUser(updated);
  };

  const handleDeleteChat = (userId) => {
    setConfirmationModal({
      title: 'Resolve & Delete Conversation',
      message: 'Are you sure you want to resolve and delete this customer support conversation?',
      onConfirm: async () => {
        await storage.deleteChat(userId);
        setSelectedChatUser(null);
        const freshChats = await storage.getSupportChatsAsync();
        setSupportChats(freshChats || []);
      }
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATED METRICS & FILTERED DATA
  // ═══════════════════════════════════════════════════════════════════════════

  // Deposits metrics
  const approvedDeposits = useMemo(() => deposits.filter(d => d.status === 'APPROVED' || d.status === 'CONFIRMED'), [deposits]);
  const pendingDeposits = useMemo(() => deposits.filter(d => d.status === 'PENDING'), [deposits]);
  const rejectedDeposits = useMemo(() => deposits.filter(d => d.status === 'REJECTED'), [deposits]);

  const totalApprovedDepositAmount = useMemo(() => approvedDeposits.reduce((sum, d) => sum + (Number(d.amount) || 0), 0), [approvedDeposits]);
  const totalPendingDepositAmount = useMemo(() => pendingDeposits.reduce((sum, d) => sum + (Number(d.amount) || 0), 0), [pendingDeposits]);
  const totalRejectedDepositAmount = useMemo(() => rejectedDeposits.reduce((sum, d) => sum + (Number(d.amount) || 0), 0), [rejectedDeposits]);

  // Withdrawals metrics
  const completedWithdrawals = useMemo(() => withdrawals.filter(w => w.status === 'COMPLETED' || w.status === 'CONFIRMED'), [withdrawals]);
  const pendingWithdrawals = useMemo(() => withdrawals.filter(w => w.status === 'PENDING'), [withdrawals]);
  const rejectedWithdrawals = useMemo(() => withdrawals.filter(w => w.status === 'REJECTED'), [withdrawals]);

  const totalCompletedWithdrawAmount = useMemo(() => completedWithdrawals.reduce((sum, w) => sum + (Number(w.amount) || 0), 0), [completedWithdrawals]);
  const totalPendingWithdrawAmount = useMemo(() => pendingWithdrawals.reduce((sum, w) => sum + (Number(w.amount) || 0), 0), [pendingWithdrawals]);
  const totalRejectedWithdrawAmount = useMemo(() => rejectedWithdrawals.reduce((sum, w) => sum + (Number(w.amount) || 0), 0), [rejectedWithdrawals]);

  // Net Operational Platform Cash Flow
  const netPlatformCashFlow = totalApprovedDepositAmount - totalCompletedWithdrawAmount;

  // Overview User Registrations filter
  const filteredNewUsers = useMemo(() => {
    if (overviewTimeframe === 'ALL') return users;
    const now = new Date();
    return users.filter(u => {
      if (!u.createdAt) return false;
      const created = new Date(u.createdAt);
      if (overviewTimeframe === 'TODAY') {
        return created.toDateString() === now.toDateString();
      }
      if (overviewTimeframe === '7D') {
        const diffDays = (now - created) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      }
      if (overviewTimeframe === '30D') {
        const diffDays = (now - created) / (1000 * 60 * 60 * 24);
        return diffDays <= 30;
      }
      return true;
    });
  }, [users, overviewTimeframe]);

  // Combined Activity Stream for Overview
  const recentActivities = useMemo(() => {
    const list = [];
    deposits.slice(0, 15).forEach(d => {
      list.push({
        id: 'act_dep_' + d.id,
        type: 'DEPOSIT',
        title: `Deposit ₹${d.amount}`,
        userPhone: d.userPhone,
        status: d.status,
        timestamp: d.createdAt,
        raw: d
      });
    });
    withdrawals.slice(0, 15).forEach(w => {
      list.push({
        id: 'act_wth_' + w.id,
        type: 'WITHDRAWAL',
        title: `Withdrawal ₹${w.amount}`,
        userPhone: w.userPhone,
        status: w.status,
        timestamp: w.createdAt,
        raw: w
      });
    });
    users.slice(0, 15).forEach(u => {
      list.push({
        id: 'act_usr_' + u.id,
        type: 'REGISTRATION',
        title: `New Player Registered`,
        userPhone: u.phone,
        status: u.hasDeposited ? 'UNLOCKED' : 'BONUS_LOCKED',
        timestamp: u.createdAt,
        raw: u
      });
    });

    return list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)).slice(0, 15);
  }, [deposits, withdrawals, users]);

  // Filtered Deposits list
  const filteredDeposits = useMemo(() => {
    return deposits.filter(d => {
      const matchesStatus = 
        depositFilter === 'ALL' ? true :
        depositFilter === 'PENDING' ? d.status === 'PENDING' :
        depositFilter === 'APPROVED' ? (d.status === 'APPROVED' || d.status === 'CONFIRMED') :
        depositFilter === 'REJECTED' ? d.status === 'REJECTED' : true;

      const q = depositSearch.toLowerCase().trim();
      const matchesSearch = !q || 
        (d.utr && d.utr.toLowerCase().includes(q)) ||
        (d.userPhone && d.userPhone.toLowerCase().includes(q)) ||
        (d.id && d.id.toLowerCase().includes(q)) ||
        (d.promoterCode && d.promoterCode.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [deposits, depositFilter, depositSearch]);

  // Filtered Withdrawals list
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter(w => {
      const matchesStatus = 
        withdrawalFilter === 'ALL' ? true :
        withdrawalFilter === 'PENDING' ? w.status === 'PENDING' :
        withdrawalFilter === 'COMPLETED' ? (w.status === 'COMPLETED' || w.status === 'CONFIRMED') :
        withdrawalFilter === 'REJECTED' ? w.status === 'REJECTED' : true;

      const q = withdrawalSearch.toLowerCase().trim();
      const matchesSearch = !q || 
        (w.userPhone && w.userPhone.toLowerCase().includes(q)) ||
        (w.upiId && w.upiId.toLowerCase().includes(q)) ||
        (w.id && w.id.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [withdrawals, withdrawalFilter, withdrawalSearch]);

  // Filtered Players list
  const filteredPlayers = useMemo(() => {
    let list = [...users];

    // Filter
    if (userFilter === 'DEPOSITED') {
      list = list.filter(u => u.hasDeposited);
    } else if (userFilter === 'LOCKED') {
      list = list.filter(u => !u.hasDeposited);
    } else if (userFilter === 'HIGH_BALANCE') {
      list = list.filter(u => (u.walletBalance || 0) >= 1000);
    }

    // Search
    const q = userSearch.toLowerCase().trim();
    if (q) {
      list = list.filter(u => 
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.id && u.id.toLowerCase().includes(q)) ||
        (u.referredBy && u.referredBy.toLowerCase().includes(q))
      );
    }

    // Sort
    if (userSort === 'NEWEST') {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (userSort === 'OLDEST') {
      list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    } else if (userSort === 'BALANCE_DESC') {
      list.sort((a, b) => (b.walletBalance || 0) - (a.walletBalance || 0));
    } else if (userSort === 'DEPOSITED_DESC') {
      list.sort((a, b) => (b.totalDeposited || 0) - (a.totalDeposited || 0));
    }

    return list;
  }, [users, userFilter, userSearch, userSort]);

  // Filtered Promoters list
  const filteredPromoters = useMemo(() => {
    const q = promoterSearch.toLowerCase().trim();
    if (!q) return promoters;
    return promoters.filter(p => 
      (p.socialUsername && p.socialUsername.toLowerCase().includes(q)) ||
      (p.phone && p.phone.toLowerCase().includes(q)) ||
      (p.code && p.code.toLowerCase().includes(q))
    );
  }, [promoters, promoterSearch]);

  // Support chat filtered list
  const filteredSupportChats = useMemo(() => {
    const q = supportSearch.toLowerCase().trim();
    if (!q) return supportChats;
    return supportChats.filter(c => 
      (c.userPhone && c.userPhone.toLowerCase().includes(q)) ||
      (c.userId && c.userId.toLowerCase().includes(q)) ||
      (c.messages && c.messages.some(m => m.text?.toLowerCase().includes(q)))
    );
  }, [supportChats, supportSearch]);

  // If not logged in, render Admin Login screen
  if (!adminLoggedIn) {
    return (
      <div className="min-h-screen bg-[#090e17] flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-black">
        <div className="w-full max-w-sm bg-[#0f1826] border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-3 shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-white tracking-wide">
              CRVPER Master Admin
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Authorized personnel control terminal
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs text-center font-bold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-[#131f33] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-[#131f33] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-xl text-sm transition transform active:scale-95 shadow-lg shadow-emerald-500/25"
            >
              Authenticate &amp; Enter
            </button>
          </form>


          <button
            onClick={onExit}
            className="w-full mt-4 text-xs text-slate-500 hover:text-slate-300 transition text-center"
          >
            ← Return to CRVPER Game Platform
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090e17] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Admin Top Bar */}
      <header className="bg-[#0f1826] border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black">
            C
          </div>
          <div>
            <h1 className="text-base font-black text-white flex items-center space-x-1.5">
              <span>CRVPER Admin Control Center</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE DB
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>Syncd with Supabase PostgreSQL</span>
              <span className="text-slate-600">•</span>
              <span>Updated {lastUpdated.toLocaleTimeString()}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadData(false)}
            disabled={isRefreshing}
            className={`p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition flex items-center gap-1 text-xs font-bold ${
              isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Refresh All Database Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={onExit}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 transition"
          >
            To Platform
          </button>
          <button
            onClick={logoutAdmin}
            className="p-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-400 border border-rose-800 transition"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Admin Navigation Tabs */}
      <div className="bg-[#0c1220] border-b border-slate-800 px-4 py-2 flex items-center space-x-2 overflow-x-auto text-xs font-bold no-scrollbar sticky top-[61px] z-30">
        {[
          { id: 'overview', label: 'Dashboard Stats', icon: Activity },
          { id: 'deposits', label: `Deposits (${pendingDeposits.length})`, icon: ArrowDownLeft, alert: pendingDeposits.length > 0 },
          { id: 'withdrawals', label: `Withdrawals (${pendingWithdrawals.length})`, icon: ArrowUpRight, alert: pendingWithdrawals.length > 0 },
          { id: 'users', label: `Players (${users.length})`, icon: Users },
          { id: 'promoters', label: `Promoters (${promoters.length})`, icon: DollarSign },
          { id: 'support', label: `Live Support (${supportChats.length})`, icon: Headphones },
          { id: 'promotions', label: 'Promotions & Risk', icon: Sparkles },
          { id: 'qr', label: 'Payment QR Setup', icon: QrCode },
          { id: 'audio', label: 'Audio & FX Studio', icon: Volume2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition shrink-0 ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.alert && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Container */}
      <main className="flex-1 p-4 max-w-6xl w-full mx-auto">
        
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* OVERVIEW STATS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400 font-bold">Registered Players</span>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black font-mono text-white">
                  {users.length}
                </div>
                <div className="text-[11px] text-emerald-400/90 font-medium mt-1">
                  {users.filter(u => u.hasDeposited).length} deposited players
                </div>
              </div>

              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400 font-bold">Approved Deposits</span>
                  <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  ₹{totalApprovedDepositAmount.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-1">
                  {approvedDeposits.length} approved transactions
                </div>
              </div>

              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400 font-bold">Completed Withdrawals</span>
                  <ArrowUpRight className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-black font-mono text-rose-400">
                  ₹{totalCompletedWithdrawAmount.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-1">
                  {completedWithdrawals.length} completed payouts
                </div>
              </div>

              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400 font-bold">Net House Cash Flow</span>
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                </div>
                <div className={`text-2xl font-black font-mono ${netPlatformCashFlow >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                  ₹{netPlatformCashFlow.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-1">
                  Gross inflows − Outflows
                </div>
              </div>
            </div>

            {/* Inflows vs Outflows Detailed Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Deposits Breakdown */}
              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                    <span>Deposits Queue &amp; Breakdown</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('deposits')}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                  >
                    <span>View Tab</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#131b2e] border border-slate-800">
                    <div>
                      <span className="text-xs font-bold text-amber-400 block">Pending Verification</span>
                      <span className="text-[11px] text-slate-400">{pendingDeposits.length} requests waiting</span>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black font-mono text-amber-400">
                        ₹{totalPendingDepositAmount.toLocaleString('en-IN')}
                      </span>
                      {pendingDeposits.length > 0 && (
                        <button
                          onClick={() => {
                            setDepositFilter('PENDING');
                            setActiveTab('deposits');
                          }}
                          className="block text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded mt-0.5 font-bold hover:bg-amber-500/30"
                        >
                          Review Now
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#131b2e] border border-slate-800">
                    <div>
                      <span className="text-xs font-bold text-emerald-400 block">Approved &amp; Credited</span>
                      <span className="text-[11px] text-slate-400">{approvedDeposits.length} confirmed</span>
                    </div>
                    <span className="text-base font-black font-mono text-emerald-400">
                      ₹{totalApprovedDepositAmount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#131b2e] border border-slate-800">
                    <div>
                      <span className="text-xs font-bold text-rose-400 block">Rejected / Failed</span>
                      <span className="text-[11px] text-slate-400">{rejectedDeposits.length} rejected</span>
                    </div>
                    <span className="text-base font-black font-mono text-rose-400">
                      ₹{totalRejectedDepositAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Withdrawals Breakdown */}
              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-rose-400" />
                    <span>Withdrawals Queue &amp; Liabilities</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('withdrawals')}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1"
                  >
                    <span>View Tab</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#131b2e] border border-slate-800">
                    <div>
                      <span className="text-xs font-bold text-amber-400 block">Pending Outstanding Payouts</span>
                      <span className="text-[11px] text-slate-400">{pendingWithdrawals.length} awaiting transfer</span>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black font-mono text-amber-400">
                        ₹{totalPendingWithdrawAmount.toLocaleString('en-IN')}
                      </span>
                      {pendingWithdrawals.length > 0 && (
                        <button
                          onClick={() => {
                            setWithdrawalFilter('PENDING');
                            setActiveTab('withdrawals');
                          }}
                          className="block text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded mt-0.5 font-bold hover:bg-amber-500/30"
                        >
                          Process Payouts
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#131b2e] border border-slate-800">
                    <div>
                      <span className="text-xs font-bold text-emerald-400 block">Completed Payouts</span>
                      <span className="text-[11px] text-slate-400">{completedWithdrawals.length} sent successfully</span>
                    </div>
                    <span className="text-base font-black font-mono text-emerald-400">
                      ₹{totalCompletedWithdrawAmount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#131b2e] border border-slate-800">
                    <div>
                      <span className="text-xs font-bold text-rose-400 block">Rejected &amp; Refunded</span>
                      <span className="text-[11px] text-slate-400">{rejectedWithdrawals.length} returned to player vault</span>
                    </div>
                    <span className="text-base font-black font-mono text-rose-400">
                      ₹{totalRejectedWithdrawAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Operational Summary Row: Promoters & Support */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-bold block">Promoter Network</span>
                  <span className="text-lg font-black text-white">{promoters.length} Registered Promoters</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Total Referred Volume: ₹{promoters.reduce((s, p) => s + (p.totalDepositsFromInvited || 0), 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('promoters')}
                  className="px-3 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300 font-bold text-xs hover:bg-purple-900/80 transition"
                >
                  Manage Promoters
                </button>
              </div>

              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-bold block">Live Support Tickets</span>
                  <span className="text-lg font-black text-white">{supportChats.length} Active User Conversations</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Instant 24/7 manual VIP resolution terminal
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('support')}
                  className="px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-bold text-xs hover:bg-cyan-900/80 transition"
                >
                  Open Live Support
                </button>
              </div>
            </div>

            {/* Recent Live Platform Activity Stream */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>Real-Time Database Activity Feed</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Latest registered players, deposit submissions, and withdrawal requests
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-mono">Live updates</span>
              </div>

              {recentActivities.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No recent events recorded in database.</p>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {recentActivities.map((act) => {
                    const isDep = act.type === 'DEPOSIT';
                    const isWth = act.type === 'WITHDRAWAL';
                    const isReg = act.type === 'REGISTRATION';

                    return (
                      <div key={act.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-[#131b2e]/40 px-2 rounded-lg transition">
                        <div className="flex items-center space-x-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isDep ? 'bg-emerald-500/20 text-emerald-400' :
                            isWth ? 'bg-rose-500/20 text-rose-400' :
                            'bg-cyan-500/20 text-cyan-400'
                          }`}>
                            {isDep && <ArrowDownLeft className="w-4 h-4" />}
                            {isWth && <ArrowUpRight className="w-4 h-4" />}
                            {isReg && <Users className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{act.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {act.userPhone} • {act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : 'Recent'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            (act.status === 'APPROVED' || act.status === 'COMPLETED' || act.status === 'CONFIRMED' || act.status === 'UNLOCKED')
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                              : act.status === 'REJECTED'
                              ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                          }`}>
                            {act.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* DEPOSITS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'deposits' && (
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                  <span>Manual UPI Deposit Verifications</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Confirm genuine UTR references to credit user wallet and release promoter commissions.
                </p>
              </div>
              <span className="text-xs text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-xl self-start sm:self-auto">
                {deposits.length} Total DB Records
              </span>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'ALL', label: `All (${deposits.length})` },
                  { id: 'PENDING', label: `Pending (${pendingDeposits.length})`, count: pendingDeposits.length },
                  { id: 'APPROVED', label: `Approved (${approvedDeposits.length})` },
                  { id: 'REJECTED', label: `Rejected (${rejectedDeposits.length})` }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => { setDepositFilter(f.id); setDepositPage(1); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                      depositFilter === f.id
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={depositSearch}
                  onChange={(e) => { setDepositSearch(e.target.value); setDepositPage(1); }}
                  placeholder="Search by UTR or Phone..."
                  className="w-full sm:w-64 bg-[#131b2e] border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Summary Stat Pill */}
            <div className="bg-[#131b2e] px-3.5 py-2 rounded-xl text-xs flex items-center justify-between text-slate-300">
              <span>Showing {filteredDeposits.length} deposit entries</span>
              <span className="font-mono font-bold text-emerald-400">
                Filtered Volume: ₹{filteredDeposits.reduce((s, d) => s + (Number(d.amount) || 0), 0).toLocaleString('en-IN')}
              </span>
            </div>

            {/* Table */}
            {filteredDeposits.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">No deposit entries matching filter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#131b2e] text-slate-400 border-b border-slate-800 uppercase font-mono">
                    <tr>
                      <th className="p-3">Player / Date</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">12-Digit UTR</th>
                      <th className="p-3">Proof Screenshot</th>
                      <th className="p-3">Promoter</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredDeposits
                      .slice((depositPage - 1) * itemsPerPage, depositPage * itemsPerPage)
                      .map((dep) => (
                        <tr key={dep.id} className="hover:bg-[#131b2e]/50">
                          <td className="p-3">
                            <span className="font-mono font-bold text-white block">{dep.userPhone}</span>
                            <span className="text-[10px] text-slate-500">
                              {dep.createdAt ? new Date(dep.createdAt).toLocaleString() : 'N/A'}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-black text-emerald-400 text-sm">
                            ₹{dep.amount}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono text-cyan-300 font-bold select-all">{dep.utr}</span>
                              {dep.utr && dep.utr !== 'N/A' && (
                                <button
                                  onClick={() => copyToClipboard(dep.utr)}
                                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                                  title="Copy UTR"
                                >
                                  {copiedText === dep.utr ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            {dep.screenshotUrl ? (
                              <button
                                onClick={() => setViewScreenshot(dep.screenshotUrl)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-[11px] flex items-center space-x-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View SS</span>
                              </button>
                            ) : (
                              <span className="text-slate-500">No Image</span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-purple-400">
                            {dep.promoterCode || '—'}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              (dep.status === 'APPROVED' || dep.status === 'CONFIRMED') ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' :
                              dep.status === 'REJECTED' ? 'bg-rose-950 text-rose-400 border border-rose-500/40' : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                            }`}>
                              {(dep.status === 'APPROVED' || dep.status === 'CONFIRMED') ? 'CONFIRMED' : dep.status}
                            </span>
                            {dep.rejectionReason && (
                              <span className="block text-[9px] text-rose-400 mt-0.5 max-w-[120px] truncate" title={dep.rejectionReason}>
                                {dep.rejectionReason}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {dep.status === 'PENDING' ? (
                              <div className="flex items-center space-x-1.5">
                                <button
                                  onClick={() => handleApproveDeposit(dep.id)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center space-x-1 shadow"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Confirm</span>
                                </button>
                                <button
                                  onClick={() => openRejectionModal('deposit', dep.id, 'Invalid UTR reference or payment screenshot')}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center space-x-1"
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Processed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {filteredDeposits.length > itemsPerPage && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                <span className="text-slate-500">
                  Page {depositPage} of {Math.ceil(filteredDeposits.length / itemsPerPage)}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={depositPage === 1}
                    onClick={() => setDepositPage(p => p - 1)}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={depositPage >= Math.ceil(filteredDeposits.length / itemsPerPage)}
                    onClick={() => setDepositPage(p => p + 1)}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* WITHDRAWALS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'withdrawals' && (
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-rose-400" />
                  <span>Manual Withdrawal Requests</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Process UPI transfers to verified players. Rejection automatically refunds held balances.
                </p>
              </div>
              <span className="text-xs text-rose-400 font-mono bg-rose-950/60 border border-rose-500/30 px-2.5 py-1 rounded-xl self-start sm:self-auto">
                {withdrawals.length} Total DB Records
              </span>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'ALL', label: `All (${withdrawals.length})` },
                  { id: 'PENDING', label: `Pending (${pendingWithdrawals.length})`, count: pendingWithdrawals.length },
                  { id: 'COMPLETED', label: `Completed (${completedWithdrawals.length})` },
                  { id: 'REJECTED', label: `Rejected (${rejectedWithdrawals.length})` }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => { setWithdrawalFilter(f.id); setWithdrawalPage(1); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                      withdrawalFilter === f.id
                        ? 'bg-rose-500 text-slate-950 font-black'
                        : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={withdrawalSearch}
                  onChange={(e) => { setWithdrawalSearch(e.target.value); setWithdrawalPage(1); }}
                  placeholder="Search by UPI or Phone..."
                  className="w-full sm:w-64 bg-[#131b2e] border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Summary Stat Pill */}
            <div className="bg-[#131b2e] px-3.5 py-2 rounded-xl text-xs flex items-center justify-between text-slate-300">
              <span>Showing {filteredWithdrawals.length} withdrawal entries</span>
              <span className="font-mono font-bold text-rose-400">
                Filtered Volume: ₹{filteredWithdrawals.reduce((s, w) => s + (Number(w.amount) || 0), 0).toLocaleString('en-IN')}
              </span>
            </div>

            {/* Table */}
            {filteredWithdrawals.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">No withdrawal requests matching filter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#131b2e] text-slate-400 border-b border-slate-800 uppercase font-mono">
                    <tr>
                      <th className="p-3">Player / Date</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">UPI ID / Details</th>
                      <th className="p-3">Player QR</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredWithdrawals
                      .slice((withdrawalPage - 1) * itemsPerPage, withdrawalPage * itemsPerPage)
                      .map((wth) => (
                        <tr key={wth.id} className="hover:bg-[#131b2e]/50">
                          <td className="p-3">
                            <span className="font-mono font-bold text-white block">{wth.userPhone}</span>
                            <span className="text-[10px] text-slate-500">
                              {wth.createdAt ? new Date(wth.createdAt).toLocaleString() : 'N/A'}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-black text-rose-400 text-sm">
                            ₹{wth.amount}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono text-slate-200 font-bold select-all">{wth.upiId}</span>
                              {wth.upiId && (
                                <button
                                  onClick={() => copyToClipboard(wth.upiId)}
                                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                                  title="Copy UPI ID"
                                >
                                  {copiedText === wth.upiId ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            {wth.qrUrl ? (
                              <button
                                onClick={() => setViewScreenshot(wth.qrUrl)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-[11px] flex items-center space-x-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View QR</span>
                              </button>
                            ) : (
                              <span className="text-slate-500">None</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              (wth.status === 'COMPLETED' || wth.status === 'CONFIRMED') ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' :
                              wth.status === 'REJECTED' ? 'bg-rose-950 text-rose-400 border border-rose-500/40' : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                            }`}>
                              {(wth.status === 'COMPLETED' || wth.status === 'CONFIRMED') ? 'CONFIRMED' : wth.status}
                            </span>
                            {wth.rejectionReason && (
                              <span className="block text-[9px] text-rose-400 mt-0.5 max-w-[120px] truncate" title={wth.rejectionReason}>
                                {wth.rejectionReason}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {wth.status === 'PENDING' ? (
                              <div className="flex items-center space-x-1.5">
                                <button
                                  onClick={() => handleApproveWithdrawal(wth.id)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow"
                                >
                                  Confirm Sent
                                </button>
                                <button
                                  onClick={() => openRejectionModal('withdrawal', wth.id, 'Incorrect UPI details or payment returned')}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px]"
                                >
                                  Reject &amp; Refund
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Completed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {filteredWithdrawals.length > itemsPerPage && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                <span className="text-slate-500">
                  Page {withdrawalPage} of {Math.ceil(filteredWithdrawals.length / itemsPerPage)}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={withdrawalPage === 1}
                    onClick={() => setWithdrawalPage(p => p - 1)}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={withdrawalPage >= Math.ceil(filteredWithdrawals.length / itemsPerPage)}
                    onClick={() => setWithdrawalPage(p => p + 1)}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PLAYERS / USERS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'users' && (
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <span>Registered Player Accounts</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete directory of players with wallet balances, wagering status, and transaction ledgers.
                </p>
              </div>
              <span className="text-xs text-white font-mono bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-xl self-start sm:self-auto">
                {users.length} Registered Accounts
              </span>
            </div>

            {/* Filter and Search Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'ALL', label: 'All Players' },
                  { id: 'DEPOSITED', label: 'Deposited (Unlocked)' },
                  { id: 'LOCKED', label: 'Bonus Locked' },
                  { id: 'HIGH_BALANCE', label: 'High Balance (≥₹1k)' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => { setUserFilter(f.id); setUserPage(1); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                      userFilter === f.id
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={userSort}
                  onChange={(e) => setUserSort(e.target.value)}
                  className="bg-[#131b2e] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="NEWEST">Newest Registered</option>
                  <option value="OLDEST">Oldest Registered</option>
                  <option value="BALANCE_DESC">Highest Balance</option>
                  <option value="DEPOSITED_DESC">Highest Deposited</option>
                </select>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                    placeholder="Search phone or ID..."
                    className="w-40 sm:w-48 bg-[#131b2e] border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            {filteredPlayers.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">No players match the chosen filter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#131b2e] text-slate-400 border-b border-slate-800 uppercase font-mono">
                    <tr>
                      <th className="p-3">Phone &amp; User ID</th>
                      <th className="p-3">Wallet Balance</th>
                      <th className="p-3">Account Status</th>
                      <th className="p-3">Total In</th>
                      <th className="p-3">Total Out</th>
                      <th className="p-3">Referrer</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredPlayers
                      .slice((userPage - 1) * itemsPerPage, userPage * itemsPerPage)
                      .map((u) => (
                        <tr key={u.id} className="hover:bg-[#131b2e]/50">
                          <td className="p-3">
                            <span className="font-mono font-bold text-white block">{u.phone}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {u.id} • {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-black text-emerald-400 text-sm">
                            ₹{Number(u.walletBalance || 0).toFixed(2)}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.hasDeposited 
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                            }`}>
                              {u.hasDeposited ? 'YES (Unlocked)' : 'NO (Bonus Lock)'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-300">
                            ₹{Number(u.totalDeposited || 0).toLocaleString()}
                          </td>
                          <td className="p-3 font-mono text-slate-300">
                            ₹{Number(u.totalWithdrawn || 0).toLocaleString()}
                          </td>
                          <td className="p-3 font-mono text-cyan-400">
                            {u.referredBy || 'Direct'}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => setSelectedPlayer(u)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-[11px] flex items-center space-x-1"
                            >
                              <Wallet className="w-3 h-3" />
                              <span>View Ledger</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {filteredPlayers.length > itemsPerPage && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                <span className="text-slate-500">
                  Page {userPage} of {Math.ceil(filteredPlayers.length / itemsPerPage)}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={userPage === 1}
                    onClick={() => setUserPage(p => p - 1)}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={userPage >= Math.ceil(filteredPlayers.length / itemsPerPage)}
                    onClick={() => setUserPage(p => p + 1)}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PROMOTERS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'promoters' && (
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <span>Promoter &amp; Influencer Network (20% Revenue Share)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Promoters earn 20% commission on every verified deposit made by referred players.
                </p>
              </div>
              <span className="text-xs text-purple-400 font-mono bg-purple-950/60 border border-purple-500/30 px-2.5 py-1 rounded-xl self-start sm:self-auto">
                {promoters.length} Registered Promoters
              </span>
            </div>

            {/* Search */}
            <div className="flex justify-between items-center">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={promoterSearch}
                  onChange={(e) => setPromoterSearch(e.target.value)}
                  placeholder="Search handle, phone or code..."
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="text-xs font-mono text-purple-300">
                Total Paid Commissions: ₹{promoters.reduce((s, p) => s + (Number(p.commissionBalance) || 0), 0).toLocaleString('en-IN')}
              </div>
            </div>

            {filteredPromoters.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">No promoters found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#131b2e] text-slate-400 border-b border-slate-800 uppercase font-mono">
                    <tr>
                      <th className="p-3">Promoter Handle</th>
                      <th className="p-3">Invite Code</th>
                      <th className="p-3">Users Invited</th>
                      <th className="p-3">Deposit Volume</th>
                      <th className="p-3">20% Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredPromoters.map((p) => (
                      <tr key={p.id} className="hover:bg-[#131b2e]/50">
                        <td className="p-3">
                          <span className="font-bold text-white block">@{p.socialUsername}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{p.phone}</span>
                        </td>
                        <td className="p-3 font-mono font-black text-cyan-400">
                          {p.code}
                        </td>
                        <td className="p-3 font-bold text-white">
                          {p.totalInvited || 0}
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          ₹{(p.totalDepositsFromInvited || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 font-mono font-black text-purple-400 text-sm">
                          ₹{(p.commissionBalance || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* LIVE CUSTOMER SUPPORT TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'support' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
            {/* Conversation list */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-3 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">User Tickets</h3>
                <span className="text-[10px] font-mono bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded">
                  {supportChats.length} open
                </span>
              </div>

              {/* Chat search */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={supportSearch}
                  onChange={(e) => setSupportSearch(e.target.value)}
                  placeholder="Filter tickets..."
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg pl-8 pr-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 no-scrollbar">
                {filteredSupportChats.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No support conversations found.</p>
                ) : (
                  filteredSupportChats.map((c) => {
                    const isSelected = selectedChatUser?.userId === c.userId;
                    const lastMsg = c.messages?.[c.messages.length - 1];

                    return (
                      <div
                        key={c.userId}
                        onClick={() => setSelectedChatUser(c)}
                        className={`p-2.5 rounded-xl cursor-pointer text-xs transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-cyan-500/20 border border-cyan-500/50 text-white'
                            : 'bg-[#131b2e] hover:bg-slate-800 text-slate-300 border border-transparent'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-mono font-bold block truncate">{c.userPhone || c.userId}</span>
                          <span className="text-[10px] text-slate-400 line-clamp-1">
                            {lastMsg?.text || 'No messages'}
                          </span>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat Box */}
            <div className="md:col-span-2 bg-[#0f172a] border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
              {selectedChatUser ? (
                <>
                  <div className="p-3 bg-[#131b2e] border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Chat with {selectedChatUser.userPhone || selectedChatUser.userId}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      </span>
                      <p className="text-[10px] text-slate-400">Live DB Conversation</p>
                    </div>
                    <button
                      onClick={() => handleDeleteChat(selectedChatUser.userId)}
                      className="p-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-400 text-xs flex items-center space-x-1"
                      title="Delete conversation after resolution"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
                    {(selectedChatUser.messages || []).map((m) => {
                      const isAdmin = m.sender === 'admin';
                      return (
                        <div key={m.id || Math.random()} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                          <div className={`px-3 py-2 rounded-xl text-xs max-w-[80%] ${
                            isAdmin ? 'bg-cyan-600 text-white' : 'bg-[#1e293b] text-slate-200'
                          }`}>
                            {m.text}
                          </div>
                          <span className="text-[9px] text-slate-500 mt-0.5">
                            {isAdmin ? 'Admin' : 'Player'} • {m.time}
                          </span>
                        </div>
                      );
                    })}
                    <div ref={chatMessagesEndRef} />
                  </div>

                  {/* Quick Canned Replies */}
                  <div className="px-3 py-1.5 bg-[#0e1627] border-t border-slate-800 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
                    <span className="text-[10px] text-slate-500 shrink-0 font-bold">Quick:</span>
                    {[
                      'Checking your UTR right now, please wait 2 mins.',
                      'Withdrawal has been processed to your UPI successfully!',
                      'Please provide your 12-digit UTR and payment screenshot.',
                      'Your account has been fully verified. Happy gaming!'
                    ].map((canned, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleQuickCannedReply(canned)}
                        className="px-2 py-1 rounded-md bg-slate-800 hover:bg-cyan-900 text-slate-300 hover:text-cyan-200 text-[10px] whitespace-nowrap transition"
                      >
                        {canned}
                      </button>
                    ))}
                  </div>

                  {/* Reply Input */}
                  <form onSubmit={handleSendAdminReply} className="p-2.5 bg-[#131b2e] border-t border-slate-800 flex space-x-2">
                    <input
                      type="text"
                      value={adminReply}
                      onChange={(e) => setAdminReply(e.target.value)}
                      placeholder="Type admin resolution reply..."
                      className="flex-1 bg-[#0b1120] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="submit"
                      disabled={!adminReply.trim()}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-bold text-xs rounded-xl flex items-center space-x-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-500 gap-2">
                  <Headphones className="w-8 h-8 text-slate-600" />
                  <span>Select a user conversation from the left to resolve.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PROMOTIONS & RISK CONTROLS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'promotions' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                <div>
                  <h2 className="text-base font-black text-white flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    <span>Promotional Policy &amp; Risk Controls</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure registration bonuses, mandatory wagering percentages, and Aviator/WinGo profit-limits.
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  promoActive ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                }`}>
                  {promoActive ? 'PROMOTIONS ACTIVE' : 'PROMOTIONS DISABLED'}
                </span>
              </div>

              {promoFeedback && (
                <div className={`p-3 rounded-xl mb-4 text-xs font-bold ${
                  promoFeedback.includes('✓') 
                    ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300' 
                    : promoFeedback.includes('⏳')
                    ? 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-300'
                    : 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
                }`}>
                  {promoFeedback}
                </div>
              )}

              <form onSubmit={handleSavePromotions} className="space-y-5">
                <div className="p-4 rounded-2xl bg-[#131b2e] border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-black text-white block">Promotional Welcome Program</span>
                    <span className="text-xs text-slate-400">Enable promotional bonus credits for new user accounts</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={promoActive}
                      onChange={(e) => setPromoActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Registration Bonus */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Registration Bonus (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={signupBonus}
                      onChange={(e) => setSignupBonus(Number(e.target.value))}
                      className="w-full bg-[#131b2e] border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Credited once to newly registered accounts (Default: ₹150)</span>
                  </div>

                  {/* Minimum Qualifying Deposit */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Minimum Qualifying Deposit (₹)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={minQualifyingDeposit}
                      onChange={(e) => setMinQualifyingDeposit(Number(e.target.value))}
                      className="w-full bg-[#131b2e] border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-emerald-300 focus:outline-none focus:border-cyan-500"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Required to unlock promotional withdrawal eligibility (Default: ₹100)</span>
                  </div>

                  {/* Wagering Percentage */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Wagering Requirement Multiplier (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="500"
                      value={wageringPercentage}
                      onChange={(e) => setWageringPercentage(Number(e.target.value))}
                      className="w-full bg-[#131b2e] border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-purple-300 focus:outline-none focus:border-cyan-500"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Percentage of qualifying wallet to wager before withdrawal (Default: 50%)</span>
                  </div>

                  {/* Aviator & WinGo Profit-Limit Multiplier */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Aviator &amp; WinGo Profit-Limit Multiplier (×)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1.0"
                      value={aviatorWingoLimitMultiplier}
                      onChange={(e) => setAviatorWingoLimitMultiplier(Number(e.target.value))}
                      className="w-full bg-[#131b2e] border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-amber-300 focus:outline-none focus:border-cyan-500"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Threshold = Qualifying Deposit × Multiplier (Default: 3.0× = ₹300 for ₹100 deposit)</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
                  <span className="font-bold text-slate-300 block mb-1">Eligible Wagering Games</span>
                  <div className="flex flex-wrap gap-2">
                    {['Aviator', 'WinGo', 'Mines', 'Quantum Dice', 'Plinko', 'Neon Tower', 'Vertex'].map(game => (
                      <span key={game} className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-bold">
                        ✓ {game}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 font-black rounded-2xl text-sm transition transform active:scale-95 shadow-lg shadow-cyan-500/25"
                >
                  Save Policy &amp; Synchronize to Live Network
                </button>
              </form>
            </div>

            {/* Audit Logs */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <h3 className="text-base font-black text-white flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Audit Logs &amp; Change History</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {(adminSettings?.auditLogs || []).length} Recorded Modifications
                </span>
              </div>

              {(adminSettings?.auditLogs || []).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  No policy changes logged yet. Any updates to promotional or limit settings will be recorded here.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#131b2e] text-slate-400 border-b border-slate-800 uppercase">
                      <tr>
                        <th className="p-2.5">Timestamp</th>
                        <th className="p-2.5">Admin</th>
                        <th className="p-2.5">Setting</th>
                        <th className="p-2.5">Previous</th>
                        <th className="p-2.5">New</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(adminSettings.auditLogs || []).map((log) => (
                        <tr key={log.id} className="hover:bg-[#131b2e]/50">
                          <td className="p-2.5 font-mono text-slate-400 text-[11px]">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-2.5 font-bold text-cyan-400">
                            {log.admin}
                          </td>
                          <td className="p-2.5 font-bold text-white">
                            {log.setting}
                          </td>
                          <td className="p-2.5 font-mono text-rose-400">
                            {String(log.previousValue)}
                          </td>
                          <td className="p-2.5 font-mono text-emerald-400 font-bold">
                            {String(log.newValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PAYMENT SETTINGS & QR UPDATE TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'qr' && (
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-xl max-w-xl mx-auto">
            <h2 className="text-base font-black text-white mb-1">Update Platform UPI QR &amp; Payee Details</h2>
            <p className="text-xs text-slate-400 mb-5">
              Strictly controls the exact QR code and UPI ID shown to all users on the deposit page.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Official UPI ID</label>
                <input
                  type="text"
                  value={newUpiId}
                  onChange={(e) => setNewUpiId(e.target.value)}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Payee Business Name</label>
                <input
                  type="text"
                  value={newPayeeName}
                  onChange={(e) => setNewPayeeName(e.target.value)}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Upload New UPI QR Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrUpload}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-cyan-400 hover:file:bg-slate-700 cursor-pointer"
                />
                <div className="mt-3 flex items-center space-x-4">
                  <div className="bg-white p-2 rounded-xl w-24 h-24 flex items-center justify-center">
                    <img
                      src={newQrImage || adminSettings.qrImageUrl}
                      alt="Current QR"
                      className="max-h-20 object-contain"
                    />
                  </div>
                  <span className="text-xs text-slate-400">Current active QR code shown to players</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-xl text-sm transition shadow-lg shadow-cyan-500/20"
              >
                Save &amp; Apply to Players Deposit Page
              </button>
            </form>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* AUDIO & SOUND FX STUDIO TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'audio' && (
          <div className="space-y-4">
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-black text-white flex items-center space-x-2">
                    <Volume2 className="w-5 h-5 text-cyan-400" />
                    <span>Dynamic Sound FX Studio</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Set each sound to <span className="text-slate-300 font-bold">Silent</span>, <span className="text-slate-300 font-bold">Default</span> synthesizer, or <span className="text-cyan-300 font-bold">Custom</span> (upload MP3/WAV/M4A ≤ 5 MB).
                  </p>
                </div>
                <button
                  onClick={handleResetAllSounds}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-rose-500 text-rose-300 font-bold text-xs transition flex items-center space-x-1 shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All</span>
                </button>
              </div>

              {audioFeedback && (
                <div className="mt-3 p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-bold text-center flex items-center justify-center space-x-2">
                  <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span>{audioFeedback}</span>
                </div>
              )}

              {/* Sound Control Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {[
                  { key: 'deposit',  title: 'Deposit Button Tap',          desc: 'Triggers when player taps the Deposit button',              accent: 'border-emerald-500/40 text-emerald-400' },
                  { key: 'withdraw', title: 'Withdraw Button Tap',         desc: 'Triggers when player submits a withdrawal request',         accent: 'border-rose-500/40 text-rose-400' },
                  { key: 'login',    title: 'User Login Sound',            desc: 'Plays when any player logs into their CRVPER account',      accent: 'border-blue-500/40 text-blue-400' },
                  { key: 'register', title: 'Registration Fanfare',        desc: 'Plays when a new player creates an account',               accent: 'border-purple-500/40 text-purple-400' },
                  { key: 'win',      title: 'Game Win Sound',              desc: 'Triumphant victory sound across all 6 games',               accent: 'border-amber-500/40 text-amber-400' },
                  { key: 'loss',     title: 'Game Loss Sound',             desc: 'Crash/thud when player loses a wager or hits a bomb',      accent: 'border-red-500/40 text-red-400' },
                  { key: 'cashout',  title: 'Jackpot Cashout',             desc: 'Coin shower when player cashes out in Aviator or Mines',   accent: 'border-cyan-500/40 text-cyan-400' },
                  { key: 'click',    title: 'UI Tap & Chip Sounds',        desc: 'Subtle feedback for buttons, bet chips, and controls',     accent: 'border-slate-600 text-slate-300' },
                ].map((item) => {
                  const mode = soundModes[item.key] || 'default';
                  const meta = customSoundMeta[item.key];

                  return (
                    <div
                      key={item.key}
                      className={`bg-[#0c1220] border ${item.accent} rounded-2xl p-4 flex flex-col gap-3 shadow-lg`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-sm font-black text-white">{item.title}</span>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{item.desc}</p>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          mode === 'silent'  ? 'bg-slate-900 text-slate-500 border border-slate-700' :
                          mode === 'custom'  ? 'bg-purple-950 text-purple-300 border border-purple-500/50' :
                                              'bg-cyan-950/60 text-cyan-300 border border-cyan-700/50'
                        }`}>
                          {mode === 'silent' ? '🔇 Silent' : mode === 'custom' ? '🎵 Custom' : '🔊 Default'}
                        </span>
                      </div>

                      {mode === 'custom' && meta && (
                        <div className="text-[11px] bg-purple-950/40 border border-purple-800/40 rounded-lg px-2.5 py-1.5 text-purple-300 flex items-center gap-1.5">
                          <Music className="w-3 h-3 shrink-0" />
                          <span className="truncate font-medium">{meta.name}</span>
                          <span className="text-purple-500 shrink-0">({(meta.size / 1048576).toFixed(2)} MB)</span>
                        </div>
                      )}
                      {mode === 'custom' && !meta && (
                        <div className="text-[11px] bg-amber-950/40 border border-amber-700/40 rounded-lg px-2.5 py-1.5 text-amber-400">
                          ⚠ No file uploaded yet — upload a file below
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        {['silent', 'default', 'custom'].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleSetSoundMode(item.key, m)}
                            className={`flex-1 py-1 rounded-lg text-[11px] font-black uppercase transition border ${
                              mode === m
                                ? m === 'silent'  ? 'bg-slate-700 border-slate-500 text-white' :
                                  m === 'custom'  ? 'bg-purple-700 border-purple-400 text-white' :
                                                    'bg-cyan-700 border-cyan-400 text-white'
                                : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {m === 'silent' ? '🔇' : m === 'custom' ? '🎵' : '🔊'} {m}
                          </button>
                        ))}
                      </div>

                      <div className="pt-1 border-t border-slate-800/60 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleTestSound(item.key)}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-xs transition flex items-center space-x-1.5 active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Test</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          {mode === 'custom' && (
                            <label className="px-3 py-1.5 rounded-xl bg-purple-900/50 hover:bg-purple-800/60 border border-purple-600/50 text-purple-200 font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer active:scale-95">
                              <Upload className="w-3.5 h-3.5" />
                              <span>{meta ? 'Change File' : 'Upload Audio'}</span>
                              <input
                                type="file"
                                accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) handleUploadSound(item.key, file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          )}

                          {(meta || mode !== 'default') && (
                            <button
                              type="button"
                              onClick={() => handleResetSound(item.key)}
                              className="p-1.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-400 hover:bg-rose-900 transition"
                              title="Reset sound"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SCREENSHOT / PROOF VIEWER MODAL */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {viewScreenshot && (
        <div 
          onClick={() => setViewScreenshot(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="max-w-md w-full bg-[#0f172a] rounded-2xl p-4 border border-slate-700 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>Payment Proof / QR Image</span>
              </span>
              <button
                onClick={() => setViewScreenshot(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-black/90 p-2 rounded-xl flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img
                src={viewScreenshot}
                alt="Payment Proof"
                className="w-full max-h-[65vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* REJECTION REASON MODAL */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {rejectionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-rose-500/40 rounded-2xl p-5 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Reject {rejectionModal.type === 'deposit' ? 'Deposit Request' : 'Withdrawal Request'}</span>
              </h3>
              <button
                onClick={() => setRejectionModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              {rejectionModal.type === 'deposit'
                ? 'Specify rejection reason for the player. Transaction will be marked REJECTED.'
                : 'Specify rejection reason. The withdrawal amount will be refunded directly to player wallet.'}
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Reason for Rejection
                </label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              {/* Canned Rejection Reasons */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Invalid UTR reference number',
                  'Payment screenshot unclear or cropped',
                  'Payment not received in official account',
                  'Incorrect UPI ID details',
                  'Duplicate transaction submission'
                ].map((reason, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectionReason(reason)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectionModal(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRejection}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PLAYER DETAILS & LEDGER MODAL */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-emerald-500/30 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  <span>Player Vault &amp; Activity Ledger</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Phone: {selectedPlayer.phone} • ID: {selectedPlayer.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar">
              {/* Balances Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#131b2e] border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Balance</span>
                  <span className="text-base font-black font-mono text-emerald-400">
                    ₹{Number(selectedPlayer.walletBalance || 0).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#131b2e] border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Deposit Cash</span>
                  <span className="text-base font-black font-mono text-cyan-300">
                    ₹{Number(selectedPlayer.depositBalance || 0).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#131b2e] border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Bonus Locked</span>
                  <span className="text-base font-black font-mono text-amber-300">
                    ₹{Number(selectedPlayer.bonusBalance || 0).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#131b2e] border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Winnings Vault</span>
                  <span className="text-base font-black font-mono text-purple-300">
                    ₹{Number(selectedPlayer.winningsBalance || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Promotional Wagering Progress */}
              <div className="p-4 rounded-xl bg-[#131b2e] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Promotional Wagering Status</span>
                  <span className="font-mono text-slate-400">
                    Wagered: ₹{selectedPlayer.wageringWagered || 0} / Req: ₹{selectedPlayer.wageringRequired || 0}
                  </span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, selectedPlayer.wageringRequired > 0 ? ((selectedPlayer.wageringWagered || 0) / selectedPlayer.wageringRequired) * 100 : 100)}%`
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Qualifying Deposit: ₹{selectedPlayer.qualifyingDeposit || 0}</span>
                  <span className={selectedPlayer.wageringRemaining === 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {selectedPlayer.wageringRemaining === 0 ? '✓ Wagering Complete' : `₹${selectedPlayer.wageringRemaining} Remaining`}
                  </span>
                </div>
              </div>

              {/* Player Deposits History */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-white block uppercase tracking-wider">
                  Deposit Submissions ({deposits.filter(d => d.userId === selectedPlayer.id).length})
                </span>
                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-800 bg-[#0c1220]">
                  {deposits.filter(d => d.userId === selectedPlayer.id).length === 0 ? (
                    <p className="text-[11px] text-slate-500 p-3">No deposits recorded for this player.</p>
                  ) : (
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#131b2e] text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-2">Date</th>
                          <th className="p-2">Amount</th>
                          <th className="p-2">UTR</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {deposits.filter(d => d.userId === selectedPlayer.id).map(dep => (
                          <tr key={dep.id}>
                            <td className="p-2 text-slate-400 font-mono">{new Date(dep.createdAt).toLocaleDateString()}</td>
                            <td className="p-2 font-black font-mono text-emerald-400">₹{dep.amount}</td>
                            <td className="p-2 font-mono text-cyan-300">{dep.utr}</td>
                            <td className="p-2">
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                dep.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-400' :
                                dep.status === 'REJECTED' ? 'bg-rose-950 text-rose-400' : 'bg-amber-950 text-amber-400'
                              }`}>
                                {dep.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Player Withdrawals History */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-white block uppercase tracking-wider">
                  Withdrawal Requests ({withdrawals.filter(w => w.userId === selectedPlayer.id).length})
                </span>
                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-800 bg-[#0c1220]">
                  {withdrawals.filter(w => w.userId === selectedPlayer.id).length === 0 ? (
                    <p className="text-[11px] text-slate-500 p-3">No withdrawals recorded for this player.</p>
                  ) : (
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#131b2e] text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-2">Date</th>
                          <th className="p-2">Amount</th>
                          <th className="p-2">UPI ID</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {withdrawals.filter(w => w.userId === selectedPlayer.id).map(wth => (
                          <tr key={wth.id}>
                            <td className="p-2 text-slate-400 font-mono">{new Date(wth.createdAt).toLocaleDateString()}</td>
                            <td className="p-2 font-black font-mono text-rose-400">₹{wth.amount}</td>
                            <td className="p-2 font-mono text-slate-300">{wth.upiId}</td>
                            <td className="p-2">
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                wth.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400' :
                                wth.status === 'REJECTED' ? 'bg-rose-950 text-rose-400' : 'bg-amber-950 text-amber-400'
                              }`}>
                                {wth.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const chat = supportChats.find(c => c.userId === selectedPlayer.id);
                  if (chat) {
                    setSelectedChatUser(chat);
                  } else {
                    setSelectedChatUser({
                      userId: selectedPlayer.id,
                      userPhone: selectedPlayer.phone,
                      messages: []
                    });
                  }
                  setSelectedPlayer(null);
                  setActiveTab('support');
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center space-x-1.5"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Open Live Support Chat With Player</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlayer(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Action Modal */}
      {confirmationModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-emerald-500/40 rounded-2xl p-5 max-w-md w-full shadow-2xl">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>{confirmationModal.title}</span>
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {confirmationModal.message}
            </p>
            <div className="flex items-center space-x-2 mt-4 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmationModal(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const fn = confirmationModal.onConfirm;
                  setConfirmationModal(null);
                  if (fn) await fn();
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20"
              >
                Confirm &amp; Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}