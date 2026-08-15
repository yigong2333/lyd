// ============================================================
//  Bullet.js - 子弹实体（玩家 + 敌方通用）
// ============================================================

import { Entity } from './Entity.js';
import { Colors } from '../config/Colors.js';
import { TAU, drawGlowCircle, clamp } from '../core/Utils.js';

export const BULLET_TYPES = {
  NORMAL: 'normal', AIMED: 'aimed', LASER: 'laser',
  SPIRAL: 'spiral', CIRCLE: 'circle', FAN: 'fan',
  WAVE: 'wave', BIG: 'big', RANDOM: 'random'
};

export class Bullet extends Entity {
  constructor() {
    super();
    this.team = 'enemy';          // 'player' | 'enemy'
    this.vx = 0; this.vy = -10;
    this.radius = 4;
    this.damage = 1;
    this.color = 'pink';
    this.bulletType = BULLET_TYPES.NORMAL;
    this.pierce = 0;              // 穿透剩余次数
    this.hitSet = null;           // 已穿透命中集合（避免同一弹重复打一个目标）
    this.life = 10000;            // 存活时长ms
    this.age = 0;
    this.homing = 0;              // 追踪强度 0~1
    this.angle = 0;               // 视觉旋转
    this.turnRate = 0;            // 角速度（螺旋弹等）
    this.amplitude = 0;           // 波动振幅
    this.freq = 0;                // 波动频率
    this.perpX = 0; this.perpY = 0; // 垂直方向（波动用）
    this.baseVx = 0; this.baseVy = 0;
    this._target = null;          // 缓存追踪目标
  }

  reset() {
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.team = 'enemy'; this.radius = 4; this.damage = 1;
    this.dead = false; this.active = true;
    this.pierce = 0; this.hitSet = null;
    this.life = 10000; this.age = 0;
    this.homing = 0; this.angle = 0; this.turnRate = 0;
    this.amplitude = 0; this.freq = 0;
    this.bulletType = BULLET_TYPES.NORMAL;
    this.color = 'pink';
    this._target = null;
  }

  setup(opts) {
    Object.assign(this, opts);
    this.baseVx = this.vx; this.baseVy = this.vy;
    if (this.amplitude > 0) {
      const len = Math.hypot(this.vx, this.vy) || 1;
      const nx = -this.vy / len, ny = this.vx / len;
      this.perpX = nx; this.perpY = ny;
    }
    if (this.pierce > 0 && !this.hitSet) this.hitSet = new Set();
    return this;
  }

  update(dt, game) {
    const dts = dt / 16.6667; // 归一化到60fps步长
    this.age += dt;
    if (this.age >= this.life) { this.dead = true; this.active = false; return; }

    // 追踪
    if (this.homing > 0 && this.team === 'player') {
      if (!this._target || this._target.dead) {
        this._target = game ? this._findTarget(game) : null;
      }
      if (this._target) {
        const dx = this._target.x - this.x;
        const dy = this._target.y - this.y;
        const len = Math.hypot(dx, dy) || 1;
        const desiredVx = dx / len * Math.hypot(this.vx, this.vy);
        const desiredVy = dy / len * Math.hypot(this.vx, this.vy);
        const h = clamp(this.homing * 0.12, 0, 1);
        this.vx = this.vx + (desiredVx - this.vx) * h;
        this.vy = this.vy + (desiredVy - this.vy) * h;
      }
    }
    // 角速度转弯
    if (this.turnRate !== 0) {
      const sp = Math.hypot(this.vx, this.vy);
      this.angle += this.turnRate * dts;
      this.vx = Math.cos(this.angle) * sp;
      this.vy = Math.sin(this.angle) * sp;
    }
    // 波动
    if (this.amplitude > 0) {
      const wave = Math.sin(this.age * 0.01 * this.freq) * this.amplitude;
      const vx = this.baseVx + this.perpX * wave * 0.08 * dts;
      const vy = this.baseVy + this.perpY * wave * 0.08 * dts;
      this.x += vx * dts;
      this.y += vy * dts;
    } else {
      super.update(dts, game);
    }

    // 出屏销毁（给余量）
    const W = game ? game.width  : window.innerWidth;
    const H = game ? game.height : window.innerHeight;
    if (!this.inBounds(W, H, 120)) {
      this.dead = true; this.active = false;
    }
  }

