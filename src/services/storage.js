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
  promoActive: true,
  minQualifyingDeposit: 100,
  wageringPercentage: 50, // 50%
  aviatorWingoLimitMultiplier: 3.0, // 3x threshold on qualifying deposit
  eligibleGames: ['Aviator', 'WinGo', 'Mines', 'Quantum Dice', 'Plinko', 'Neon Tower'],
  auditLogs: [],
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

function safeStorageSet(key, value) {
  // Use globalThis.localStorage directly so this works in both browser (real window.localStorage)
  // and Node.js test environments (where globalThis.localStorage is mocked but window.localStorage may not be set)
  const ls = globalThis.localStorage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!ls) return;
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  try {
    localStorage.setItem(key, str);
  } catch (err) {
    console.warn(`[LocalStorage] safeStorageSet quota handled for "${key}":`, err.message);
    try {
      if (Array.isArray(value)) {
        const lightweight = value.map(item => {
          if (!item || typeof item !== 'object') return item;
          const copy = { ...item };
          if (copy.screenshotUrl && copy.screenshotUrl.length > 500) {
            copy.screenshotUrl = '[Uploaded Cloud Proof]';
          }
          if (copy.qrUrl && copy.qrUrl.length > 500) {
            copy.qrUrl = '[Uploaded Cloud QR]';
          }
          return copy;
        });
        localStorage.setItem(key, JSON.stringify(lightweight.slice(-25)));
      }
    } catch (_) {}
  }
}

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

  // Retrieve cached local fields if available to preserve sub-balance separation
  let cached = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (raw) {
      const all = JSON.parse(raw);
      cached = all.find(u => u.id === row.id);
    }
  } catch {}

  const walletBalance = Number(row.wallet_balance ?? 150);
  const totalDeposited = Number(row.total_deposited ?? 0);
  const hasDeposited = Boolean(row.has_deposited ?? (totalDeposited >= 100));

  let depositBalance = cached?.depositBalance;
  let bonusBalance = cached?.bonusBalance;
  let winningsBalance = cached?.winningsBalance;
  let bonusClaimed = cached?.bonusClaimed ?? true;
  let wageringRequired = cached?.wageringRequired;
  let wageringWagered = cached?.wageringWagered ?? 0;
  let qualifyingDeposit = cached?.qualifyingDeposit ?? totalDeposited;

  if (depositBalance === undefined || bonusBalance === undefined || winningsBalance === undefined) {
    if (totalDeposited > 0) {
      depositBalance = Math.min(walletBalance, totalDeposited);
      bonusBalance = 0;
      winningsBalance = Math.max(0, walletBalance - depositBalance);
    } else {
      bonusBalance = Math.min(walletBalance, 150);
      depositBalance = 0;
      winningsBalance = Math.max(0, walletBalance - bonusBalance);
    }
  }

  if (wageringRequired === undefined) {
    wageringRequired = Number(((bonusBalance * 0.5) + (qualifyingDeposit * 0.5)).toFixed(2));
  }

  const wageringRemaining = Math.max(0, Number((wageringRequired - wageringWagered).toFixed(2)));

  return {
    id: row.id,
    phone: row.phone,
    password: row.password,
    walletBalance,
    depositBalance: Number(depositBalance.toFixed(2)),
    bonusBalance: Number(bonusBalance.toFixed(2)),
    winningsBalance: Number(winningsBalance.toFixed(2)),
    bonusClaimed,
    wageringRequired: Number(wageringRequired.toFixed(2)),
    wageringWagered: Number(wageringWagered.toFixed(2)),
    wageringRemaining,
    qualifyingDeposit: Number(qualifyingDeposit.toFixed(2)),
    hasDeposited,
    totalDeposited,
    totalWithdrawn: Number(row.total_withdrawn ?? 0),
    referredBy: row.referred_by ?? null,
    createdAt: row.created_at
  };
}

