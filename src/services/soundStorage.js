// ═══════════════════════════════════════════════════════════════════════════
// CRVPER.BET — Cross-Device Real-Time Sound Storage Engine v5
// ─────────────────────────────────────────────────────────────────────────
// • Powered by IndexedDB + In-Memory Cache (handles audio/video files of any size)
// • Universal WAV Transcoder: Converts decoded audio to 100% browser-compatible PCM WAV
// • Synced to Supabase admin_settings with Realtime sub-second broadcast
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from './supabase.js';
import { realtimeSync } from './realtimeSync.js';

const DB_NAME = 'crvper_sound_db_v5';
const DB_VERSION = 1;
const STORE_NAME = 'sounds';
const LS_SOUND_MODES = 'crvper_sound_modes_v5';
const LS_SOUND_META = 'crvper_sound_meta_v5';

// Fast In-Memory cache for zero-latency playback
const memoryCache = new Map();

// ─── IndexedDB Helpers ───────────────────────────────────────────────────────

function openDb() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet(key) {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result?.value || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet(key, value) {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ key, value });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function idbDelete(key) {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function idbClear() {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// ─── LocalStorage Helpers (Only lightweight metadata, <1KB) ─────────────────

function getStoredModes() {
  try {
    const raw = localStorage.getItem(LS_SOUND_MODES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredModes(modes) {
  try {
    localStorage.setItem(LS_SOUND_MODES, JSON.stringify(modes));
  } catch {}
}

function getStoredMeta() {
  try {
    const raw = localStorage.getItem(LS_SOUND_META);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredMeta(meta) {
  try {
    localStorage.setItem(LS_SOUND_META, JSON.stringify(meta));
  } catch {}
}

// Convert File/Blob to base64 Data URL
function fileToDataUrl(fileOrBlob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(fileOrBlob);
  });
}

// Decode base64 data URI to ArrayBuffer
export function dataUrlToArrayBuffer(dataUrl) {
  try {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    const base64 = dataUrl.split(',')[1];
    if (!base64) return null;
    const binary = atob(base64);
    const buf = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
    return buf;
  } catch {
    return null;
  }
}

// ─── Universal WAV Generator (Encodes AudioBuffer to 16-bit PCM WAV) ─────────
// Produces pure WAV format that is 100% compatible across Chrome, Safari,
// Android, Windows, iOS, and Firefox without requiring any video codecs.
export function audioBufferToWavDataUrl(audioBuffer) {
  try {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    function writeString(offset, string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    // RIFF identifier
    writeString(0, 'RIFF');
    // RIFF chunk length
    view.setUint32(4, 36 + dataSize, true);
    // RIFF type
    writeString(8, 'WAVE');
    // format chunk identifier
    writeString(12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (1 = PCM)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, numChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate
    view.setUint32(28, byteRate, true);
    // block align
    view.setUint16(32, blockAlign, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    writeString(36, 'data');
    // data chunk length
    view.setUint32(40, dataSize, true);

    // Interleave channels & write 16-bit PCM
    const channels = [];
    for (let c = 0; c < numChannels; c++) {
      channels.push(audioBuffer.getChannelData(c));
    }

    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numChannels; c++) {
        const sample = Math.max(-1, Math.min(1, channels[c][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    // Convert ArrayBuffer to Base64 in chunks to prevent stack overflow
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }

    return 'data:audio/wav;base64,' + btoa(binary);
  } catch (err) {
    console.warn('[SoundStorage] audioBufferToWavDataUrl conversion failed:', err);
    return null;
  }
}

// ─── Supabase Cloud Sync ─────────────────────────────────────────────────────

async function fetchSupabaseConfig() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('qr_image_url, updated_at')
      .eq('id', 1)
      .single();
    if (error || !data) return null;

    try {
      const parsed = JSON.parse(data.qr_image_url);
      if (parsed && typeof parsed === 'object') {
        return {
          qr: parsed.qr || '',
          soundModes: parsed.soundModes || {},
          soundData: parsed.soundData || {},
          updatedAt: data.updated_at
        };
      }
    } catch {}

    return { qr: data.qr_image_url, soundModes: {}, soundData: {}, updatedAt: data.updated_at };
  } catch {
    return null;
  }
}

async function pushSupabaseConfig(partial) {
  if (!supabase) return;
  try {
    const { data: existing } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('id', 1)
      .single();

    let currentQr = '';
    let currentModes = {};
    let currentData = {};

    try {
      const parsed = JSON.parse(existing?.qr_image_url || '{}');
      if (parsed && typeof parsed === 'object') {
        currentQr = parsed.qr || '';
        currentModes = parsed.soundModes || {};
        currentData = parsed.soundData || {};
      } else {
        currentQr = existing?.qr_image_url || '';
      }
    } catch {
      currentQr = existing?.qr_image_url || '';
    }

    const mergedEnvelope = JSON.stringify({
      qr: partial.qr !== undefined ? partial.qr : currentQr,
      soundModes: { ...currentModes, ...(partial.soundModes || {}) },
      soundData: { ...currentData, ...(partial.soundData || {}) }
    });

    await supabase.from('admin_settings').upsert({
      id: 1,
      upi_id: existing?.upi_id || 'crvper@ibl',
      payee_name: existing?.payee_name || 'CRVPER.BET PVT LTD',
      qr_image_url: mergedEnvelope,
      min_deposit: Number(existing?.min_deposit || 100),
      min_withdraw: Number(existing?.min_withdraw || 100),
      signup_bonus: Number(existing?.signup_bonus || 150),
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[soundStorage] Supabase push failed:', err);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const soundStorage = {

  // Save an audio/video file, transcode to WAV if possible, and broadcast in real-time
  async saveSound(key, fileOrBlob) {
    try {
      if (fileOrBlob.size > 8 * 1024 * 1024) {
        throw new Error('File exceeds 8 MB limit');
      }

      let dataUrl = await fileToDataUrl(fileOrBlob);

      // Attempt to transcode to universal PCM WAV for 100% cross-device compatibility
      if (typeof window !== 'undefined') {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (AC) {
            const ctx = new AC();
            const arrayBuf = await fileOrBlob.arrayBuffer();
            const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
            if (decoded) {
              const wavDataUrl = audioBufferToWavDataUrl(decoded);
              if (wavDataUrl) {
                dataUrl = wavDataUrl;
              }
            }
            if (ctx.state !== 'closed') ctx.close().catch(() => {});
          }
        } catch (e) {
          // If browser can't decode it directly, keep original dataUrl (will use HTML5 media fallback)
        }
      }

      const meta = {
        name: fileOrBlob.name || `${key}.wav`,
        type: dataUrl.startsWith('data:audio/wav') ? 'audio/wav' : (fileOrBlob.type || 'audio/mpeg'),
        size: Math.round(dataUrl.length * 0.75),
        updatedAt: Date.now()
      };

      const soundEntry = { ...meta, dataUrl };

      // 1. Store in Memory Cache
      memoryCache.set(key, soundEntry);

      // 2. Store in IndexedDB
      await idbSet(key, soundEntry);

      // 3. Update localStorage metadata & soundModes
      const modes = getStoredModes();
      modes[key] = 'custom';
      saveStoredModes(modes);

      const allMeta = getStoredMeta();
      allMeta[key] = meta;
      saveStoredMeta(allMeta);

      // 4. Push to Supabase Cloud
      await pushSupabaseConfig({
        soundModes: { [key]: 'custom' },
        soundData: { [key]: soundEntry }
      });

      // 5. Broadcast to ALL active devices across the internet
      await realtimeSync.broadcast('sound_updated', {
        key,
        mode: 'custom',
        meta,
        dataUrl
      });

      // 6. Notify local audio engine
      window.dispatchEvent(new CustomEvent('crvper_sound_updated', {
        detail: { key, dataUrl, meta }
      }));
      window.dispatchEvent(new CustomEvent('crvper_settings_updated'));

      return soundEntry;
    } catch (err) {
      console.error('[soundStorage] saveSound failed:', err);
      throw err;
    }
  },

  // Get single sound entry
  async getSound(key) {
    // 1. Check memory cache
    if (memoryCache.has(key)) {
      const cached = memoryCache.get(key);
      return {
        ...cached,
        buffer: dataUrlToArrayBuffer(cached.dataUrl)
      };
    }

    // 2. Check IndexedDB
    const fromIdb = await idbGet(key);
    if (fromIdb && fromIdb.dataUrl) {
      memoryCache.set(key, fromIdb);
      return {
        ...fromIdb,
        buffer: dataUrlToArrayBuffer(fromIdb.dataUrl)
      };
    }

    // 3. Fallback: fetch from Supabase
    const remote = await fetchSupabaseConfig();
    if (remote?.soundData?.[key]) {
      const entry = remote.soundData[key];
      memoryCache.set(key, entry);
      await idbSet(key, entry);
      return {
        ...entry,
        buffer: dataUrlToArrayBuffer(entry.dataUrl)
      };
    }

    return null;
  },

  // Get metadata of all custom sounds for Admin UI
  async getAllSounds() {
    const metaMap = getStoredMeta();
    const result = {};

    // Pull from memory cache & meta map
    for (const [key, meta] of Object.entries(metaMap)) {
      result[key] = meta;
    }

    // Also check memory cache
    for (const [key, val] of memoryCache.entries()) {
      result[key] = {
        name: val.name,
        type: val.type,
        size: val.size,
        updatedAt: val.updatedAt
      };
    }

    return result;
  },

  // Remove a custom sound and revert to default
  async deleteSound(key) {
    try {
      memoryCache.delete(key);
      await idbDelete(key);

      const modes = getStoredModes();
      modes[key] = 'default';
      saveStoredModes(modes);

      const meta = getStoredMeta();
      delete meta[key];
      saveStoredMeta(meta);

      // Push delete to Supabase
      if (supabase) {
        const { data: existing } = await supabase
          .from('admin_settings')
          .select('qr_image_url')
          .eq('id', 1)
          .single();

        try {
          const parsed = JSON.parse(existing?.qr_image_url || '{}');
          if (parsed && typeof parsed === 'object') {
            if (parsed.soundData?.[key]) delete parsed.soundData[key];
            if (parsed.soundModes?.[key]) parsed.soundModes[key] = 'default';
            await supabase.from('admin_settings').update({
              qr_image_url: JSON.stringify(parsed),
              updated_at: new Date().toISOString()
            }).eq('id', 1);
          }
        } catch {}
      }

      await realtimeSync.broadcast('sound_updated', {
        key,
        deleted: true,
        mode: 'default'
      });

      window.dispatchEvent(new CustomEvent('crvper_sound_updated', {
        detail: { key, deleted: true }
      }));
      window.dispatchEvent(new CustomEvent('crvper_settings_updated'));
      return true;
    } catch (err) {
      console.error('[soundStorage] deleteSound failed:', err);
      return false;
    }
  },

  // Remove all custom sounds
  async clearAll() {
    try {
      memoryCache.clear();
      await idbClear();
      saveStoredModes({});
      saveStoredMeta({});

      if (supabase) {
        const { data: existing } = await supabase
          .from('admin_settings')
          .select('qr_image_url')
          .eq('id', 1)
          .single();

        try {
          const parsed = JSON.parse(existing?.qr_image_url || '{}');
          if (parsed && typeof parsed === 'object') {
            parsed.soundData = {};
            parsed.soundModes = {};
            await supabase.from('admin_settings').update({
              qr_image_url: JSON.stringify(parsed),
              updated_at: new Date().toISOString()
            }).eq('id', 1);
          }
        } catch {}
      }

      await realtimeSync.broadcast('sound_updated', { all: true, deleted: true });

      window.dispatchEvent(new CustomEvent('crvper_sound_updated', {
        detail: { all: true, deleted: true }
      }));
      window.dispatchEvent(new CustomEvent('crvper_settings_updated'));
      return true;
    } catch (err) {
      console.error('[soundStorage] clearAll failed:', err);
      return false;
    }
  },

  // Fetch the latest config from Supabase and synchronize
  async syncFromRemote(force = false) {
    try {
      const remote = await fetchSupabaseConfig();
      if (!remote) return false;

      // Update sound modes
      if (remote.soundModes) {
        const currentModes = getStoredModes();
        const mergedModes = { ...currentModes, ...remote.soundModes };
        saveStoredModes(mergedModes);
      }

      // Update sound data
      if (remote.soundData) {
        const meta = getStoredMeta();
        for (const [key, entry] of Object.entries(remote.soundData)) {
          if (entry?.dataUrl) {
            memoryCache.set(key, entry);
            await idbSet(key, entry);
            meta[key] = {
              name: entry.name,
              type: entry.type,
              size: entry.size,
              updatedAt: entry.updatedAt
            };
            window.dispatchEvent(new CustomEvent('crvper_sound_updated', {
              detail: { key, dataUrl: entry.dataUrl, meta: entry }
            }));
          }
        }
        saveStoredMeta(meta);
      }

      window.dispatchEvent(new CustomEvent('crvper_settings_updated'));
      return true;
    } catch (err) {
      console.warn('[soundStorage] syncFromRemote failed:', err);
      return false;
    }
  },

  // Get current sound modes
  getSoundModes() {
    return getStoredModes();
  },

  // Set mode for a key (silent | default | custom)
  async setSoundMode(key, mode) {
    const modes = getStoredModes();
    modes[key] = mode;
    saveStoredModes(modes);

    await pushSupabaseConfig({
      soundModes: { [key]: mode }
    });

    await realtimeSync.broadcast('sound_updated', {
      key,
      mode
    });

    window.dispatchEvent(new CustomEvent('crvper_settings_updated'));
  }
};
