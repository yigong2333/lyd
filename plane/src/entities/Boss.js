// ============================================================
//  Boss.js - Boss基类（多阶段 + SpellCard弹幕）
// ============================================================

import { Entity } from './Entity.js';
import { Colors } from '../config/Colors.js';
import { BossData } from '../config/BossData.js';
import {
  TAU, clamp, rand, drawGlowCircle, drawGlowPoly,
  angleBetween, dist, sin01, lerp
} from '../core/Utils.js';
import { audio } from '../core/AudioManager.js';

export class Boss extends Entity {
  constructor() {
    super();
    this.team = 'enemy';
    this.bossId = 'crab';
    this.data = BossData.crab;
    this.phase = 0;            // 0~2
    this.radius = 72;
    this.maxHp = 2200;
    this.hp = 2200;
    this.age = 0;
    this.entryTime = 2000;     // 入场动画时长
    this.entered = false;      // 入场完成
    this.damage = 30;
    this.score = 30000;
    this.state = 'entry';      // entry | fighting | dying | dead
    this._targetX = 0; this._targetY = 0;
    this.timer = {};           // 各弹幕CD
    this.summonCD = 0;
    this.custom = {};
    this.slowmoBulletTimer = 0;
    this.weakPulse = 0;        // 弱点闪烁脉冲
    this.stunTimer = 0;
    this._gameRef = null;
    this.teleportTimer = 0;
    this.fury = false;   // 残血狂暴
  }

  reset() {
    this.phase = 0; this.age = 0; this.entered = false;
    this.state = 'entry'; this.timer = {}; this.summonCD = 0;
    this.custom = {}; this.teleportTimer = 0;
    this.dead = false; this.active = true;
    this.stunTimer = 0;
    this.fury = false;
  }

  spawn(bossId, game) {
    const d = BossData[bossId] || BossData.crab;
    this.bossId = bossId;
    this.data = d;
    const hpMul = game && game.stageEnemyHpMul || 1;
    this.maxHp = Math.floor(d.maxHp * hpMul);
    this.hp = this.maxHp;
    this.radius = d.radius;
    this.score = 30000 * (bossId === 'crab' ? 1 : bossId === 'carrier' ? 2 : 3.5);
    this.x = game.width * 0.5;
    this.y = -120;
    this._targetX = game.width * 0.5;
    this._targetY = game.height * 0.22;
    this.state = 'entry';
    this.phase = 0;
    this.age = 0; this.entered = false;
    this.dead = false; this.active = true;
    this.custom = {};
    this.fury = false;
    // 初始化各计时器
    for (const t in d.phases[0].timers) this.timer[t] = rand(300, 900);
    if (d.phases[0].summon) this.summonCD = d.phases[0].summon.cd * 0.6;
    return this;
  }

