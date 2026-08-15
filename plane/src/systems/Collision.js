// ============================================================
//  Collision.js - 碰撞系统（含空间网格优化 + 擦弹判定）
// ============================================================

import { circleHit, dist2 } from '../core/Utils.js';
import { Colors } from '../config/Colors.js';
import { audio } from '../core/AudioManager.js';

export class CollisionSystem {
  constructor() {
    this.cellSize = 64;
  }

  /** 一帧全部碰撞处理 */
  process(game) {
    const player = game.player;
    // 1. 玩家子弹 vs 敌人/Boss
    this._playerBulletsVsEnemies(game);
    // 2. 敌方子弹 vs 玩家（含擦弹）
    this._enemyBulletsVsPlayer(game);
    // 3. 敌机/敌方子弹 与玩家机体碰撞
    this._enemiesVsPlayer(game);
    // 4. 道具 vs 玩家
    this._pickupsVsPlayer(game);
  }

  // ---------- 玩家子弹 vs 敌人/Boss ----------
  _playerBulletsVsEnemies(game) {
    const list = [...game.enemies, ...game.bosses];
    for (const b of game.playerBullets) {
      if (!b.active || b.dead || b.team !== 'player') continue;
      for (const e of list) {
        if (!e.active || e.dead) continue;
        if (b.alreadyHit && b.alreadyHit(e)) continue;
        if (circleHit(b.x, b.y, b.radius, e.x, e.y, e.radius)) {
          e.takeDamage(b.damage, game.player);
          audio.sfxHit();
          // 命中火花
          const pt = game.fxPool.acquire();
          pt.setup({
            x: b.x, y: b.y,
            vx: (b.x - e.x) * 0.03 + (Math.random()-0.5),
            vy: (b.y - e.y) * 0.03 + (Math.random()-0.5),
            life: 180, maxR: 4, radius: 3.5,
            color: b.color === 'gold' ? Colors.NEON_YELLOW : Colors.NEON_CYAN,
            glow: 14, friction: 0.9
          });
          game.particles.push(pt);
          if (b.pierce > 0) {
            b.onPierceHit(e);
          } else {
            b.dead = true; b.active = false;
            break;
          }
        }
      }
    }
  }

  // ---------- 敌方子弹 vs 玩家（含擦弹） ----------
  _enemyBulletsVsPlayer(game) {
    const p = game.player;
    if (!p || p.dead) return;
    for (const b of game.enemyBullets) {
      if (!b.active || b.dead) continue;
      // 先擦弹
      if (p.grazeCheck(b)) {
        game.onGraze();
        const pt = game.fxPool.acquire();
        pt.setup({
          x: b.x, y: b.y,
          vx: (b.x - p.x) * 0.04, vy: (b.y - p.y) * 0.04,
          life: 260, maxR: 4, radius: 3,
          color: Colors.FX.GRAZE, glow: 12, friction: 0.92
        });
        game.particles.push(pt);
        audio.sfxGraze();
      }
      // 命中判定点
      if (p.invuln > 0) continue;
      if (circleHit(b.x, b.y, b.radius, p.x, p.y, p.radius)) {
        p.takeDamage(b.damage, b);
        b.dead = true; b.active = false;
      }
    }
  }

  // ---------- 敌机/子弹 直接撞机 ----------
  _enemiesVsPlayer(game) {
    const p = game.player;
    if (!p || p.dead || p.invuln > 0) return;
    for (const e of game.enemies) {
      if (!e.active || e.dead) continue;
      if (circleHit(e.x, e.y, e.radius, p.x, p.y, p.radius)) {
        p.takeDamage(e.damage, e);
        e.takeDamage(99999, p); // 同归于尽
      }
    }
  }

  // ---------- 道具拾取 ----------
  _pickupsVsPlayer(game) {
    const p = game.player;
    if (!p || p.dead) return;
    for (const pk of game.pickups) {
      if (!pk.active || pk.dead) continue;
      if (circleHit(pk.x, pk.y, pk.radius, p.x, p.y, p.radius + 10)) {
        game.onPickup(pk);
        pk.dead = true; pk.active = false;
      }
    }
  }
}

export default CollisionSystem;
