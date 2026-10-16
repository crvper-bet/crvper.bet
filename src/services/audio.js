// ═══════════════════════════════════════════════════════════════════════════
// CRVPER.BET — Dynamic Sound System v5 (Universal & Sub-Second Real-Time)
// ─────────────────────────────────────────────────────────────────────────
// • Cross-Device Real-Time: Any sound changed by admin syncs in sub-second time.
// • AudioContext Auto-Unlock on mobile touch/click.
// • Dual Playback Pipeline: Web Audio API AudioBuffer + HTML5 media fallback.
// • Synthesizer Safety Net: If custom media fails or is absent, built-in tone plays.
// ═══════════════════════════════════════════════════════════════════════════

import { soundStorage } from './soundStorage';
import { storage } from './storage';

const SOUND_KEYS = ['deposit', 'withdraw', 'login', 'register', 'win', 'loss', 'cashout', 'click'];

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.customBuffers = {};
    this.customDataUrls = {};
    this.isUnlocked = false;

    try {
      this.muted = localStorage.getItem('crvper_sound_muted') === 'true';
    } catch {}

    if (typeof window !== 'undefined') {
      // 1. Mobile & Browser Autoplay Unlock on first interaction
      const unlockAudio = () => {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        this.isUnlocked = true;
        ['click', 'touchstart', 'touchend', 'keydown'].forEach(evt => {
          window.removeEventListener(evt, unlockAudio);
        });
      };

      ['click', 'touchstart', 'touchend', 'keydown'].forEach(evt => {
        window.addEventListener(evt, unlockAudio, { passive: true });
      });

      // 2. Initial load from Supabase cloud
      this._initFromRemote();

      // 3. Admin uploaded / updated / deleted sound
      window.addEventListener('crvper_sound_updated', async (e) => {
        const { key, deleted, all, dataUrl } = e.detail || {};
        if (all && deleted) {
          this.customBuffers = {};
          this.customDataUrls = {};
        } else if (key && deleted) {
          delete this.customBuffers[key];
          delete this.customDataUrls[key];
        } else if (key && dataUrl) {
          this.customDataUrls[key] = dataUrl;
          await this._decodeFromDataUrl(key, dataUrl);
        } else if (key) {
          await this._reloadSound(key);
        }
      });

      // 4. Admin changed sound modes
      window.addEventListener('crvper_settings_updated', () => {
        SOUND_KEYS.forEach(k => {
          if (this.getSoundMode(k) === 'custom' && !this.customBuffers[k]) {
            this._reloadSound(k);
          }
        });
      });

      // 5. Periodic polling & focus re-sync
      window.addEventListener('focus', () => soundStorage.syncFromRemote());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') soundStorage.syncFromRemote();
      });
    }
  }

  // ─── Initialize from Cloud Storage ──────────────────────────────────────────
  async _initFromRemote() {
    try {
      await soundStorage.syncFromRemote();
    } catch {}
    await this._loadAllCustomSounds();
  }

  // ─── Sound Mode ─────────────────────────────────────────────────────────────
  getSoundMode(key) {
    try {
      const modes = soundStorage.getSoundModes();
      if (modes[key]) return modes[key];
      const settings = storage.getAdminSettings();
      return (settings?.soundModes?.[key]) || 'default';
    } catch {
      return 'default';
    }
  }

  // ─── AudioContext Initialization ────────────────────────────────────────────
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

  // ─── Pre-load & Decode Custom Sounds ────────────────────────────────────────
  async _loadAllCustomSounds() {
    try {
      for (const key of SOUND_KEYS) {
        if (this.getSoundMode(key) === 'custom') {
          await this._reloadSound(key);
        }
      }
    } catch (err) {
      console.warn('[Audio] Pre-load error:', err);
    }
  }

  async _reloadSound(key) {
    try {
      const meta = await soundStorage.getSound(key);
      if (meta?.dataUrl) {
        this.customDataUrls[key] = meta.dataUrl;
        if (meta.buffer) {
          await this._decodeAndCache(key, meta.buffer);
        } else {
          await this._decodeFromDataUrl(key, meta.dataUrl);
        }
      } else {
        delete this.customBuffers[key];
        delete this.customDataUrls[key];
      }
    } catch {}
  }

  async _decodeFromDataUrl(key, dataUrl) {
    try {
      if (!dataUrl || !dataUrl.startsWith('data:')) return;
      this.customDataUrls[key] = dataUrl;
      const base64 = dataUrl.split(',')[1];
      if (!base64) return;
      const binary = atob(base64);
      const buf = new ArrayBuffer(binary.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
      await this._decodeAndCache(key, buf);
    } catch (err) {
      console.warn(`[Audio] Data URL decode failed for "${key}":`, err);
    }
  }

  async _decodeAndCache(key, arrayBuffer) {
    try {
      this.init();
      if (!this.ctx) return;
      const decoded = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
      this.customBuffers[key] = decoded;
    } catch (err) {
      // AudioContext could not decode (e.g. video container). Keep dataUrl for HTML5 fallback
      delete this.customBuffers[key];
    }
  }

  // ─── Play Custom Sound or Fallback to Synthesizer ───────────────────────────
  async playCustomOrSynthesize(soundKey, synthFallback) {
    if (this.muted) return;

    const mode = this.getSoundMode(soundKey);

    // SILENT → do nothing
    if (mode === 'silent') return;

    this.init();
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume().catch(() => {});
    }

    // CUSTOM → Try AudioBuffer then HTML5 Audio/Video, then synth fallback
    if (mode === 'custom') {
      let buffer = this.customBuffers[soundKey];

      if (!buffer) {
        await this._reloadSound(soundKey);
        buffer = this.customBuffers[soundKey];
      }

      if (buffer && this.ctx) {
        try {
          const source = this.ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(this.ctx.destination);
          source.start(0);
          return;
        } catch (err) {
          console.warn(`[Audio] Buffer playback error for "${soundKey}":`, err);
        }
      }

      // Fallback: HTML5 Media element
      let dataUrl = this.customDataUrls[soundKey];
      if (!dataUrl) {
        await this._reloadSound(soundKey);
        dataUrl = this.customDataUrls[soundKey];
      }

      if (dataUrl) {
        try {
          const media = new Audio(dataUrl);
          media.volume = 1.0;
          await media.play();
          return;
        } catch (err) {
          // If HTML5 media element also fails, fall through to synthFallback
          console.warn(`[Audio] Media element playback failed for "${soundKey}", using synthesizer:`, err);
        }
      }
    }

    // DEFAULT (or fallback when custom file failed) → Synthesizer
    if (typeof synthFallback === 'function') {
      try { synthFallback(); } catch {}
    }
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

  // ─── Game specific sound effects ──────────────────────────────────────────
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