  // ---------- Update ----------
  update(dt, game) {
    if (this.dead) return;
    this._gameRef = game;
    const dts = dt / 16.6667;
    this.age += dt;
    if (this.stunTimer > 0) { this.stunTimer -= dt; return; }
    this.weakPulse += dt * 0.005;

    if (this.state === 'entry') {
      // 入场：从屏幕上外移动到目标点
      const t = clamp(this.age / this.entryTime, 0, 1);
      this.x = lerp(game.width*0.5, this._targetX, t);
      this.y = lerp(-120, this._targetY, this._easeOutBack(t));
      if (t >= 1) { this.state = 'fighting'; this.entered = true; }
      return;
    }
    if (this.state === 'dying') {
      // 爆炸动画
      if (Math.random() < 0.8) {
        const pt = game.fxPool.acquire();
        pt.setup({
          x: this.x + rand(-this.radius, this.radius),
          y: this.y + rand(-this.radius, this.radius),
          vx: rand(-3, 3), vy: rand(-3, 3),
          life: rand(500, 900), maxR: rand(5, 11), radius: 9,
          color: rand(0,1) < 0.5 ? Colors.FX.EXPLOSION_MID : Colors.FX.EXPLOSION_IN,
          glow: 22, friction: 0.93
        });
        game.particles.push(pt);
      }
      if (this.age - this._dyingStart > 2600) {
        this.dead = true; this.active = false;
      }
      return;
    }

    // ---------- 战斗阶段 ----------
    // 检查阶段切换
    this._checkPhase(game);

    // 移动模式
    const ph = this.data.phases[this.phase];
    switch (ph.moves) {
      case 'sway':
        this._targetX = game.width * 0.5 + Math.sin(this.age * 0.0009 * ph.moveSpeed) * (game.width * 0.3);
        this._targetY = game.height * 0.22 + Math.sin(this.age * 0.0013 * ph.moveSpeed) * 30;
        break;
      case 'hover':
        this._targetX = game.width * 0.5;
        this._targetY = game.height * 0.22;
        break;
      case 'chase': {
        const p = game.player;
        this._targetX = p ? clamp(p.x, game.width*0.2, game.width*0.8) : game.width*0.5;
        this._targetY = game.height * 0.28 + Math.sin(this.age*0.0012) * 20;
        break;
      }
      case 'snake': {
        const t = this.age * 0.0008;
        this._targetX = game.width*0.5 + Math.sin(t * 1.2) * (game.width*0.32);
        this._targetY = game.height*0.2 + Math.sin(t * 2.0) * 40;
        break;
      }
      case 'teleport':
        this.teleportTimer -= dt;
        if (this.teleportTimer <= 0) {
          this.teleportTimer = ph.timers.teleport || 3500;
          // 瞬移特效
          for (let i = 0; i < 16; i++) {
            const pt = game.fxPool.acquire();
            const ang = (i / 16) * TAU;
            pt.setup({
              x: this.x + Math.cos(ang)*this.radius*0.3, y: this.y + Math.sin(ang)*this.radius*0.3,
              vx: Math.cos(ang)*4, vy: Math.sin(ang)*4,
              life: 500, maxR: 4, radius: 4,
              color: this.data.colorAccent, glow: 16, friction: 0.9
            });
            game.particles.push(pt);
          }
          this.x = rand(game.width*0.15, game.width*0.85);
          this.y = rand(game.height*0.12, game.height*0.3);
          for (let i = 0; i < 16; i++) {
            const pt = game.fxPool.acquire();
            const ang = (i / 16) * TAU;
            pt.setup({
              x: this.x + Math.cos(ang)*this.radius*0.5, y: this.y + Math.sin(ang)*this.radius*0.5,
              vx: -Math.cos(ang)*3, vy: -Math.sin(ang)*3,
              life: 500, maxR: 4, radius: 4,
              color: this.data.colorAccent, glow: 16, friction: 0.9
            });
            game.particles.push(pt);
          }
        }
        break;
    }
    // 平滑移动到目标
    this.x = lerp(this.x, this._targetX, 0.04 * dts);
    this.y = lerp(this.y, this._targetY, 0.04 * dts);

    // 狂暴红粒子
    if (this.fury && Math.random() < 0.5) {
      const ang = rand(0, TAU);
      const pt = game.fxPool.acquire();
      pt.setup({
        x: this.x + Math.cos(ang) * this.radius, y: this.y + Math.sin(ang) * this.radius,
        vx: -Math.cos(ang) * 1.5, vy: -Math.sin(ang) * 1.5,
        life: 400, maxR: 4, radius: 3.5,
        color: '#ff2222', glow: 16,
      });
      game.particles.push(pt);
    }

    // ---------- 弹幕 ----------
    if (this.bossId === 'crab')    this._ai_crab(dt, game);
    if (this.bossId === 'carrier') this._ai_carrier(dt, game);
    if (this.bossId === 'abyss')   this._ai_abyss(dt, game);

    // 召唤小怪（狂暴时加速）
    if (ph.summon) {
      this.summonCD -= dt * (this.fury ? 1.5 : 1);
      if (this.summonCD <= 0) {
        this.summonCD = ph.summon.cd;
        this._doSummon(ph.summon.count, ph.summon.type, game);
      }
    }
  }

