// ═══════════════════════════════════════════════════════════════════════════
// CRVPER.BET — Real-Time Cross-Device Synchronization Engine
// ─────────────────────────────────────────────────────────────────────────
// Connects all clients across the internet using Supabase Realtime Broadcast
// and Postgres Changes. Ensures admin actions (approvals, rejections, sound
// uploads, QR changes) and player actions (new deposits/withdrawals) propagate
// in sub-second time to every device worldwide.
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from './supabase.js';
import { storage } from './storage.js';
import { sounds } from './audio.js';

const CHANNEL_NAME = 'crvper-global-sync';

class RealtimeSyncService {
  constructor() {
    this.channel = null;
    this.isSubscribed = false;
    this.pollTimer = null;
    this._listeners = new Map();
  }

  init() {
    if (typeof window === 'undefined' || !supabase) return;
    if (this.channel) return;

    try {
      this.channel = supabase.channel(CHANNEL_NAME, {
        config: { broadcast: { self: true } }
      });

      // ── Broadcast Event Handlers ──
      this.channel.on('broadcast', { event: 'sound_updated' }, async (event) => {
        const payload = event.payload || {};
        try {
          const { soundStorage } = await import('./soundStorage.js');
          await soundStorage.syncFromRemote(true);
        } catch (e) {
          console.warn('[RealtimeSync] Sound sync error:', e);
        }
      });

      this.channel.on('broadcast', { event: 'settings_updated' }, async (event) => {
        try {
          await storage.getAdminSettingsAsync();
          window.dispatchEvent(new CustomEvent('crvper_settings_updated', { detail: event.payload }));
        } catch (e) {
          console.warn('[RealtimeSync] Settings sync error:', e);
        }
      });

      this.channel.on('broadcast', { event: 'deposit_updated' }, async (event) => {
        const payload = event.payload || {};
        window.dispatchEvent(new CustomEvent('crvper_deposit_updated', { detail: payload }));
        window.dispatchEvent(new Event('crvper_deposits_changed'));

        const currentUser = storage.getCurrentUser();
        if (currentUser && payload.userId && String(currentUser.id) === String(payload.userId)) {
          const freshUser = await storage.refreshCurrentUserFromSupabase();
          if (payload.status === 'APPROVED') {
            try { sounds.playDeposit(); } catch {}
          }
        }
      });

      this.channel.on('broadcast', { event: 'deposit_created' }, (event) => {
        window.dispatchEvent(new CustomEvent('crvper_deposits_changed', { detail: event.payload }));
      });

      this.channel.on('broadcast', { event: 'withdrawal_updated' }, async (event) => {
        const payload = event.payload || {};
        window.dispatchEvent(new CustomEvent('crvper_withdrawal_updated', { detail: payload }));
        window.dispatchEvent(new Event('crvper_withdrawals_changed'));

        const currentUser = storage.getCurrentUser();
        if (currentUser && payload.userId && String(currentUser.id) === String(payload.userId)) {
          await storage.refreshCurrentUserFromSupabase();
        }
      });

      this.channel.on('broadcast', { event: 'withdrawal_created' }, (event) => {
        window.dispatchEvent(new CustomEvent('crvper_withdrawals_changed', { detail: event.payload }));
      });

      // ── Postgres Changes (Safety Net for direct DB updates) ──
      this.channel.on('postgres_changes', { event: '*', schema: 'public', table: 'admin_settings' }, async () => {
        try {
          await storage.getAdminSettingsAsync();
          const { soundStorage } = await import('./soundStorage.js');
          await soundStorage.syncFromRemote(true);
        } catch {}
      });

      this.channel.on('postgres_changes', { event: '*', schema: 'public', table: 'deposits' }, async (change) => {
        window.dispatchEvent(new Event('crvper_deposits_changed'));
        const currentUser = storage.getCurrentUser();
        if (currentUser && change.new && String(currentUser.id) === String(change.new.user_id)) {
          await storage.refreshCurrentUserFromSupabase();
          if (change.new.status === 'APPROVED') {
            try { sounds.playDeposit(); } catch {}
          }
        }
      });

      this.channel.on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, async (change) => {
        window.dispatchEvent(new Event('crvper_withdrawals_changed'));
        const currentUser = storage.getCurrentUser();
        if (currentUser && change.new && String(currentUser.id) === String(change.new.user_id)) {
          await storage.refreshCurrentUserFromSupabase();
        }
      });

      this.channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.isSubscribed = true;
        }
      });

      // Periodic safety net polling (every 10s) to guarantee consistency
      if (!this.pollTimer) {
        this.pollTimer = setInterval(async () => {
          const currentUser = storage.getCurrentUser();
          if (currentUser) {
            await storage.refreshCurrentUserFromSupabase();
          }
        }, 10000);
      }

      // Re-sync immediately on window focus
      window.addEventListener('focus', async () => {
        const currentUser = storage.getCurrentUser();
        if (currentUser) {
          await storage.refreshCurrentUserFromSupabase();
        }
        await storage.getAdminSettingsAsync();
      });
    } catch (err) {
      console.warn('[RealtimeSync] Initialization error:', err);
    }
  }

  // Broadcast message to all active clients globally
  async broadcast(event, payload = {}) {
    if (!supabase) return;
    try {
      if (!this.channel) this.init();
      if (this.channel) {
        await this.channel.send({
          type: 'broadcast',
          event,
          payload: {
            ...payload,
            _timestamp: Date.now()
          }
        });
      }
    } catch (err) {
      console.warn(`[RealtimeSync] Broadcast failed for "${event}":`, err);
    }
  }
}

export const realtimeSync = new RealtimeSyncService();
