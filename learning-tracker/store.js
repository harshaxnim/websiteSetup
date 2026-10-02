import { validateEntries, seedEntries } from './model.js';
const PREFIX = 'learning-tracker:v1:';
export class TrackerStore {
  constructor(platform, onChange) {
    this.platform = platform;
    this.onChange = onChange;
    this.entries = [];
    this.uid = null;
    this.ready = false;
    this.generation = 0;
    this.pending = Promise.resolve();
    this.version = 0;
    this.status = '';
    this.error = false;
  }
  key(uid = this.uid) { return PREFIX + (uid ? `user:${uid}` : 'guest'); }
  readCache(uid) {
    const raw = localStorage.getItem(this.key(uid));
    if (raw === null) return null;
    const record = JSON.parse(raw);
    return { entries: validateEntries(record.entries), dirty: record.dirty === true };
  }
  writeCache(dirty) {
    try {
      localStorage.setItem(this.key(), JSON.stringify({ entries: this.entries, dirty }));
      return true;
    } catch {
      this.setStatus('Device storage is unavailable. Export your list before closing.', true);
      return false;
    }
  }
  setStatus(message, error = false) {
    this.status = message;
    this.error = error;
    this.onChange(this);
  }
  async switchUser(user) {
    const generation = ++this.generation;
    this.uid = user?.uid ?? null;
    this.ready = false;
    this.entries = [];
    this.setStatus(this.uid ? 'Opening your private list…' : 'Opening this device’s list…');
    let cached;
    try { cached = this.readCache(this.uid); } catch {
      this.setStatus('The saved list could not be opened. Import a backup to recover it.', true);
      return;
    }
    if (!this.uid) {
      this.entries = cached?.entries ?? seedEntries();
      this.ready = true;
      if (this.writeCache(false)) this.setStatus(navigator.onLine ? 'Saved on this device · Sign in to sync' : 'Offline · Saved on this device');
      return;
    }
    if (!navigator.onLine) {
      if (cached) {
        this.entries = cached.entries;
        this.ready = true;
        this.setStatus('Offline · Changes stay on this device until you reconnect');
      } else this.setStatus('Go online once to open this account’s private list.', true);
      return;
    }
    try {
      // Existing accounts take precedence over the device guest list. Creation is
      // atomic so two first visits cannot reset an already-created account list.
      const guest = this.readCache(null)?.entries ?? seedEntries();
      const storage = this.platform.getStorage();
      const entries = await storage.transaction(async tx => {
        const document = await tx.get('data/state');
        if (document) return validateEntries(document.value.entries);
        tx.set('data/state', { value: { schemaVersion: 1, entries: guest } });
        return guest;
      });
      if (generation !== this.generation) return;
      this.entries = cached?.dirty ? cached.entries : entries;
      this.ready = true;
      if (!this.writeCache(cached?.dirty ?? false)) return;
      if (cached?.dirty) this.sync();
      else this.setStatus('Synced · Your private list');
    } catch {
      if (generation !== this.generation) return;
      if (cached) {
        this.entries = cached.entries;
        this.ready = true;
      }
      this.setStatus(cached ? 'Sync unavailable · Your device copy is safe. Reconnect to retry.' : 'Could not open your private list. Reconnect or sign out to use this device.', true);
    }
  }
  replace(entries) {
    if (!this.ready) throw new Error('Wait for your list to open before making changes.');
    this.entries = validateEntries(entries);
    this.version++;
    const saved = this.writeCache(Boolean(this.uid));
    if (this.uid) this.sync(saved);
    else if (saved) this.setStatus(navigator.onLine ? 'Saved on this device · Sign in to sync' : 'Offline · Saved on this device');
  }
  sync(locallySaved = true) {
    if (!this.uid || !this.ready) return;
    if (!navigator.onLine) {
      if (locallySaved) this.setStatus('Offline · Saved on this device, sync when reconnected');
      return;
    }
    const uid = this.uid;
    const generation = this.generation;
    const version = this.version;
    const entries = structuredClone(this.entries);
    if (locallySaved) this.setStatus('Syncing · Saved on this device');
    this.pending = this.pending.catch(() => {}).then(async () => {
      if (uid !== this.uid || generation !== this.generation) return;
      try {
        await this.platform.getStorage().saveState({ schemaVersion: 1, entries });
        if (generation !== this.generation || version !== this.version) return;
        if (this.writeCache(false)) this.setStatus('Synced · Your private list');
        else this.setStatus('Synced · Device storage unavailable', true);
      } catch {
        if (generation !== this.generation || version !== this.version) return;
        this.setStatus(locallySaved ? 'Sync unavailable · Saved on this device. Reconnect to retry.' : 'Could not save. Export your list before closing.', true);
      }
    });
  }
  reconnect() {
    if (!this.uid) this.setStatus('Saved on this device · Sign in to sync');
    else {
      let dirty = false;
      try { dirty = this.readCache(this.uid)?.dirty === true; } catch { /* Opening will report invalid caches. */ }
      if (this.ready && dirty) this.sync();
      else this.switchUser(this.platform.getCurrentUser());
    }
  }
}
