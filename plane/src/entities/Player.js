// ============================================================
//  Player.js - 玩家战机
// ============================================================

import { Entity } from './Entity.js';
import { Colors } from '../config/Colors.js';
import { PlayerData, MAX_POWER } from '../config/PlayerData.js';
import { TAU, clamp, drawGlowCircle, drawGlowPoly, rand } from '../core/Utils.js';
import { audio } from '../core/AudioManager.js';

export class Player extends Entity {
  constructor() {
    super();
    this.team = 'player';
    this.shipId = 'sf01';
    this.data = PlayerData.sf01;
    this.power = 1;                  // 火力等级 1~8
    this.maxHp = 100;
    this.hp = 100;
    this.bomb = 3;
    this.energy = 0;
    this.maxEnergy = 100;
    this.invuln = 0;                 // 无敌帧剩余ms
    this.dead = false;
    this.radius = 4;                 // 仅hitbox（判定点）
    this.grazeR = 24;                // 擦弹圈
    this.shootCD = 0;
    this.shootInterval = 110;
    this.chargeTime = 0;             // 已蓄力ms
    this.isCharged = false;
    this.dragging = false;           // 触屏模式标记
    this.dragStart = { x: 0, y: 0 };
    this.grazeCD = new WeakMap();    // 每子弹擦弹冷却
    this.slowmoTimer = 0;            // 时间减速剩余（幻影Bomb）
  }

  spawn(game, shipId) {
    this._gameRef = game;
    this.shipId = shipId || game.storage.selectedShip;
    this.data = PlayerData[this.shipId] || PlayerData.sf01;
    this.maxHp = this.data.maxHp;
    this.hp = this.maxHp;
    this.bomb = this.data.startBomb;
    this.energy = 20;
    this.power = 1;
    this.speed = this.data.speed;
    this.grazeR = this.data.grazeR;
    this.radius = this.data.hitboxR;
    this.x = game.width * 0.5;
    this.y = game.height - 120;
    this.invuln = 1500;
    this.dead = false; this.active = true;
    this.shootInterval = 110;
    this.chargeTime = 0;
    this.slowmoTimer = 0;
  }

  // ---------- Update ----------
  update(dt, game) {
    if (this.dead) return;
    const dts = dt / 16.6667;

    // 输入移动
    const input = game.input;
    const axis = input.getAxis();
    const speedScale = (input.pointer.down && input.isCharging(0)) ? 0.35 : 1.0; // 蓄力减速
    if (axis.x || axis.y) {
      this.x += axis.x * this.speed * speedScale * dts;
      this.y += axis.y * this.speed * speedScale * dts;
    }
    // 指针/触屏 移动（跟随）
    if (input.pointer.down) {
      if (input.dragEnabled || input.isDown('')) {
        // 全屏触摸：手指点哪飞机飞哪（快速跟手，手指下方偏移防遮挡）
        const targetX = input.pointer.x;
        const targetY = input.pointer.y + (input.dragEnabled ? 40 : 0);
        const lerpFactor = input.dragEnabled ? 0.9 : 0.9;
        const k = lerpFactor * Math.min(1, 0.35 * dts);
        this.x = this.x + (targetX - this.x) * k;
        this.y = this.y + (targetY - this.y) * k;
      }
    }

    // 边界
    const margin = 16;
    this.x = clamp(this.x, margin, game.width - margin);
    this.y = clamp(this.y, margin + 60, game.height - margin);

    // 无敌帧衰减
    if (this.invuln > 0) this.invuln -= dt;
    if (this.slowmoTimer > 0) this.slowmoTimer -= dt;

    // 能量自然恢复
    this.energy = clamp(this.energy + dt * 0.004, 0, this.maxEnergy);

    // 射击
    const autoShoot = game.canAutoShoot();
    const charging = input.pointer.down && (this._isStaticCharge(input) || this._pcCharge(input));
    if (charging) {
      this.chargeTime = clamp(this.chargeTime + dt, 0, this.data.charge.time);
      if (this.chargeTime >= this.data.charge.time) this.isCharged = true;
      // 蓄电气粒子
      if (Math.random() < 0.6) {
        const ang = Math.random() * TAU;
        const rr = rand(24, 38);
        const pt = game.fxPool.acquire();
        pt.setup({
          x: this.x + Math.cos(ang) * rr, y: this.y + Math.sin(ang) * rr,
          vx: -Math.cos(ang) * 0.5, vy: -Math.sin(ang) * 0.5,
          life: 220, maxR: rand(2, 3.5), radius: 3,
          color: this.chargeTime >= this.data.charge.time ? Colors.NEON_YELLOW : Colors.NEON_CYAN,
          glow: 14, friction: 0.9, ptype: 'charge'
        });
        game.particles.push(pt);
      }
    } else {
      // 释放蓄力 → 发蓄力弹
      if (this.chargeTime > 350) {
        this._releaseCharged(game);
      }
      this.chargeTime = 0;
      this.isCharged = false;

      // 自动射击
      if (autoShoot) {
        this.shootCD -= dt;
        if (this.shootCD <= 0) {
          this.shootCD = this.shootInterval;
          this._fire(game);
        }
      }
    }

    // Bomb
    if (input.bombPressed()) this.useBomb(game);
    // 技能1：满能量大招
    if (input.skillPressed()) this.useUltimate(game);

    // 尾焰粒子
    for (let i = 0; i < 2; i++) {
      const pt = game.fxPool.acquire();
      pt.setup({
        ptype: 'trail',
        x: this.x + rand(-3, 3), y: this.y + 14,
        vx: rand(-0.5, 0.5), vy: rand(2.2, 4.2),
        life: 340, maxR: rand(4, 7), radius: 6,
        color: i === 0 ? Colors.PLAYER.TRAIL_1 : (i === 1 ? Colors.PLAYER.TRAIL_2 : Colors.PLAYER.TRAIL_3),
        glow: 14, friction: 0.92,
      });
      game.particles.push(pt);
    }
  }

