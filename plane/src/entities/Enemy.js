// ============================================================
//  Enemy.js - 敌机实体（5种基础类型 + 行为模式）
// ============================================================

import { Entity } from './Entity.js';
import { Colors } from '../config/Colors.js';
import { EnemyData } from '../config/EnemyData.js';
import {
  TAU, rand, randSign, chance, pick, clamp, drawGlowCircle, drawGlowPoly,
  angleBetween, dist, sin01
} from '../core/Utils.js';
import { PICKUP_TYPES, Pickup } from './Pickup.js';
import { audio } from '../core/AudioManager.js';

const COLOR_MAP = {
  drone:    Colors.ENEMY.DRONE,
  striker:  Colors.ENEMY.STRIKER,
  elite:    Colors.ENEMY.ELITE,
  bomber:   Colors.ENEMY.BOMBER,
  kamikaze: Colors.ENEMY.KAMIKAZE,
  golden:   Colors.ENEMY.GOLDEN,
  splitter: Colors.ENEMY.SPLITTER,
};

export class Enemy extends Entity {
  constructor() {
    super();
    this.team = 'enemy';
    this.type = 'drone';
    this.radius = 14;
    this.hp = 3; this.maxHp = 3;
    this.damage = 8;
    this.score = 100;
    this.age = 0;
    this.fireCD = 0;
    this.data = null;
    this.behavior = 'dive';
    this.startX = 0; this.startY = 0;
    this.waypointT = 0;
    this.sinePhase = 0;
    this.stunTimer = 0;
    this.dropBonus = 1;
    this.angle = 0;
    this.orbitTarget = null;
    this.orbitAngle = 0;
    this.orbitR = 80;
    this.custom = {};
  }

  reset() {
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.dead = false; this.active = true;
    this.age = 0; this.fireCD = 0;
    this.type = 'drone'; this.data = null;
    this.stunTimer = 0; this.dropBonus = 1;
    this.custom = {};
  }

  spawn(typeKey, x, y, game, opts = {}) {
    const d = EnemyData[typeKey] || EnemyData.drone;
    this._gameRef = game;
    this.data = d;
    this.type = d.type;
    this.hp = d.hp * (game ? (game.stageEnemyHpMul || 1) : 1);
    this.maxHp = this.hp;
    this.radius = d.radius;
    this.damage = d.damage;
    this.score = d.score;
    this.behavior = d.behavior;
    this.fireCD = 500 + rand(0, d.fireCD || 0);
    this.x = x; this.y = y;
    this.startX = x; this.startY = y;
    this.sinePhase = rand(0, TAU);
    Object.assign(this, opts);
    return this;
  }

  // ---------- Update ----------
  update(dt, game) {
    if (this.dead) return;
    const dts = dt / 16.6667;
    this.age += dt;
    if (this.stunTimer > 0) { this.stunTimer -= dt; return; }

    this._updateMovement(dt, dts, game);
    super.update(dts, game);

    // 射击
    if (this.data && this.data.fireCD && this.data.fireCD > 0) {
      this.fireCD -= dt;
      if (this.fireCD <= 0 && this.y > 20 && this.y < game.height - 120) {
        this.fireCD = this.data.fireCD;
        this._fire(game);
      }
    }

    // 出屏下方销毁（不奖励）
    if (this.y > game.height + 100) { this.dead = true; this.active = false; }
  }