  _easeOutBack(t) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  _checkPhase(game) {
    const ph = this.data.phases[this.phase];
    const ratio = this.hp / this.maxHp;
    // 最终阶段残血：狂暴模式
    if (!this.fury && this.phase === this.data.phases.length - 1 && ratio < 0.2) {
      this.fury = true;
      game.shake(16, 1200);
      game.flash(0.5, 'rgba(255,0,60,0.5)');
      game.addFloat('FINAL FURY!', game.width / 2, game.height * 0.42, '#ff2222', 'big');
      audio.sfxFury();
    }
    if (ratio < ph.hpRange[0]) {
      // 阶段切换
      if (this.phase < this.data.phases.length - 1) {
        this.phase++;
        const nph = this.data.phases[this.phase];
        this.timer = {};
        for (const t in nph.timers) this.timer[t] = 800;
        if (nph.summon) this.summonCD = nph.summon.cd * 0.7;
        // 视觉：闪红+屏幕震动+清除玩家外子弹
        game.shake(14, 900);
        game.flash(0.5, 'rgba(255,0,212,0.5)');
        game.addFloat(nph.spellCard || 'NEW PHASE', game.width/2, game.height*0.42, Colors.NEON_PINK, 'big');
        audio.sfxPhase();
        // 大冲击波
        const sw = game.fxPool.acquire();
        sw.setup({
          ptype: 'shockwave', x: this.x, y: this.y,
          life: 700, maxR: 280, radius: 20,
          color: this.data.colorAccent + 'dd', ringWidth: 6, glow: 30
        });
        game.particles.push(sw);
      }
    }
  }

  _doSummon(count, type, game) {
    for (let i = 0; i < count; i++) {
      const e = game.enemyPool.acquire();
      const ang = (i / count) * TAU;
      const sx = this.x + Math.cos(ang) * 100;
      const sy = this.y + Math.sin(ang) * 80;
      e.spawn(type, sx, sy, game);
      if (type === 'minion') {
        e.orbitTarget = this;
        e.orbitAngle = ang;
        e.orbitR = rand(80, 150);
      }
      game.enemies.push(e);
    }
  }

  // ============ 各Boss AI ============
  _ai_crab(dt, game) {
    const ph = this.data.phases[this.phase];
    const bh = game.bulletHell;
    // 计时（狂暴时加速1.6倍）
    for (const k in ph.timers) this.timer[k] = (this.timer[k] || 0) - dt * (this.fury ? 1.6 : 1);

    if (this.phase === 0) {
      // 钳击：左右两舷扇形 + 上方直射
      if (this.timer.claw <= 0) {
        this.timer.claw = ph.timers.claw;
        const ang1 = angleBetween(this.x - 60, this.y + 30, game.player.x, game.player.y);
        const ang2 = angleBetween(this.x + 60, this.y + 30, game.player.x, game.player.y);
        bh.spawnFan(this.x - 60, this.y + 30, ang1, { count: 5, spread: 0.8, speed: 3.5, color: 'red', damage: 11, radius: 5 });
        bh.spawnFan(this.x + 60, this.y + 30, ang2, { count: 5, spread: 0.8, speed: 3.5, color: 'red', damage: 11, radius: 5 });
      }
      if (this.timer.fan <= 0) {
        this.timer.fan = ph.timers.fan;
        bh.spawnFan(this.x, this.y + 40, Math.PI/2, { count: 7, spread: 1.1, speed: 3, color: 'pink', damage: 9, radius: 5 });
      }
    } else if (this.phase === 1) {
      if (this.timer.circle <= 0) {
        this.timer.circle = ph.timers.circle;
        this.custom.cAngle = (this.custom.cAngle || 0) + 0.35;
        bh.spawnCircle(this.x, this.y + 20, { count: 14, speed: 2.8, color: 'purple', startAngle: this.custom.cAngle, damage: 10, radius: 5 });
      }
      if (this.timer.fan <= 0) {
        this.timer.fan = ph.timers.fan;
        bh.spawnAimedFan(this.x, this.y + 40, { count: 9, spread: 1.4, speed: 3.4, color: 'orange', damage: 11, radius: 5 });
      }
    } else {
      // P3：激光十字 + 自机狙 + 螺旋
      if (this.timer.spiral <= 0) {
        this.timer.spiral = ph.timers.spiral;
        this.custom.spState = this.custom.spState || { angle: 0 };
        bh.spawnSpiral(this.x, this.y + 20, this.custom.spState, { arms: 3, step: 0.22, speed: 3, color: 'pink', damage: 10, radius: 4.5 });
      }
      if (this.timer.laser <= 0) {
        this.timer.laser = ph.timers.laser;
        // 十字激光
        bh.spawnLaser(this.x, this.y, Math.PI/2, { damage: 22, radius: 8 });
        bh.spawnLaser(this.x, this.y, 0, { damage: 16, radius: 6 });
        bh.spawnLaser(this.x, this.y, Math.PI, { damage: 16, radius: 6 });
      }
      if (this.timer.aimed <= 0) {
        this.timer.aimed = ph.timers.aimed;
        for (let i = 0; i < 3; i++) {
          setTimeout(() => bh.spawnAimed(this.x, this.y + 30, { speed: 4.5, damage: 12, radius: 6, color: 'red' }), i * 100);
        }
      }
    }
  }

