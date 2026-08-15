// ============================================================
//  Wingman.js - 僚机
// ============================================================
import { Entity } from './Entity.js';
import { Colors } from '../config/Colors.js';
import { TAU, lerp, drawGlowCircle, drawGlowPoly, rand } from '../core/Utils.js';
import { audio } from '../core/AudioManager.js';

export class Wingman extends Entity {constructor() {
    super();
    this.side = 1;        // -1左 1右
    this.team = 'player';
    this.damage = 0.3;
    this.radius = 9;
    this.shootCD = 0;
    this.shootInterval = 180;
    this.type = 'attack';  // attack/defense/support
    this.trailColor = Colors.PLAYER.TRAIL_2;
  }

  reset() {
    this.side = 1; this.shootCD = 0;
    this.dead = false; this.active = true;
    this.type = 'attack';
  }

  update(dt, game) {
    const dts = dt / 16.6667;
    const p = game.player;
    if (!p || p.dead) return;
    // 跟随玩家：左右两侧后上方
    const targetX = p.x + this.side * 38;
    const targetY = p.y + 22 + Math.sin((performance.now() + this.side * 500) * 0.003) * 2;
    this.x = lerp(this.x, targetX, 0.2 * dts);
    this.y = lerp(this.y, targetY, 0.2 * dts);

    // 射击
    this.shootCD -= dt;
    if (this.shootCD <= 0 && game.canAutoShoot()) {
      this.shootCD = this.shootInterval;
      this._fire(game);
    }
    // 尾焰粒子
    if (Math.random() < 0.6) {
      const pt = game.fxPool.acquire();
      pt.setup({
        ptype: 'trail', x: this.x + rand(-1,1), y: this.y + 8,
        vx: rand(-0.3,0.3), vy: rand(1.2, 2.2),
        life: 250, maxR: rand(2, 3.5), radius: 3.5,
        color: this.trailColor, glow: 10, friction: 0.93
      });
      game.particles.push(pt);
    }
  }

  _fire(game) {
    const dmgBonus = this.type === 'attack' ? 1.3 : 1;
    const b = game.playerBulletPool.acquire();
    b.setup({
      team: 'player', x: this.x, y: this.y - 10,
      vx: 0, vy: -11, radius: 3.2, damage: 0.8 * dmgBonus,
      color: game.player.shipId === 'sf02' ? 'gold'
           : game.player.shipId === 'sf03' ? 'purple' : 'cyan',
      life: 2200,
    });
    game.playerBullets.push(b);
  }

  draw(ctx, game) {
    const shipId = game.player ? game.player.shipId : 'sf01';
    const color = shipId === 'sf02' ? Colors.PLAYER.THUNDER_BODY
               : shipId === 'sf03' ? Colors.PLAYER.PHANTOM_BODY : Colors.PLAYER.FALCON_BODY;
    const cock  = shipId === 'sf02' ? Colors.PLAYER.THUNDER_COCK
               : shipId === 'sf03' ? Colors.PLAYER.PHANTOM_COCK : Colors.PLAYER.FALCON_COCK;
    const x = this.x, y = this.y;
    // 机身（三角）
    drawGlowPoly(ctx, [
      {x: x, y: y - 10},
      {x: x - 9 * this.side, y: y + 4},
      {x: x - 2 * this.side, y: y + 6},
      {x: x + 2 * this.side, y: y + 6},
      {x: x + 9 * this.side, y: y + 4},
    ], color + '55', color, 1.5, 8);
    // 座舱
    drawGlowCircle(ctx, x, y - 2, 2, cock, cock, 5);
  }
}

export default Wingman;
