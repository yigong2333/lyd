// ============================================================
//  Spawner.js - 波次生成器（解析WaveData的声明式事件）
// ============================================================

import { Stage1, Stage2, Stage3 } from './WaveData.js';
import { TAU, rand } from '../core/Utils.js';

export class Spawner {
  constructor(game) {
    this.game = game;
    this.stage = null;
    this.mode = 'campaign';    // campaign | endless
    this.stageTime = 0;
    this.eventCursor = 0;
    this.bossSpawned = false;
    this.stageComplete = false;
    this.endlessRound = 0;
    this.endlessTimer = 0;
    this.endlessNextElite = 0;
    this.goldenTimer = 20000;
    this.progress = 0;          // 0~1 用于HUD显示
  }

  // ---------- 开始 ----------
  startCampaign(stageId) {
    const map = { 1: Stage1, 2: Stage2, 3: Stage3 };
    this.stage = map[stageId] || Stage1;
    this.mode = 'campaign';
    this.stageTime = 0;
    this.eventCursor = 0;
    this.bossSpawned = false;
    this.stageComplete = false;
    this.progress = 0;
    this.game.stageEnemyHpMul = this.stage.enemyHpMul;
    this.game.stageName = this.stage.name;
    this.goldenTimer = 20000;
  }

  startEndless() {
    this.mode = 'endless';
    this.stage = null;
    this.stageTime = 0;
    this.endlessRound = 1;
    this.endlessTimer = 0;
    this.endlessNextElite = 15000;
    this.endlessNextWave = 0;
    this.endlessMiniBoss = 25000;
    this.bossSpawned = false;
    this.stageComplete = false;
    this.game.stageName = `ENDLESS · Round ${this.endlessRound}`;
    this.game.stageEnemyHpMul = 1 + 0.2 * (this.endlessRound - 1);
    this.goldenTimer = 15000;
    this.progress = 0;
  }

  // ---------- 每帧更新 ----------
  update(dt) {
    this.stageTime += dt;
    if (this.mode === 'campaign') this._updateCampaign(dt);
    else                          this._updateEndless(dt);
  }

  _updateCampaign(dt) {
    const events = this.stage.events;
    while (this.eventCursor < events.length && events[this.eventCursor].t <= this.stageTime) {
      this._runEvent(events[this.eventCursor]);
      this.eventCursor++;
    }
    // 进度（不含Boss战部分：Boss战为最后10%）
    const nonBossT = this.stage.duration * 0.9;
    this.progress = Math.min(1, this.stageTime / nonBossT);
    // 随机财宝机乱入
    this.goldenTimer -= dt;
    if (this.goldenTimer <= 0 && !this.game.inBossBattle && !this.stageComplete) {
      this.goldenTimer = 20000 + Math.random() * 16000;
      this._spawnGolden();
    }
    // 如果Boss已被击杀，则关卡完成
    if (this.bossSpawned && this.game.bosses.every(b => b.dead)) {
      this.stageComplete = true;
    }
  }

  _runEvent(ev) {
    const g = this.game;
    switch (ev.type) {
      case 'spawn':
        this._spawn(ev.key, ev.x, ev.y, ev.opts); break;
      case 'formation':
        this._formation(ev); break;
      case 'elite':
        this._spawn('elite', ev.x, ev.y); break;
      case 'bomber':
        this._spawn('bomber', ev.x, ev.y); break;
      case 'boss':
        g.spawnBoss(ev.bossId);
        this.bossSpawned = true;
        break;
      case 'drop': {
        const P = g.pickupPool.acquire();
        P.setup(ev.pickup, g.width * ev.x, ev.y);
        g.pickups.push(P);
        break;
      }
      case 'bg':
        g.addFloat(ev.msg, g.width/2, g.height * 0.2, '#fff');
        break;
    }
  }

  _spawn(key, x, y, opts = {}) {
    const g = this.game;
    const e = g.enemyPool.acquire();
    const px = (x <= 1 ? x * g.width : x);
    const py = (y <= 0 ? y - 0 : y);
    e.spawn(key, px, py, g, opts);
    g.enemies.push(e);
  }