  _ai_carrier(dt, game) {
    const ph = this.data.phases[this.phase];
    const bh = game.bulletHell;
    for (const k in ph.timers) this.timer[k] = (this.timer[k] || 0) - dt * (this.fury ? 1.6 : 1);

    if (this.phase === 0) {
      // 导弹：抛物线式（用带重力子弹实现）
      if (this.timer.missile <= 0) {
        this.timer.missile = ph.timers.missile;
        for (let side = -1; side <= 1; side += 2) {
          for (let i = 0; i < 4; i++) {
            const px = this.x + side * 80 + rand(-10, 10);
            const py = this.y + 20;
            const ang = Math.PI/2 + rand(-0.3, 0.3) * side;
            const b = bh.shoot(px, py, { angle: ang, speed: rand(3, 4), color: 'orange', bulletType: 'big', radius: 7, damage: 16 });
            // 简易抛物线：逐渐加速下落
            b.custom = { missile: true };
          }
        }
      }
      if (this.timer.fan <= 0) {
        this.timer.fan = ph.timers.fan;
        bh.spawnFan(this.x, this.y + 40, Math.PI/2, { count: 11, spread: Math.PI * 0.65, speed: 3, color: 'cyan', damage: 10, radius: 5 });
      }
    } else if (this.phase === 1) {
      if (this.timer.ring <= 0) {
        this.timer.ring = ph.timers.ring;
        // 扩散环形脉冲
        bh.spawnRing(this.x, this.y, { count: 30, startSpeed: 1.2, endSpeed: 3, color: 'purple', damage: 12, radius: 5 });
      }
      if (this.timer.striker <= 0) {
        this.timer.striker = ph.timers.striker;
        // 两舷大型扇形
        bh.spawnFan(this.x - 90, this.y + 30, Math.PI/2, { count: 9, spread: 1.0, speed: 3.4, color: 'yellow', damage: 11, radius: 5 });
        bh.spawnFan(this.x + 90, this.y + 30, Math.PI/2, { count: 9, spread: 1.0, speed: 3.4, color: 'yellow', damage: 11, radius: 5 });
      }
    } else {
      if (this.timer.tripleSpiral <= 0) {
        this.timer.tripleSpiral = ph.timers.tripleSpiral;
        this.custom.sp1 = this.custom.sp1 || { angle: 0 };
        this.custom.sp2 = this.custom.sp2 || { angle: Math.PI * 0.33 };
        this.custom.sp3 = this.custom.sp3 || { angle: Math.PI * 0.66 };
        bh.spawnSpiral(this.x - 40, this.y + 20, this.custom.sp1, { arms: 2, step: 0.20, speed: 3.2, color: 'cyan', damage: 9, radius: 4.5 });
        bh.spawnSpiral(this.x,      this.y + 30, this.custom.sp2, { arms: 2, step: -0.20, speed: 3.2, color: 'purple', damage: 9, radius: 4.5 });
        bh.spawnSpiral(this.x + 40, this.y + 20, this.custom.sp3, { arms: 2, step: 0.20, speed: 3.2, color: 'pink', damage: 9, radius: 4.5 });
      }
      if (this.timer.aimedBurst <= 0) {
        this.timer.aimedBurst = ph.timers.aimedBurst;
        for (let i = 0; i < 8; i++) setTimeout(() => bh.spawnAimed(this.x, this.y + 30, { speed: 4, damage: 11, radius: 5, color: 'red' }), i * 70);
      }
    }
  }

