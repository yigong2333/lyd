// ============================================================
//  SpawnSystem.js - 敌方刷新系统
// ============================================================

import { EnemyTank } from '../entities/EnemyTank.js';
import { TILE_SIZE } from '../config/Colors.js';
import { randChoice, chance } from '../core/Utils.js';
import { Powerup } from '../entities/Powerup.js';
import { PowerupTypes } from '../config/TankData.js';

export class SpawnSystem {
  constructor(game) {
    this.game = game;
    this.reset();
  }

  reset() {
    this.waves = [];
    this.waveIndex = 0;
    this.spawnQueue = [];     // 待生成敌人类型队列
    this.spawnTimer = 0;
    this.spawnInterval = 2500;
    this.maxAlive = 4;
    this.allWavesDone = false;
    this.endlessWave = 0;
    this.endlessTimer = 0;
    this.goldenTimer = 0;
  }

  // 加载关卡波次
  loadWaves(waves) {
    this.waves = waves;
    this.waveIndex = 0;
    this.allWavesDone = false;
    this._fillQueue();
  }

  // 无尽模式
  startEndless() {
    this.waves = [];
    this.waveIndex = 0;
    this.allWavesDone = false;
    this.endlessWave = 1;
    this.endlessTimer = 0;
    this.goldenTimer = 18000;
    this._spawnEndlessWave();
  }

  _fillQueue() {
    if (this.waveIndex >= this.waves.length) {
      this.allWavesDone = true;
      return;
    }
    const wave = this.waves[this.waveIndex];
    this.spawnQueue = wave.types.slice();
    this.spawnInterval = wave.interval || 2500;
    this.spawnTimer = 1000; // 波次开始延迟
    this.game.ui.showWaveText(`WAVE ${this.waveIndex + 1}/${this.waves.length}`);
  }

  _spawnEndlessWave() {
    const w = this.endlessWave;
    const types = [];
    const count = 3 + Math.floor(w / 2);
    const pool = ['scout', 'striker'];
    if (w >= 2) pool.push('striker');
    if (w >= 3) pool.push('heavy');
    if (w >= 4) pool.push('sniper');
    for (let i = 0; i < count; i++) types.push(randChoice(pool));
    if (w % 5 === 0) types.push('boss');
    this.spawnQueue = types;
    this.spawnInterval = Math.max(1200, 2500 - w * 100);
    this.spawnTimer = 1500;
    this.game.ui.showWaveText(`WAVE ${w}`);
  }

  update(dt) {
    // 生成队列
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.game.enemies.length < this.maxAlive) {
        const typeId = this.spawnQueue.shift();
        this._spawnEnemy(typeId);
        this.spawnTimer = this.spawnInterval;
      }
    } else if (!this.allWavesDone) {
      // 当前波次清空且敌人全灭 -> 下一波
      if (this.game.enemies.length === 0) {
        this.waveIndex++;
        if (this.waveIndex < this.waves.length) {
          this._fillQueue();
        } else {
          this.allWavesDone = true;
        }
      }
    }

    // 无尽模式
    if (this.game.mode === 'endless' && this.game.enemies.length === 0 && this.spawnQueue.length === 0) {
      this.endlessWave++;
      this.endlessTimer += dt;
      if (this.endlessTimer > 2000) {
        this.endlessTimer = 0;
        this._spawnEndlessWave();
      }
    }

    // 无尽模式金色坦克（高分彩蛋）
    if (this.game.mode === 'endless') {
      this.goldenTimer -= dt;
      if (this.goldenTimer <= 0 && this.game.enemies.length < this.maxAlive) {
        this.goldenTimer = 25000 + Math.random() * 15000;
        this._spawnGolden();
      }
    }

    // 无尽模式空投道具
    if (this.game.mode === 'endless') {
      this._dropTimer = (this._dropTimer || 0) + dt;
      if (this._dropTimer > 30000) {
        this._dropTimer = 0;
        this._spawnRandomPowerup();
      }
    }
  }

  _spawnEnemy(typeId) {
    const level = this.game.level;
    const spawns = level.enemySpawns || [{ x: 1, y: 0 }];
    const spawn = spawns[Math.floor(Math.random() * spawns.length)];
    // 安全检查：如果出生点被墙挡住，找附近空地
    let sx = spawn.x, sy = spawn.y;
    if (level.walls.has(sx, sy) || level.tileBlocksTank(sx, sy)) {
      const found = this._findNearbyEmpty(sx, sy);
      if (found) { sx = found.x; sy = found.y; }
    }
    const enemy = new EnemyTank(sx, sy, typeId);
    enemy.setGame(this.game);
    this.game.enemies.push(enemy);
    this.game.audio.sfxLevelStart && this.game.audio.sfxButton();
  }

  // 在出生点附近搜索空地（螺旋搜索）
  _findNearbyEmpty(sx, sy) {
    const level = this.game.level;
    for (let radius = 1; radius <= 5; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const nx = sx + dx, ny = sy + dy;
          if (nx < 0 || ny < 0 || nx >= 26 || ny >= 26) continue;
          if (!level.walls.has(nx, ny) && !level.tileBlocksTank(nx, ny)) {
            return { x: nx, y: ny };
          }
        }
      }
    }
    return null;
  }

  _spawnRandomPowerup() {
    const pos = this.game.findEmptyTile();
    if (!pos) return;
    const type = randChoice(PowerupTypes);
    const p = new Powerup(pos.x * TILE_SIZE + 4, pos.y * TILE_SIZE + 4, type);
    this.game.powerups.push(p);
  }

  _spawnGolden() {
    const level = this.game.level;
    const spawns = level.enemySpawns || [{ x: 1, y: 0 }];
    const spawn = spawns[Math.floor(Math.random() * spawns.length)];
    const enemy = new EnemyTank(spawn.x, spawn.y, 'golden');
    enemy.setGame(this.game);
    this.game.enemies.push(enemy);
    this.game.ui.showWaveText('金色坦克出现!');
    this.game.audio.sfxGolden();
  }

  // 击毁敌人时掉落道具
  maybeDropPowerup(x, y, isBoss = false) {
    if (isBoss || chance(0.15)) {
      const type = randChoice(PowerupTypes);
      const p = new Powerup(x - 12, y - 12, type);
      this.game.powerups.push(p);
    }
  }
}
