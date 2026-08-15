// ============================================================
//  Storage.js - localStorage存档管理器
//  保存：最高分、金币、解锁飞机、排行榜、当前选择配置
// ============================================================

const KEY = 'stellar_fighter_save_v1';

const DEFAULT_SAVE = {
  bestScore: 0,
  gold: 0,
  unlockedShips: ['sf01', 'sf02'],   // sf03需通关第1关解锁
  selectedShip: 'sf01',
  selectedWingman: 'attack',
  clearedStages: [],                 // 通关关卡id
  ranking: [],                       // [{name, score, date}]
  settings: {
    sfx: 1, bgm: 1,
  },
};

export class Storage {
  constructor() {
    this.data = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULT_SAVE };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SAVE, ...parsed };
    } catch (e) {
      console.warn('存档读取失败，使用默认存档', e);
      return { ...DEFAULT_SAVE };
    }
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('存档保存失败', e);
    }
  }

  // ---------- 属性访问 ----------
  get bestScore() { return this.data.bestScore; }
  setBestScore(v) { if (v > this.data.bestScore) { this.data.bestScore = v; this.save(); } }

  get gold() { return this.data.gold; }
  addGold(v) { this.data.gold += v; this.save(); }

  get selectedShip() { return this.data.selectedShip; }
  setSelectedShip(id) { this.data.selectedShip = id; this.save(); }

  get selectedWingman() { return this.data.selectedWingman; }
  setSelectedWingman(id) { this.data.selectedWingman = id; this.save(); }

  isShipUnlocked(id) { return this.data.unlockedShips.includes(id); }
  unlockShip(id) {
    if (!this.data.unlockedShips.includes(id)) {
      this.data.unlockedShips.push(id);
      this.save();
    }
  }

  isStageCleared(id) { return this.data.clearedStages.includes(id); }
  markStageCleared(id) {
    if (!this.data.clearedStages.includes(id)) {
      this.data.clearedStages.push(id);
      this.save();
    }
  }

  get ranking() { return this.data.ranking; }
  addRanking(score, name = 'Pilot') {
    this.data.ranking.push({ name, score, date: Date.now() });
    this.data.ranking.sort((a, b) => b.score - a.score);
    this.data.ranking = this.data.ranking.slice(0, 10);
    this.save();
  }

  // 重置（调试用）
  resetAll() {
    this.data = { ...DEFAULT_SAVE };
    this.save();
  }
}

export const storage = new Storage();
export default storage;
