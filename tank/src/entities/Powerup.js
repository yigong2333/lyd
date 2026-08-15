// ============================================================
//  Powerup.js - 道具实体
// ============================================================

import { Entity } from './Entity.js';
import { TILE_SIZE, Colors } from '../config/Colors.js';
import { PowerupData } from '../config/TankData.js';

export class Powerup extends Entity {
  constructor(x, y, type) {
    super(x, y, TILE_SIZE * 0.8, TILE_SIZE * 0.8);
    this.type = 'powerup';
    this.powerType = type;
    this.life = 15000;   // 15秒后消失
    this.bob = 0;
    this.alive = true;
  }

  update(dt) {
    this.life -= dt;
    this.bob += dt / 1000;
    if (this.life <= 0) this.destroy();
  }

  destroy() { this.alive = false; }

  draw(ctx) {
    const data = PowerupData[this.powerType] || PowerupData.star;
    const cx = this.cx;
    const cy = this.cy + Math.sin(this.bob * 3) * 3;
    const r = this.w / 2;
    const blink = this.life < 3000 ? (Math.floor(this.life / 200) % 2 === 0) : true;

    ctx.save();
    if (blink) {
      // 外光环
      ctx.shadowColor = data.color;
      ctx.shadowBlur = 12;
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = data.color;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
      ctx.fill();
      // 主体
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 8;
      ctx.fillStyle = data.color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      // 图标
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.floor(r * 1.1)}px Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(data.icon, cx, cy + 1);
    }
    ctx.restore();
  }
}
