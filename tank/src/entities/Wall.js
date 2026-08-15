// ============================================================
//  Wall.js - 墙壁/障碍物实体（格子级）
// ============================================================
//
//  砖墙：一格一个整体，一击即碎。
//  钢墙：不可破坏（蓄力弹除外）。
// ============================================================

import { TileType, TILE_SIZE } from '../config/Colors.js';
import { Colors } from '../config/Colors.js';

export class Wall {
  constructor(gridX, gridY, type, isText = false) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.x = gridX * TILE_SIZE;
    this.y = gridY * TILE_SIZE;
    this.type = type;          // TileType.BRICK / STEEL
    this.isText = isText;      // 保留兼容
    this.size = TILE_SIZE;
    this.alive = true;
  }

  get hp() { return this.alive ? 1 : 0; }

  // 命中：砖墙一击碎
  hit() {
    if (this.type !== TileType.BRICK) return false;
    if (this.alive) {
      this.alive = false;
      return true;
    }
    return false;
  }

  isSolid() {
    return this.alive;
  }

  isPassable() {
    return !this.alive;
  }

  draw(ctx) {
    if (!this.alive) return;
    const { x, y, size } = this;
    if (this.type === TileType.STEEL) {
      // 钢墙
      ctx.save();
      const grad = ctx.createLinearGradient(x, y, x + size, y + size);
      grad.addColorStop(0, Colors.WALL.STEEL_GLOW);
      grad.addColorStop(0.5, Colors.WALL.STEEL);
      grad.addColorStop(1, Colors.WALL.STEEL_DARK);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = Colors.WALL.STEEL_DARK;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
      // 高光
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(x + 2, y + 2, size - 8, 2);
      ctx.restore();
    } else if (this.type === TileType.BRICK) {
      // 砖墙 — 整格绘制
      ctx.save();
      const grad = ctx.createLinearGradient(x, y, x + size, y + size);
      grad.addColorStop(0, Colors.WALL.BRICK);
      grad.addColorStop(1, Colors.WALL.BRICK_DARK);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, size, size);
      // 砖纹
      ctx.fillStyle = Colors.WALL.BRICK_DARK;
      ctx.fillRect(x, y + size / 2 - 1, size, 2);
      ctx.fillRect(x + size / 2 - 1, y, 2, size / 2);
      ctx.fillRect(x + size / 4 - 1, y + size / 2, 2, size / 2);
      ctx.fillRect(x + size * 3 / 4 - 1, y + size / 2, 2, size / 2);
      // 边框
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
      ctx.restore();
    }
  }
}
