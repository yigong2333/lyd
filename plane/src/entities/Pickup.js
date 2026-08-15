// ============================================================
//  Pickup.js - 道具实体（7种）
// ============================================================

import { Entity } from './Entity.js';
import { Colors } from '../config/Colors.js';
import { TAU, clamp, dist, rand, sin01 } from '../core/Utils.js';

export const PICKUP_TYPES = {
  POWER: 'P',       // 火力+1
  GOLD:  '$',       // 金币 + 分
  HP:    'HP',      // 回血
  BOMB:  'B',       // 炸弹+1
  ENERGY:'E',       // 能量
  WIPE:  'S',       // 全屏清弹
  TIME:  'T',       // 时间减速
};

const COLOR_MAP = {
  'P':  Colors.PICKUP.POWER,
  '$':  Colors.PICKUP.GOLD,
  'HP': Colors.PICKUP.HP,
  'B':  Colors.PICKUP.BOMB,
  'E':  Colors.PICKUP.ENERGY,
  'S':  Colors.PICKUP.WIPE,
  'T':  Colors.PICKUP.TIME,
};

export class Pickup extends Entity {
  constructor() {
    super();
    this.ptype = PICKUP_TYPES.POWER;
    this.radius = 14;
    this.life = 12000;   // 12s自动消失
    this.age = 0;
    this.team = 'neutral';
    this.magnet = false;  // 是否在磁吸中
    this.vy = 1.2;        // 缓慢下落
    this.baseY = 0;
    this.bobPhase = 0;    // 上下浮动相位
  }

  reset() {
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 1.2;
    this.dead = false; this.active = true;
    this.age = 0; this.magnet = false;
    this.ptype = PICKUP_TYPES.POWER;
  }

  setup(type, x, y) {
    this.ptype = type;
    this.x = x; this.y = y;
    this.bobPhase = Math.random() * TAU;
    return this;
  }

  update(dt, game) {
    const dts = dt / 16.6667;
    this.age += dt;
    if (this.age >= this.life) { this.dead = true; this.active = false; return; }

    const player = game.player;
    const baseMagnetR = 150;
    const magnetR = baseMagnetR * (game.wingmanType === 'support' ? 1.5 : 1);

    if (player && !player.dead) {
      const d = dist(this.x, this.y, player.x, player.y);
      if (d < magnetR) {
        this.magnet = true;
        const dx = player.x - this.x, dy = player.y - this.y;
        const len = Math.hypot(dx, dy) || 1;
        // 越近加速越快
        const pull = (1 - d / magnetR) * 10;
        this.vx = (dx / len) * pull * 1.6;
        this.vy = (dy / len) * pull * 1.6;
      }
    }
    if (!this.magnet) {
      this.vy = 0.9 + Math.sin(this.age * 0.004 + this.bobPhase) * 0.3;
      this.vx *= 0.96;
    }
    super.update(dts, game);

    // 出屏下方销毁
    if (this.y > game.height + 60) { this.dead = true; this.active = false; }
  }

  draw(ctx, game) {
    const c = COLOR_MAP[this.ptype] || Colors.NEON_CYAN;
    const pulse = 1 + sin01(this.age * 0.008) * 0.12;
    const r = this.radius * pulse;
    ctx.save();
    // 消失前闪烁
    if (this.life - this.age < 2000 && Math.floor(this.age / 120) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }
    // 外发光环
    ctx.shadowBlur = 18;
    ctx.shadowColor = c;
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, TAU);
    ctx.stroke();
    // 内填
    ctx.fillStyle = c + '33';
    ctx.fill();
    // 内图标文字
    ctx.shadowBlur = 10;
    ctx.shadowColor = c;
    ctx.fillStyle = c;
    ctx.font = `bold ${Math.floor(r*1.1)}px Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.ptype, this.x, this.y + 1);
    ctx.restore();
  }
}

export default Pickup;
