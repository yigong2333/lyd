// ============================================================
//  Entity.js - 实体基类
//  玩家/敌机/Boss/子弹/道具/粒子 的共同父类
// ============================================================

import { clamp } from '../core/Utils.js';

export class Entity {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 4;        // 碰撞半径
    this.dead = false;      // 是否销毁
    this.active = true;     // 对象池标记
    this.hp = 1;
    this.maxHp = 1;
    this.team = 'neutral';  // 'player' | 'enemy' | 'neutral'
    this.damage = 1;        // 碰撞给对方造成的伤害
    this._visible = true;
  }

  /** 子类可覆盖 update(dt, game) */
  update(dt, game) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  /** 子类可覆盖 draw(ctx, game) */
  draw(ctx, game) {}

  /** 受到伤害 */
  takeDamage(dmg, src = null) {
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.hp = 0;
      this.onDeath(src);
      this.dead = true;
      this.active = false;
    }
  }

  /** 死亡回调，子类覆盖（如爆炸特效） */
  onDeath(src) {}

  /** 是否在屏幕内（带margin缓冲） */
  inBounds(w, h, margin = 80) {
    return this.x >= -margin && this.x <= w + margin
        && this.y >= -margin && this.y <= h + margin;
  }

  get visible() { return this._visible; }
  set visible(v) { this._visible = v; }
}

export default Entity;