  _updateMovement(dt, dts, game) {
    const data = this.data;
    switch (this.behavior) {
      case 'dive':
        this.vx = 0;
        this.vy = data.speed;
        break;
      case 'sine': {
        const amp = 50;
        this.sinePhase += dt * 0.006;
        this.vx = Math.cos(this.sinePhase) * 3;
        this.vy = data.speed;
        break;
      }
      case 'straight':
        this.vx = 0; this.vy = data.speed;
        if (this.y > game.height * 0.25) this.vy *= 0.4; // 停在1/4位置
        break;
      case 'stop_fire': {
        // 进入场景后停下射击，再缓慢退出
        if (this.age < 1500) {
          this.vy = data.speed; this.vx = 0;
        } else if (this.age < 5500) {
          // S型左右巡航
          this.sinePhase += dt * 0.004;
          this.vx = Math.sin(this.sinePhase) * 2.6;
          this.vy = 0;
        } else {
          this.vy = -data.speed * 0.6; this.vx *= 0.9;
        }
        break;
      }
      case 'pattern': {
        // 精英：入场后停在上方左右踱步
        if (this.age < 1800) this.vy = data.speed;
        else {
          this.vy = clamp((game.height*0.2) - this.y, -1, 1) * 0.6;
          this.sinePhase += dt * 0.0025;
          this.vx = Math.sin(this.sinePhase) * 2.8;
        }
        break;
      }
      case 'aimed': {
        // 神风：追击玩家
        if (game.player && !game.player.dead) {
          const a = angleBetween(this.x, this.y, game.player.x, game.player.y);
          const sp = data.speed;
          this.vx = Math.cos(a) * sp;
          this.vy = Math.sin(a) * sp;
        }
        this.angle = Math.atan2(this.vy, this.vx) + Math.PI/2;
        break;
      }
      case 'orbit': {
        // 绕某目标飞行（Boss护卫）
        if (!this.orbitTarget || this.orbitTarget.dead) {
          // 没目标就普通下落
          this.vy = 2; break;
        }
        this.orbitAngle += dt * 0.002;
        this.vx = (this.orbitTarget.x + Math.cos(this.orbitAngle)*this.orbitR - this.x) * 0.12;
        this.vy = (this.orbitTarget.y + Math.sin(this.orbitAngle)*this.orbitR - this.y) * 0.12;
        break;
      }
    }
  }

  // ---------- 射击 ----------
  _fire(game) {
    const data = this.data;
    const dmgMul = game ? (game.stageEnemyHpMul || 1) : 1;
    const speed = data.bulletSpeed || 3;
    switch (data.bulletType) {
      case 'fan5':
        game.bulletHell.spawnFan(this.x, this.y + this.radius,
          Math.PI/2, { count: 5, spread: Math.PI/3, speed, color: 'orange', damage: 8*dmgMul, radius: 5 });
        break;
      case 'spiral_circle': {
        const base = (this.age * 0.005) % TAU;
        game.bulletHell.spawnCircle(this.x, this.y + this.radius,
          { count: 10, speed: speed, color: 'purple', startAngle: base, damage: 10*dmgMul, radius: 5 });
        break;
      }
      case 'big_slow':
        game.bulletHell.spawnCircle(this.x, this.y + this.radius,
          { count: 3, speed: speed, color: 'orange', damage: 15*dmgMul, radius: 9, bulletType: 'big' });
        break;
      case 'aimed':
        if (game.player && !game.player.dead) {
          const a = angleBetween(this.x, this.y, game.player.x, game.player.y);
          game.bulletHell.shoot(this.x, this.y + this.radius,
            { angle: a, speed, color: 'red', damage: 10*dmgMul, radius: 5, bulletType: 'aimed' });
        }
        break;
      default:
        game.bulletHell.shoot(this.x, this.y + this.radius,
          { angle: Math.PI/2, speed, color: 'pink', damage: 6*dmgMul, radius: 4 });
    }
    audio.sfxShoot();
  }

  // ---------- 死亡 ----------
  takeDamage(dmg, src = null) {
    if (this.dead) return;
    super.takeDamage(dmg, src);
    // 击中火花
    if (!this.dead && typeof window !== 'undefined') {
      // 火花（轻量）
    }
  }

  onDeath(src) {
    // 爆炸特效
    const big = this.radius > 22 || this.type === 'elite' || this.type === 'bomber'
             || this.type === 'golden' || this.type === 'splitter';
    this._spawnExplosion(this._gameRef);
    if (this.type === 'golden') audio.sfxGolden();
    else if (big) audio.sfxEnemyDieBig(); else audio.sfxEnemyDieSmall();

    // 分裂者：击毁分裂成2个小无人机
    if (this.type === 'splitter' && this._gameRef) this._splitInto(this._gameRef);

    // 掉落道具
    this._rollDrops(this._gameRef);

    // 分数（含暴击判定）
    if (this._gameRef && !this._gameRef.player.dead) {
      this._gameRef.addScore(this.score, this.x, this.y);
      this._gameRef.onEnemyKilled(this);
      this._gameRef.registerKill(this);
    }
  }

  _splitInto(game) {
    for (let i = 0; i < 2; i++) {
      const e = game.enemyPool.acquire();
      e.spawn('drone_wave', this.x + (i === 0 ? -20 : 20), this.y + 8, game);
      e.dropBonus = 0;
      game.enemies.push(e);
    }
  }

