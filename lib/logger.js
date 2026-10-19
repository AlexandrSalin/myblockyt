export class Logger {
  constructor(storageKey = "myblockyt_logs") {
    this.storageKey = storageKey;
    this.max = 500;
  }
  async _load() {
    try {
      const s = await chrome.storage.local.get([this.storageKey]);
      return s[this.storageKey] || [];
    } catch (e) {
      return [];
    }
  }
  async _save(arr) {
    try {
      await chrome.storage.local.set({ [this.storageKey]: arr });
    } catch (e) {
      // ignore
    }
  }
  async log(level, ctx, msg, meta) {
    const arr = await this._load();
    arr.push({ t: Date.now(), level, ctx, msg, meta });
    if (arr.length > this.max) arr.splice(0, arr.length - this.max);
    await this._save(arr);
  }
  async info(ctx, msg, meta) { return this.log("info", ctx, msg, meta); }
  async warn(ctx, msg, meta) { return this.log("warn", ctx, msg, meta); }
  async error(ctx, msg, meta) { return this.log("error", ctx, msg, meta); }
  async get(limit = 100) {
    const arr = await this._load();
    return arr.slice(-limit).reverse();
  }
  async clear() {
    try { await chrome.storage.local.set({ [this.storageKey]: [] }); } catch (e) {}
  }
}
