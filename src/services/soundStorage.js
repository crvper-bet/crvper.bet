// ═══════════════════════════════════════════════════════════════════════════
// CRVPER.BET — Cross-Device Real-Time Sound Storage v4
// ─────────────────────────────────────────────────────────────────────────
// Architecture: Audio files are stored as base64 data URIs packed inside the
// Supabase `admin_settings.qr_image_url` column as a JSON envelope:
//
//   {
//     "qr": "data:image/svg+xml...",          ← QR image as before
//     "soundModes": { "win": "custom", ... },  ← per-key mode
//     "soundData": {                            ← audio files as base64
//       "win": { "dataUrl": "data:audio/mp3;base64,...", "name": "...", "size": 0 }
//     }
//   }
//
// This envelope approach requires ZERO new Supabase tables or columns.
// When admin uploads or changes a sound, the new config is written to Supabase
// immediately. All connected user devices fetch the fresh config within seconds
// via Supabase Realtime + periodic polling — achieving true real-time rollout.
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from './supabase.js';

const LS_SOUND_CONFIG = 'crvper_sound_config_v3';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readLocalConfig() {
  try {
    const raw = localStorage.getItem(LS_SOUND_CONFIG);
    return raw ? JSON.parse(raw) : { soundModes: {}, soundData: {} };
  } catch {
    return { soundModes: {}, soundData: {} };
  }
}

function writeLocalConfig(config) {
  try {
    localStorage.setItem(LS_SOUND_CONFIG, JSON.stringify(config));
  } catch {}
}

// Convert File / Blob → base64 data URI
function fileToDataUrl(fileOrBlob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(fileOrBlob);
  });
}

// Decode base64 data URI → ArrayBuffer (for Web Audio API decoding)
function dataUrlToArrayBuffer(dataUrl) {
  try {
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const buf = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
    return buf;
  } catch {
    return null;
  }
}

// ─── Supabase sync: read the full packed config from `qr_image_url` ──────────

async function fetchSupabaseConfig() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('qr_image_url, updated_at')
      .eq('id', 1)
      .single();
    if (error || !data) return null;

    // Try to parse as JSON envelope — fall back to raw QR string
    try {
      const parsed = JSON.parse(data.qr_image_url);
      if (parsed && typeof parsed === 'object' && parsed.qr !== undefined) {
        return {
          qr: parsed.qr,
          soundModes: parsed.soundModes || {},
          soundData: parsed.soundData || {},
          updatedAt: data.updated_at
        };
      }
    } catch {}
    // Plain string QR (old format) — no sound config in Supabase yet
    return { qr: data.qr_image_url, soundModes: {}, soundData: {}, updatedAt: data.updated_at };
  } catch {
    return null;
  }
}