  _spawnExplosion(game) {
    if (!game) return;
    this._gameRef = game;
    const big = this.radius > 22 || this.type === 'elite' || this.type === 'bomber'
             || this.type === 'golden' || this.type === 'splitter';
    const count = big ? 24 : 10;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * TAU + rand(-0.2, 0.2);
      const sp  = rand(big ? 2 : 1.2, big ? 6.5 : 3.5);
      const p = game.fxPool.acquire();
      p.setup({
        x: this.x, y: this.y,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        life: big ? rand(500, 900) : rand(260, 500),
        maxR: rand(big ? 4 : 2.4, big ? 8 : 5), radius: 6,
        color: pick([Colors.FX.EXPLOSION_IN, Colors.FX.EXPLOSION_MID, Colors.FX.EXPLOSION_OUT]),
        glow: big ? 20 : 12, friction: 0.93
      });
      game.particles.push(p);
    }
    // 冲击波环
    const sw = game.fxPool.acquire();
    sw.setup({
      ptype: 'shockwave', x: this.x, y: this.y,
      life: big ? 600 : 380, maxR: big ? 90 : 42, radius: 8,
      color: big ? Colors.FX.EXPLOSION_MID + 'cc' : Colors.FX.SHOCKWAVE,
      ring: true, ringWidth: big ? 3 : 2, glow: big ? 22 : 12,
    });
    game.particles.push(sw);
    // 碎片
    if (big) {
      for (let i = 0; i < 10; i++) {
        const ang = rand(0, TAU), sp = rand(1, 4);
        const p = game.fxPool.acquire();
        p.setup({
          x: this.x, y: this.y, shape: 'rect', ptype: 'debris',
          vx: Math.cos(ang)*sp, vy: Math.sin(ang)*sp,
          life: rand(600, 1000), maxR: rand(3, 6), radius: 5,
          color: Colors.ENEMY[this.type.toUpperCase()] || Colors.NEON_CYAN,
          rotSpeed: rand(-0.2, 0.2), glow: 6, friction: 0.97,
        });
        game.particles.push(p);
      }
    }
    if (big) game.shake(5, 200);
  }

  _rollDrops(game) {
    if (!game) return;
    const d = this.data;
    const pushP = (p, qty = 1) => {
      const pk = game.pickupPool.acquire();
      pk.setup(p, this.x + rand(-14, 14), this.y + rand(-10, 10));
      game.pickups.push(pk);
    };
    if (chance((d.dropP || 0) * this.dropBonus)) pushP(PICKUP_TYPES.POWER);
    if (d.dropHp && chance(d.dropHp)) pushP(PICKUP_TYPES.HP);
    if (d.dropEnergy && chance(d.dropEnergy)) pushP(PICKUP_TYPES.ENERGY);
    if (d.dropRandom) pushP(pick([PICKUP_TYPES.HP, PICKUP_TYPES.BOMB, PICKUP_TYPES.ENERGY, PICKUP_TYPES.WIPE, PICKUP_TYPES.TIME]));
    // 金币：多个
    if (d.dropGold) {
      const n = d.dropGold >= 1 ? Math.floor(d.dropGold) : (chance(d.dropGold) ? 1 : 0);
      for (let i = 0; i < n; i++) pushP(PICKUP_TYPES.GOLD);
    }
    if (d.dropBomb) pushP(PICKUP_TYPES.BOMB);
  }

  setGameRef(game) { this._gameRef = game; }

  // ---------- 绘制 ----------
  draw(ctx, game) {
    this._gameRef = game;
    const color = COLOR_MAP[this.type] || Colors.ENEMY.DRONE;
    const accent = '#ffffff';
    const x = this.x, y = this.y;

    ctx.save();
    if (this.angle) { ctx.translate(x, y); ctx.rotate(this.angle); ctx.translate(-x, -y); }

    const big = this.radius;
    switch (this.type) {
      case 'drone': case 'minion': {
        // 小菱形
        drawGlowPoly(ctx, [
          {x, y: y-big*0.9}, {x: x+big*0.8, y}, {x, y: y+big*0.9}, {x: x-big*0.8, y}
        ], color + '66', color, 1.5, 10);
        drawGlowCircle(ctx, x, y, big*0.28, accent, color, 6);
        break;
      }
      case 'striker': {
        drawGlowPoly(ctx, [
          {x, y: y - big},
          {x: x - big*0.4, y: y - big*0.2},
          {x: x - big, y: y + big*0.1},
          {x: x - big*0.9, y: y + big*0.8},
          {x: x + big*0.9, y: y + big*0.8},
          {x: x + big, y: y + big*0.1},
          {x: x + big*0.4, y: y - big*0.2},
        ], color + '66', color, 2, 12);
        // 炮口
        drawGlowCircle(ctx, x - big*0.5, y + big*0.5, 2, Colors.FLAME_IN || '#fff', color, 6);
        drawGlowCircle(ctx, x + big*0.5, y + big*0.5, 2, Colors.FLAME_IN || '#fff', color, 6);
        drawGlowCircle(ctx, x, y - big*0.1, big*0.3, accent, color, 8);
        break;
      }
      case 'elite': {
        // 六边形精英
        const pts = [];
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI/2 + i * TAU/6;
          pts.push({ x: x + Math.cos(a)*big, y: y + Math.sin(a)*big });
        }
        drawGlowPoly(ctx, pts, color + '55', color, 2, 16);
        // 内核
        drawGlowCircle(ctx, x, y, big*0.4, Colors.NEON_YELLOW, Colors.NEON_YELLOW, 16);
        ctx.save();
        const t = this.age * 0.003;
        ctx.strokeStyle = Colors.NEON_PINK;
        ctx.shadowBlur = 10; ctx.shadowColor = Colors.NEON_PINK;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, big*0.75, t, t + Math.PI*1.2);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'bomber': {
        drawGlowPoly(ctx, [
          {x: x, y: y - big},
          {x: x - big*1.2, y: y - big*0.2},
          {x: x - big*1.2, y: y + big*0.3},
          {x: x - big*0.7, y: y + big},
          {x: x + big*0.7, y: y + big},
          {x: x + big*1.2, y: y + big*0.3},
          {x: x + big*1.2, y: y - big*0.2},
        ], color + '66', color, 2, 14);
        drawGlowCircle(ctx, x - big*0.8, y + big*0.6, 2.5, Colors.NEON_YELLOW, Colors.NEON_YELLOW, 8);
        drawGlowCircle(ctx, x + big*0.8, y + big*0.6, 2.5, Colors.NEON_YELLOW, Colors.NEON_YELLOW, 8);
        drawGlowCircle(ctx, x, y - big*0.3, big*0.35, accent, color, 10);
        break;
      }
      case 'golden': {
        // 金色财宝机：旋转十芒星 + 脉冲光晕
        const t = this.age * 0.004;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t);
        const gpts = [];
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + i * TAU / 10;
          const rr = i % 2 === 0 ? big : big * 0.45;
          gpts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr });
        }
        drawGlowPoly(ctx, gpts, color + '88', color, 2, 22);
        ctx.restore();
        drawGlowCircle(ctx, x, y, big * 0.3, '#ffffff', color, 18);
        break;
      }
      case 'splitter': {
        // 分裂者：双菱形 + 核心
        drawGlowPoly(ctx, [
          {x: x - big*0.55, y: y - big*0.8}, {x, y: y - big*0.15}, {x: x - big*0.55, y: y + big*0.5}
        ], color + '66', color, 2, 12);
        drawGlowPoly(ctx, [
          {x: x + big*0.55, y: y - big*0.8}, {x, y: y - big*0.15}, {x: x + big*0.55, y: y + big*0.5}
        ], color + '66', color, 2, 12);
        drawGlowCircle(ctx, x, y - big * 0.15, big * 0.22, '#ffffff', color, 10);
        break;
      }
      case 'kamikaze': {
        // 尖三角（箭头）
        drawGlowPoly(ctx, [
          {x, y: y + big},
          {x: x - big*0.7, y: y - big*0.8},
          {x: x - big*0.25, y: y - big*0.3},
          {x: x + big*0.25, y: y - big*0.3},
          {x: x + big*0.7, y: y - big*0.8},
        ], color + '77', color, 1.5, 10);
        // 尾焰
        drawGlowCircle(ctx, x, y - big*0.6, 3, Colors.NEON_YELLOW, Colors.NEON_YELLOW, 12);
        break;
      }
      default:
        drawGlowCircle(ctx, x, y, big, color, color, 12);
    }

    // 血条（精英/轰炸）
    if (this.data && this.data.healthBar) {
      const w = big * 2.6, h = 4;
      const bx = x - w/2, by = y - big - 10;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx, by, w, h);
      ctx.fillStyle = Colors.NEON_GREEN;
      ctx.shadowBlur = 5; ctx.shadowColor = Colors.NEON_GREEN;
      ctx.fillRect(bx, by, w * (this.hp / this.maxHp), h);
      ctx.strokeStyle = Colors.NEON_CYAN + '88';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, w, h);
    }
    ctx.restore();
  }
}

export default Enemy;
