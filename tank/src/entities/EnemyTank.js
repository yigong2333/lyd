// ============================================================
//  EnemyTank.js - 敌方坦克（含AI接口）
// ============================================================

import { Tank } from './Tank.js';
import { DIR, DIR_VEC, TILE_SIZE, TileType } from '../config/Colors.js';
import { EnemyTanks } from '../config/TankData.js';
import { AIConfig } from '../config/EnemyAIData.js';
import { randInt, chance, dist } from '../core/Utils.js';
import { spawnExplosion } from './Particle.js';

export class EnemyTank extends Tank {
  constructor(gridX, gridY, typeId = 'scout') {
    const data = EnemyTanks[typeId] || EnemyTanks.scout;
    super(gridX, gridY, data);
    this.typeId = typeId;
    this.isPlayer = false;
    this.score = data.score || 100;
    this.aiType = data.ai || 'patrol';
    this.aiCfg = AIConfig[this.aiType] || AIConfig.patrol;
    this.thinkTimer = 0;
    this.aiDir = DIR.UP;
    this.bossPhase = 0;
    this.isBoss = typeId === 'boss';

    // Boss 体积
    if (this.isBoss) {
      this.w = TILE_SIZE * 1.5;
      this.h = TILE_SIZE * 1.5;
    }
    // 出生点
    this.spawnTime = 1000;
  }

  // AI 决策（由 AISystem 调用）
  think(player, base) {
    const cfg = this.aiCfg;
    switch (this.aiType) {
      case 'patrol':
        this._aiPatrol();
        break;
      case 'chase':
        this._aiChase(player, base);
        break;
      case 'guard':
        this._aiGuard(player);
        break;
      case 'ambush':
        this._aiAmbush(player);
        break;
      case 'boss':
        this._aiBoss(player);
        break;
      case 'suicide':
        this._aiSuicide(player, base);
        break;
    }
    // 随机射击
    if (chance(cfg.shootChance)) {
      this.fire();
    }
    // 正面有目标时射击
    if (player && this._facingTarget(player)) {
      this.fire();
    }
  }

  _aiPatrol() {
    // 随机换方向
    if (chance(0.4) || !this.moving) {
      this.aiDir = randInt(0, 3);
    }
    this._changeDir(this.aiDir);
  }

  _aiChase(player, base) {
    const target = (player && chance(1 - (this.aiCfg.trackBase || 0))) ? player : base;
    if (!target) { this._aiPatrol(); return; }
    this.aiDir = this._dirTo(target);
    this._changeDir(this.aiDir);
  }

  _aiGuard(player) {
    if (player && dist(this.cx, this.cy, player.cx, player.cy) < (this.aiCfg.guardRadius || 5) * TILE_SIZE) {
      this.aiDir = this._dirTo(player);
      this._changeDir(this.aiDir);
    } else {
      this._aiPatrol();
    }
  }

  _aiAmbush(player) {
    if (player && dist(this.cx, this.cy, player.cx, player.cy) < (this.aiCfg.detectRange || 7) * TILE_SIZE) {
      // 预判射击
      this.aiDir = this._dirTo(player);
      this._changeDir(this.aiDir);
      this.fire();
    } else {
      this.moving = false;
    }
  }

  _aiBoss(player) {
    // 多阶段
    const hpRatio = this.hp / this.maxHp;
    const phases = this.aiCfg.phases;
    let phase = 0;
    for (let i = 0; i < phases.length; i++) {
      if (hpRatio <= phases[i].hpRange[1] && hpRatio >= phases[i].hpRange[0]) {
        phase = i; break;
      }
    }
    this.bossPhase = phase;
    const phaseCfg = phases[phase];
    this.speed = (this.data.speed || 1.5) * phaseCfg.moveSpeed * TILE_SIZE;

    // 移动追玩家
    if (player) {
      this.aiDir = this._dirTo(player);
      if (chance(0.3)) this._changeDir(this.aiDir);
    }
    // 阶段射击模式
    if (phaseCfg.pattern === 'spread' && chance(0.3)) {
      this._fireSpread();
    } else if (phaseCfg.pattern === 'barrage' && chance(0.5)) {
      this._fireSpread();
      this.fire();
    } else if (phaseCfg.pattern === 'laser' && chance(0.2)) {
      this.fire();
    }
  }

