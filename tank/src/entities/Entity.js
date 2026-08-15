// ============================================================
//  Entity.js - 实体基类
// ============================================================

import { TILE_SIZE } from '../config/Colors.js';

export class Entity {
  constructor(x = 0, y = 0, w = TILE_SIZE, h = TILE_SIZE) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.alive = true;
    this.type = 'entity';
  }

  // 中心点
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  // AABB
  get bounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(dt) {}
  draw(ctx) {}

  // 与另一实体 AABB 碰撞
  hits(other) {
    return this.x < other.x + other.w &&
           this.x + this.w > other.x &&
           this.y < other.y + other.h &&
           this.y + this.h > other.y;
  }

  destroy() { this.alive = false; }
}