  _ai_abyss(dt, game) {
    const ph = this.data.phases[this.phase];
    const bh = game.bulletHell;
    for (const k in ph.timers) this.timer[k] = (this.timer[k] || 0) - dt * (this.fury ? 1.6 : 1);

    if (this.phase === 0) {
      if (this.timer.aimedBarrage <= 0) {
        this.timer.aimedBarrage = ph.timers.aimedBarrage;
        // 身体每节发一枚自机狙 - 这里简化为多处射
        for (let i = -3; i <= 3; i++) {
          bh.spawnAimed(this.x + i * 22, this.y + i * 12, { speed: 4.2, color: 'purple', damage: 10, radius: 5 });
        }
      }
      if (this.timer.circle <= 0) {
        this.timer.circle = ph.timers.circle;
        this.custom.cAng = (this.custom.cAng || 0) + 0.15;
        bh.spawnCircle(this.x, this.y + 30, { count: 22, startAngle: this.custom.cAng, speed: 2.8, color: 'pink', damage: 10, radius: 4.8 });
      }
    } else if (this.phase === 1) {
      if (this.timer.megaFan <= 0) {
        this.timer.megaFan = ph.timers.megaFan;
        bh.spawnFan(this.x, this.y + 50, Math.PI/2, { count: 40, spread: Math.PI * 0.9, speed: 3.2, color: 'cyan', damage: 10, radius: 5 });
      }
      if (this.timer.wall <= 0) {
        this.timer.wall = ph.timers.wall;
        // 环形弹壁（压迫式）
        bh.spawnRing(this.x, this.y + 40, { count: 40, startSpeed: 1.0, endSpeed: 2.2, color: 'purple', damage: 11, radius: 6 });
      }
      if (this.timer.random <= 0) {
        this.timer.random = ph.timers.random;
        bh.spawnRandom(this.x, this.y + 40, { count: 18, minSpeed: 2, maxSpeed: 4.5, minAngle: Math.PI * 0.1, maxAngle: Math.PI * 0.9, color: 'yellow', damage: 9, radius: 4.5 });
      }
    } else {
      // P3：弹幕地狱
      if (this.timer.hell <= 0) {
        this.timer.hell = ph.timers.hell;
        this.custom.hell = this.custom.hell || { a: 0 };
        // 6反向螺旋 + 随机杂弹
        bh.spawnSpiral(this.x, this.y + 30, this.custom.hell, { arms: 6, step: 0.15, speed: 2.6, color: 'pink', damage: 10, radius: 4.5 });
        if (Math.random() < 0.25) {
          bh.spawnAimed(this.x + rand(-40,40), this.y + rand(0, 60), { speed: rand(3,5), color: 'red', damage: 10, radius: 5 });
        }
      }
      if (this.timer.lasers <= 0) {
        this.timer.lasers = ph.timers.lasers;
        for (let i = 0; i < 3; i++) {
          const ang = Math.PI/2 + (i - 1) * 0.18;
          bh.spawnLaser(this.x + rand(-20,20), this.y + 40, ang, { damage: 22, radius: 9 });
        }
      }
      if (this.timer.blackHole <= 0) {
        this.timer.blackHole = ph.timers.blackHole;
        // 黑洞：持续吸引玩家（通过game.blackHoleTarget实现）
        this.custom.blackHoleX = rand(game.width*0.25, game.width*0.75);
        this.custom.blackHoleY = rand(game.height*0.4, game.height*0.65);
        this.custom.blackHoleT = 3000;
        game.blackHole = { x: this.custom.blackHoleX, y: this.custom.blackHoleY, t: 3000 };
        audio.sfxPhase();
      }
      // 黑洞视觉
      if (game.blackHole) {
        game.blackHole.t -= dt;
        if (game.blackHole.t <= 0) game.blackHole = null;
        else {
          const pt = game.fxPool.acquire();
          pt.setup({
            ptype: 'shockwave', x: game.blackHole.x, y: game.blackHole.y,
            life: 600, maxR: 60, radius: 10,
            color: 'rgba(162,0,255,0.7)', ring: true, ringWidth: 3, glow: 20,
          });
          game.particles.push(pt);
        }
      }
    }
  }