  _pcCharge(input) {
    // PC模式：按住左键 且 没有键盘移动 才算蓄力（避免同时移动）
    if (input.dragEnabled) return false;
    const a = input.getAxis();
    return Math.abs(a.x) < 0.1 && Math.abs(a.y) < 0.1;
  }
  _isStaticCharge(input) {
    // 移动端：按住且本帧几乎没移动
    if (!input.dragEnabled) return false;
    return input.pointer.holdTime > 0 && !input.pointer.moved;
  }

  // ---------- 射击 ----------
  _fire(game) {
    const w = this.data.weapons[this.power - 1] || this.data.weapons[0];
    const pierce = w.pierce || 0;
    let fired = 0;
    for (const s of w.shots) {
      const sx = this.x + s.offset;
      const sy = this.y - 12;
      const b = game.playerBulletPool.acquire();
      const dmgBonus = 1;
      b.setup({
        team: 'player', x: sx, y: sy,
        vx: Math.cos(s.angle) * s.speed, vy: Math.sin(s.angle) * s.speed,
        radius: (s.size || 4), damage: s.damage * dmgBonus,
        color: s.color, homing: s.homing || 0,
        pierce: pierce, life: 2500,
      });
      game.playerBullets.push(b);
      fired++;
    }
    if (fired) audio.sfxShoot(this.power);
  }

  _releaseCharged(game) {
    const ratio = clamp(this.chargeTime / this.data.charge.time, 0, 1);
    const c = this.data.charge;
    let dmg = c.damage * (0.3 + ratio * 1.1);
    if (this.data.chargeDamageBonus) dmg *= (1 + this.data.chargeDamageBonus);
    // 巨型弹
    const b = game.playerBulletPool.acquire();
    b.setup({
      team: 'player', x: this.x, y: this.y - 20,
      vx: 0, vy: -11, radius: c.size * (0.6 + ratio * 0.8),
      damage: dmg, color: this.power >= 7 ? 'gold' : 'cyan',
      pierce: 6 + Math.floor(ratio * 6), life: 2500,
      bulletType: 'charged',
    });
    game.playerBullets.push(b);

    // 幻影额外8追踪弹
    if (this.data.charge.homingShots) {
      for (let i = 0; i < this.data.charge.homingShots; i++) {
        const ang = -Math.PI/2 + (i - this.data.charge.homingShots/2) * 0.3;
        const bb = game.playerBulletPool.acquire();
        bb.setup({
          team: 'player', x: this.x, y: this.y - 10,
          vx: Math.cos(ang) * 9, vy: Math.sin(ang) * 9,
          radius: 4, damage: dmg * 0.25, color: 'purple',
          homing: 0.55, pierce: 1, life: 3000,
        });
        game.playerBullets.push(bb);
      }
    }
    audio.sfxChargedShoot();
    game.addFloat(`CHARGED x${Math.round(ratio * 100)}%`, this.x, this.y - 40, Colors.NEON_YELLOW, 'big');
  }