// Map app user object → Supabase DB row
function appUserToDb(user) {
  const cleanPhone = String(user.phone || '').replace(/\D/g, '').trim() || user.phone;
  return {
    id: user.id,
    phone: cleanPhone,
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
// Heals ID mismatches and guarantees foreign keys never fail with 23503
async function ensureUserInSupabase(user) {
  if (!isSupabaseReady() || !user) return user;
  try {
    const cleanPhone = String(user.phone || '').replace(/\D/g, '').trim();

    // 1. Check if user already exists by exact ID
    if (user.id) {
      const { data: byId } = await supabase
        .from('users')
        .select('id, phone')
        .eq('id', user.id)
        .maybeSingle();

      if (byId) {
        return user;
      }
    }

    // 2. Check if user exists by phone in Supabase (resolves ID divergence)
    if (cleanPhone) {
      const { data: byPhone } = await supabase
        .from('users')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (byPhone) {
        user.id = byPhone.id;
        user.phone = byPhone.phone;

        // Sync aligned ID to local cache
        const rawUsers = localStorage.getItem(STORAGE_KEYS.USERS);
        if (rawUsers) {
          try {
            const users = JSON.parse(rawUsers);
            const idx = users.findIndex(u => String(u.phone).replace(/\D/g, '').trim() === cleanPhone || u.id === byPhone.id);
            if (idx !== -1) {
              users[idx].id = byPhone.id;
              localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
            }
          } catch {}
        }
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        return user;
      }
    }

    // 3. User does not exist in Supabase yet — insert new record
    const dbPayload = appUserToDb(user);
    if (cleanPhone) dbPayload.phone = cleanPhone;

    const { data: inserted, error: insertErr } = await supabase
      .from('users')
      .upsert(dbPayload, { onConflict: 'id' })
      .select('id, phone')
      .maybeSingle();

    if (!insertErr && inserted?.id) {
      user.id = inserted.id;
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    }

    if (insertErr && cleanPhone) {
      console.warn('[Supabase] ensureUserInSupabase insert notice:', insertErr.message);
      // If error was unique phone constraint, retrieve existing row ID
      const { data: conflictRow } = await supabase
        .from('users')
        .select('id, phone')
        .eq('phone', cleanPhone)
        .maybeSingle();
      if (conflictRow?.id) {
        user.id = conflictRow.id;
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        return user;
      }
    }
  } catch (e) {
    console.warn('[Supabase] ensureUserInSupabase exception:', e.message);
  }
  return user;
}

// ─── Storage Service ──────────────────────────────────────────────────────────

export const storage = {

  // ── Admin Settings ──────────────────────────────────────────────────────────

  // Helper: parse qr_image_url which may be a plain data URI or our JSON envelope
  _parseQrEnvelope(raw) {
    if (!raw) return { qrImageUrl: DEFAULT_UPI_QR, soundModes: {}, soundData: {}, promotions: {}, auditLogs: [] };
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.qr !== undefined) {
        return {
          qrImageUrl: parsed.qr || DEFAULT_UPI_QR,
          soundModes: parsed.soundModes || {},
          soundData: parsed.soundData || {},
          promotions: parsed.promotions || {},
          auditLogs: parsed.auditLogs || []
        };
      }
    } catch {}
    // Plain string (legacy — just the QR data URI)
    return { qrImageUrl: raw, soundModes: {}, soundData: {}, promotions: {}, auditLogs: [] };
  },

  // Build JSON envelope for storing in qr_image_url
  _buildQrEnvelope(qrImageUrl, soundModes, soundData, promotions = {}, auditLogs = []) {
    return JSON.stringify({
      qr: qrImageUrl || DEFAULT_UPI_QR,
      soundModes: soundModes || {},
      soundData: soundData || {},
      promotions: promotions || {},
      auditLogs: auditLogs || []
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
          ...DEFAULT_ADMIN_SETTINGS,
          upiId: data.upi_id,
          payeeName: data.payee_name,
          qrImageUrl: envelope.qrImageUrl,
          minDeposit: Number(data.min_deposit),
          minWithdraw: Number(data.min_withdraw),
          signupBonus: Number(data.signup_bonus),
          promoActive: envelope.promotions?.promoActive !== undefined ? Boolean(envelope.promotions.promoActive) : DEFAULT_ADMIN_SETTINGS.promoActive,
          minQualifyingDeposit: Number(envelope.promotions?.minQualifyingDeposit ?? DEFAULT_ADMIN_SETTINGS.minQualifyingDeposit),
          wageringPercentage: Number(envelope.promotions?.wageringPercentage ?? DEFAULT_ADMIN_SETTINGS.wageringPercentage),
          aviatorWingoLimitMultiplier: Number(envelope.promotions?.aviatorWingoLimitMultiplier ?? DEFAULT_ADMIN_SETTINGS.aviatorWingoLimitMultiplier),
          eligibleGames: envelope.promotions?.eligibleGames || DEFAULT_ADMIN_SETTINGS.eligibleGames,
          auditLogs: envelope.auditLogs || [],
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
      let promotions = {
        promoActive: updated.promoActive ?? true,
        minQualifyingDeposit: updated.minQualifyingDeposit ?? 100,
        wageringPercentage: updated.wageringPercentage ?? 50,
        aviatorWingoLimitMultiplier: updated.aviatorWingoLimitMultiplier ?? 3.0,
        eligibleGames: updated.eligibleGames || DEFAULT_ADMIN_SETTINGS.eligibleGames
      };
      let auditLogs = updated.auditLogs || [];

      try {
        const parsed = JSON.parse(existing?.qr_image_url || '{}');
        if (parsed && typeof parsed === 'object') {
          if (!newSettings.qrImageUrl && parsed.qr) currentQr = parsed.qr;
          soundModes = { ...(parsed.soundModes || {}), ...soundModes };
          soundData = parsed.soundData || {};
          promotions = { ...(parsed.promotions || {}), ...promotions };
          auditLogs = updated.auditLogs || parsed.auditLogs || [];
        }
      } catch {}

      const envelope = this._buildQrEnvelope(currentQr, soundModes, soundData, promotions, auditLogs);

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

  async logAdminSettingChange(adminUser = 'crvvper (Admin)', settingKey, previousValue, newValue) {
    const currentSettings = this.getAdminSettings();
    const auditLogs = [...(currentSettings.auditLogs || [])];
    const newLog = {
      id: 'log_' + Date.now() + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toISOString(),
      admin: adminUser,
      setting: settingKey,
      previousValue: previousValue !== undefined ? String(previousValue) : 'N/A',
      newValue: String(newValue)
    };
    auditLogs.unshift(newLog);
    const trimmed = auditLogs.slice(0, 100);
    await this.updateAdminSettings({ auditLogs: trimmed });
    return newLog;
  },

  // ── Users & Wallet ──────────────────────────────────────────────────────────

  getUsers() {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },

  saveUsers(users) {
    safeStorageSet(STORAGE_KEYS.USERS, users);
  },

  async getUsersAsync() {
    if (isSupabaseReady()) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        const mapped = data.map(dbUserToApp);
        safeStorageSet(STORAGE_KEYS.USERS, mapped);
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

    const settings = this.getAdminSettings();
    const signupBonus = settings.promoActive ? Number(settings.signupBonus ?? 150.00) : 0;
    const wageringReq = settings.promoActive ? Number((signupBonus * ((settings.wageringPercentage ?? 50) / 100)).toFixed(2)) : 0;

    const newUser = {
      id: 'usr_' + Date.now() + Math.random().toString(36).substring(2, 6),
      phone,
      password,
      walletBalance: signupBonus,
      depositBalance: 0.00,
      bonusBalance: signupBonus,
      winningsBalance: 0.00,
      bonusClaimed: true,
      wageringRequired: wageringReq,
      wageringWagered: 0.00,
      wageringRemaining: wageringReq,
      qualifyingDeposit: 0.00,
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

    if (signupBonus > 0) {
      await this.addTransaction({
        userId: newUser.id,
        type: 'BONUS',
        amount: signupBonus,
        description: 'Signup Promotional Welcome Bonus (₹150)',
        status: 'COMPLETED'
      });
    }

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
    let users = this.getUsers();
    let idx = users.findIndex(u => u.id === userId);
    if (idx === -1 && isSupabaseReady()) {
      const dbUsers = await this.getUsersAsync();
      users = dbUsers;
      idx = users.findIndex(u => u.id === userId);
      if (idx === -1) {
        try {
          const { data: dbUser } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
          if (dbUser) {
            users.push(dbUserToApp(dbUser));
            idx = users.length - 1;
          }
        } catch {}
      }
    }
    if (idx === -1) return null;

    const u = users[idx];
    let depBal = Number(u.depositBalance ?? 0);
    let bonBal = Number(u.bonusBalance ?? 0);
    let winBal = Number(u.winningsBalance ?? 0);

    const curTotal = Number(u.walletBalance || 0);
    // Auto-heal missing sub-balances if needed
    if (depBal + bonBal + winBal !== curTotal && curTotal > 0) {
      if ((u.totalDeposited || 0) > 0) {
        depBal = Math.min(curTotal, u.totalDeposited);
        bonBal = 0;
        winBal = Math.max(0, curTotal - depBal);
      } else {
        bonBal = Math.min(curTotal, 150);
        depBal = 0;
        winBal = Math.max(0, curTotal - bonBal);
      }
    }

    const reasonLower = reason.toLowerCase();

    if (deltaAmount < 0) {
      const wagerAmt = Math.abs(deltaAmount);
      let rem = wagerAmt;

      if (reasonLower.includes('withdrawal')) {
        // Withdrawal holds pull from winnings first, then deposit, then bonus
        const fromWin = Math.min(winBal, rem);
        winBal -= fromWin;
        rem -= fromWin;

        const fromDep = Math.min(depBal, rem);
        depBal -= fromDep;
        rem -= fromDep;

        if (rem > 0) {
          bonBal = Math.max(0, bonBal - rem);
        }
      } else {
        // Game wagers consume bonusBalance first, then depositBalance, then winningsBalance
        const fromBonus = Math.min(bonBal, rem);
        bonBal -= fromBonus;
        rem -= fromBonus;

        const fromDep = Math.min(depBal, rem);
        depBal -= fromDep;
        rem -= fromDep;

        const fromWin = Math.min(winBal, rem);
        winBal -= fromWin;
        rem -= fromWin;

        // Advance wagering requirement for eligible game wagers
        const isEligibleWager = !reasonLower.includes('cancel') && !reasonLower.includes('hold');
        if (isEligibleWager) {
          u.wageringWagered = Number(((u.wageringWagered || 0) + wagerAmt).toFixed(2));
          const req = Number(u.wageringRequired || 0);
          u.wageringRemaining = Math.max(0, Number((req - u.wageringWagered).toFixed(2)));
        }

        // Add ledger record for bet
        this.addTransaction({
          userId,
          type: 'WAGER',
          amount: wagerAmt,
          description: reason,
          status: 'COMPLETED'
        }).catch(() => {});
      }
    } else if (deltaAmount > 0) {
      if (reasonLower.includes('refund')) {
        depBal += deltaAmount;
        if (reasonLower.includes('bet') || reasonLower.includes('cancel')) {
          u.wageringWagered = Math.max(0, Number(((u.wageringWagered || 0) - deltaAmount).toFixed(2)));
          const req = Number(u.wageringRequired || 0);
          u.wageringRemaining = Math.max(0, Number((req - u.wageringWagered).toFixed(2)));
        }
        this.addTransaction({
          userId,
          type: 'REFUND',
          amount: deltaAmount,
          description: reason,
          status: 'COMPLETED'
        }).catch(() => {});
      } else {
        // Game win profit goes to winningsBalance
        winBal += deltaAmount;
        this.addTransaction({
          userId,
          type: 'WIN',
          amount: deltaAmount,
          description: reason,
          status: 'COMPLETED'
        }).catch(() => {});
      }
    }

    u.depositBalance = Number(Math.max(0, depBal).toFixed(2));
    u.bonusBalance = Number(Math.max(0, bonBal).toFixed(2));
    u.winningsBalance = Number(Math.max(0, winBal).toFixed(2));
    const newBalance = Number((u.depositBalance + u.bonusBalance + u.winningsBalance).toFixed(2));
    u.walletBalance = newBalance;

    this.saveUsers(users);

    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      Object.assign(currentUser, {
        walletBalance: newBalance,
        depositBalance: u.depositBalance,
        bonusBalance: u.bonusBalance,
        winningsBalance: u.winningsBalance,
        wageringRequired: u.wageringRequired,
        wageringWagered: u.wageringWagered,
        wageringRemaining: u.wageringRemaining
      });
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      window.dispatchEvent(new CustomEvent('crvper_wallet_delta', {
        detail: { newBalance, deltaAmount, reason }
      }));
      window.dispatchEvent(new Event('crvper_user_updated'));
    }

    // Sync to Supabase
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

  // ── Winning Limit Check for Aviator & WinGo ─────────────────────────────────
  checkGameWinningLimit(userId, gameName = 'Aviator') {
    const restrictedGames = ['aviator', 'wingo'];
    const norm = String(gameName).toLowerCase().replace(/[^a-z]/g, '');
    const isRestricted = restrictedGames.some(g => norm.includes(g));

    if (!isRestricted) {
      return { isLimitReached: false, threshold: Infinity, currentWinnings: 0, reason: null };
    }

    const user = this.getCurrentUser()?.id === userId ? this.getCurrentUser() : this.getUsers().find(u => u.id === userId);
    if (!user) {
      return { isLimitReached: false, threshold: Infinity, currentWinnings: 0, reason: null };
    }

    const settings = this.getAdminSettings();
    const multiplier = Number(settings.aviatorWingoLimitMultiplier ?? 3.0);
    // Base is user's approved qualifying deposits, or default minimum 100
    const qualifyingDeposit = Number(user.qualifyingDeposit || (user.hasDeposited ? (user.totalDeposited || 100) : 100));
    const threshold = Number((qualifyingDeposit * multiplier).toFixed(2));
    const currentWinnings = Number(user.winningsBalance || 0);
    const totalProfit = Math.max(0, Number((user.walletBalance || 0) - qualifyingDeposit));

    const isLimitReached = (currentWinnings >= threshold) || (totalProfit >= threshold && totalProfit > 0);

    return {
      isLimitReached,
      qualifyingDeposit,
      multiplier,
      threshold,
      currentWinnings,
      message: isLimitReached
        ? "You have reached the winning amount. Please withdraw your funds to play again."
        : null
    };
  },

  // ── Withdrawal Eligibility Validator ─────────────────────────────────────────
  getWithdrawalEligibility(userId) {
    const user = this.getCurrentUser()?.id === userId ? this.getCurrentUser() : this.getUsers().find(u => u.id === userId);
    if (!user) {
      return {
        isEligible: false,
        hasDeposited: false,
        depositRequired: 100,
        depositRemaining: 100,
        depositMessage: 'A minimum deposit of ₹100 is required to become eligible for withdrawal under this promotion.',
        hasMetWagering: false,
        wageringRequired: 0,
        wageringWagered: 0,
        wageringRemaining: 0,
        wageringMessage: null,
        depositBalance: 0,
        bonusBalance: 0,
        winningsBalance: 0,
        withdrawableBalance: 0,
        totalBalance: 0
      };
    }

    const settings = this.getAdminSettings();
    const minQualifyingDeposit = Number(settings.minQualifyingDeposit ?? 100);
    const totalDep = Number(user.totalDeposited || 0);
    const hasMetDeposit = Boolean(user.hasDeposited || totalDep >= minQualifyingDeposit);
    const depositRemaining = Math.max(0, Number((minQualifyingDeposit - totalDep).toFixed(2)));

    const depositMessage = !hasMetDeposit
      ? `A minimum deposit of ₹${minQualifyingDeposit} is required to become eligible for withdrawal under this promotion.`
      : null;

    const wageringRequired = Number(user.wageringRequired || 0);
    const wageringWagered = Number(user.wageringWagered || 0);
    const wageringRemaining = Math.max(0, Number((wageringRequired - wageringWagered).toFixed(2)));
    const hasMetWagering = wageringRemaining === 0;

    const wageringMessage = !hasMetWagering
      ? `You need to wager ₹${wageringRemaining.toFixed(2)} more to meet your promotional requirement.`
      : null;

    const depositBal = Number(user.depositBalance || 0);
    const winBal = Number(user.winningsBalance || 0);
    const bonBal = Number(user.bonusBalance || 0);
    const totalBal = Number(user.walletBalance || (depositBal + winBal + bonBal));

    // Withdrawable balance is depositBalance + winningsBalance when wagering requirements are fulfilled
    const withdrawableBalance = hasMetWagering
      ? Number((depositBal + winBal).toFixed(2))
      : 0;

    const isEligible = hasMetDeposit && hasMetWagering && withdrawableBalance >= (settings.minWithdraw ?? 100);

    return {
      isEligible,
      hasDeposited: hasMetDeposit,
      depositRequired: minQualifyingDeposit,
      depositRemaining,
      depositMessage,
      hasMetWagering,
      wageringRequired,
      wageringWagered,
      wageringRemaining,
      wageringMessage,
      depositBalance: depositBal,
      bonusBalance: bonBal,
      winningsBalance: winBal,
      withdrawableBalance,
      totalBalance: totalBal
    };
  },

  // ── Transactions ────────────────────────────────────────────────────────────

  getTransactions(userId = null) {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const all = data ? JSON.parse(data) : [];
    const normalized = all.map(t => ({
      ...t,
      status: (t.status === 'COMPLETED' || t.status === 'APPROVED' || t.status === 'CONFIRMED')
        ? 'CONFIRMED'
        : (t.status === 'REJECTED' || t.status === 'FAILED' ? 'REJECTED' : 'PENDING')
    }));
    if (userId) return normalized.filter(t => t.userId === userId).reverse();
    return normalized.reverse();
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
          status: (row.status === 'COMPLETED' || row.status === 'APPROVED' || row.status === 'CONFIRMED')
            ? 'CONFIRMED'
            : (row.status === 'REJECTED' || row.status === 'FAILED' ? 'REJECTED' : 'PENDING'),
          timestamp: row.timestamp
        }));
      }
    }
    return this.getTransactions(userId);
  },

  async updateTransactionStatus(predicate, newStatus, newDescription = null) {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const all = data ? JSON.parse(data) : [];
    let updatedTx = null;
    for (let i = all.length - 1; i >= 0; i--) {
      if (predicate(all[i])) {
        all[i].status = newStatus;
        if (newDescription) all[i].description = newDescription;
        updatedTx = all[i];
        break;
      }
    }
    if (updatedTx) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(all));
      if (isSupabaseReady()) {
        const dbStatus = (newStatus === 'CONFIRMED' || newStatus === 'APPROVED') ? 'COMPLETED' : newStatus;
        const updatePayload = { status: dbStatus };
        if (newDescription) updatePayload.description = newDescription;
        supabase.from('transactions').update(updatePayload).eq('id', updatedTx.id).then(() => {});
      }
      window.dispatchEvent(new Event('crvper_wallet_delta'));
    }
    return updatedTx;
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
      const allowedDbTypes = ['DEPOSIT', 'WITHDRAW', 'BONUS', 'REFUND', 'COMMISSION'];
      const dbType = allowedDbTypes.includes(newTx.type)
        ? newTx.type
        : (newTx.type === 'WIN' ? 'BONUS' : 'WITHDRAW');
      const dbStatus = (newTx.status === 'CONFIRMED' || newTx.status === 'APPROVED') ? 'COMPLETED' : (newTx.status || 'PENDING');

      supabase.from('transactions').insert({
        id: newTx.id,
        user_id: newTx.userId,
        type: dbType,
        amount: newTx.amount,
        description: newTx.type === dbType ? newTx.description : `[${newTx.type}] ${newTx.description}`,
        status: dbStatus,
        timestamp: newTx.timestamp
      }).then(({ error }) => {
        if (error) console.warn('[Supabase] addTransaction notice:', error.message);
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
        safeStorageSet(STORAGE_KEYS.DEPOSITS, mapped);
        return mapped;
      }
    }
    return this.getDeposits();
  },

  async createDepositRequest({ userId, userPhone, amount, utr, screenshotUrl, promoterCode }) {
    // Guarantee the user exists in Supabase before inserting (FK guard)
    const currentUser = this.getCurrentUser();
    const verifiedUser = await ensureUserInSupabase(currentUser);

    const targetUserId = verifiedUser?.id || userId;
    const targetUserPhone = verifiedUser?.phone || userPhone;

    const newReq = {
      id: 'dep_' + Date.now(),
      userId: targetUserId,
      userPhone: targetUserPhone,
      amount: Number(amount),
      utr: utr || 'N/A',
      screenshotUrl: screenshotUrl || null,
      promoterCode: promoterCode || null,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    // Save to Supabase
    if (isSupabaseReady()) {
      const { error } = await supabase.from('deposits').insert({
        id: newReq.id,
        user_id: targetUserId,
        user_phone: targetUserPhone,
        amount: newReq.amount,
        utr: newReq.utr,
        screenshot_url: newReq.screenshotUrl,
        promoter_code: newReq.promoterCode,
        status: 'PENDING',
        created_at: newReq.createdAt
      });

      if (error) {
        console.warn('[Supabase] createDepositRequest notice:', error.message);
        // If foreign key constraint failed, re-heal and retry once
        if (error.code === '23503') {
          const healed = await ensureUserInSupabase(this.getCurrentUser());
          if (healed?.id) {
            newReq.userId = healed.id;
            const { error: retryErr } = await supabase.from('deposits').insert({
              id: newReq.id,
              user_id: healed.id,
              user_phone: healed.phone || targetUserPhone,
              amount: newReq.amount,
              utr: newReq.utr,
              screenshot_url: newReq.screenshotUrl,
              promoter_code: newReq.promoterCode,
              status: 'PENDING',
              created_at: newReq.createdAt
            });
            if (retryErr) {
              console.warn('[Supabase] deposit retry notice:', retryErr.message);
            }
          }
        }
      }
    }

    // Local cache with Quota safety
    const deposits = this.getDeposits();
    const localReq = {
      ...newReq,
      screenshotUrl: (newReq.screenshotUrl && newReq.screenshotUrl.length > 5000) 
        ? '[Uploaded Cloud Proof]' 
        : newReq.screenshotUrl
    };
    deposits.push(localReq);
    try {
      localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(deposits));
    } catch (quotaErr) {
      console.warn('[LocalStorage] Quota limit encountered for deposits:', quotaErr.message);
      const safeDeposits = deposits.slice(-20).map(d => ({
        ...d,
        screenshotUrl: (d.screenshotUrl && d.screenshotUrl.length > 200) ? '[Uploaded Cloud Proof]' : d.screenshotUrl
      }));
      try {
        localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(safeDeposits));
      } catch (_) {}
    }

    await this.addTransaction({
      userId: targetUserId,
      type: 'DEPOSIT',
      amount: Number(amount),
      description: `UPI Deposit (UTR: ${utr || 'Pending'})`,
      status: 'PENDING'
    });

    window.dispatchEvent(new Event('crvper_deposit_submitted'));
    broadcastRealtime('deposit_created', { depositId: newReq.id, userId: targetUserId, amount: newReq.amount });
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
    safeStorageSet(STORAGE_KEYS.DEPOSITS, deposits);

    // Credit wallet and separated balances
    let users = await this.getUsersAsync();
    let uIdx = users.findIndex(u => u.id === dep.userId);
    if (uIdx === -1 && isSupabaseReady()) {
      try {
        const { data: dbUser } = await supabase.from('users').select('*').eq('id', dep.userId).maybeSingle();
        if (dbUser) {
          users.push(dbUserToApp(dbUser));
          uIdx = users.length - 1;
        }
      } catch {}
    }

    if (uIdx !== -1) {
      const u = users[uIdx];
      const settings = this.getAdminSettings();

      u.depositBalance = Number(((u.depositBalance || 0) + dep.amount).toFixed(2));
      u.bonusBalance = Number((u.bonusBalance || 0).toFixed(2));
      u.winningsBalance = Number((u.winningsBalance || 0).toFixed(2));
      u.walletBalance = Number((u.depositBalance + u.bonusBalance + u.winningsBalance).toFixed(2));

      const totalDep = Number(((u.totalDeposited || 0) + dep.amount).toFixed(2));
      u.totalDeposited = totalDep;
      u.qualifyingDeposit = Number(((u.qualifyingDeposit || 0) + dep.amount).toFixed(2));

      // Wagering requirement update (e.g. 50% of deposit amount)
      const wageringPct = Number(settings.wageringPercentage ?? 50);
      const additionalWagering = Number((dep.amount * (wageringPct / 100)).toFixed(2));
      u.wageringRequired = Number(((u.wageringRequired || 0) + additionalWagering).toFixed(2));
      u.wageringWagered = Number((u.wageringWagered || 0).toFixed(2));
      u.wageringRemaining = Math.max(0, Number((u.wageringRequired - u.wageringWagered).toFixed(2)));

      const minQualifying = Number(settings.minQualifyingDeposit ?? 100);
      if (totalDep >= minQualifying || dep.amount >= minQualifying) {
        u.hasDeposited = true;
      }
      this.saveUsers(users);

      // Supabase user update
      if (isSupabaseReady()) {
        await supabase.from('users').update({
          wallet_balance: u.walletBalance,
          has_deposited: u.hasDeposited,
          total_deposited: u.totalDeposited
        }).eq('id', dep.userId);
      }

      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.id === dep.userId) {
        Object.assign(currentUser, {
          walletBalance: u.walletBalance,
          depositBalance: u.depositBalance,
          bonusBalance: u.bonusBalance,
          winningsBalance: u.winningsBalance,
          totalDeposited: u.totalDeposited,
          qualifyingDeposit: u.qualifyingDeposit,
          wageringRequired: u.wageringRequired,
          wageringWagered: u.wageringWagered,
          wageringRemaining: u.wageringRemaining,
          hasDeposited: u.hasDeposited
        });
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
        window.dispatchEvent(new Event('crvper_user_updated'));
      }
    }

    // Promoter commission (20%)
    const promoCode = dep.promoterCode || (users[uIdx] && users[uIdx].referredBy);
    if (promoCode) {
      const promoters = await this.getPromotersAsync();
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

    // Update matching pending transaction to CONFIRMED
    const updated = await this.updateTransactionStatus(
      (tx) => tx.userId === dep.userId && tx.type === 'DEPOSIT' && (tx.status === 'PENDING' || !tx.status),
      'CONFIRMED',
      `Deposit Confirmed (₹${dep.amount})`
    );

    if (!updated) {
      await this.addTransaction({
        userId: dep.userId,
        type: 'DEPOSIT',
        amount: dep.amount,
        description: `Deposit Confirmed (₹${dep.amount})`,
        status: 'CONFIRMED'
      });
    }

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
    safeStorageSet(STORAGE_KEYS.DEPOSITS, deposits);

    // Update matching pending transaction to REJECTED
    const updatedReject = await this.updateTransactionStatus(
      (tx) => tx.userId === dep.userId && tx.type === 'DEPOSIT' && (tx.status === 'PENDING' || !tx.status),
      'REJECTED',
      `Deposit Rejected (${reason})`
    );

    if (!updatedReject) {
      await this.addTransaction({
        userId: dep.userId,
        type: 'DEPOSIT',
        amount: dep.amount,
        description: `Deposit Rejected: ${reason}`,
        status: 'REJECTED'
      });
    }

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
        safeStorageSet(STORAGE_KEYS.WITHDRAWALS, mapped);
        return mapped;
      }
    }
    return this.getWithdrawals();
  },

  async createWithdrawalRequest({ userId, userPhone, amount, upiId, qrUrl }) {
    const user = this.getCurrentUser()?.id === userId ? this.getCurrentUser() : this.getUsers().find(u => u.id === userId);
    if (!user) throw new Error('You must be logged in.');

    const eligibility = this.getWithdrawalEligibility(userId);

    // 1. Minimum deposit requirement validation
    if (!eligibility.hasDeposited) {
      throw new Error(eligibility.depositMessage || 'A minimum deposit of ₹100 is required to become eligible for withdrawal under this promotion.');
    }

    // 2. Promotional Wagering requirement validation
    if (!eligibility.hasMetWagering) {
      throw new Error(eligibility.wageringMessage || `You need to wager ₹${eligibility.wageringRemaining.toFixed(2)} more to meet your promotional requirement.`);
    }

    const settings = this.getAdminSettings();
    const minWth = Number(settings.minWithdraw ?? 100);
    const numAmount = Number(amount);

    if (numAmount < minWth) {
      throw new Error(`Minimum withdrawal amount is ₹${minWth}.`);
    }

    if (numAmount > eligibility.withdrawableBalance) {
      throw new Error(`Amount cannot exceed your withdrawable balance (₹${eligibility.withdrawableBalance.toFixed(2)}). Promotional bonus cannot be withdrawn directly.`);
    }

    if (numAmount > (user.walletBalance || 0)) {
      throw new Error('Insufficient wallet balance!');
    }

    await this.updateWalletBalance(userId, -numAmount, 'Withdrawal Hold');

    const newReq = {
      id: 'wth_' + Date.now(),
      userId,
      userPhone,
      amount: numAmount,
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
    safeStorageSet(STORAGE_KEYS.WITHDRAWALS, withdrawals);

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
    safeStorageSet(STORAGE_KEYS.WITHDRAWALS, withdrawals);

    const users = await this.getUsersAsync();
    let idx = users.findIndex(u => u.id === wth.userId);
    if (idx === -1 && isSupabaseReady()) {
      try {
        const { data: dbUser } = await supabase.from('users').select('*').eq('id', wth.userId).maybeSingle();
        if (dbUser) {
          users.push(dbUserToApp(dbUser));
          idx = users.length - 1;
        }
      } catch {}
    }
    if (idx !== -1) {
      users[idx].totalWithdrawn = (users[idx].totalWithdrawn || 0) + wth.amount;
      this.saveUsers(users);
      if (isSupabaseReady()) {
        await supabase.from('users').update({
          total_withdrawn: users[idx].totalWithdrawn
        }).eq('id', wth.userId);
      }
    }

    // Update matching pending transaction to CONFIRMED
    const updated = await this.updateTransactionStatus(
      (tx) => tx.userId === wth.userId && tx.type === 'WITHDRAW' && (tx.status === 'PENDING' || !tx.status),
      'CONFIRMED',
      `Withdrawal Confirmed (₹${wth.amount})`
    );

    if (!updated) {
      await this.addTransaction({
        userId: wth.userId,
        type: 'WITHDRAW',
        amount: wth.amount,
        description: `Withdrawal Confirmed (₹${wth.amount})`,
        status: 'CONFIRMED'
      });
    }

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
    safeStorageSet(STORAGE_KEYS.WITHDRAWALS, withdrawals);

    // Update pending withdrawal transaction to REJECTED
    const updatedReject = await this.updateTransactionStatus(
      (tx) => tx.userId === wth.userId && tx.type === 'WITHDRAW' && (tx.status === 'PENDING' || !tx.status),
      'REJECTED',
      `Withdrawal Rejected (${reason})`
    );

    if (!updatedReject) {
      await this.addTransaction({
        userId: wth.userId,
        type: 'WITHDRAW',
        amount: wth.amount,
        description: `Withdrawal Rejected (${reason})`,
        status: 'REJECTED'
      });
    }

    // Refund
    await this.updateWalletBalance(wth.userId, wth.amount, 'Withdrawal Refund');

    await this.addTransaction({
      userId: wth.userId,
      type: 'REFUND',
      amount: wth.amount,
      description: `Withdrawal Refunded (${reason})`,
      status: 'CONFIRMED'
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
        safeStorageSet(STORAGE_KEYS.PROMOTERS, mapped);
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
      safeStorageSet(STORAGE_KEYS.SUPPORT_CHATS, chats);
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
          safeStorageSet(STORAGE_KEYS.SUPPORT_CHATS, chats);
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
          safeStorageSet(STORAGE_KEYS.SUPPORT_CHATS, mapped);
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

    safeStorageSet(STORAGE_KEYS.SUPPORT_CHATS, chats);

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
    safeStorageSet(STORAGE_KEYS.SUPPORT_CHATS, chats);

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
