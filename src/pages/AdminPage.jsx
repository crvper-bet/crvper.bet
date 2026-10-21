import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Users, ArrowDownLeft, ArrowUpRight, QrCode, Headphones, 
  Trash2, Send, CheckCircle2, XCircle, LogOut, RefreshCw, Eye, Edit3, DollarSign, Activity,
  Volume2, Play, Upload, RotateCcw, Music, Sparkles
} from 'lucide-react';
import { storage } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';
import { soundStorage } from '../services/soundStorage';

export default function AdminPage({ onExit }) {
  const { adminLoggedIn, loginAdmin, logoutAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('deposits'); // 'overview', 'deposits', 'withdrawals', 'qr', 'audio', 'promoters', 'support', 'users'

  // Admin login form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Live state
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [users, setUsers] = useState([]);
  const [promoters, setPromoters] = useState([]);
  const [adminSettings, setAdminSettings] = useState(() => storage.getAdminSettings());
  const [supportChats, setSupportChats] = useState([]);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [adminReply, setAdminReply] = useState('');
  const [viewScreenshot, setViewScreenshot] = useState(null);

  const [newUpiId, setNewUpiId] = useState('');
  const [newPayeeName, setNewPayeeName] = useState('');
  const [newQrImage, setNewQrImage] = useState(null);
  const [audioFeedback, setAudioFeedback] = useState('');
  // IndexedDB metadata for uploaded sounds: { key → { name, size, type } }
  const [customSoundMeta, setCustomSoundMeta] = useState({});
  // Per-key mode: 'silent' | 'default' | 'custom'
  const [soundModes, setSoundModes] = useState(() => storage.getAdminSettings()?.soundModes || {});

  // Promotional and Risk Controls State
  const [promoActive, setPromoActive] = useState(() => storage.getAdminSettings()?.promoActive ?? true);
  const [signupBonus, setSignupBonus] = useState(() => storage.getAdminSettings()?.signupBonus ?? 150);
  const [minQualifyingDeposit, setMinQualifyingDeposit] = useState(() => storage.getAdminSettings()?.minQualifyingDeposit ?? 100);
  const [wageringPercentage, setWageringPercentage] = useState(() => storage.getAdminSettings()?.wageringPercentage ?? 50);
  const [aviatorWingoLimitMultiplier, setAviatorWingoLimitMultiplier] = useState(() => storage.getAdminSettings()?.aviatorWingoLimitMultiplier ?? 3.0);
  const [promoFeedback, setPromoFeedback] = useState('');

  const loadAudioMeta = async () => {
    const all = await soundStorage.getAllSounds();
    // Strip ArrayBuffer/dataUrl — keep only display metadata
    const meta = {};
    for (const [key, val] of Object.entries(all)) {
      meta[key] = { name: val.name, size: val.size, type: val.type, updatedAt: val.updatedAt };
    }
    setCustomSoundMeta(meta);
    // Refresh soundModes from the latest local config (already synced from Supabase)
    const latestModes = soundStorage.getSoundModes();
    if (latestModes && Object.keys(latestModes).length > 0) {
      setSoundModes(prev => ({ ...prev, ...latestModes }));
    }
  };

  const loadData = async () => {
    try {
      const [deps, withs, usrs, proms, settings, chats] = await Promise.all([
        storage.getDepositsAsync(),
        storage.getWithdrawalsAsync(),
        storage.getUsersAsync(),
        storage.getPromotersAsync(),
        storage.getAdminSettingsAsync(),
        storage.getSupportChatsAsync()
      ]);
      setDeposits([...deps].reverse());
      setWithdrawals([...withs].reverse());
      setUsers([...usrs].reverse());
      setPromoters(proms);
      setAdminSettings(settings);
      setSoundModes(settings?.soundModes || {});
      setNewUpiId(settings.upiId);
      setNewPayeeName(settings.payeeName);
      setPromoActive(settings?.promoActive ?? true);
      setSignupBonus(settings?.signupBonus ?? 150);
      setMinQualifyingDeposit(settings?.minQualifyingDeposit ?? 100);
      setWageringPercentage(settings?.wageringPercentage ?? 50);
      setAviatorWingoLimitMultiplier(settings?.aviatorWingoLimitMultiplier ?? 3.0);
      setSupportChats(chats || []);

      // If a chat is currently open, keep it updated with fresh messages
      setSelectedChatUser(prev => {
        if (!prev) return null;
        const fresh = (chats || []).find(c => c.userId === prev.userId);
        return fresh || prev;
      });
    } catch (e) {
      console.warn('[AdminPage] loadData error:', e);
    }
  };

  useEffect(() => {
    if (adminLoggedIn) {
      loadData();
      // Sync from Supabase first so admin sees the latest cloud config
      soundStorage.syncFromRemote().then(() => loadAudioMeta());
      window.addEventListener('crvper_deposits_updated', loadData);
      window.addEventListener('crvper_deposits_changed', loadData);
      window.addEventListener('crvper_withdrawals_updated', loadData);
      window.addEventListener('crvper_withdrawals_changed', loadData);
      window.addEventListener('crvper_support_updated', loadData);
      window.addEventListener('crvper_promoter_updated', loadData);
      window.addEventListener('crvper_user_updated', loadData);
      window.addEventListener('crvper_sound_updated', loadAudioMeta);
      window.addEventListener('crvper_settings_updated', loadAudioMeta);
      return () => {
        window.removeEventListener('crvper_deposits_updated', loadData);
        window.removeEventListener('crvper_deposits_changed', loadData);
        window.removeEventListener('crvper_withdrawals_updated', loadData);
        window.removeEventListener('crvper_withdrawals_changed', loadData);
        window.removeEventListener('crvper_support_updated', loadData);
        window.removeEventListener('crvper_promoter_updated', loadData);
        window.removeEventListener('crvper_user_updated', loadData);
        window.removeEventListener('crvper_sound_updated', loadAudioMeta);
        window.removeEventListener('crvper_settings_updated', loadAudioMeta);
      };
    }
  }, [adminLoggedIn]);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      loginAdmin(username.trim(), password.trim());
      sounds.playWin();
    } catch (err) {
      setLoginError(err.message || 'Invalid admin credentials');
    }
  };

  const handleApproveDeposit = async (id) => {
    if (confirm('Approve this deposit? User wallet will be credited and promoter will receive 20% commission.')) {
      await storage.approveDeposit(id);
      sounds.playWin();
      await loadData();
    }
  };

  const handleRejectDeposit = async (id) => {
    const reason = prompt('Reason for rejection:', 'Invalid UTR reference or payment screenshot');
    if (reason) {
      await storage.rejectDeposit(id, reason);
      sounds.playClick();
      await loadData();
    }
  };

  const handleApproveWithdrawal = async (id) => {
    if (confirm('Mark this withdrawal as Completed / Sent?')) {
      await storage.approveWithdrawal(id);
      sounds.playWin();
      await loadData();
    }
  };

  const handleRejectWithdrawal = async (id) => {
    const reason = prompt('Reason for rejection (funds will be refunded to user):', 'Incorrect UPI details');
    if (reason) {
      await storage.rejectWithdrawal(id, reason);
      sounds.playClick();
      await loadData();
    }
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

  // Set mode for a sound key: 'silent' | 'default' | 'custom'
  // Syncs to Supabase immediately so ALL users hear the change in real-time
  const handleSetSoundMode = async (soundKey, newMode) => {
    try {
      // Write to soundStorage (syncs to Supabase)
      await soundStorage.setSoundMode(soundKey, newMode);
      const updatedModes = { ...soundModes, [soundKey]: newMode };
      setSoundModes(updatedModes);
      // Also update legacy adminSettings soundModes for backward compat
      storage.updateAdminSettings({ soundModes: updatedModes });
      setAudioFeedback(`✓ ${soundKey.toUpperCase()} → ${newMode.toUpperCase()} (synced to all devices)`);
      setTimeout(() => setAudioFeedback(''), 3000);
    } catch (err) {
      setAudioFeedback(`❌ Mode change failed: ${err.message}`);
      setTimeout(() => setAudioFeedback(''), 3000);
    }
  };

  // Upload a custom audio file (≤5 MB) — stored in Supabase, live for ALL users
  const handleUploadSound = async (soundKey, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAudioFeedback(`❌ File too large (max 5 MB). "${file.name}" is ${(file.size / 1048576).toFixed(1)} MB`);
      setTimeout(() => setAudioFeedback(''), 4000);
      return;
    }
    try {
      setAudioFeedback(`⏳ Uploading "${file.name}" to cloud…`);
      // saveSound() encodes as base64, stores in Supabase, fires crvper_sound_updated
      await soundStorage.saveSound(soundKey, file);
      // soundStorage.saveSound() already sets mode to 'custom' and pushes to Supabase
      const updatedModes = { ...soundModes, [soundKey]: 'custom' };
      setSoundModes(updatedModes);
      // Keep legacy soundModes in adminSettings in sync
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

  // Remove custom file for a key and revert to default — syncs to all devices
  const handleResetSound = async (soundKey) => {
    try {
      setAudioFeedback(`⏳ Removing custom sound for ${soundKey.toUpperCase()}…`);
      await soundStorage.deleteSound(soundKey); // pushes to Supabase
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

  // Remove all custom files and reset all modes to default — syncs to all devices
  const handleResetAllSounds = async () => {
    if (confirm('Reset ALL custom sounds? This will delete all uploaded audio files and revert to built-in synthesizers for all users.')) {
      try {
        setAudioFeedback('⏳ Resetting all sounds…');
        await soundStorage.clearAll(); // pushes to Supabase
        const defaultModes = {
          deposit: 'default', withdraw: 'default', login: 'default', register: 'default',
          win: 'default', loss: 'default', cashout: 'default', click: 'default'
        };
        storage.updateAdminSettings({ soundModes: defaultModes });
        setSoundModes(defaultModes);
        await loadAudioMeta();
        setAudioFeedback('✓ All sounds reset to built-in synthesizers (synced to all devices)');
        setTimeout(() => setAudioFeedback(''), 3000);
      } catch (err) {
        setAudioFeedback(`❌ Reset all failed: ${err.message}`);
        setTimeout(() => setAudioFeedback(''), 3000);
      }
    }
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

  const handleDeleteChat = async (userId) => {
    if (confirm('Delete this conversation after customer satisfaction?')) {
      await storage.deleteChat(userId);
      setSelectedChatUser(null);
      const freshChats = await storage.getSupportChatsAsync();
      setSupportChats(freshChats || []);
    }
  };

  // If not logged in, render Admin Login screen
  if (!adminLoggedIn) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#0f172a] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl relative">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-3 shadow-lg shadow-cyan-500/20">
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
                className="w-full bg-[#131b2e] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
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
                className="w-full bg-[#131b2e] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 font-black rounded-xl text-sm transition transform active:scale-95 shadow-lg shadow-cyan-500/25"
            >
              Authenticate & Enter
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

  // Calculate statistics
  const totalDepositAmount = deposits
    .filter(d => d.status === 'APPROVED')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalWithdrawAmount = withdrawals
    .filter(w => w.status === 'COMPLETED')
    .reduce((sum, w) => sum + w.amount, 0);

  const pendingDepositsCount = deposits.filter(d => d.status === 'PENDING').length;
  const pendingWithdrawalsCount = withdrawals.filter(w => w.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Admin Top Bar */}
      <header className="bg-[#0f172a] border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-black">
            C
          </div>
          <div>
            <h1 className="text-base font-black text-white flex items-center space-x-1.5">
              <span>CRVPER Admin Control Center</span>
              <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-500/40 px-1.5 py-0.2 rounded">LIVE</span>
            </h1>
            <p className="text-[11px] text-slate-400">Manage Deposits, Withdrawals, QR, Promoters & Live Support</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onExit}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
          >
            To Platform
          </button>
          <button
            onClick={logoutAdmin}
            className="p-2 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-800 transition"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Admin Navigation Tabs */}
      <div className="bg-[#111827] border-b border-slate-800 px-4 py-2 flex items-center space-x-2 overflow-x-auto text-xs font-bold">
        {[
          { id: 'overview', label: 'Dashboard Stats', icon: Activity },
          { id: 'deposits', label: `Deposits (${pendingDepositsCount})`, icon: ArrowDownLeft, alert: pendingDepositsCount > 0 },
          { id: 'withdrawals', label: `Withdrawals (${pendingWithdrawalsCount})`, icon: ArrowUpRight, alert: pendingWithdrawalsCount > 0 },
          { id: 'promotions', label: 'Promotions & Risk Controls', icon: Sparkles },
          { id: 'qr', label: 'Payment QR Setup', icon: QrCode },
          { id: 'audio', label: 'Audio & FX Studio', icon: Volume2 },
          { id: 'promoters', label: 'Promoters (20%)', icon: Users },
          { id: 'support', label: `Live Support (${supportChats.length})`, icon: Headphones },
          { id: 'users', label: `Players (${users.length})`, icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition shrink-0 ${
                isActive
                  ? 'bg-cyan-500 text-black font-extrabold shadow-md'
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

      {/* Main Tab Views */}
      <main className="flex-1 p-4 max-w-6xl w-full mx-auto">
        {/* OVERVIEW STATS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
                <span className="text-xs text-slate-400 font-bold block">Total Approved Deposits</span>
                <span className="text-2xl font-black font-mono text-emerald-400">₹{totalDepositAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
                <span className="text-xs text-slate-400 font-bold block">Total Approved Withdrawals</span>
                <span className="text-2xl font-black font-mono text-rose-400">₹{totalWithdrawAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
                <span className="text-xs text-slate-400 font-bold block">Registered Players</span>
                <span className="text-2xl font-black font-mono text-white">{users.length}</span>
              </div>
              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
                <span className="text-xs text-slate-400 font-bold block">Active Promoters</span>
                <span className="text-2xl font-black font-mono text-cyan-400">{promoters.length}</span>
              </div>
            </div>

            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-2">Platform House Revenue</h3>
              <div className="text-3xl font-black font-mono text-cyan-400">
                ₹{(totalDepositAmount - totalWithdrawAmount).toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Net operational balance remaining on CRVPER platform.
              </p>
            </div>
          </div>
        )}

        {/* DEPOSITS TAB */}
        {activeTab === 'deposits' && (
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-white">Manual UPI Deposit Verifications</h2>
              <span className="text-xs text-cyan-400 font-mono">{deposits.length} total entries</span>
            </div>

            {deposits.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No deposit requests yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#131b2e] text-slate-400 border-b border-slate-800 uppercase">
                    <tr>
                      <th className="p-3">Player</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">12-Digit UTR</th>
                      <th className="p-3">Proof Screenshot</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {deposits.map((dep) => (
                      <tr key={dep.id} className="hover:bg-[#131b2e]/50">
                        <td className="p-3">
                          <span className="font-mono font-bold text-white block">{dep.userPhone}</span>
                          <span className="text-[10px] text-slate-500">{new Date(dep.createdAt).toLocaleString()}</span>
                        </td>
                        <td className="p-3 font-mono font-black text-emerald-400 text-sm">
                          ₹{dep.amount}
                        </td>
                        <td className="p-3 font-mono text-cyan-300">
                          {dep.utr}
                        </td>
                        <td className="p-3">
                          {dep.screenshotUrl ? (
                            <button
                              onClick={() => setViewScreenshot(dep.screenshotUrl)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-[11px] flex items-center space-x-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View SS</span>
                            </button>
                          ) : (
                            <span className="text-slate-500">No Image</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            dep.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-400' :
                            dep.status === 'REJECTED' ? 'bg-rose-950 text-rose-400' : 'bg-amber-950 text-amber-400'
                          }`}>
                            {dep.status}
                          </span>
                        </td>
                        <td className="p-3">
                          {dep.status === 'PENDING' ? (
                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => handleApproveDeposit(dep.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center space-x-1"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleRejectDeposit(dep.id)}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center space-x-1"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>Decline</span>
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
          </div>
        )}

        {/* WITHDRAWALS TAB */}
        {activeTab === 'withdrawals' && (
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-white">Manual Withdrawal Requests</h2>
              <span className="text-xs text-rose-400 font-mono">{withdrawals.length} total entries</span>
            </div>

            {withdrawals.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No withdrawal requests yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#131b2e] text-slate-400 border-b border-slate-800 uppercase">
                    <tr>
                      <th className="p-3">Player</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">UPI ID / Details</th>
                      <th className="p-3">Player QR</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {withdrawals.map((wth) => (
                      <tr key={wth.id} className="hover:bg-[#131b2e]/50">
                        <td className="p-3">
                          <span className="font-mono font-bold text-white block">{wth.userPhone}</span>
                          <span className="text-[10px] text-slate-500">{new Date(wth.createdAt).toLocaleString()}</span>
                        </td>
                        <td className="p-3 font-mono font-black text-rose-400 text-sm">
                          ₹{wth.amount}
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {wth.upiId}
                        </td>
                        <td className="p-3">
                          {wth.qrUrl ? (
                            <button
                              onClick={() => setViewScreenshot(wth.qrUrl)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-[11px] flex items-center space-x-1"
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
                            wth.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400' :
                            wth.status === 'REJECTED' ? 'bg-rose-950 text-rose-400' : 'bg-amber-950 text-amber-400'
                          }`}>
                            {wth.status}
                          </span>
                        </td>
                        <td className="p-3">
                          {wth.status === 'PENDING' ? (
                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => handleApproveWithdrawal(wth.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
                              >
                                Mark Sent
                              </button>
                              <button
                                onClick={() => handleRejectWithdrawal(wth.id)}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px]"
                              >
                                Reject & Refund
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
          </div>
        )}

        {/* PROMOTIONS & RISK CONTROLS TAB */}
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

                {/* Eligible Games Disclosure */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
                  <span className="font-bold text-slate-300 block mb-1">Eligible Wagering Games</span>
                  <div className="flex flex-wrap gap-2">
                    {['Aviator', 'WinGo', 'Mines', 'Quantum Dice', 'Plinko', 'Neon Tower'].map(game => (
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

            {/* Comprehensive Server-Side Audit Logs */}
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
                  No policy changes logged yet. Any updates to promotional or limit settings will be recorded here with administrator identity and timestamps.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#131b2e] text-slate-400 border-b border-slate-800 uppercase">
                      <tr>
                        <th className="p-2.5">Timestamp (UTC/IST)</th>
                        <th className="p-2.5">Admin Identity</th>
                        <th className="p-2.5">Setting Modified</th>
                        <th className="p-2.5">Previous Value</th>
                        <th className="p-2.5">New Value</th>
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

        {/* PAYMENT SETTINGS & QR UPDATE TAB */}
        {activeTab === 'qr' && (
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-xl max-w-xl mx-auto">
            <h2 className="text-base font-black text-white mb-1">Update Platform UPI QR & Payee Details</h2>
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
                  <span className="text-xs text-slate-400">Current active QR code</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-xl text-sm transition shadow-lg shadow-cyan-500/20"
              >
                Save & Apply to Players Deposit Page
              </button>
            </form>
          </div>
        )}

        {/* AUDIO & SOUND FX STUDIO TAB */}
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
                    Set each sound to <span className="text-slate-300 font-bold">Silent</span>, <span className="text-slate-300 font-bold">Default</span> synthesizer, or <span className="text-cyan-300 font-bold">Custom</span> (upload MP3/WAV/M4A ≤ 5 MB). Changes take effect instantly across all games.
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
                  { key: 'deposit',  title: 'Deposit Button Tap',          desc: 'Triggers when player taps the Deposit button',              accent: 'emerald' },
                  { key: 'withdraw', title: 'Withdraw Button Tap',          desc: 'Triggers when player submits a withdrawal request',         accent: 'rose' },
                  { key: 'login',    title: 'User Login Sound',             desc: 'Plays when any player logs into their CRVPER account',      accent: 'blue' },
                  { key: 'register', title: 'Registration Fanfare',         desc: 'Plays when a new player creates an account',               accent: 'purple' },
                  { key: 'win',      title: 'Game Win Sound',               desc: 'Triumphant victory sound across all 6 games',               accent: 'amber' },
                  { key: 'loss',     title: 'Game Loss Sound',              desc: 'Crash/thud when player loses a wager or hits a bomb',      accent: 'red' },
                  { key: 'cashout',  title: 'Jackpot Cashout',              desc: 'Coin shower when player cashes out in Aviator or Mines',   accent: 'cyan' },
                  { key: 'click',    title: 'UI Tap & Chip Sounds',         desc: 'Subtle feedback for buttons, bet chips, and controls',     accent: 'slate' },
                ].map((item) => {
                  const mode = soundModes[item.key] || 'default';
                  const meta = customSoundMeta[item.key];
                  const accentMap = {
                    emerald: 'border-emerald-500/40 text-emerald-400',
                    rose:    'border-rose-500/40 text-rose-400',
                    blue:    'border-blue-500/40 text-blue-400',
                    purple:  'border-purple-500/40 text-purple-400',
                    amber:   'border-amber-500/40 text-amber-400',
                    red:     'border-red-500/40 text-red-400',
                    cyan:    'border-cyan-500/40 text-cyan-400',
                    slate:   'border-slate-600 text-slate-300',
                  };
                  const accent = accentMap[item.accent] || accentMap.slate;

                  return (
                    <div
                      key={item.key}
                      className={`bg-[#0c1220] border ${accent} rounded-2xl p-4 flex flex-col gap-3 shadow-lg`}
                    >
                      {/* Title + mode badge */}
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

                      {/* Custom file info */}
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

                      {/* 3-Mode selector pills */}
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

                      {/* Bottom row: Test + (Upload when custom mode) + Reset */}
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
                          {/* Upload — only meaningful in custom mode */}
                          {mode === 'custom' && (
                            <label className="px-3 py-1.5 rounded-xl bg-purple-900/50 hover:bg-purple-800/60 border border-purple-600/50 text-purple-200 font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer active:scale-95">
                              <Upload className="w-3.5 h-3.5" />
                              <span>{meta ? 'Change File' : 'Upload Audio/Video'}</span>
                              <input
                                type="file"
                                accept="audio/*,video/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.mp4,.webm,.mov"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) handleUploadSound(item.key, file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          )}

                          {/* Reset — only if there's a custom file or non-default mode */}
                          {(meta || mode !== 'default') && (
                            <button
                              type="button"
                              onClick={() => handleResetSound(item.key)}
                              className="p-1.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-400 hover:bg-rose-900 transition"
                              title="Remove custom file & revert to Default"
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


        {/* PROMOTERS TAB */}
        {activeTab === 'promoters' && (
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-black text-white">Promoter & Influencer Commissions</h2>
                <p className="text-xs text-slate-400">Promoters earn 20% commission on every verified deposit made by referred users</p>
              </div>
              <span className="text-xs text-purple-400 font-bold">{promoters.length} registered</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#131b2e] text-slate-400 border-b border-slate-800 uppercase">
                  <tr>
                    <th className="p-3">Promoter</th>
                    <th className="p-3">Invite Code</th>
                    <th className="p-3">Users Invited</th>
                    <th className="p-3">Deposit Volume</th>
                    <th className="p-3">20% Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {promoters.map((p) => (
                    <tr key={p.id} className="hover:bg-[#131b2e]/50">
                      <td className="p-3">
                        <span className="font-bold text-white block">@{p.socialUsername}</span>
                        <span className="text-[10px] text-slate-400">{p.phone}</span>
                      </td>
                      <td className="p-3 font-mono font-black text-cyan-400">
                        {p.code}
                      </td>
                      <td className="p-3 font-bold text-white">
                        {p.totalInvited || 0}
                      </td>
                      <td className="p-3 font-mono text-slate-300">
                        ₹{(p.totalDepositsFromInvited || 0).toLocaleString()}
                      </td>
                      <td className="p-3 font-mono font-black text-purple-400 text-sm">
                        ₹{(p.commissionBalance || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LIVE CUSTOMER SUPPORT TAB */}
        {activeTab === 'support' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[550px]">
            {/* Conversation list */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-3 overflow-y-auto">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">User Tickets</h3>
              {supportChats.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">No active support conversations.</p>
              ) : (
                <div className="space-y-1.5">
                  {supportChats.map((c) => (
                    <div
                      key={c.userId}
                      onClick={() => setSelectedChatUser(c)}
                      className={`p-2.5 rounded-xl cursor-pointer text-xs transition flex items-center justify-between ${
                        selectedChatUser?.userId === c.userId
                          ? 'bg-cyan-500/20 border border-cyan-500/50 text-white'
                          : 'bg-[#131b2e] hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div>
                        <span className="font-mono font-bold block">{c.userPhone || c.userId}</span>
                        <span className="text-[10px] text-slate-400 line-clamp-1">
                          {c.messages[c.messages.length - 1]?.text}
                        </span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chat Box */}
            <div className="md:col-span-2 bg-[#0f172a] border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
              {selectedChatUser ? (
                <>
                  <div className="p-3 bg-[#131b2e] border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">Chat with {selectedChatUser.userPhone || selectedChatUser.userId}</span>
                      <p className="text-[10px] text-slate-400">Live manual resolution</p>
                    </div>
                    <button
                      onClick={() => handleDeleteChat(selectedChatUser.userId)}
                      className="p-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-400 text-xs flex items-center space-x-1"
                      title="Delete conversation after customer satisfaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Chat</span>
                    </button>
                  </div>

                  <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
                    {selectedChatUser.messages.map((m) => {
                      const isAdmin = m.sender === 'admin';
                      return (
                        <div key={m.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
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
                  </div>

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
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl flex items-center space-x-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                  Select a user conversation from the left to reply.
                </div>
              )}
            </div>
          </div>
        )}

        {/* PLAYERS TAB */}
        {activeTab === 'users' && (
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
            <h2 className="text-base font-black text-white mb-4">Registered Player Accounts</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#131b2e] text-slate-400 border-b border-slate-800 uppercase">
                  <tr>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Wallet Balance</th>
                    <th className="p-3">Deposited?</th>
                    <th className="p-3">Total In</th>
                    <th className="p-3">Total Out</th>
                    <th className="p-3">Referrer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#131b2e]/50">
                      <td className="p-3 font-mono font-bold text-white">{u.phone}</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">₹{Number(u.walletBalance || 0).toFixed(2)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.hasDeposited ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {u.hasDeposited ? 'YES (Unlocked)' : 'NO (Bonus Lock)'}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-300">₹{u.totalDeposited || 0}</td>
                      <td className="p-3 font-mono text-slate-300">₹{u.totalWithdrawn || 0}</td>
                      <td className="p-3 font-mono text-cyan-400">{u.referredBy || 'Direct'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Screenshot Viewer Modal */}
      {viewScreenshot && (
        <div 
          onClick={() => setViewScreenshot(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-md w-full bg-[#0f172a] rounded-2xl p-4 border border-slate-700">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-white">Payment Proof Screenshot</span>
              <span className="text-xs text-slate-400">Click anywhere to close</span>
            </div>
            <img
              src={viewScreenshot}
              alt="Payment Proof"
              className="w-full max-h-[70vh] object-contain rounded-xl bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
}
