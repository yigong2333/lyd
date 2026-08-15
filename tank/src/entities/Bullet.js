// ============================================================
//  Bullet.js - 子弹实体
// ============================================================

import { Entity } from './Entity.js';
import { DIR, DIR_VEC, TILE_SIZE } from '../config/Colors.js';
import { Colors } from '../config/Colors.js';

export class Bullet extends Entity {
  constructor() {
    super(0, 0, 6, 6);
    this.type = 'bullet';
    this.dir = DIR.UP;
    this.speed = 6;
    this.damage = 1;
    this.owner = 'player';   // 'player' | 'enemy'
    this.bulletType = 'normal'; // normal|spread3|pierce|charged|heavy|laser
    this.life = 3000;        // 生存时间ms
    this.pierceCount = 0;    // 穿透剩余次数
    this.trail = [];         // 拖尾
    this.active = false;
    this.counted = false;    // activeBullets 计数是否已递减
  }

  spawn(x, y, dir, opts = {}) {
    this.x = x; this.y = y;
    this.dir = dir;
    this.speed = opts.speed ?? 6;
    this.damage = opts.damage ?? 1;
    this.owner = opts.owner ?? 'player';
    this.bulletType = opts.bulletType ?? 'normal';
    this.life = opts.life ?? 3000;
    this.pierceCount = opts.bulletType === 'pierce' ? 99 : (opts.bulletType === 'charged' ? 2 : 0);
    this.counted = false;
    this.alive = true;
    this.active = true;
    this.trail.length = 0;
    // 调整尺寸
    if (this.bulletType === 'charged') { this.w = 14; this.h = 14; }
    else if (this.bulletType === 'heavy') { this.w = 10; this.h = 10; }
    else { this.w = 6; this.h = 6; }
  }

  reset() {
    this.alive = false;
    this.active = false;
    this.counted = false;
    this.trail.length = 0;
  }

  update(dt) {
    if (!this.active) return;
    const dts = dt / 1000;
    const v = DIR_VEC[this.dir];
    // 拖尾
    this.trail.push({ x: this.cx, y: this.cy });
    if (this.trail.length > 6) this.trail.shift();
    this.x += v.x * this.speed * TILE_SIZE * dts;
    this.y += v.y * this.speed * TILE_SIZE * dts;
    this.life -= dt;
    if (this.life <= 0) this.destroy();
  }

  destroy() { this.alive = false; this.active = false; }

  draw(ctx) {
    if (!this.active) return;
    const isPlayer = this.owner === 'player';
    let color, glow;
    if (this.bulletType === 'heavy') {
      color = Colors.BULLET.HEAVY; glow = Colors.BULLET.HEAVY_GLOW;
    } else {
      color = isPlayer ? Colors.BULLET.PLAYER : Colors.BULLET.ENEMY;
      glow = isPlayer ? Colors.BULLET.PLAYER_GLOW : Colors.BULLET.ENEMY_GLOW;
    }
    // 拖尾
    ctx.save();
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const a = (i / this.trail.length) * 0.4;
      ctx.globalAlpha = a;
      ctx.fillStyle = glow;
      ctx.fillRect(t.x - 2, t.y - 2, 4, 4);
    }
    ctx.restore();

    // 主体
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 10;
    ctx.fillStyle = color;
    if (this.bulletType === 'charged') {
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, this.w / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(this.x, this.y, this.w, this.h);
    }
    ctx.restore();
  }
}