  _formation(ev) {
    const g = this.game;
    const { key, n, pattern, y, spacing = 30 } = ev;
    const startX = ev.x !== undefined ? (ev.x <= 1 ? ev.x * g.width : ev.x) : g.width/2;
    const sy = y;
    switch (pattern) {
      case 'V': {
        const side = ev.side || 'center';
        let ox;
        if (side === 'left')       ox = g.width * 0.18;
        else if (side === 'right') ox = g.width * 0.82;
        else                       ox = g.width / 2;
        for (let i = 0; i < n; i++) {
          const row = Math.floor(i / 2);
          const side2 = (i % 2 === 0 ? -1 : 1);
          const px = ox + side2 * (row + 1) * spacing;
          const py = sy - row * spacing * 0.8;
          this._spawn(key, px, py);
        }
        break;
      }
      case 'DOUBLE_V': {
        const ox = g.width * 0.3;
        for (let i = 0; i < n/2; i++) {
          const row = i;
          this._spawn(key, ox - row*spacing*0.6, sy - row*spacing*0.8);
          this._spawn(key, ox + (g.width*0.4) + row*spacing*0.6, sy - row*spacing*0.8);
        }
        break;
      }
      case 'LINE': {
        const side = ev.side || 'center';
        const ex = (side === 'right') ? g.width - 80 : 80;
        for (let i = 0; i < n; i++) {
          const px = (side === 'center') ? (startX + ev.xOffset || 0) : ex;
          const py = sy + i * (ev.spacingY || spacing);
          this._spawn(key, px, py);
        }
        break;
      }
      case 'LINE_H': {
        for (let i = 0; i < n; i++) {
          const px = g.width * ( (i + 0.5) / n );
          this._spawn(key, px, sy);
        }
        break;
      }
      case 'HORIZONTAL_SINE': {
        for (let i = 0; i < n; i++) {
          const px = g.width * ( (i + 0.5) / n );
          const py = sy + (i % 2 === 0 ? -20 : 20);
          const d = (ev.delay || 0) * i;
          setTimeout(() => {
            if (!this.game.isPlaying()) return;
            this._spawn(key, px, py);
          }, d);
        }
        break;
      }
      case 'WAVE_BOTH': {
        const half = Math.ceil(n / 2);
        for (let i = 0; i < half; i++) {
          const px1 = 50 + i * 20;
          const px2 = g.width - 50 - i * 20;
          const py = sy + i * spacing * 0.4;
          this._spawn(key, px1, py);
          this._spawn(key, px2, py);
        }
        break;
      }
      case 'SCATTER_TOP': {
        for (let i = 0; i < n; i++) {
          const px = 60 + Math.random() * (g.width - 120);
          const py = sy - Math.random() * 200;
          setTimeout(() => {
            if (!this.game.isPlaying()) return;
            this._spawn(key, px, py);
          }, i * 180);
        }
        break;
      }
      case 'RUSH': {
        for (let i = 0; i < n; i++) {
          const px = 40 + (g.width - 80) * ((i + Math.random()*0.4) / Math.max(1, n - 1));
          const py = sy - Math.random() * 180;
          setTimeout(() => {
            if (!this.game.isPlaying()) return;
            this._spawn(key, px, py);
          }, i * 100);
        }
        break;
      }
      default: {
        for (let i = 0; i < n; i++) this._spawn(key, startX + rand(-40,40), sy + rand(-40,40));
      }
    }
  }

  // ---------- 无尽模式 ----------
  _updateEndless(dt) {
    this.endlessTimer += dt;
    const hpMul = 1 + 0.2 * (this.endlessRound - 1);
    const bulletMul = 1 + 0.15 * (this.endlessRound - 1);
    this.game.stageEnemyHpMul = hpMul;

    // 波次轮换：每15s一组编队
    const cycleT = this.endlessTimer % 15000;
    if (cycleT < dt * 2 && this.endlessTimer > 0) {
      // 一个新波次
      const pats = ['V','DOUBLE_V','WAVE_BOTH','LINE_H','SCATTER_TOP','HORIZONTAL_SINE'];
      const keys = ['drone','drone_wave'];
      const key = this.endlessRound > 3 && Math.random() < 0.3 ? 'striker' : keys[Math.floor(Math.random()*keys.length)];
      this._formation({
        key, n: 8 + Math.floor(this.endlessRound),
        pattern: pats[Math.floor(Math.random() * pats.length)],
        y: -40
      });
      // 每波结束丢道具
      setTimeout(() => {
        if (!this.game.isPlaying()) return;
        const P = this.game.pickupPool.acquire();
        const drops = ['$','$','P','E','HP','B'];
        P.setup(drops[Math.floor(Math.random()*drops.length)],
          this.game.width * rand(0.2, 0.8), -20);
        this.game.pickups.push(P);
      }, 8000);
    }

    // 精英
    this.endlessNextElite -= dt;
    if (this.endlessNextElite <= 0) {
      this.endlessNextElite = 15000 - Math.min(8000, this.endlessRound * 700);
      this._spawn('elite', rand(0.2, 0.8) * this.game.width, -40);
      if (this.endlessRound > 2) this._spawn('bomber', rand(0.2, 0.8) * this.game.width, -40);
    }

    // 随机财宝机乱入
    this.goldenTimer -= dt;
    if (this.goldenTimer <= 0) {
      this.goldenTimer = Math.max(9000, 20000 - this.endlessRound * 600) + Math.random() * 8000;
      this._spawnGolden();
    }

    // Mini Boss
    this.endlessMiniBoss -= dt;
    if (this.endlessMiniBoss <= 0 && !this.game.bosses.some(b => !b.dead)) {
      this.endlessMiniBoss = 30000;
      const bossList = ['crab', 'carrier', 'abyss'];
      const roundBoss = bossList[(this.endlessRound - 1) % bossList.length];
      this.game.spawnBoss(roundBoss);
    }

    // 每打完一个Boss，下一轮
    const liveBoss = this.game.bosses.filter(b => !b.dead).length;
    if (liveBoss === 0 && this.game.bosses.length > 0) {
      // 清理已死boss数组
      this.game.bosses.length = 0;
      this.endlessRound++;
      this.game.stageName = `ENDLESS · Round ${this.endlessRound}`;
      this.game.addFloat(`ROUND ${this.endlessRound} START`, this.game.width/2, this.game.height*0.4, '#fff', 'big');
    }

    this.progress = (this.endlessTimer % 15000) / 15000;
  }

  _spawnGolden() {
    const g = this.game;
    const e = g.enemyPool.acquire();
    e.spawn('golden', rand(g.width * 0.15, g.width * 0.85), -30, g);
    g.enemies.push(e);
    g.addFloat('GOLDEN INCOMING!', g.width / 2, g.height * 0.25, '#ffd700', 'big');
    g.audio.sfxWarn();
  }
}

export default Spawner;
