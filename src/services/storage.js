// CRVPER Storage Service — Supabase + localStorage hybrid
// Supabase is the primary store; localStorage is the fast-read cache.
// All writes go to Supabase first, then update local cache.

import { supabase } from './supabase.js';

const STORAGE_KEYS = {
  USERS: 'crvper_users_v1',
  CURRENT_USER: 'crvper_current_user_v1',
  ADMIN_AUTH: 'crvper_admin_auth_v1',
  PROMOTERS: 'crvper_promoters_v1',
  CURRENT_PROMOTER: 'crvper_current_promoter_v1',
  DEPOSITS: 'crvper_deposits_v1',
  WITHDRAWALS: 'crvper_withdrawals_v1',
  ADMIN_SETTINGS: 'crvper_admin_settings_v1',
  SUPPORT_CHATS: 'crvper_support_chats_v1',
  TRANSACTIONS: 'crvper_transactions_v1'
};

// Default QR Code SVG as data URL (Clean modern UPI QR template)
const DEFAULT_UPI_QR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300' width='300' height='300'><rect width='300' height='300' fill='white'/><rect x='25' y='25' width='70' height='70' fill='black'/><rect x='35' y='35' width='50' height='50' fill='white'/><rect x='45' y='45' width='30' height='30' fill='black'/><rect x='205' y='25' width='70' height='70' fill='black'/><rect x='215' y='35' width='50' height='50' fill='white'/><rect x='225' y='45' width='30' height='30' fill='black'/><rect x='25' y='205' width='70' height='70' fill='black'/><rect x='35' y='215' width='50' height='50' fill='white'/><rect x='45' y='225' width='30' height='30' fill='black'/><rect x='110' y='35' width='20' height='50' fill='black'/><rect x='150' y='25' width='30' height='20' fill='black'/><rect x='140' y='60' width='45' height='25' fill='black'/><rect x='25' y='110' width='25' height='70' fill='black'/><rect x='65' y='120' width='30' height='30' fill='black'/><rect x='110' y='110' width='80' height='80' fill='%2300b4d8'/><rect x='125' y='125' width='50' height='50' fill='%230077b6'/><circle cx='150' cy='150' r='16' fill='white'/><polygon points='145,140 157,150 145,160' fill='%230077b6'/><rect x='205' y='110' width='70' height='20' fill='black'/><rect x='230' y='140' width='45' height='45' fill='black'/><rect x='110' y='205' width='40' height='25' fill='black'/><rect x='110' y='245' width='25' height='30' fill='black'/><rect x='150' y='220' width='30' height='55' fill='black'/><rect x='205' y='205' width='25' height='25' fill='black'/><rect x='245' y='205' width='30' height='70' fill='black'/><rect x='205' y='245' width='25' height='30' fill='black'/></svg>";

const DEFAULT_ADMIN_SETTINGS = {
  upiId: 'crvper.pay@upi',
  payeeName: 'CRVPER ENTERTAINMENT PVT LTD',
  qrImageUrl: DEFAULT_UPI_QR,
  minDeposit: 100,
  minWithdraw: 100,
  signupBonus: 150,
  soundModes: {
    deposit: 'default',
    withdraw: 'default',
    login: 'default',
    register: 'default',
    win: 'default',
    loss: 'default',
    cashout: 'default',
    click: 'default'
  }
};

// Seed initial promoter
const INITIAL_PROMOTERS = [
  {
    id: 'promo_1',
    phone: '9988776655',
    socialUsername: 'crvper_vip',
    password: 'promoter@123',
    code: 'CRV777',
    totalInvited: 12,
    totalDepositsFromInvited: 24000,
    commissionBalance: 4800,
    createdAt: new Date().toISOString()
  }
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isSupabaseReady = () => !!supabase;

function broadcastRealtime(event, payload) {
  try {
    import('./realtimeSync.js').then(({ realtimeSync }) => {
      realtimeSync.broadcast(event, payload);
    }).catch(() => {});
  } catch {}
}

// Map Supabase DB row (snake_case) → app user object (camelCase)
function dbUserToApp(row) {
  if (!row) return null;
  return {
    id: row.id,
    phone: row.phone,
    password: row.password,
    walletBalance: Number(row.wallet_balance ?? 150),
    hasDeposited: row.has_deposited ?? false,
    totalDeposited: Number(row.total_deposited ?? 0),
    totalWithdrawn: Number(row.total_withdrawn ?? 0),
    referredBy: row.referred_by ?? null,
    createdAt: row.created_at
  };
}

// Map app user object → Supabase DB row
function appUserToDb(user) {
  return {
    id: user.id,
    phone: user.phone,
    password: user.password,
    wallet_balance: user.walletBalance,
    has_deposited: user.hasDeposited,
    total_deposited: user.totalDeposited,
    total_withdrawn: user.totalWithdrawn,
    referred_by: user.referredBy ?? null,
    created_at: user.createdAt
  };
}

function dbDepositToApp(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    userPhone: row.user_phone,
    amount: Number(row.amount),
    utr: row.utr,
    screenshotUrl: row.screenshot_url,
    promoterCode: row.promoter_code,
    status: row.status,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at
  };
}

