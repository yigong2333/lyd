// ============================================================
//  BulletHell.js - 弹幕生成系统（8种生成API）
//  封装 Enemy / Boss 的弹幕创建，统一走对象池
// ============================================================

import { TAU, rand } from '../core/Utils.js';
import { BULLET_TYPES } from '../entities/Bullet.js';

export class BulletHell {
  constructor(game) {
    this.game = game;
  }

  /** 基础发射：1发子弹 */
  shoot(x, y, opts = {}) {
    const {
      angle = -Math.PI/2,
      speed = 4,
      radius = 4,
      damage = 8,
      color = 'pink',
      team = 'enemy',
      homing = 0,
      pierce = 0,
      bulletType = 'normal',
      life = 7000,
      turnRate = 0,
      amplitude = 0,
      freq = 4,
      vx = undefined, vy = undefined,
    } = opts;
    const b = team === 'player'
      ? this.game.playerBulletPool.acquire()
      : this.game.enemyBulletPool.acquire();
    const finalVx = vx !== undefined ? vx : Math.cos(angle) * speed;
    const finalVy = vy !== undefined ? vy : Math.sin(angle) * speed;
    b.setup({
      team, x, y, vx: finalVx, vy: finalVy,
      radius, damage, color, homing, pierce,
      bulletType, life, turnRate, amplitude, freq,
      angle,
    });
    if (team === 'player') this.game.playerBullets.push(b);
    else                   this.game.enemyBullets.push(b);
    return b;
  }

  /** 环形弹幕：count发均匀360度 */
  spawnCircle(x, y, opts = {}) {
    const { count = 12, speed = 3, startAngle = 0, gapMul = 1, ...rest } = opts;
    const list = [];
    for (let i = 0; i < count; i++) {
      const a = startAngle + (i / count) * TAU * gapMul;
      list.push(this.shoot(x, y, { angle: a, speed, ...rest }));
    }
    return list;
  }

  /** 扇形弹幕 */
  spawnFan(x, y, angleCenter, opts = {}) {
    const { count = 5, spread = Math.PI/4, speed = 3, ...rest } = opts;
    const list = [];
    const start = angleCenter - spread / 2;
    const step = count === 1 ? 0 : spread / (count - 1);
    for (let i = 0; i < count; i++) {
      list.push(this.shoot(x, y, { angle: start + i * step, speed, ...rest }));
    }
    return list;
  }

  /** 自机狙扇形：朝玩家方向 */
  spawnAimedFan(x, y, opts = {}) {
    const target = this.game.player;
    if (!target || target.dead) return [];
    const a = Math.atan2(target.y - y, target.x - x);
    return this.spawnFan(x, y, a, opts);
  }

  /** 单发自机狙 */
  spawnAimed(x, y, opts = {}) {
    const target = this.game.player;
    if (!target || target.dead) return null;
    const a = Math.atan2(target.y - y, target.x - x);
    return this.shoot(x, y, { angle: a, bulletType: 'aimed', color: 'red', ...opts });
  }

  /** 螺旋弹：持续调用，每帧增加角度
   *  state = { angle: 0 } 外部持有并累加
   */
  spawnSpiral(x, y, state, opts = {}) {
    const { step = 0.25, arms = 1, speed = 3, ...rest } = opts;
    const list = [];
    for (let i = 0; i < arms; i++) {
      const a = state.angle + (i / arms) * TAU;
      list.push(this.shoot(x, y, { angle: a, speed, bulletType: 'spiral', ...rest }));
    }
    state.angle += step;
    return list;
  }

  /** 正弦波弹 */
  spawnWave(x, y, angle, opts = {}) {
    const { count = 1, speed = 3, amplitude = 2.5, freq = 4, ...rest } = opts;
    const list = [];
    for (let i = 0; i < count; i++) {
      const phase = (i / Math.max(1, count)) * TAU;
      list.push(this.shoot(x, y, {
        angle, speed, bulletType: 'wave',
        amplitude, freq: freq + (phase * 0.01), ...rest
      }));
    }
    return list;
  }

  /** 随机散射弹 */
  spawnRandom(x, y, opts = {}) {
    const { count = 16, minSpeed = 2, maxSpeed = 5,
            minAngle = 0, maxAngle = TAU, ...rest } = opts;
    const list = [];
    for (let i = 0; i < count; i++) {
      const a = rand(minAngle, maxAngle);
      const s = rand(minSpeed, maxSpeed);
      list.push(this.shoot(x, y, { angle: a, speed: s, bulletType: 'random', ...rest }));
    }
    return list;
  }

  /** 大型弹 / 激光简版 */
  spawnLaser(x, y, angle, opts = {}) {
    return this.shoot(x, y, {
      angle, bulletType: 'laser',
      color: 'laser', radius: 6, damage: opts.damage || 20,
      speed: opts.speed || 14, life: 1200,
      ...opts
    });
  }

  /** 环形弹壁（空心圆扩散） */
  spawnRing(x, y, opts = {}) {
    const { count = 28, startSpeed = 1.5, endSpeed = 3, ...rest } = opts;
    const list = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU;
      const s = startSpeed + (i / count) * (endSpeed - startSpeed);
      list.push(this.shoot(x, y, { angle: a, speed: s, ...rest }));
    }
    return list;
  }
}

export default BulletHell;
