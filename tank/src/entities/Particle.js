// ============================================================
//  Particle.js - 粒子特效
// ============================================================

import { Entity } from './Entity.js';
import { Colors } from '../config/Colors.js';
import { rand, TAU } from '../core/Utils.js';

export class Particle extends Entity {
  constructor() {
    super(0, 0, 4, 4);
    this.type = 'particle';
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 0;
    this.color = '#fff';
    this.size = 4;
    this.kind = 'spark';   // spark|explosion|ring|smoke
    this.active = false;
  }

  spawn(x, y, opts = {}) {
    this.x = x; this.y = y;
    this.vx = opts.vx ?? 0;
    this.vy = opts.vy ?? 0;
    this.life = opts.life ?? 500;
    this.maxLife = this.life;
    this.color = opts.color ?? '#fff';
    this.size = opts.size ?? 4;
    this.kind = opts.kind ?? 'spark';
    this.w = this.size; this.h = this.size;
    this.alive = true;
    this.active = true;
  }

  reset() { this.alive = false; this.active = false; }

  update(dt) {
    if (!this.active) return;
    const dts = dt / 1000;
    this.x += this.vx * dts;
    this.y += this.vy * dts;
    this.vx *= 0.92;
    this.vy *= 0.92;
    this.life -= dt;
    if (this.life <= 0) this.destroy();
  }

  destroy() { this.alive = false; this.active = false; }

  draw(ctx) {
    if (!this.active) return;
    const a = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = this.color;
    if (this.kind === 'ring') {
      ctx.globalAlpha = a * 0.6;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      const r = (1 - a) * this.size * 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, TAU);
      ctx.stroke();
    } else {
      ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
    ctx.restore();
  }
}

// 生成爆炸粒子组
export function spawnExplosion(particles, x, y, color = Colors.FX.EXPLOSION_MID, count = 14) {
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * TAU + rand(-0.2, 0.2);
    const sp = rand(60, 180);
    const p = particles.acquire();
    p.spawn(x, y, {
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      life: rand(300, 600),
      color: i % 3 === 0 ? Colors.FX.EXPLOSION_IN : (i % 3 === 1 ? color : Colors.FX.EXPLOSION_OUT),
      size: rand(3, 6),
      kind: 'spark',
    });
  }
  // 冲击波环
  const ring = particles.acquire();
  ring.spawn(x, y, {
    life: 350, color: Colors.FX.SHOCKWAVE, size: 12, kind: 'ring',
  });
}

// 火花（小型）
export function spawnSparks(particles, x, y, color = Colors.FX.SPARK, count = 5) {
  for (let i = 0; i < count; i++) {
    const ang = rand(0, TAU);
    const sp = rand(30, 100);
    const p = particles.acquire();
    p.spawn(x, y, {
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      life: rand(150, 350),
      color,
      size: rand(2, 4),
      kind: 'spark',
    });
  }
}