  // ---------- Bomb必杀 ----------
  useBomb(game) {
    if (this.bomb <= 0 || this.dead) return;
    this.bomb--;
    this.invuln = Math.max(this.invuln, this.data.bombInvuln);

    // 幻影：时间减速
    if (this.data.slowmoOnBomb) {
      this.slowmoTimer = Math.max(this.slowmoTimer, this.data.slowmoOnBomb);
      game.shake(6, 600);
    }

    // 清除敌方子弹
    for (const b of game.enemyBullets) {
      const p = game.fxPool.acquire();
      p.setup({ x: b.x, y: b.y, vx: 0, vy: 0, life: 250, maxR: 10, radius: 10,
                color: Colors.NEON_YELLOW, glow: 14 });
      game.particles.push(p);
      b.dead = true; b.active = false;
    }
    // 对敌人/Boss造成固定伤害
    for (const e of [...game.enemies, ...game.bosses]) {
      if (e.dead) continue;
      e.takeDamage(this.data.bombDamage, this);
    }
    // 冲击波
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const sw = game.fxPool.acquire();
        sw.setup({
          ptype: 'shockwave', x: this.x, y: this.y,
          life: 800, maxR: Math.max(game.width, game.height) * 0.9, radius: 10,
          color: i === 0 ? 'rgba(255,242,0,0.85)' : i===1 ? 'rgba(0,240,255,0.6)' : 'rgba(255,255,255,0.4)',
          ring: true, ringWidth: 4 - i, glow: 30 - i*8,
        });
        game.particles.push(sw);
      }, i * 80);
    }
    game.shake(14, 900);
    game.flash(0.5);
    audio.sfxBomb();
  }

  // ---------- 终极技能（消耗能量） ----------
  useUltimate(game) {
    if (this.energy < 100 || this.dead) return;
    this.energy = 0;
    // 每种飞机效果不同
    if (this.shipId === 'sf01') this._ultLaser(game);
    else if (this.shipId === 'sf02') this._ultEMP(game);
    else if (this.shipId === 'sf03') this._ultTimeStop(game);
    audio.sfxBomb();
  }
  _ultLaser(game) {
    // 水平激光全屏扫，每条造成大伤害
    game.shake(8, 500);
    const totalDmg = 400;
    for (const e of [...game.enemies, ...game.bosses]) {
      if (e.dead) continue;
      e.takeDamage(totalDmg, this);
    }
    // 清除所有敌方子弹
    for (const b of game.enemyBullets) { b.dead = true; b.active = false; }
    // 激光视觉：由Game在ultDuration期间渲染
    game.ultVisual = { type: 'laser', t: 0, duration: 900 };
    game.flash(0.6);
  }
  _ultEMP(game) {
    // 范围AOE + 麻痹敌人2s（移动/射击停止）
    game.shake(10, 700);
    game.flash(0.5);
    for (const e of [...game.enemies, ...game.bosses]) {
      if (e.dead) continue;
      e.takeDamage(300, this);
      e.stunTimer = 2000;
    }
    for (const b of game.enemyBullets) { b.dead = true; b.active = false; }
    game.ultVisual = { type: 'emp', t: 0, duration: 800, x: this.x, y: this.y };
  }
  _ultTimeStop(game) {
    // 时间减速3秒 + 无敌（已通过invuln叠加）
    this.slowmoTimer = Math.max(this.slowmoTimer, 3000);
    this.invuln = Math.max(this.invuln, 3000);
    for (const b of game.enemyBullets) { b.dead = true; b.active = false; }
    game.flash(0.4);
    game.ultVisual = { type: 'time', t: 0, duration: 1200 };
  }

  // ---------- 受伤 ----------
  takeDamage(dmg, src) {
    if (this.invuln > 0 || this.dead) return;
    this.hp = clamp(this.hp - dmg, 0, this.maxHp);
    this.invuln = 900;
    // 被击掉落一点火力
    if (this.power > 1) this.power = Math.max(1, this.power - 1);
    // 震屏/闪红
    if (this._gameRef) {
      this._gameRef.shake(10, 400);
      this._gameRef.flash(0.35, 'rgba(255,51,102,0.45)');
      this._gameRef.registerHitTaken();
    }
    audio.sfxPlayerHit();
    if (this.hp <= 0) {
      this.hp = 0;
      this.onDeath(src);
      this.dead = true;
      this.active = false;
    }
  }

  onDeath(src) {
    // 玩家死亡：大爆炸
    if (this._deathFired) return;
    this._deathFired = true;
  }

  // ---------- 资源变更 ----------
  addPower(v = 1) {
    const before = this.power;
    this.power = clamp(this.power + v, 1, MAX_POWER);
    if (this.power > before) audio.sfxPowerUp();
  }
  addHp(v) { this.hp = clamp(this.hp + v, 0, this.maxHp); }
  addBomb(v = 1) { this.bomb = clamp(this.bomb + v, 0, 9); }
  addEnergy(v) {
    let gain = v;
    if (this.data.energyRegenKillsBonus) gain *= (1 + this.data.energyRegenKillsBonus);
    this.energy = clamp(this.energy + gain, 0, this.maxEnergy);
  }

  // ---------- 擦弹检测 ----------
  grazeCheck(bullet) {
    if (this.dead || this.invuln > 0) return false;
    const dx = bullet.x - this.x, dy = bullet.y - this.y;
    const rr = this.grazeR + bullet.radius;
    if (dx*dx + dy*dy <= rr*rr) {
      // 同子弹 100ms 只能擦一次
      const last = this.grazeCD.get(bullet) || 0;
      if (performance.now() - last > 80) {
        this.grazeCD.set(bullet, performance.now());
        return true;
      }
    }
    return false;
  }

  // ---------- 绘制 ----------
  draw(ctx, game) {
    const ship = this.shipId;
    const color = ship === 'sf02' ? Colors.PLAYER.THUNDER_BODY
               : ship === 'sf03' ? Colors.PLAYER.PHANTOM_BODY : Colors.PLAYER.FALCON_BODY;
    const cock  = ship === 'sf02' ? Colors.PLAYER.THUNDER_COCK
               : ship === 'sf03' ? Colors.PLAYER.PHANTOM_COCK : Colors.PLAYER.FALCON_COCK;

    // 无敌闪烁
    if (this.invuln > 0 && Math.floor(this.invuln / 80) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }
    // 火力Lv光环
    if (this.power >= 5) {
      ctx.save();
      const t = performance.now() * 0.002;
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = this.power >= 8 ? Colors.NEON_YELLOW : Colors.NEON_CYAN;
      ctx.shadowBlur = 20; ctx.shadowColor = ctx.strokeStyle;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 34 + Math.sin(t) * 2, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // 蓄力指示环
    if (this.chargeTime > 200) {
      const ratio = clamp(this.chargeTime / this.data.charge.time, 0, 1);
      ctx.save();
      ctx.strokeStyle = ratio >= 1 ? Colors.NEON_YELLOW : Colors.NEON_CYAN;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 22; ctx.shadowColor = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 24, -Math.PI/2, -Math.PI/2 + TAU * ratio);
      ctx.stroke();
      ctx.restore();
    }

    const x = this.x, y = this.y;
    // 机身几何（以中心为基准）
    const size = ship === 'sf02' ? 1.2 : ship === 'sf03' ? 0.9 : 1;
    const s = (dx, dy) => ({ x: x + dx*size, y: y + dy*size });

    if (ship === 'sf01') {
      // 均衡型 尖头三角翼
      drawGlowPoly(ctx, [
        s(0,-20), s(-6,-6), s(-20,-4), s(-14, 6), s(-4,12), s(4,12), s(14,6), s(20,-4), s(6,-6)
      ], color + '66', color, 2, 14);
      drawGlowPoly(ctx, [
        s(0,-20), s(-4,-8), s(4,-8)
      ], cock + 'aa', cock, 1.2, 8);
      // 引擎
      drawGlowCircle(ctx, x - 8 * size, y + 10 * size, 2, Colors.PLAYER.TRAIL_1, Colors.PLAYER.TRAIL_1, 8);
      drawGlowCircle(ctx, x + 8 * size, y + 10 * size, 2, Colors.PLAYER.TRAIL_1, Colors.PLAYER.TRAIL_1, 8);
    } else if (ship === 'sf02') {
      // 重型 宽阔机身
      drawGlowPoly(ctx, [
        s(0,-22), s(-10,-8), s(-26,-2), s(-22, 8), s(-6,14), s(6,14), s(22,8), s(26,-2), s(10,-8)
      ], color + '66', color, 2.2, 16);
      // 双炮管
      ctx.save();
      ctx.shadowBlur = 12; ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.fillRect(x - 16*size - 1, y - 14*size, 3, 18*size);
      ctx.fillRect(x + 13*size,     y - 14*size, 3, 18*size);
      ctx.restore();
      drawGlowCircle(ctx, x, y - 6, 4, cock, cock, 10);
    } else {
      // 幻影 流线型三角
      drawGlowPoly(ctx, [
        s(0,-24), s(-4,-8), s(-18,-2), s(-10,10), s(-2,14), s(2,14), s(10,10), s(18,-2), s(4,-8)
      ], color + '66', color, 1.8, 16);
      // 翼端光
      drawGlowCircle(ctx, x - 18*size, y - 2*size, 2.4, cock, cock, 10);
      drawGlowCircle(ctx, x + 18*size, y - 2*size, 2.4, cock, cock, 10);
      drawGlowCircle(ctx, x, y - 6, 3, cock, cock, 10);
    }

    // 判定点（调试或低压显示：中心一个小点）
    if (game && game.debugMode) {
      ctx.save();
      ctx.strokeStyle = Colors.NEON_GREEN;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = Colors.NEON_CYAN + '88';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.grazeR, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }
}

export default Player;
