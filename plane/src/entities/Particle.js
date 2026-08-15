// ============================================================
//  Particle.js - 粒子特效
//  爆炸、拖尾、擦弹火花、冲击波等
// ============================================================

import { Entity } from './Entity.js';
import { TAU, drawGlowCircle } from '../core/Utils.js';
import { Colors } from '../config/Colors.js';

export const PARTICLE_TYPES = {
  EXPLOSION: 'explosion',    // 爆炸火花（外向）
  SMOKE:     'smoke',        // 烟雾（慢速扩散）
  TRAIL:     'trail',        // 尾焰（玩家身后）
  SHOCKWAVE: 'shockwave',    // 冲击波圆环
  GRAZE:     'graze',        // 擦弹火花
  SCORE:     'score',        // 得分文字（实体层显示；实际用DOM也可）
  CHARGE:    'charge',       // 蓄电气
  DEBRIS:    'debris',       // 碎片
};

export class Particle extends Entity {
  constructor() {
    super();
    this.ptype = PARTICLE_TYPES.EXPLOSION;
    this.vx = 0; this.vy = 0;
    this.life = 500;    // ms
    this.age = 0;
    this.radius = 4;
    this.maxR = 4;
    this.color = '#fff';
    this.shrink = true;
    this.friction = 0.96; // 每帧衰减
    this.gravity = 0;
    this.glow = 12;
    this.rotSpeed = 0;
    this.angle = 0;
    this.shape = 'circle';  // circle | rect | ring
    this.text = '';
    this.ring = false;
    this.ringWidth = 2;
  }

  reset() {
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.life = 500; this.age = 0;
    this.radius = 4; this.maxR = 4;
    this.dead = false; this.active = true;
    this.ptype = PARTICLE_TYPES.EXPLOSION;
    this.color = '#fff';
    this.shrink = true;
    this.friction = 0.96;
    this.gravity = 0;
    this.glow = 12;
    this.rotSpeed = 0; this.angle = 0;
    this.shape = 'circle';
    this.ring = false; this.text = '';
  }

  setup(opts) { Object.assign(this, opts); return this; }

  update(dt, game) {
    const dts = dt / 16.6667;
    this.age += dt;
    if (this.age >= this.life) { this.dead = true; this.active = false; return; }
    this.vx *= Math.pow(this.friction, dts);
    this.vy *= Math.pow(this.friction, dts);
    this.vy += this.gravity * dts;
    super.update(dts, game);
    this.angle += this.rotSpeed * dts;
    const t = this.age / this.life; // 0~1
    if (this.shrink) this.radius = this.maxR * (1 - t);
    else             this.radius = this.maxR;
    // shockwave: 半径越来越大
    if (this.ptype === PARTICLE_TYPES.SHOCKWAVE) {
      this.radius = this.maxR * (0.2 + t * 1.2);
    }
  }

  draw(ctx) {
    const t = this.age / this.life;
    const alpha = t < 0.2 ? t / 0.2 : 1 - t;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    if (this.ptype === PARTICLE_TYPES.SHOCKWAVE) {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.ringWidth;
      ctx.shadowBlur = this.glow;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, TAU);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (this.shape === 'rect' || this.ptype === PARTICLE_TYPES.DEBRIS) {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = this.glow;
      ctx.shadowColor = this.color;
      const r = this.radius;
      ctx.fillRect(-r, -r * 0.5, r * 2, r);
      ctx.restore();
      return;
    }

    drawGlowCircle(ctx, this.x, this.y, Math.max(0.3, this.radius), this.color, this.color, this.glow);
    ctx.restore();
  }
}

export default Particle;
