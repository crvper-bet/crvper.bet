// IndexedDB Persistent Audio Vault for CRVPER.BET
// Bypasses browser localStorage 5MB limit so users can upload high-quality
// MP3/WAV/M4A audio files of any size from mobile phones and PCs.

const DB_NAME = 'crvper_audio_vault_v1';
const STORE_NAME = 'custom_sounds';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const soundStorage = {
  // Save an audio file (File or Blob or Base64) to IndexedDB
  async saveSound(key, fileOrBlob) {
    try {
      const db = await openDB();
      const arrayBuffer = await fileOrBlob.arrayBuffer();
      const meta = {
        name: fileOrBlob.name || `${key}-custom.mp3`,
        type: fileOrBlob.type || 'audio/mpeg',
        size: fileOrBlob.size || arrayBuffer.byteLength,
        buffer: arrayBuffer,
        updatedAt: Date.now()
      };

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(meta, key);

        req.onsuccess = () => {
          // Notify sound engine and components across the app
          window.dispatchEvent(new CustomEvent('crvper_sound_updated', {
            detail: { key, meta }
          }));
          resolve(meta);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error('[soundStorage] Failed to save sound:', err);
      throw err;
    }
  },

  // Retrieve raw audio entry by key
  async getSound(key) {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  // Retrieve all custom sounds as a map: { [key]: { name, type, size, buffer } }
  async getAllSounds() {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.openCursor();
        const results = {};

        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            results[cursor.key] = cursor.value;
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        req.onerror = () => resolve({});
      });
    } catch {
      return {};
    }
  },

  // Remove a custom sound (reverts to default synthesizer)
  async deleteSound(key) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);

        req.onsuccess = () => {
          window.dispatchEvent(new CustomEvent('crvper_sound_updated', {
            detail: { key, deleted: true }
          }));
          resolve(true);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error('[soundStorage] Failed to delete sound:', err);
      return false;
    }
  },

  // Remove all custom sounds
  async clearAll() {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();

        req.onsuccess = () => {
          window.dispatchEvent(new CustomEvent('crvper_sound_updated', {
            detail: { all: true, deleted: true }
          }));
          resolve(true);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error('[soundStorage] Failed to clear sounds:', err);
      return false;
    }
  }
};