  _findTarget(game) {
    let best = null, bestD = Infinity;
    const list = [...game.enemies, ...game.bosses.filter(b=>!b.dead)];
    for (const e of list) {
      if (!e.active || e.dead) continue;
      const dx = e.x - this.x, dy = e.y - this.y;
      const d = dx*dx + dy*dy;
      if (d < bestD && d < 420*420) { bestD = d; best = e; }
    }
    return best;
  }

  // 穿透命中后调用
  onPierceHit(target) {
    if (this.hitSet) this.hitSet.add(target);
    this.pierce--;
    if (this.pierce < 0) {
      this.dead = true; this.active = false;
    }
  }

  alreadyHit(target) {
    return this.hitSet && this.hitSet.has(target);
  }

  draw(ctx, game) {
    if (this.team === 'player') this._drawPlayer(ctx);
    else this._drawEnemy(ctx);
  }

  _drawPlayer(ctx) {
    const isMax   = this.color === 'gold';
    const charged = this.bulletType === 'charged';
    if (charged) {
      drawGlowCircle(ctx, this.x, this.y, this.radius + 6, Colors.BULLET.PLAYER_CHARGED, Colors.BULLET.PLAYER_CHG_GLOW, 30);
      drawGlowCircle(ctx, this.x, this.y, this.radius, '#fff', Colors.BULLET.PLAYER_CHG_GLOW, 16);
      // 外环
      ctx.save();
      ctx.strokeStyle = Colors.BULLET.PLAYER_CHG_GLOW;
      ctx.shadowBlur = 20; ctx.shadowColor = Colors.BULLET.PLAYER_CHG_GLOW;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 10 + Math.sin(this.age * 0.02) * 2, 0, TAU);
      ctx.stroke();
      ctx.restore();
      return;
    }
    const core  = isMax ? '#fff8bb' : Colors.BULLET.PLAYER;
    const glow  = isMax ? Colors.BULLET.PLAYER_MAX : Colors.BULLET.PLAYER_GLOW;
    const blur  = isMax ? 16 : 10;
    const r = this.radius;
    // 拖尾
    ctx.save();
    const tail = ctx.createLinearGradient(this.x, this.y, this.x - this.vx*1.2, this.y - this.vy*1.2);
    tail.addColorStop(0, glow + 'cc');
    tail.addColorStop(1, glow + '00');
    ctx.strokeStyle = tail;
    ctx.lineWidth = r * 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 1.4, this.y - this.vy * 1.4);
    ctx.stroke();
    ctx.restore();
    drawGlowCircle(ctx, this.x, this.y, r, core, glow, blur);
    if (isMax) {
      drawGlowCircle(ctx, this.x, this.y, r * 0.4, '#ffffff', Colors.BULLET.PLAYER_MAX, 8);
    }
  }

  _drawEnemy(ctx) {
    const colorMap = {
      pink:    Colors.BULLET.ENEMY_NORMAL,
      red:     Colors.BULLET.ENEMY_AIMED,
      orange:  Colors.BULLET.ENEMY_BIG,
      laser:   Colors.BULLET.ENEMY_LASER,
      purple:  Colors.BULLET.ENEMY_PURPLE,
      cyan:    Colors.BULLET.ENEMY_CYAN,
      yellow:  Colors.BULLET.ENEMY_YELLOW,
    };
    const c = colorMap[this.color] || Colors.BULLET.ENEMY_NORMAL;
    const r = this.radius;
    if (this.bulletType === 'laser') {
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = c;
      ctx.strokeStyle = c;
      ctx.fillStyle = c;
      ctx.lineWidth = Math.max(2, r * 0.8);
      ctx.globalAlpha = 0.9;
      const ang = Math.atan2(this.vy, this.vx);
      const len = 60;
      ctx.translate(this.x, this.y);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(-len, 0);
      ctx.lineTo(len, 0);
      ctx.stroke();
      // 芯
      ctx.lineWidth = Math.max(1, r * 0.4);
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-len*0.9, 0);
      ctx.lineTo(len*0.9, 0);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (this.bulletType === 'big') {
      drawGlowCircle(ctx, this.x, this.y, r * 1.2, c, c, 24);
      drawGlowCircle(ctx, this.x, this.y, r * 0.6, '#ffffff', c, 10);
      return;
    }
    drawGlowCircle(ctx, this.x, this.y, r, '#ffffff', c, 10);
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = c;
    ctx.shadowBlur = 6;
    ctx.shadowColor = c;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r + 1, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

export default Bullet;
