// ═══════════════════════════════════════════════════════════════════════════
// CRVPER.BET — Dynamic Sound System v3
// ─────────────────────────────────────────────────────────────────────────
// Each sound key has ONE of three modes (set by Admin in real-time):
//   "silent"  → no sound at all
//   "default" → built-in synthesizer tone
//   "custom"  → decoded AudioBuffer from IndexedDB (uploaded by Admin)
//
// Audio files are stored in IndexedDB via soundStorage.js (no size limit).
// Playback uses Web Audio API BufferSource — zero-latency, mobile-safe.
// crvper_sound_updated  → re-decodes changed key from IndexedDB
// crvper_settings_updated → re-reads soundModes from adminSettings
// ═══════════════════════════════════════════════════════════════════════════

import { soundStorage } from './soundStorage';
import { storage } from './storage';

const SOUND_KEYS = ['deposit', 'withdraw', 'login', 'register', 'win', 'loss', 'cashout', 'click'];

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    // Decoded AudioBuffers for custom sounds  { key → AudioBuffer }
    this.customBuffers = {};

    try {
      this.muted = localStorage.getItem('crvper_sound_muted') === 'true';
    } catch {}

    if (typeof window !== 'undefined') {
      // Pre-load all custom sounds from IndexedDB on startup
      this._loadAllCustomSounds();

      // Admin uploaded / deleted a specific sound file
      window.addEventListener('crvper_sound_updated', async (e) => {
        const { key, deleted, all } = e.detail || {};
        if (all && deleted) {
          this.customBuffers = {};
        } else if (key && deleted) {
          delete this.customBuffers[key];
        } else if (key) {
          await this._reloadSound(key);
        }
      });

      // Admin changed a sound mode (silent / default / custom)
      // No buffer action needed — getSoundMode() is always read live from storage
      window.addEventListener('crvper_settings_updated', () => {
        // Modes are read dynamically; nothing extra needed here.
        // But if custom mode was just set, ensure the buffer is ready.
        SOUND_KEYS.forEach(k => {
          if (this.getSoundMode(k) === 'custom' && !this.customBuffers[k]) {
            this._reloadSound(k);
          }
        });
      });
    }
  }

  // ─── Read current mode for a key (live from storage) ─────────────────────
  getSoundMode(key) {
    try {
      const settings = storage.getAdminSettings();
      return (settings?.soundModes?.[key]) || 'default';
    } catch {
      return 'default';
    }
  }

  // ─── AudioContext ─────────────────────────────────────────────────────────
  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    try { localStorage.setItem('crvper_sound_muted', String(this.muted)); } catch {}
  }

  isMuted() { return this.muted; }

  // ─── IndexedDB helpers ────────────────────────────────────────────────────
  async _loadAllCustomSounds() {
    try {
      const all = await soundStorage.getAllSounds();
      for (const [key, meta] of Object.entries(all)) {
        if (meta?.buffer) await this._decodeAndCache(key, meta.buffer);
      }
    } catch (err) {
      console.warn('[Audio] Pre-load failed:', err);
    }
  }

  async _reloadSound(key) {
    try {
      const meta = await soundStorage.getSound(key);
      if (meta?.buffer) {
        await this._decodeAndCache(key, meta.buffer);
      } else {
        delete this.customBuffers[key];
      }
    } catch {}
  }

  async _decodeAndCache(key, arrayBuffer) {
    try {
      this.init();
      if (!this.ctx) return;
      // slice() required — decodeAudioData detaches the buffer
      const decoded = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
      this.customBuffers[key] = decoded;
    } catch (err) {
      console.warn(`[Audio] Decode failed for "${key}":`, err);
      delete this.customBuffers[key];
    }
  }

  // ─── Core play dispatcher ─────────────────────────────────────────────────
  async playCustomOrSynthesize(soundKey, synthFallback) {
    if (this.muted) return;

    const mode = this.getSoundMode(soundKey);

    // SILENT → do nothing
    if (mode === 'silent') return;

    this.init();
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume().catch(() => {});
    }

    // CUSTOM → play decoded AudioBuffer from IndexedDB
    if (mode === 'custom') {
      const buffer = this.customBuffers[soundKey];
      if (buffer) {
        try {
          const source = this.ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(this.ctx.destination);
          source.start(0);
          return;
        } catch (err) {
          console.warn(`[Audio] Custom playback failed for "${soundKey}":`, err);
        }
      } else {
        // Buffer not decoded yet → try to load it now
        await this._reloadSound(soundKey);
        const buf2 = this.customBuffers[soundKey];
        if (buf2) {
          try {
            const src = this.ctx.createBufferSource();
            src.buffer = buf2;
            src.connect(this.ctx.destination);
            src.start(0);
            return;
          } catch {}
        }
        // Fall through to synthesizer if custom file unavailable
      }
    }

    // DEFAULT → synthesizer
    if (typeof synthFallback === 'function') synthFallback();
  }

  // ─── 1. DEPOSIT ───────────────────────────────────────────────────────────
  playDeposit() {
    this.playCustomOrSynthesize('deposit', () => {
      try {
        this.init(); if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [587.33, 880.00, 1174.66, 1479.98].forEach((freq, i) => {
          const o = this.ctx.createOscillator(), g = this.ctx.createGain();
          o.type = 'triangle'; o.frequency.setValueAtTime(freq, now + i * 0.05);
          g.gain.setValueAtTime(0.22, now + i * 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.22);
          o.connect(g); g.connect(this.ctx.destination);
          o.start(now + i * 0.05); o.stop(now + i * 0.05 + 0.22);
        });
      } catch {}
    });
  }

  // ─── 2. WITHDRAW ─────────────────────────────────────────────────────────
  playWithdraw() {
    this.playCustomOrSynthesize('withdraw', () => {
      try {
        this.init(); if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [880.00, 659.25, 523.25, 392.00].forEach((freq, i) => {
          const o = this.ctx.createOscillator(), g = this.ctx.createGain();
          o.type = 'sine'; o.frequency.setValueAtTime(freq, now + i * 0.06);
          g.gain.setValueAtTime(0.24, now + i * 0.06);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.26);
          o.connect(g); g.connect(this.ctx.destination);
          o.start(now + i * 0.06); o.stop(now + i * 0.06 + 0.26);
        });
      } catch {}
    });
  }

  // ─── 3. LOGIN ─────────────────────────────────────────────────────────────
  playLogin() {
    this.playCustomOrSynthesize('login', () => {
      try {
        this.init(); if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [261.63, 392.00, 523.25, 659.25].forEach((freq, i) => {
          const o = this.ctx.createOscillator(), g = this.ctx.createGain();
          o.type = 'sawtooth'; o.frequency.setValueAtTime(freq, now + i * 0.07);
          g.gain.setValueAtTime(0.15, now + i * 0.07);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.35);
          o.connect(g); g.connect(this.ctx.destination);
          o.start(now + i * 0.07); o.stop(now + i * 0.07 + 0.35);
        });
      } catch {}
    });
  }

  // ─── 4. REGISTER ─────────────────────────────────────────────────────────
  playRegister() {
    this.playCustomOrSynthesize('register', () => {
      try {
        this.init(); if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [440, 554.37, 659.25, 880, 1108.73].forEach((freq, i) => {
          const o = this.ctx.createOscillator(), g = this.ctx.createGain();
          o.type = 'triangle'; o.frequency.setValueAtTime(freq, now + i * 0.06);
          g.gain.setValueAtTime(0.25, now + i * 0.06);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.3);
          o.connect(g); g.connect(this.ctx.destination);
          o.start(now + i * 0.06); o.stop(now + i * 0.06 + 0.3);
        });
      } catch {}
    });
  }

  // ─── 5. WIN ───────────────────────────────────────────────────────────────
  playWin() {
    this.playCustomOrSynthesize('win', () => {
      try {
        this.init(); if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, i) => {
          const o = this.ctx.createOscillator(), g = this.ctx.createGain();
          o.type = 'triangle'; o.frequency.setValueAtTime(freq, now + i * 0.06);
          g.gain.setValueAtTime(0.24, now + i * 0.06);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.35);
          o.connect(g); g.connect(this.ctx.destination);
          o.start(now + i * 0.06); o.stop(now + i * 0.06 + 0.35);
        });
        if (navigator.vibrate) navigator.vibrate([40, 30, 60]);
      } catch {}
    });
  }

  // ─── 6. LOSS ─────────────────────────────────────────────────────────────
  playLoss() {
    this.playCustomOrSynthesize('loss', () => {
      try {
        this.init(); if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [155.56, 146.83, 138.59, 90.0].forEach((freq, i) => {
          const o = this.ctx.createOscillator(), g = this.ctx.createGain();
          o.type = 'sawtooth'; o.frequency.setValueAtTime(freq, now + i * 0.09);
          o.frequency.exponentialRampToValueAtTime(35, now + i * 0.09 + 0.35);
          g.gain.setValueAtTime(0.28, now + i * 0.09);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.4);
          o.connect(g); g.connect(this.ctx.destination);
          o.start(now + i * 0.09); o.stop(now + i * 0.09 + 0.4);
        });
        if (navigator.vibrate) navigator.vibrate([120, 40, 180]);
      } catch {}
    });
  }

  // ─── 7. CASHOUT ──────────────────────────────────────────────────────────
  playCashout() {
    this.playCustomOrSynthesize('cashout', () => {
      try {
        this.init(); if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [587.33, 739.99, 880, 1174.66, 1479.98, 1760].forEach((freq, i) => {
          const o = this.ctx.createOscillator(), g = this.ctx.createGain();
          o.type = 'sine'; o.frequency.setValueAtTime(freq, now + i * 0.045);
          g.gain.setValueAtTime(0.22, now + i * 0.045);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.28);
          o.connect(g); g.connect(this.ctx.destination);
          o.start(now + i * 0.045); o.stop(now + i * 0.045 + 0.28);
        });
      } catch {}
    });
  }

  // ─── 8. CLICK ────────────────────────────────────────────────────────────
  playClick() {
    this.playCustomOrSynthesize('click', () => {
      try {
        this.init(); if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(950, t); o.frequency.exponentialRampToValueAtTime(450, t + 0.035);
        g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
        o.connect(g); g.connect(this.ctx.destination);
        o.start(); o.stop(t + 0.035);
      } catch {}
    });
  }

  // ─── Mines diamond discovery ──────────────────────────────────────────────
  playDiamond(step = 1) {
    if (this.muted) return;
    try {
      this.init(); if (!this.ctx) return;
      const freq = 440 * Math.pow(1.08, Math.min(step, 18));
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(freq * 1.45, t + 0.14);
      g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(); o.stop(t + 0.32);
      if (navigator.vibrate) navigator.vibrate(25);
    } catch {}
  }

  playBomb() { this.playLoss(); }

  // ─── Plinko peg ───────────────────────────────────────────────────────────
  playPeg() {
    if (this.muted) return;
    try {
      this.init(); if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(620 + Math.random() * 380, t);
      g.gain.setValueAtTime(0.045, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(); o.stop(t + 0.05);
    } catch {}
  }
}

export const sounds = new SoundEngine();