  // ---------- 受伤/死亡 ----------
  takeDamage(dmg, src) {
    if (this.dead) return;
    // 弱点判定：击中靠近中心x，y下沿，伤害×2
    let finalDmg = dmg;
    if (src && dist(src.x || 0, src.y || 0, this.x, this.y) < this.radius * 0.4) {
      finalDmg *= 1.5;
    }
    super.takeDamage(finalDmg, src);
  }

  onDeath(src) {
    if (this.state !== 'dying') {
      this.state = 'dying';
      this._dyingStart = this.age;
      const g = this._gameRef;
      if (g) {
        g.shake(20, 1800);
        g.flash(0.9);
        audio.sfxBossExplode();
        // 大量道具
        for (let i = 0; i < 8; i++) {
          const pk = g.pickupPool.acquire();
          const types = ['$','$','$','P','P','E','HP','B','S','T'];
          pk.setup(types[i % types.length], this.x + rand(-60,60), this.y + rand(-30, 30));
          g.pickups.push(pk);
        }
        // 烟花式清屏：敌方子弹自动消灭（交给Game onBossDeath处理）
      }
    }
  }

  // ---------- 绘制 ----------
  draw(ctx, game) {
    this._gameRef = game;
    const accent = this.data.colorAccent;
    const body = this.data.colorBody;

    // 入场未完成的半透明
    ctx.save();
    if (this.state === 'entry') ctx.globalAlpha = clamp(this.age / this.entryTime, 0, 1);
    if (this.phase === 2) {
      // P3呼吸发光
      const pulse = 0.7 + sin01(this.weakPulse) * 0.3;
      ctx.save();
      ctx.globalAlpha = 0.18 * pulse;
      ctx.fillStyle = accent;
      ctx.shadowBlur = 80; ctx.shadowColor = accent;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 1.8, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    if (this.bossId === 'crab') this._drawCrab(ctx, body, accent);
    else if (this.bossId === 'carrier') this._drawCarrier(ctx, body, accent);
    else this._drawAbyss(ctx, body, accent);

    // 弱点发光核心
    drawGlowCircle(ctx, this.x, this.y + 6, 10 + Math.sin(this.weakPulse)*3, Colors.NEON_YELLOW, Colors.NEON_YELLOW, 22);

    // 阶段符卡名
    if (this.entered && this.age < 4000) {
      const a = this.age < 1000 ? this.age/1000 : (this.age > 3000 ? (4000 - this.age)/1000 : 1);
      ctx.save();
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.fillStyle = Colors.NEON_PINK;
      ctx.shadowBlur = 14; ctx.shadowColor = Colors.NEON_PINK;
      ctx.font = 'bold 16px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.data.phases[this.phase].spellCard || '', this.x, this.y - this.radius - 24);
      ctx.restore();
    }
    ctx.restore();
  }

  _drawCrab(ctx, body, accent) {
    const x = this.x, y = this.y, r = this.radius;
    // 两只钳子（左右大三角）
    const clawOffset = Math.sin(this.age * 0.003) * 8;
    const drawClaw = (sx, flip) => {
      drawGlowPoly(ctx, [
        {x: sx, y: y - 10},
        {x: sx - 24 * flip, y: y - 60 + clawOffset},
        {x: sx - 54 * flip, y: y - 30 + clawOffset},
        {x: sx - 58 * flip, y: y + 10},
        {x: sx - 30 * flip, y: y + 30},
        {x: sx - 10 * flip, y: y + 10},
      ], body + '66', accent, 2.5, 14);
    };
    drawClaw(x - 40, 1); drawClaw(x + 40, -1);
    // 关节腿
    for (let i = 0; i < 3; i++) {
      const dx = (i - 1) * 18;
      drawGlowPoly(ctx, [
        {x: x + dx - 20, y: y + 10}, {x: x + dx - 40, y: y + 60}, {x: x + dx - 32, y: y + 74},
        {x: x + dx - 16, y: y + 56}, {x: x + dx - 10, y: y + 20}
      ], body + '55', accent, 1.5, 8);
      drawGlowPoly(ctx, [
        {x: x - dx + 20, y: y + 10}, {x: x - dx + 40, y: y + 60}, {x: x - dx + 32, y: y + 74},
        {x: x - dx + 16, y: y + 56}, {x: x - dx + 10, y: y + 20}
      ], body + '55', accent, 1.5, 8);
    }
    // 身体椭圆
    drawGlowPoly(ctx, [
      {x, y: y - r*0.65},
      {x: x - r*0.75, y: y - r*0.2},
      {x: x - r*0.9, y: y + r*0.35},
      {x: x - r*0.5, y: y + r*0.55},
      {x: x + r*0.5, y: y + r*0.55},
      {x: x + r*0.9, y: y + r*0.35},
      {x: x + r*0.75, y: y - r*0.2},
    ], body + '77', accent, 2.5, 18);
    // 眼睛（左右2只）
    drawGlowCircle(ctx, x - 22, y - 20, 6, Colors.NEON_YELLOW, Colors.NEON_RED, 12);
    drawGlowCircle(ctx, x + 22, y - 20, 6, Colors.NEON_YELLOW, Colors.NEON_RED, 12);
    drawGlowCircle(ctx, x - 22, y - 20, 2, '#fff', Colors.NEON_YELLOW, 6);
    drawGlowCircle(ctx, x + 22, y - 20, 2, '#fff', Colors.NEON_YELLOW, 6);
  }

  _drawCarrier(ctx, body, accent) {
    const x = this.x, y = this.y, r = this.radius;
    // 主舰体（长条形梯形）
    drawGlowPoly(ctx, [
      {x: x - r*0.5, y: y - r*0.7},
      {x: x + r*0.5, y: y - r*0.7},
      {x: x + r*1.05, y: y - r*0.15},
      {x: x + r*1.05, y: y + r*0.3},
      {x: x + r*0.55, y: y + r*0.65},
      {x: x - r*0.55, y: y + r*0.65},
      {x: x - r*1.05, y: y + r*0.3},
      {x: x - r*1.05, y: y - r*0.15},
    ], body + '77', accent, 2.5, 20);
    // 甲板
    drawGlowPoly(ctx, [
      {x: x - r*0.35, y: y - r*0.55},
      {x: x + r*0.35, y: y - r*0.55},
      {x: x + r*0.85, y: y - r*0.05},
      {x: x - r*0.85, y: y - r*0.05},
    ], accent + '33', accent, 1.5, 12);
    // 舰桥
    drawGlowPoly(ctx, [
      {x: x - r*0.2, y: y - r*0.85},
      {x: x + r*0.2, y: y - r*0.85},
      {x: x + r*0.3, y: y - r*0.55},
      {x: x - r*0.3, y: y - r*0.55},
    ], body + 'aa', accent, 2, 14);
    // 量子核心（蓝绿光球）
    const pulse = sin01(this.age * 0.006);
    drawGlowCircle(ctx, x, y + 10, 18 + pulse*3, accent, accent, 30 + pulse*10);
    drawGlowCircle(ctx, x, y + 10, 8 + pulse*2, '#fff', accent, 18);
    // 导弹巢
    drawGlowPoly(ctx, [
      {x: x - r*0.9, y: y + r*0.1}, {x: x - r*1.0, y: y + r*0.1},
      {x: x - r*1.0, y: y + r*0.28}, {x: x - r*0.8, y: y + r*0.28}
    ], accent + '55', accent, 1, 6);
    drawGlowPoly(ctx, [
      {x: x + r*0.9, y: y + r*0.1}, {x: x + r*1.0, y: y + r*0.1},
      {x: x + r*1.0, y: y + r*0.28}, {x: x + r*0.8, y: y + r*0.28}
    ], accent + '55', accent, 1, 6);
    // 双联炮
    drawGlowCircle(ctx, x - r*0.6, y + r*0.45, 4, Colors.NEON_RED, Colors.NEON_RED, 10);
    drawGlowCircle(ctx, x + r*0.6, y + r*0.45, 4, Colors.NEON_RED, Colors.NEON_RED, 10);
  }

  _drawAbyss(ctx, body, accent) {
    const x = this.x, y = this.y, r = this.radius;
    // 蛇形多段体（8节）
    for (let i = 8; i >= 0; i--) {
      const t = i / 8;
      const segX = x - Math.sin(this.age * 0.0015 + t * TAU*0.6) * (20 + t*60);
      const segY = y + t * 40 - Math.cos(this.age * 0.002 + t * 3) * 10;
      const segR = r * (0.35 + (1 - t) * 0.7);
      // 虚空质感（深紫+外发光）
      ctx.save();
      const g = ctx.createRadialGradient(segX, segY, segR*0.1, segX, segY, segR);
      g.addColorStop(0, '#000');
      g.addColorStop(0.6, body);
      g.addColorStop(1, accent + '22');
      ctx.fillStyle = g;
      ctx.shadowBlur = 24; ctx.shadowColor = accent;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(segX, segY, segR, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // 头部：巨口（张开三角）
    const mouthOpen = 0.5 + sin01(this.age * 0.005) * 0.4;
    drawGlowPoly(ctx, [
      {x: x, y: y - r*0.85},
      {x: x - r*0.9, y: y - r*0.3 - mouthOpen*r*0.5},
      {x: x - r*0.95, y: y + r*0.25},
      {x: x - r*0.4, y: y + r*0.35},
      {x: x + r*0.4, y: y + r*0.35},
      {x: x + r*0.95, y: y + r*0.25},
      {x: x + r*0.9, y: y - r*0.3 - mouthOpen*r*0.5},
    ], '#000', accent, 3, 24);
    // 巨口内发光
    ctx.save();
    ctx.globalAlpha = 0.7 + Math.sin(this.age*0.006)*0.3;
    const gg = ctx.createRadialGradient(x, y + 5, 5, x, y + 5, r*0.6);
    gg.addColorStop(0, Colors.NEON_PINK);
    gg.addColorStop(0.6, Colors.NEON_PURPLE);
    gg.addColorStop(1, 'rgba(255,0,255,0)');
    ctx.fillStyle = gg;
    ctx.shadowBlur = 30; ctx.shadowColor = accent;
    ctx.beginPath();
    ctx.ellipse(x, y + 10, r*0.55, r*0.35, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    // 眼睛（2只在头上方）
    drawGlowCircle(ctx, x - 36, y - r*0.55, 7, '#fff', Colors.NEON_CYAN, 18);
    drawGlowCircle(ctx, x + 36, y - r*0.55, 7, '#fff', Colors.NEON_CYAN, 18);
    drawGlowCircle(ctx, x - 36, y - r*0.55, 3, Colors.NEON_PINK, Colors.NEON_PINK, 10);
    drawGlowCircle(ctx, x + 36, y - r*0.55, 3, Colors.NEON_PINK, Colors.NEON_PINK, 10);
    // 触手
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * TAU + sin01(this.age*0.002 + i) * 0.4;
      const len = 80 + Math.sin(this.age*0.004 + i*1.3) * 14;
      drawGlowPoly(ctx, [
        {x: x + Math.cos(ang)*r*0.6, y: y + 10 + Math.sin(ang)*r*0.6},
        {x: x + Math.cos(ang+0.1)*(r*0.6+len), y: y + 10 + Math.sin(ang+0.1)*(r*0.6+len)},
        {x: x + Math.cos(ang)*(r*0.6+len-5), y: y + 10 + Math.sin(ang)*(r*0.6+len-5)},
      ], accent + '55', accent, 1.5, 10);
    }
  }
}

export default Boss;
