// ============================================================
//  CollisionSystem.js - 碰撞检测系统
// ============================================================
//
//  坦克-墙壁: 由 Game.canTankBeAt 查询格子（O(1)）
//  本系统处理: 子弹-墙壁/坦克/基地/子弹, 坦克-道具
// ============================================================

import { DIR, DIR_VEC, TILE_SIZE, TileType } from '../config/Colors.js';
import { aabb } from '../core/Utils.js';
import { spawnSparks } from '../entities/Particle.js';

export class CollisionSystem {
  constructor(game) {
    this.game = game;
  }

  process() {
    this._bulletVsWall();
    this._bulletVsTank();
    this._bulletVsBullet();
    this._bulletVsBase();
    this._tankVsPowerup();
  }

  // 子弹 vs 墙壁
  _bulletVsWall() {
    const bullets = this.game.bullets;
    const walls = this.game.level.walls;
    const particles = this.game.particles;
    if (!walls) return;
    for (const b of bullets.active) {
      if (!b.active) continue;
      // 查询子弹所在格子
      const gx = Math.floor(b.cx / TILE_SIZE);
      const gy = Math.floor(b.cy / TILE_SIZE);
      const wall = walls.get(gx, gy);
      if (wall && wall.isSolid()) {
        // 命中
        if (wall.type === TileType.BRICK) {
          // 一击碎
          wall.hit();
          this.game.audio.sfxBrickBreak();
          spawnSparks(particles, b.cx, b.cy, '#d4782a', 6);
          // 穿甲弹不消失
          if (b.bulletType !== 'pierce') {
            if (b.bulletType === 'charged') {
              if (b.pierceCount <= 0) { b.destroy(); b.owner === 'player' && this.game.playerDecrementBullet(b); }
              else b.pierceCount--;
            } else {
              b.destroy();
              if (b.owner === 'player') this.game.playerDecrementBullet(b);
            }
          }
        } else if (wall.type === TileType.STEEL) {
          // 钢墙：普通弹消失，蓄力弹/穿甲弹可破坏？文档说钢墙不可破坏
          spawnSparks(particles, b.cx, b.cy, '#80b0e0', 5);
          if (b.bulletType === 'charged' && b.pierceCount > 0) {
            // 蓄力弹能破钢墙一次
            wall.alive = false;
            this.game.audio.sfxBrickBreak();
            b.pierceCount--;
          } else {
            b.destroy();
            if (b.owner === 'player') this.game.playerDecrementBullet(b);
          }
        }
      }
    }
  }

  // 子弹 vs 坦克
  _bulletVsTank() {
    const { bullets, enemies, player } = this.game;
    for (const b of bullets.active) {
      if (!b.active) continue;
      const targets = b.owner === 'player' ? enemies : (player ? [player] : []);
      for (const t of targets) {
        if (!t.alive) continue;
        if (b.owner === 'player' && t === player) continue;
        if (b.owner === 'enemy' && t !== player) continue;
        if (aabb(b.bounds, t.bounds)) {
          // Boss 子弹不算自己
          if (b.ownerTank === t) continue;
          const hit = t.takeDamage(b.damage);
          if (hit) {
            this.game.audio.sfxHit();
            if (t.isPlayer) this.game.audio.sfxPlayerHit();
            // 穿甲弹穿透坦克
            if (b.bulletType !== 'pierce') {
              b.destroy();
              if (b.owner === 'player') this.game.playerDecrementBullet(b);
            }
          } else {
            // 护盾/无敌 — 子弹消失
            spawnSparks(this.game.particles, b.cx, b.cy, '#00f0ff', 4);
            b.destroy();
            if (b.owner === 'player') this.game.playerDecrementBullet(b);
          }
          break;
        }
      }
    }
  }

  // 子弹 vs 子弹
  _bulletVsBullet() {
    const arr = this.game.bullets.active;
    for (let i = 0; i < arr.length; i++) {
      const a = arr[i];
      if (!a.active) continue;
      for (let j = i + 1; j < arr.length; j++) {
        const b = arr[j];
        if (!b.active) continue;
        // 仅玩家弹 vs 敌方弹
        if (a.owner === b.owner) continue;
        if (aabb(a.bounds, b.bounds)) {
          a.destroy();
          b.destroy();
          if (a.owner === 'player') this.game.playerDecrementBullet(a);
          if (b.owner === 'player') this.game.playerDecrementBullet(b);
          spawnSparks(this.game.particles, (a.cx + b.cx) / 2, (a.cy + b.cy) / 2, '#fff', 6);
        }
      }
    }
  }

  // 子弹 vs 基地
  _bulletVsBase() {
    const base = this.game.level.base;
    if (!base || !base.alive) return;
    for (const b of this.game.bullets.active) {
      if (!b.active) continue;
      if (b.owner !== 'enemy') continue;
      if (aabb(b.bounds, base)) {
        b.destroy();
        this.game.damageBase(b.damage);
      }
    }
  }

  // 坦克 vs 道具
  _tankVsPowerup() {
    const { powerups, player } = this.game;
    if (!player || !player.alive) return;
    for (const p of powerups) {
      if (!p.alive) continue;
      if (aabb(player.bounds, p.bounds)) {
        this.game.collectPowerup(p);
      }
    }
  }
}