function dbWithdrawalToApp(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    userPhone: row.user_phone,
    amount: Number(row.amount),
    upiId: row.upi_id,
    qrUrl: row.qr_url,
    status: row.status,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    rejectedAt: row.rejected_at
  };
}

function dbPromoterToApp(row) {
  if (!row) return null;
  return {
    id: row.id,
    phone: row.phone,
    socialUsername: row.social_username,
    password: row.password,
    code: row.code,
    totalInvited: row.total_invited ?? 0,
    totalDepositsFromInvited: Number(row.total_deposits_from_invited ?? 0),
    commissionBalance: Number(row.commission_balance ?? 0),
    createdAt: row.created_at
  };
}

// ─── Ensure user exists in Supabase before FK-dependent inserts ───────────────
// Silently upserts the user row so deposits/transactions never fail with 23502/23503
async function ensureUserInSupabase(user) {
  if (!isSupabaseReady() || !user) return;
  try {
    await supabase.from('users').upsert(appUserToDb(user), { onConflict: 'id' });
  } catch (e) {
    console.warn('[Supabase] ensureUserInSupabase failed:', e.message);
  }
}

// ─── Storage Service ──────────────────────────────────────────────────────────

export const storage = {

  // ── Admin Settings ──────────────────────────────────────────────────────────

  // Helper: parse qr_image_url which may be a plain data URI or our JSON envelope
  _parseQrEnvelope(raw) {
    if (!raw) return { qrImageUrl: DEFAULT_UPI_QR, soundModes: {}, soundData: {} };
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.qr !== undefined) {
        return {
          qrImageUrl: parsed.qr || DEFAULT_UPI_QR,
          soundModes: parsed.soundModes || {},
          soundData: parsed.soundData || {}
        };
      }
    } catch {}
    // Plain string (legacy — just the QR data URI)
    return { qrImageUrl: raw, soundModes: {}, soundData: {} };
  },

  // Build JSON envelope for storing in qr_image_url
  _buildQrEnvelope(qrImageUrl, soundModes, soundData) {
    return JSON.stringify({
      qr: qrImageUrl || DEFAULT_UPI_QR,
      soundModes: soundModes || {},
      soundData: soundData || {}
    });
  },

  async getAdminSettingsAsync() {
    if (isSupabaseReady()) {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (!error && data) {
        const envelope = this._parseQrEnvelope(data.qr_image_url);
        const settings = {
          upiId: data.upi_id,
          payeeName: data.payee_name,
          qrImageUrl: envelope.qrImageUrl,
          minDeposit: Number(data.min_deposit),
          minWithdraw: Number(data.min_withdraw),
          signupBonus: Number(data.signup_bonus),
          soundModes: envelope.soundModes,
        };
        localStorage.setItem(STORAGE_KEYS.ADMIN_SETTINGS, JSON.stringify(settings));

        // Also sync sound config into soundStorage local cache (direct localStorage write, no import needed)
        try {
          const localConfig = JSON.parse(localStorage.getItem('crvper_sound_config_v3') || '{}');
          const remoteTs = new Date(data.updated_at || 0).getTime();
          if (remoteTs > (localConfig.lastRemoteSync || 0)) {
            const merged = {
              ...localConfig,
              qr: envelope.qrImageUrl,
              soundModes: { ...localConfig.soundModes, ...envelope.soundModes },
              soundData: { ...localConfig.soundData, ...envelope.soundData },
              lastRemoteSync: remoteTs
            };
            localStorage.setItem('crvper_sound_config_v3', JSON.stringify(merged));
            // Fire events for changed sounds
            Object.keys(envelope.soundData || {}).forEach(key => {
              window.dispatchEvent(new CustomEvent('crvper_sound_updated', {
                detail: { key, dataUrl: envelope.soundData[key]?.dataUrl, meta: envelope.soundData[key] }
              }));
            });
            window.dispatchEvent(new CustomEvent('crvper_settings_updated'));
          }
        } catch {}

        return settings;
      }
    }
    return this.getAdminSettings();
  },

  getAdminSettings() {
    const data = localStorage.getItem(STORAGE_KEYS.ADMIN_SETTINGS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_SETTINGS, JSON.stringify(DEFAULT_ADMIN_SETTINGS));
      return DEFAULT_ADMIN_SETTINGS;
    }
    try {
      const parsed = JSON.parse(data);
      // Merge soundModes from soundStorage local cache (highest priority)
      let soundModes = parsed.soundModes || DEFAULT_ADMIN_SETTINGS.soundModes;
      try {
        const sc = JSON.parse(localStorage.getItem('crvper_sound_config_v3') || '{}');
        if (sc.soundModes && Object.keys(sc.soundModes).length > 0) {
          soundModes = { ...soundModes, ...sc.soundModes };
        }
      } catch {}
      return {
        ...DEFAULT_ADMIN_SETTINGS,
        ...parsed,
        soundModes,
        customSounds: {
          ...DEFAULT_ADMIN_SETTINGS.customSounds,
          ...(parsed.customSounds || {})
        }
      };
    } catch {
      return DEFAULT_ADMIN_SETTINGS;
    }
  },

  async updateAdminSettings(newSettings) {
    const current = this.getAdminSettings();
    const updated = { ...current, ...newSettings };
    localStorage.setItem(STORAGE_KEYS.ADMIN_SETTINGS, JSON.stringify(updated));

    if (isSupabaseReady()) {
      // Read the current row directly from Supabase to preserve existing soundData and modes
      const { data: existing } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('id', 1)
        .single();

      let currentQr = updated.qrImageUrl || existing?.qr_image_url || '';
      let soundModes = updated.soundModes || {};
      let soundData = {};

      try {
        const parsed = JSON.parse(existing?.qr_image_url || '{}');
        if (parsed && typeof parsed === 'object') {
          if (!newSettings.qrImageUrl && parsed.qr) currentQr = parsed.qr;
          soundModes = { ...(parsed.soundModes || {}), ...soundModes };
          soundData = parsed.soundData || {};
        }
      } catch {}

      const envelope = this._buildQrEnvelope(currentQr, soundModes, soundData);

      await supabase.from('admin_settings').upsert({
        id: 1,
        upi_id: updated.upiId || existing?.upi_id || 'crvper@ibl',
        payee_name: updated.payeeName || existing?.payee_name || 'CRVPER.BET PVT LTD',
        qr_image_url: envelope,
        min_deposit: Number(updated.minDeposit ?? existing?.min_deposit ?? 100),
        min_withdraw: Number(updated.minWithdraw ?? existing?.min_withdraw ?? 100),
        signup_bonus: Number(updated.signupBonus ?? existing?.signup_bonus ?? 150),
        updated_at: new Date().toISOString()
      });
    }

    broadcastRealtime('settings_updated', updated);
    window.dispatchEvent(new Event('crvper_settings_updated'));
    return updated;
  },

  // ── Users & Wallet ──────────────────────────────────────────────────────────

  getUsers() {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },

  saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  async getUsersAsync() {
    if (isSupabaseReady()) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        const mapped = data.map(dbUserToApp);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(mapped));
        return mapped;
      }
    }
    return this.getUsers();
  },

  async refreshCurrentUserFromSupabase() {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !isSupabaseReady()) return currentUser;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();
      if (!error && data) {
        const freshUser = dbUserToApp(data);
        const users = this.getUsers();
        const idx = users.findIndex(u => u.id === freshUser.id);
        if (idx !== -1) users[idx] = freshUser; else users.push(freshUser);
        this.saveUsers(users);
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(freshUser));
        window.dispatchEvent(new Event('crvper_user_updated'));
        return freshUser;
      }
    } catch (e) {
      console.warn('[Storage] refreshCurrentUserFromSupabase error:', e);
    }
    return currentUser;
  },

  getCurrentUser() {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  setCurrentUser(user) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      const users = this.getUsers();
      const idx = users.findIndex(u => u.id === user.id);
      if (idx !== -1) users[idx] = user;
      else users.push(user);
      this.saveUsers(users);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    window.dispatchEvent(new Event('crvper_user_updated'));
  },

  async registerUser({ phone, password, inviteCode }) {
    const cleanPhone = String(phone || '').replace(/\D/g, '').trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    const users = this.getUsers();
    if (users.find(u => String(u.phone).replace(/\D/g, '').trim() === cleanPhone)) {
      throw new Error('This phone number is already registered. Please log in.');
    }

    // Check Supabase too
    if (isSupabaseReady()) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('phone', cleanPhone)
        .maybeSingle();
      if (existing) throw new Error('This phone number is already registered. Please log in.');
    }

    // Check promoter code
    let validPromoCode = null;
    if (inviteCode && inviteCode.trim()) {
      const codeClean = inviteCode.trim().toUpperCase();
      const promoters = this.getPromoters();
      const matchedPromo = promoters.find(p => p.code.toUpperCase() === codeClean);
      if (matchedPromo) {
        validPromoCode = matchedPromo.code;
        matchedPromo.totalInvited = (matchedPromo.totalInvited || 0) + 1;
        this.savePromoters(promoters);
        if (isSupabaseReady()) {
          await supabase
            .from('promoters')
            .update({ total_invited: matchedPromo.totalInvited })
            .eq('id', matchedPromo.id);
        }
      }
    }

    const newUser = {
      id: 'usr_' + Date.now() + Math.random().toString(36).substring(2, 6),
      phone,
      password,
      walletBalance: 150.00,
      hasDeposited: false,
      totalDeposited: 0,
      totalWithdrawn: 0,
      referredBy: validPromoCode,
      createdAt: new Date().toISOString()
    };

    // Save to Supabase
    if (isSupabaseReady()) {
      const { error } = await supabase.from('users').insert(appUserToDb(newUser));
      if (error) console.error('[Supabase] registerUser error:', error.message);
    }

    users.push(newUser);
    this.saveUsers(users);
    this.setCurrentUser(newUser);

    await this.addTransaction({
      userId: newUser.id,
      type: 'BONUS',
      amount: 150,
      description: 'Signup Welcome Bonus',
      status: 'COMPLETED'
    });

    return newUser;
  },

  async loginUser(phone, password) {
    // Try Supabase first
    if (isSupabaseReady()) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .eq('password', password)
        .maybeSingle();

      if (!error && data) {
        const user = dbUserToApp(data);
        // Sync to local cache
        const users = this.getUsers();
        const idx = users.findIndex(u => u.id === user.id);
        if (idx !== -1) users[idx] = user; else users.push(user);
        this.saveUsers(users);
        this.setCurrentUser(user);
        return user;
      }
    }

    // Fallback to localStorage
    const users = this.getUsers();
    const user = users.find(u => u.phone === phone && u.password === password);
    if (!user) throw new Error('Invalid phone number or password');
    this.setCurrentUser(user);
    return user;
  },

  async updateWalletBalance(userId, deltaAmount, reason = 'Game Activity') {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return null;

    const currentBalance = Number(users[idx].walletBalance || 0);
    const newBalance = Math.max(0, Number((currentBalance + deltaAmount).toFixed(2)));
    users[idx].walletBalance = newBalance;
    this.saveUsers(users);

    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      currentUser.walletBalance = newBalance;
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      window.dispatchEvent(new CustomEvent('crvper_wallet_delta', {
        detail: { newBalance, deltaAmount, reason }
      }));
    }

    // Sync to Supabase (fire and forget — don't block gameplay)
    if (isSupabaseReady()) {
      supabase
        .from('users')
        .update({ wallet_balance: newBalance })
        .eq('id', userId)
        .then(({ error }) => {
          if (error) console.error('[Supabase] wallet update error:', error.message);
        });
    }

    return newBalance;
  },

  // ── Transactions ────────────────────────────────────────────────────────────

  getTransactions(userId = null) {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const all = data ? JSON.parse(data) : [];
    if (userId) return all.filter(t => t.userId === userId).reverse();
    return all.reverse();
  },

  async getTransactionsAsync(userId = null) {
    if (isSupabaseReady()) {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('timestamp', { ascending: false });
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (!error && data) {
        return data.map(row => ({
          id: row.id,
          userId: row.user_id,
          type: row.type,
          amount: Number(row.amount),
          description: row.description,
          status: row.status,
          timestamp: row.timestamp
        }));
      }
    }
    return this.getTransactions(userId);
  },

  async addTransaction(tx) {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const all = data ? JSON.parse(data) : [];
    const newTx = {
      id: 'tx_' + Date.now() + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toISOString(),
      ...tx
    };
    all.push(newTx);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(all));

    if (isSupabaseReady()) {
      supabase.from('transactions').insert({
        id: newTx.id,
        user_id: newTx.userId,
        type: newTx.type,
        amount: newTx.amount,
        description: newTx.description,
        status: newTx.status,
        timestamp: newTx.timestamp
      }).then(({ error }) => {
        if (error) console.error('[Supabase] addTransaction error:', error.message);
      });
    }

    return newTx;
  },

  // ── Deposits ────────────────────────────────────────────────────────────────

  getDeposits() {
    const data = localStorage.getItem(STORAGE_KEYS.DEPOSITS);
    return data ? JSON.parse(data) : [];
  },

  async getDepositsAsync() {
    if (isSupabaseReady()) {
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        const mapped = data.map(dbDepositToApp);
        localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(mapped));
        return mapped;
      }
    }
    return this.getDeposits();
  },

  async createDepositRequest({ userId, userPhone, amount, utr, screenshotUrl, promoterCode }) {
    const newReq = {
      id: 'dep_' + Date.now(),
      userId,
      userPhone,
      amount: Number(amount),
      utr: utr || 'N/A',
      screenshotUrl: screenshotUrl || null,
      promoterCode: promoterCode || null,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    // Guarantee the user exists in Supabase before inserting (FK guard)
    const currentUser = this.getCurrentUser();
    await ensureUserInSupabase(currentUser);

    // Save to Supabase
    if (isSupabaseReady()) {
      const { error } = await supabase.from('deposits').insert({
        id: newReq.id,
        user_id: newReq.userId,
        user_phone: newReq.userPhone,
        amount: newReq.amount,
        utr: newReq.utr,
        screenshot_url: newReq.screenshotUrl,
        promoter_code: newReq.promoterCode,
        status: 'PENDING',
        created_at: newReq.createdAt
      });
      if (error) {
        console.error('[Supabase] createDepositRequest error:', error.message);
        throw new Error(error.message);
      }
    }

    // Local cache
    const deposits = this.getDeposits();
    deposits.push(newReq);
    localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(deposits));

    await this.addTransaction({
      userId,
      type: 'DEPOSIT',
      amount: Number(amount),
      description: `UPI Deposit (UTR: ${utr || 'Pending'})`,
      status: 'PENDING'
    });

    window.dispatchEvent(new Event('crvper_deposit_submitted'));
    broadcastRealtime('deposit_created', { depositId: newReq.id, userId, amount: newReq.amount });
    return newReq;
  },

  async approveDeposit(depositId) {
    const deposits = await this.getDepositsAsync();
    const dep = deposits.find(d => d.id === depositId);
    if (!dep || dep.status !== 'PENDING') return;

    const now = new Date().toISOString();

    // Update Supabase
    if (isSupabaseReady()) {
      const { error } = await supabase
        .from('deposits')
        .update({ status: 'APPROVED', approved_at: now })
        .eq('id', depositId);
      if (error) console.error('[Supabase] approveDeposit error:', error.message);
    }

    // Update local cache
    dep.status = 'APPROVED';
    dep.approvedAt = now;
    localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(deposits));

    // Credit wallet
    const users = this.getUsers();
    const uIdx = users.findIndex(u => u.id === dep.userId);
    if (uIdx !== -1) {
      users[uIdx].walletBalance = Number((users[uIdx].walletBalance + dep.amount).toFixed(2));
      const totalDep = Number(((users[uIdx].totalDeposited || 0) + dep.amount).toFixed(2));
      users[uIdx].totalDeposited = totalDep;
      // Compulsory deposit rule: Depositing minimum ₹100 unlocks withdrawals
      if (totalDep >= 100 || dep.amount >= 100) {
        users[uIdx].hasDeposited = true;
      }
      this.saveUsers(users);

      // Supabase user update
      if (isSupabaseReady()) {
        await supabase.from('users').update({
          wallet_balance: users[uIdx].walletBalance,
          has_deposited: users[uIdx].hasDeposited,
          total_deposited: users[uIdx].totalDeposited
        }).eq('id', dep.userId);
      }

      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.id === dep.userId) {
        currentUser.walletBalance = users[uIdx].walletBalance;
        currentUser.hasDeposited = true;
        currentUser.totalDeposited = users[uIdx].totalDeposited;
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
        window.dispatchEvent(new Event('crvper_user_updated'));
      }
    }

    // Promoter commission (20%)
    const promoCode = dep.promoterCode || (users[uIdx] && users[uIdx].referredBy);
    if (promoCode) {
      const promoters = this.getPromoters();
      const pIdx = promoters.findIndex(p => p.code.toUpperCase() === promoCode.toUpperCase());
      if (pIdx !== -1) {
        const commission = Number((dep.amount * 0.20).toFixed(2));
        promoters[pIdx].commissionBalance = (promoters[pIdx].commissionBalance || 0) + commission;
        promoters[pIdx].totalDepositsFromInvited = (promoters[pIdx].totalDepositsFromInvited || 0) + dep.amount;
        this.savePromoters(promoters);

        if (isSupabaseReady()) {
          await supabase.from('promoters').update({
            commission_balance: promoters[pIdx].commissionBalance,
            total_deposits_from_invited: promoters[pIdx].totalDepositsFromInvited
          }).eq('id', promoters[pIdx].id);
        }

        const currentPromo = this.getCurrentPromoter();
        if (currentPromo && currentPromo.id === promoters[pIdx].id) {
          currentPromo.commissionBalance = promoters[pIdx].commissionBalance;
          currentPromo.totalDepositsFromInvited = promoters[pIdx].totalDepositsFromInvited;
          localStorage.setItem(STORAGE_KEYS.CURRENT_PROMOTER, JSON.stringify(currentPromo));
          window.dispatchEvent(new Event('crvper_promoter_updated'));
        }
      }
    }

    await this.addTransaction({
      userId: dep.userId,
      type: 'DEPOSIT',
      amount: dep.amount,
      description: `Deposit Approved (₹${dep.amount})`,
      status: 'COMPLETED'
    });

    broadcastRealtime('deposit_updated', {
      depositId: dep.id,
      userId: dep.userId,
      status: 'APPROVED',
      amount: dep.amount
    });
    window.dispatchEvent(new Event('crvper_deposits_updated'));
  },

  async rejectDeposit(depositId, reason = 'Verification Failed') {
    const deposits = await this.getDepositsAsync();
    const dep = deposits.find(d => d.id === depositId);
    if (!dep || dep.status !== 'PENDING') return;

    const now = new Date().toISOString();

    if (isSupabaseReady()) {
      await supabase.from('deposits').update({
        status: 'REJECTED',
        rejection_reason: reason,
        rejected_at: now
      }).eq('id', depositId);
    }

    dep.status = 'REJECTED';
    dep.rejectionReason = reason;
    dep.rejectedAt = now;
    localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(deposits));

    await this.addTransaction({
      userId: dep.userId,
      type: 'DEPOSIT',
      amount: dep.amount,
      description: `Deposit Declined: ${reason}`,
      status: 'REJECTED'
    });

    broadcastRealtime('deposit_updated', {
      depositId: dep.id,
      userId: dep.userId,
      status: 'REJECTED',
      reason
    });
    window.dispatchEvent(new Event('crvper_deposits_updated'));
  },

  // ── Withdrawals ─────────────────────────────────────────────────────────────

  getWithdrawals() {
    const data = localStorage.getItem(STORAGE_KEYS.WITHDRAWALS);
    return data ? JSON.parse(data) : [];
  },

  async getWithdrawalsAsync() {
    if (isSupabaseReady()) {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        const mapped = data.map(dbWithdrawalToApp);
        localStorage.setItem(STORAGE_KEYS.WITHDRAWALS, JSON.stringify(mapped));
        return mapped;
      }
    }
    return this.getWithdrawals();
  },

  async createWithdrawalRequest({ userId, userPhone, amount, upiId, qrUrl }) {
    const user = this.getCurrentUser();
    if (!user) throw new Error('You must be logged in.');

    // Compulsory rule: must have deposited a minimum of ₹100 to unlock withdrawals
    const isUnlocked = Boolean(user.hasDeposited || Number(user.totalDeposited || 0) >= 100);
    if (!isUnlocked) throw new Error('COMPULSORY_DEPOSIT_REQUIRED');

    if (amount < 100) throw new Error('Minimum withdrawal amount is ₹100.');
    if (user.walletBalance < amount) throw new Error('Insufficient wallet balance!');

    await this.updateWalletBalance(userId, -amount, 'Withdrawal Hold');

    const newReq = {
      id: 'wth_' + Date.now(),
      userId,
      userPhone,
      amount: Number(amount),
      upiId: upiId || 'QR Uploaded',
      qrUrl: qrUrl || null,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    if (isSupabaseReady()) {
      await ensureUserInSupabase(user);
      const { error } = await supabase.from('withdrawals').insert({
        id: newReq.id,
        user_id: newReq.userId,
        user_phone: newReq.userPhone,
        amount: newReq.amount,
        upi_id: newReq.upiId,
        qr_url: newReq.qrUrl,
        status: 'PENDING',
        created_at: newReq.createdAt
      });
      if (error) console.error('[Supabase] createWithdrawalRequest error:', error.message);
    }

    const withdrawals = this.getWithdrawals();
    withdrawals.push(newReq);
    localStorage.setItem(STORAGE_KEYS.WITHDRAWALS, JSON.stringify(withdrawals));

    await this.addTransaction({
      userId,
      type: 'WITHDRAW',
      amount: Number(amount),
      description: `Withdrawal Request to ${upiId || 'UPI QR'}`,
      status: 'PENDING'
    });

    window.dispatchEvent(new Event('crvper_withdrawals_updated'));
    broadcastRealtime('withdrawal_created', { withdrawalId: newReq.id, userId, amount: newReq.amount });
    return newReq;
  },

  async approveWithdrawal(withdrawalId) {
    const withdrawals = await this.getWithdrawalsAsync();
    const wth = withdrawals.find(w => w.id === withdrawalId);
    if (!wth || wth.status !== 'PENDING') return;

    const now = new Date().toISOString();

    if (isSupabaseReady()) {
      await supabase.from('withdrawals').update({
        status: 'COMPLETED',
        completed_at: now
      }).eq('id', withdrawalId);
    }

    wth.status = 'COMPLETED';
    wth.completedAt = now;
    localStorage.setItem(STORAGE_KEYS.WITHDRAWALS, JSON.stringify(withdrawals));

    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === wth.userId);
    if (idx !== -1) {
      users[idx].totalWithdrawn = (users[idx].totalWithdrawn || 0) + wth.amount;
      this.saveUsers(users);
      if (isSupabaseReady()) {
        await supabase.from('users').update({
          total_withdrawn: users[idx].totalWithdrawn
        }).eq('id', wth.userId);
      }
    }

    await this.addTransaction({
      userId: wth.userId,
      type: 'WITHDRAW',
      amount: wth.amount,
      description: `Withdrawal Transferred (₹${wth.amount})`,
      status: 'COMPLETED'
    });

    broadcastRealtime('withdrawal_updated', {
      withdrawalId,
      userId: wth.userId,
      status: 'COMPLETED'
    });
    window.dispatchEvent(new Event('crvper_withdrawals_updated'));
  },

  async rejectWithdrawal(withdrawalId, reason = 'Bank details invalid') {
    const withdrawals = await this.getWithdrawalsAsync();
    const wth = withdrawals.find(w => w.id === withdrawalId);
    if (!wth || wth.status !== 'PENDING') return;

    const now = new Date().toISOString();

    if (isSupabaseReady()) {
      await supabase.from('withdrawals').update({
        status: 'REJECTED',
        rejection_reason: reason,
        rejected_at: now
      }).eq('id', withdrawalId);
    }

    wth.status = 'REJECTED';
    wth.rejectionReason = reason;
    wth.rejectedAt = now;
    localStorage.setItem(STORAGE_KEYS.WITHDRAWALS, JSON.stringify(withdrawals));

    // Refund
    await this.updateWalletBalance(wth.userId, wth.amount, 'Withdrawal Refund');

    await this.addTransaction({
      userId: wth.userId,
      type: 'REFUND',
      amount: wth.amount,
      description: `Withdrawal Refunded (${reason})`,
      status: 'COMPLETED'
    });

    broadcastRealtime('withdrawal_updated', {
      withdrawalId,
      userId: wth.userId,
      status: 'REJECTED',
      reason
    });
    window.dispatchEvent(new Event('crvper_withdrawals_updated'));
  },

  // ── Promoters ───────────────────────────────────────────────────────────────

  getPromoters() {
    const data = localStorage.getItem(STORAGE_KEYS.PROMOTERS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.PROMOTERS, JSON.stringify(INITIAL_PROMOTERS));
      return INITIAL_PROMOTERS;
    }
    return JSON.parse(data);
  },

  async getPromotersAsync() {
    if (isSupabaseReady()) {
      const { data, error } = await supabase
        .from('promoters')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        const mapped = data.map(dbPromoterToApp);
        localStorage.setItem(STORAGE_KEYS.PROMOTERS, JSON.stringify(mapped));
        return mapped;
      }
    }
    return this.getPromoters();
  },

  savePromoters(promoters) {
    localStorage.setItem(STORAGE_KEYS.PROMOTERS, JSON.stringify(promoters));
  },

  getCurrentPromoter() {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_PROMOTER);
    return data ? JSON.parse(data) : null;
  },

  setCurrentPromoter(promoter) {
    if (promoter) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_PROMOTER, JSON.stringify(promoter));
      const promoters = this.getPromoters();
      const idx = promoters.findIndex(p => p.id === promoter.id);
      if (idx !== -1) promoters[idx] = promoter;
      else promoters.push(promoter);
      this.savePromoters(promoters);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_PROMOTER);
    }
    window.dispatchEvent(new Event('crvper_promoter_updated'));
  },

  async registerPromoter({ phone, socialUsername, password }) {
    const promoters = this.getPromoters();
    if (promoters.find(p => p.phone === phone)) {
      throw new Error('A promoter with this phone number already exists!');
    }

    const cleanHandle = socialUsername.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 5) || 'CRV';
    const uniqueCode = `${cleanHandle}${Math.floor(100 + Math.random() * 900)}`;

    const newPromoter = {
      id: 'prm_' + Date.now(),
      phone,
      socialUsername,
      password,
      code: uniqueCode,
      totalInvited: 0,
      totalDepositsFromInvited: 0,
      commissionBalance: 0,
      createdAt: new Date().toISOString()
    };

    if (isSupabaseReady()) {
      const { error } = await supabase.from('promoters').insert({
        id: newPromoter.id,
        phone: newPromoter.phone,
        social_username: newPromoter.socialUsername,
        password: newPromoter.password,
        code: newPromoter.code,
        total_invited: 0,
        total_deposits_from_invited: 0,
        commission_balance: 0,
        created_at: newPromoter.createdAt
      });
      if (error) console.error('[Supabase] registerPromoter error:', error.message);
    }

    promoters.push(newPromoter);
    this.savePromoters(promoters);
    this.setCurrentPromoter(newPromoter);
    return newPromoter;
  },

  async loginPromoter(phone, password) {
    if (isSupabaseReady()) {
      const { data, error } = await supabase
        .from('promoters')
        .select('*')
        .eq('phone', phone)
        .eq('password', password)
        .maybeSingle();
      if (!error && data) {
        const p = dbPromoterToApp(data);
        const promoters = this.getPromoters();
        const idx = promoters.findIndex(pr => pr.id === p.id);
        if (idx !== -1) promoters[idx] = p; else promoters.push(p);
        this.savePromoters(promoters);
        this.setCurrentPromoter(p);
        return p;
      }
    }
    const promoters = this.getPromoters();
    const p = promoters.find(item => item.phone === phone && item.password === password);
    if (!p) throw new Error('Invalid promoter credentials');
    this.setCurrentPromoter(p);
    return p;
  },

  // ── Support Chats ───────────────────────────────────────────────────────────

  getSupportChats() {
    const data = localStorage.getItem(STORAGE_KEYS.SUPPORT_CHATS);
    return data ? JSON.parse(data) : [];
  },

  getUserChat(userId) {
    const chats = this.getSupportChats();
    let chat = chats.find(c => c.userId === userId);
    if (!chat) {
      chat = {
        userId,
        messages: [
          {
            id: 'm1',
            sender: 'admin',
            text: 'Hello! Welcome to CRVPER 24/7 VIP Customer Support. How can we assist your gaming experience today?',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ],
        status: 'OPEN',
        updatedAt: new Date().toISOString()
      };
      chats.push(chat);
      localStorage.setItem(STORAGE_KEYS.SUPPORT_CHATS, JSON.stringify(chats));
    }
    return chat;
  },

  async getUserChatAsync(userId) {
    if (isSupabaseReady() && userId) {
      try {
        const { data, error } = await supabase
          .from('support_chats')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (!error && data) {
          const chat = {
            id: data.id,
            userId: data.user_id,
            userPhone: data.user_phone,
            messages: data.messages || [],
            status: data.status,
            updatedAt: data.updated_at
          };
          const chats = this.getSupportChats();
          const idx = chats.findIndex(c => c.userId === userId);
          if (idx !== -1) chats[idx] = chat; else chats.push(chat);
          localStorage.setItem(STORAGE_KEYS.SUPPORT_CHATS, JSON.stringify(chats));
          return chat;
        }
      } catch (e) {
        console.warn('[Storage] getUserChatAsync error:', e);
      }
    }
    return this.getUserChat(userId);
  },

  async getSupportChatsAsync() {
    if (isSupabaseReady()) {
      try {
        const { data, error } = await supabase
          .from('support_chats')
          .select('*')
          .order('updated_at', { ascending: false });
        if (!error && data) {
          const mapped = data.map(row => ({
            id: row.id,
            userId: row.user_id,
            userPhone: row.user_phone,
            messages: row.messages || [],
            status: row.status,
            updatedAt: row.updated_at
          }));
          localStorage.setItem(STORAGE_KEYS.SUPPORT_CHATS, JSON.stringify(mapped));
          return mapped;
        }
      } catch (e) {
        console.warn('[Storage] getSupportChatsAsync error:', e);
      }
    }
    return this.getSupportChats();
  },

  async sendSupportMessage(userId, userPhone, text, sender = 'user') {
    // Foreign key safety: Ensure user exists in Supabase before saving chat
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      await ensureUserInSupabase(currentUser);
    } else if (userId) {
      const users = this.getUsers();
      const targetUser = users.find(u => u.id === userId);
      if (targetUser) await ensureUserInSupabase(targetUser);
    }

    const chats = this.getSupportChats();
    let chat = chats.find(c => c.userId === userId);
    const msg = {
      id: 'msg_' + Date.now(),
      sender,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    let allMessages = [];
    if (!chat) {
      allMessages = [
        {
          id: 'm1',
          sender: 'admin',
          text: 'Hello! Welcome to CRVPER 24/7 VIP Customer Support. How can we assist your gaming experience today?',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        msg
      ];
      chat = {
        userId,
        userPhone,
        messages: allMessages,
        status: 'OPEN',
        updatedAt: new Date().toISOString()
      };
      chats.push(chat);
    } else {
      chat.userPhone = userPhone || chat.userPhone;
      chat.messages.push(msg);
      allMessages = chat.messages;
      chat.status = 'OPEN';
      chat.updatedAt = new Date().toISOString();
    }

    localStorage.setItem(STORAGE_KEYS.SUPPORT_CHATS, JSON.stringify(chats));

    // Save to Supabase without invalid onConflict specification
    if (isSupabaseReady()) {
      try {
        const { data: existing } = await supabase
          .from('support_chats')
          .select('id, messages')
          .eq('user_id', userId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('support_chats')
            .update({
              messages: allMessages,
              user_phone: userPhone || chat.userPhone,
              status: 'OPEN',
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('support_chats')
            .insert({
              user_id: userId,
              user_phone: userPhone || chat.userPhone,
              messages: allMessages,
              status: 'OPEN',
              updated_at: new Date().toISOString()
            });
        }
      } catch (err) {
        console.warn('[Storage] sendSupportMessage error:', err);
      }
    }

    broadcastRealtime('support_message', {
      userId,
      userPhone: userPhone || chat.userPhone,
      message: msg,
      sender
    });

    window.dispatchEvent(new CustomEvent('crvper_support_updated', {
      detail: { userId, message: msg, sender }
    }));
    return chat;
  },

  async deleteChat(userId) {
    let chats = this.getSupportChats();
    chats = chats.filter(c => c.userId !== userId);
    localStorage.setItem(STORAGE_KEYS.SUPPORT_CHATS, JSON.stringify(chats));

    if (isSupabaseReady()) {
      try {
        await supabase.from('support_chats').delete().eq('user_id', userId);
      } catch (e) {
        console.warn('[Storage] deleteChat error:', e);
      }
    }

    broadcastRealtime('support_chat_deleted', { userId });
    window.dispatchEvent(new CustomEvent('crvper_support_updated', {
      detail: { userId, deleted: true }
    }));
  }
};