// Push the packed config back to Supabase (admin-only action)
async function pushSupabaseConfig(config) {
  if (!supabase) return;
  try {
    // Read existing admin_settings row first to preserve other fields
    const { data: existing } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('id', 1)
      .single();

    const envelope = JSON.stringify({
      qr: config.qr,
      soundModes: config.soundModes,
      soundData: config.soundData
    });

    await supabase.from('admin_settings').upsert({
      id: 1,
      upi_id: existing?.upi_id || 'crvper.pay@upi',
      payee_name: existing?.payee_name || 'CRVPER',
      qr_image_url: envelope,
      min_deposit: existing?.min_deposit ?? 200,
      min_withdraw: existing?.min_withdraw ?? 200,
      signup_bonus: existing?.signup_bonus ?? 150,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[soundStorage] Supabase push failed:', err);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const soundStorage = {

  // Save an audio file to central storage + Supabase
  async saveSound(key, fileOrBlob) {
    try {
      if (fileOrBlob.size > 5 * 1024 * 1024) {
        throw new Error('File exceeds 5 MB limit');
      }

      const dataUrl = await fileToDataUrl(fileOrBlob);
      const config = readLocalConfig();

      // Merge into local config
      config.soundData = config.soundData || {};
      config.soundData[key] = {
        dataUrl,
        name: fileOrBlob.name || `${key}.mp3`,
        type: fileOrBlob.type || 'audio/mpeg',
        size: fileOrBlob.size,
        updatedAt: Date.now()
      };
      config.soundModes = config.soundModes || {};
      config.soundModes[key] = 'custom';

      writeLocalConfig(config);

      // Sync to Supabase so all user devices receive the new sound
      await pushSupabaseConfig({
        qr: config.qr || '',
        soundModes: config.soundModes,
        soundData: config.soundData
      });

      // Notify local audio engine
      window.dispatchEvent(new CustomEvent('crvper_sound_updated', {
        detail: { key, dataUrl, meta: config.soundData[key] }
      }));

      return config.soundData[key];
    } catch (err) {
      console.error('[soundStorage] Failed to save sound:', err);
      throw err;
    }
  },

  // Get single sound entry (with ArrayBuffer for Web Audio API)
  async getSound(key) {
    // First try local config
    let config = readLocalConfig();
    let entry = config.soundData?.[key];

    // If not local, try fetching from Supabase
    if (!entry) {
      const remote = await fetchSupabaseConfig();
      if (remote?.soundData?.[key]) {
        entry = remote.soundData[key];
        // Cache locally
        config.soundData = { ...config.soundData, [key]: entry };
        config.soundModes = { ...config.soundModes, ...remote.soundModes };
        writeLocalConfig(config);
      }
    }

    if (!entry?.dataUrl) return null;
    return {
      name: entry.name,
      type: entry.type,
      size: entry.size,
      updatedAt: entry.updatedAt,
      buffer: dataUrlToArrayBuffer(entry.dataUrl),
      dataUrl: entry.dataUrl
    };
  },

  // Get all custom sounds
  async getAllSounds() {
    const config = readLocalConfig();
    const results = {};
    for (const [key, entry] of Object.entries(config.soundData || {})) {
      if (entry?.dataUrl) {
        results[key] = {
          name: entry.name,
          type: entry.type,
          size: entry.size,
          updatedAt: entry.updatedAt,
          buffer: dataUrlToArrayBuffer(entry.dataUrl),
          dataUrl: entry.dataUrl
        };
      }
    }
    return results;
  },

  // Remove a custom sound and revert to default
  async deleteSound(key) {
    try {
      const config = readLocalConfig();
      if (config.soundData?.[key]) delete config.soundData[key];
      if (config.soundModes?.[key]) config.soundModes[key] = 'default';
      writeLocalConfig(config);

      await pushSupabaseConfig({
        qr: config.qr || '',
        soundModes: config.soundModes,
        soundData: config.soundData
      });

      window.dispatchEvent(new CustomEvent('crvper_sound_updated', {
        detail: { key, deleted: true }
      }));
      return true;
    } catch (err) {
      console.error('[soundStorage] Failed to delete sound:', err);
      return false;
    }
  },

  // Remove all custom sounds
  async clearAll() {
    try {
      const config = readLocalConfig();
      config.soundData = {};
      config.soundModes = {};
      writeLocalConfig(config);

      await pushSupabaseConfig({
        qr: config.qr || '',
        soundModes: {},
        soundData: {}
      });

      window.dispatchEvent(new CustomEvent('crvper_sound_updated', {
        detail: { all: true, deleted: true }
      }));
      return true;
    } catch (err) {
      console.error('[soundStorage] Failed to clear sounds:', err);
      return false;
    }
  },

  // Fetch the latest config from Supabase and merge into local cache.
  // Called by the audio engine on startup and every 30s.
  async syncFromRemote() {
    try {
      const remote = await fetchSupabaseConfig();
      if (!remote) return false;

      const local = readLocalConfig();
      const remoteTs = new Date(remote.updatedAt || 0).getTime();
      const localTs = local.lastRemoteSync || 0;

      if (remoteTs <= localTs) return false; // No change

      // Remote is newer — update local cache
      const merged = {
        ...local,
        qr: remote.qr || local.qr,
        soundModes: { ...local.soundModes, ...remote.soundModes },
        soundData: { ...local.soundData, ...remote.soundData },
        lastRemoteSync: remoteTs
      };
      writeLocalConfig(merged);

      // Fire events so audio engine re-decodes updated files
      const changedKeys = Object.keys(remote.soundData || {});
      changedKeys.forEach(key => {
        window.dispatchEvent(new CustomEvent('crvper_sound_updated', {
          detail: { key, dataUrl: remote.soundData[key]?.dataUrl, meta: remote.soundData[key] }
        }));
      });
      window.dispatchEvent(new CustomEvent('crvper_settings_updated'));

      return true;
    } catch {
      return false;
    }
  },

  // Get current sound modes (from local cache, always fast)
  getSoundModes() {
    return readLocalConfig().soundModes || {};
  },

  // Set mode for a key without uploading a file
  async setSoundMode(key, mode) {
    const config = readLocalConfig();
    config.soundModes = config.soundModes || {};
    config.soundModes[key] = mode;
    writeLocalConfig(config);

    await pushSupabaseConfig({
      qr: config.qr || '',
      soundModes: config.soundModes,
      soundData: config.soundData || {}
    });

    window.dispatchEvent(new CustomEvent('crvper_settings_updated'));
  },

  // Migrate QR image URL into the local config (called from storage.js)
  setQrInConfig(qrImageUrl) {
    const config = readLocalConfig();
    config.qr = qrImageUrl;
    writeLocalConfig(config);
  },

  // Extract just the QR image URL from the stored envelope
  getQrFromConfig(raw) {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.qr !== undefined) return parsed.qr;
    } catch {}
    return raw; // Plain string (legacy)
  }
};
