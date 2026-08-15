// ============================================================
//  Storage.js - localStorage 存档管理
// ============================================================

const KEY = 'lyd_tank_battle_save';

const DEFAULT_SAVE = {
  bestScore: 0,
  gold: 0,
  selectedTank: 'scholar',
  clearedLevels: [],
  ranking: [],
  totalKills: 0,
  settings: { sfx: 1, bgm: 1 },
};

class StorageManager {
  constructor() {
    this._cache = null;
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      this._cache = raw ? { ...DEFAULT_SAVE, ...JSON.parse(raw) } : { ...DEFAULT_SAVE };
    } catch (e) {
      this._cache = { ...DEFAULT_SAVE };
    }
    return this._cache;
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this._cache));
    } catch (e) { /* ignore */ }
  }

  get data() { return this._cache; }

  get bestScore() { return this._cache.bestScore; }
  set bestScore(v) { this._cache.bestScore = v; this.save(); }

  get gold() { return this._cache.gold; }
  setGold(v) { this._cache.gold = v; this.save(); }

  get selectedTank() { return this._cache.selectedTank; }
  setSelectedTank(id) { this._cache.selectedTank = id; this.save(); }

  get clearedLevels() { return this._cache.clearedLevels; }
  markLevelCleared(id) {
    if (!this._cache.clearedLevels.includes(id)) {
      this._cache.clearedLevels.push(id);
      this.save();
    }
  }

  get totalKills() { return this._cache.totalKills; }
  addKills(n) { this._cache.totalKills += n; this.save(); }

  getRanking() { return this._cache.ranking.slice(); }
  addRanking(entry) {
    this._cache.ranking.push(entry);
    this._cache.ranking.sort((a, b) => b.score - a.score);
    this._cache.ranking = this._cache.ranking.slice(0, 10);
    this.save();
  }

  getSettings() { return this._cache.settings; }
  setSettings(s) { this._cache.settings = { ...this._cache.settings, ...s }; this.save(); }

  reset() {
    this._cache = { ...DEFAULT_SAVE };
    this.save();
  }
}

export const storage = new StorageManager();