  _aiSuicide(player, base) {
    // 冲向玩家（或基地）
    const target = (player && chance(0.7)) ? player : base;
    if (!target) { this._aiPatrol(); return; }
    this.aiDir = this._dirTo(target);
    this._changeDir(this.aiDir);
    // 接近后加速冲撞
    const d = dist(this.cx, this.cy, target.cx, target.cy);
    if (d < (this.aiCfg.fuseRange || 2.5) * TILE_SIZE) {
      this.speed = (this.data.speed || 2.6) * (this.aiCfg.speedBoost || 1.6) * TILE_SIZE;
    } else {
      this.speed = (this.data.speed || 2.6) * TILE_SIZE;
    }
  }

  _explode() {
    const g = this._game;
    if (!g || !this.alive) return;
    this.alive = false;
    // 范围伤害：玩家 / 基地
    if (g.player && g.player.alive) {
      if (dist(this.cx, this.cy, g.player.cx, g.player.cy) < TILE_SIZE * 2) {
        g.player.takeDamage(2);
      }
    }
    if (g.level.base && g.level.base.alive) {
      const bx = g.level.base.x + g.level.base.w / 2;
      const by = g.level.base.y + g.level.base.h / 2;
      if (dist(this.cx, this.cy, bx, by) < TILE_SIZE * 2) g.damageBase(1);
    }
    // 破坏周围砖墙
    const gx = Math.floor(this.cx / TILE_SIZE);
    const gy = Math.floor(this.cy / TILE_SIZE);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const w = g.level.walls.get(gx + dx, gy + dy);
        if (w && w.type === TileType.BRICK) w.hit();
      }
    }
    spawnExplosion(g.particles, this.cx, this.cy, '#ff2200', 18);
    g.shake = 10;
    g.audio.sfxExplosion();
    g.score += Math.floor(this.score / 2);
    g.kills++;
    g.ui.addFloatText(this.cx, this.cy, 'BOOM!', '#ff4400');
  }

  _fireSpread() {
    if (this.fireCD > 0) return;
    this.fireCD = this.fireRate;
    if (this._game) this._game.spawnSpreadBullets(this);
  }

  // 朝目标方向（贪心）
  _dirTo(target) {
    if (!target) return randInt(0, 3);
    const dx = target.cx - this.cx;
    const dy = target.cy - this.cy;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? DIR.RIGHT : DIR.LEFT;
    } else {
      return dy > 0 ? DIR.DOWN : DIR.UP;
    }
  }

  // 是否正面朝向目标（同轴且在前方）
  _facingTarget(target) {
    if (!target) return false;
    const dx = target.cx - this.cx;
    const dy = target.cy - this.cy;
    const range = TILE_SIZE * 8;
    switch (this.dir) {
      case DIR.UP:    return dy < 0 && Math.abs(dx) < TILE_SIZE * 0.6 && Math.abs(dy) < range;
      case DIR.DOWN:  return dy > 0 && Math.abs(dx) < TILE_SIZE * 0.6 && Math.abs(dy) < range;
      case DIR.LEFT:  return dx < 0 && Math.abs(dy) < TILE_SIZE * 0.6 && Math.abs(dx) < range;
      case DIR.RIGHT: return dx > 0 && Math.abs(dy) < TILE_SIZE * 0.6 && Math.abs(dx) < range;
    }
    return false;
  }

  update(dt) {
    super.update(dt);
    // 自爆兵：接近目标引信 + 警告闪烁
    if (this.typeId === 'suicide' && this.alive) {
      const g = this._game;
      if (!g) return;
      this.flashTime = Math.max(this.flashTime, 120);
      const targets = [];
      if (g.player && g.player.alive) targets.push(g.player);
      if (g.level.base && g.level.base.alive) targets.push(g.level.base);
      for (const t of targets) {
        const tx = t.cx !== undefined ? t.cx : (t.x + t.w / 2);
        const ty = t.cy !== undefined ? t.cy : (t.y + t.h / 2);
        if (dist(this.cx, this.cy, tx, ty) < TILE_SIZE * 1.3) {
          this._explode();
          return;
        }
      }
    }
  }

  destroy() {
    super.destroy();
  }
}
