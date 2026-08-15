// ============================================================
//  Game.js - 游戏全局主类（状态机 + 主循环）
//  所有子系统/实体在这里组装并协作
// ============================================================

import { Colors } from '../config/Colors.js';
import { PlayerData, MAX_POWER } from '../config/PlayerData.js';
import { storage } from './Storage.js';
import { isMobile, clamp, rand } from './Utils.js';
import { ObjectPool } from './ObjectPool.js';
import { InputManager } from './InputManager.js';
import { Renderer } from './Renderer.js';
import { audio } from './AudioManager.js';
import { CollisionSystem } from '../systems/Collision.js';
import { BulletHell } from '../systems/BulletHell.js';
import { Spawner } from '../systems/Spawner.js';
import { UIManager } from '../ui/UIManager.js';

import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { Bullet } from '../entities/Bullet.js';
import { Pickup, PICKUP_TYPES } from '../entities/Pickup.js';
import { Particle } from '../entities/Particle.js';
import { Wingman } from '../entities/Wingman.js';

export const GAME_STATE = {
  MENU:   'menu',
  PLAYING:'playing',
  PAUSED: 'paused',
  RESULT: 'result',
};

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.width  = window.innerWidth;
    this.height = window.innerHeight;
    this.state  = GAME_STATE.MENU;
    this.mode   = 'campaign'; // campaign | endless
    this.globalTime = 0;      // 累计游戏时间ms
    this.stageTime = 0;       // 当前关卡时间
    this.stageId = 1;
    this.stageName = '';
    this.stageEnemyHpMul = 1;

    this.debugMode = false;
    this.motionBlur = true;
    this.autoShoot = true;

    // 震屏 & 闪白
    this.shakeMag = 0; this.shakeDur = 0; this.shakeTime = 0;
    this.flashAmt = 0; this.flashColor = null;

    // 黑洞吸引（终极Boss）
    this.blackHole = null;

    // 终极技能视觉
    this.ultVisual = null;

    // 输入 / 渲染 / 存储
    this.storage = storage;
    this.input   = new InputManager(this.canvas);
    this.renderer= new Renderer(this.canvas);
    this.collision = new CollisionSystem(this);
    this.bulletHell = new BulletHell(this);
    this.spawner = new Spawner(this);

    // 玩家/僚机
    this.player = new Player();
    this.wingmen = [new Wingman(), new Wingman()];
    this.wingmanType = storage.selectedWingman || 'attack';

    // 对象池
    this.playerBulletPool = new ObjectPool(() => new Bullet(), 128);
    this.enemyBulletPool  = new ObjectPool(() => new Bullet(), 512);
    this.enemyPool        = new ObjectPool(() => new Enemy(), 64);
    this.bossPool         = new ObjectPool(() => new Boss(), 4);
    this.pickupPool       = new ObjectPool(() => new Pickup(), 64);
    this.fxPool           = new ObjectPool(() => new Particle(), 300);

    // 活跃数组
    this.playerBullets = [];
    this.enemyBullets  = [];
    this.enemies = [];
    this.bosses  = [];
    this.pickups = [];
    this.particles = [];

    // 统计数据
    this.score = 0;
    this.combo = 0; this.comboTimer = 0; this.maxCombo = 0;
    this.grazeCombo = 0; this.totalGraze = 0; this.grazeComboTimer = 0;
    this.kills = 0; this.hitsTaken = 0;

    this.inBossBattle = false;
    this.pendingBoss = null;

    // UI
    this.ui = new UIManager(this);

    // 窗口尺寸
    this._onResize();
    window.addEventListener('resize', () => this._onResize());

    // 启动主循环
    this._lastT = performance.now();
    this._running = true;
    requestAnimationFrame((t) => this._loop(t));
  }

  // ============================================================
  //  生命周期：开始/暂停/重启/退出
  // ============================================================
  getNextUnlockedStageId() {
    if (!storage.isStageCleared(1)) return 1;
    if (!storage.isStageCleared(2)) return 2;
    return 3;
  }
  hasNextStage() { return this.mode === 'campaign' && this.stageId < 3; }

  startCampaign(stageId = 1) {
    this.mode = 'campaign';
    this.stageId = stageId;
    this._resetForNewRun();
    this.spawner.startCampaign(stageId);
    this.ui.onGameStart();
    this.state = GAME_STATE.PLAYING;
    audio.startBGM(stageId === 1 ? 'stage1' : stageId === 2 ? 'stage2' : 'stage3');
  }
  startEndless() {
    this.mode = 'endless';
    this.stageId = 1;
    this._resetForNewRun();
    this.spawner.startEndless();
    this.ui.onGameStart();
    this.state = GAME_STATE.PLAYING;
    audio.startBGM('stage2');
  }
  restart() {
    if (this.mode === 'campaign') this.startCampaign(this.stageId);
    else                          this.startEndless();
  }
  nextStage() {
    if (this.hasNextStage()) this.startCampaign(this.stageId + 1);
    else this.quitToMenu();
  }
  resume() {
    if (this.state === GAME_STATE.PAUSED) {
      this.state = GAME_STATE.PLAYING;
      this._lastT = performance.now();
    }
  }
  pause() {
    if (this.state === GAME_STATE.PLAYING) {
      this.state = GAME_STATE.PAUSED;
      this.ui.showPause();
      audio.stopBGM();
    }
  }
  quitToMenu() {
    this.state = GAME_STATE.MENU;
    this.ui.onGameEnd();
    this.ui.showMainMenu();
    audio.stopBGM();
    audio.startBGM('menu');
  }
  isPlaying() { return this.state === GAME_STATE.PLAYING; }

  canAutoShoot() {
    return this.autoShoot && !this.player.dead && this.state === GAME_STATE.PLAYING;
  }

  _resetForNewRun() {
    // 回收旧对象
    this.playerBullets.forEach(b => this.playerBulletPool.release(b));
    this.enemyBullets.forEach(b  => this.enemyBulletPool.release(b));
    this.enemies.forEach(e       => this.enemyPool.release(e));
    this.bosses.forEach(b        => this.bossPool.release(b));
    this.pickups.forEach(p       => this.pickupPool.release(p));
    this.particles.forEach(p     => this.fxPool.release(p));
    this.playerBullets.length = 0;
    this.enemyBullets.length = 0;
    this.enemies.length = 0;
    this.bosses.length = 0;
    this.pickups.length = 0;
    this.particles.length = 0;

    // 重置玩家
    this.player.spawn(this, storage.selectedShip || 'sf01');

    // 僚机
    this.wingmanType = storage.selectedWingman || 'attack';
    const w1 = this.wingmen[0]; w1.side = -1; w1.type = this.wingmanType; w1.active = false;
    const w2 = this.wingmen[1]; w2.side =  1; w2.type = this.wingmanType; w2.active = false;

    // 统计
    this.score = 0; this.combo = 0; this.maxCombo = 0; this.comboTimer = 0;
    this.grazeCombo = 0; this.totalGraze = 0; this.grazeComboTimer = 0;
    this.kills = 0; this.hitsTaken = 0;
    this.stageTime = 0;
    this.shakeMag = this.shakeDur = this.shakeTime = 0;
    this.flashAmt = 0; this.flashColor = null;
    this.blackHole = null;
    this.ultVisual = null;
    this.inBossBattle = false;
    this.pendingBoss = null;
    this.ui.floating && (this.ui.floating.innerHTML = '');
  }

  _onResize() {
    this.width  = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer.resize(this.width, this.height);
  }

  // ============================================================
  //  主循环
  // ============================================================
  _loop(t) {
    if (!this._running) return;
    requestAnimationFrame((nt) => this._loop(nt));
    let dt = Math.min(50, t - this._lastT);
    this._lastT = t;

    this.globalTime += dt;

    // 幻影等时间减速
    const slowFactor = (this.player && this.player.slowmoTimer > 0) ? 0.3 : 1;
    const simDt = dt * slowFactor;

    // 输入
    this.input.beginFrame(dt);

    // 暂停切换
    if (this.input.pausePressed() && (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.PAUSED)) {
      if (this.state === GAME_STATE.PLAYING) this.pause();
      else { this.ui.hidePause(); this.resume(); audio.startBGM('stage2'); }
    }

    if (this.state === GAME_STATE.MENU) {
      this._drawMenuBg(dt);
      this.input.endFrame();
      return;
    }
    if (this.state === GAME_STATE.PAUSED) {
      this._drawPauseOverlay(dt);
      this.input.endFrame();
      return;
    }
    if (this.state === GAME_STATE.RESULT) {
      this.input.endFrame();
      return;
    }

    // ---------- 更新 ----------
    this.stageTime += dt;
    this._update(dt, simDt);
    this._draw(dt);

    this.input.endFrame();
  }

  _update(dt, simDt) {
    // 震屏/闪白 衰减
    if (this.shakeTime > 0) this.shakeTime -= dt;
    if (this.flashAmt > 0) {
      this.flashAmt = Math.max(0, this.flashAmt - dt * 0.004);
      if (this.flashAmt === 0) this.flashColor = null;
    }

    // 连击衰减
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) { this.combo = 0; this.ui.setCombo(0); }
    }
    if (this.grazeCombo > 0) {
      this.grazeComboTimer -= dt;
      if (this.grazeComboTimer <= 0) { this.grazeCombo = 0; this.ui.setGraze(0); }
    }

    // 波次生成
    this.spawner.update(dt);
    if (this.spawner.stageComplete && !this._ended) {
      this._ended = true;
      this._finishRun(true);
      return;
    }

    // Boss pending
    if (this.pendingBoss && !this.pendingBossHandled) {
      // 等待警告动画结束
    }

    // 玩家
    this.player.update(simDt, this);
    // 黑洞牵引玩家
    if (this.blackHole && this.blackHole.t > 0 && !this.player.dead) {
      const dx = this.blackHole.x - this.player.x;
      const dy = this.blackHole.y - this.player.y;
      const d = Math.hypot(dx, dy) || 1;
      const pull = 0.25 * (1 - Math.min(1, d / 400));
      this.player.x += (dx / d) * pull * simDt/16.66 * 20;
      this.player.y += (dy / d) * pull * simDt/16.66 * 20;
    }

    // 僚机（根据火力等级启用）
    const weapon = this.player.data.weapons[this.player.power - 1] || {};
    const wingCount = weapon.wingmen || 0;
    for (let i = 0; i < this.wingmen.length; i++) {
      const w = this.wingmen[i];
      w.active = i < wingCount;
      if (w.active) w.update(simDt, this);
    }

    // 敌机/Boss/子弹/道具/粒子
    for (const e of this.enemies)   e.update(simDt, this);
    for (const b of this.bosses)    b.update(simDt, this);
    for (const b of this.playerBullets) b.update(simDt, this);
    for (const b of this.enemyBullets)  b.update(simDt, this);
    for (const p of this.pickups)   p.update(simDt, this);
    for (const p of this.particles) p.update(simDt, this);

    // 导弹微重力（carrier）
    for (const b of this.enemyBullets) {
      if (b.custom && b.custom.missile) {
        b.vy += 0.03 * simDt/16.66;
      }
    }

    // 碰撞
    this.collision.process(this);

    // 玩家死亡判定
    if (this.player.dead && this.state === GAME_STATE.PLAYING && !this._ended) {
      // 等1.5秒显示大爆炸然后结束
      if (!this._playerDeathTimer) this._playerDeathTimer = 1500;
      this._playerDeathTimer -= dt;
      // 持续爆炸
      if (Math.random() < 0.6) {
        const pt = this.fxPool.acquire();
        pt.setup({
          x: this.player.x + rand(-20, 20), y: this.player.y + rand(-20, 20),
          vx: rand(-2, 2), vy: rand(-3, 0.5),
          life: rand(500, 900), maxR: rand(4, 10), radius: 8,
          color: rand(0,1) < 0.5 ? Colors.FX.EXPLOSION_MID : Colors.FX.EXPLOSION_IN,
          glow: 18, friction: 0.92
        });
        this.particles.push(pt);
      }
      if (this._playerDeathTimer <= 0) {
        this._ended = true;
        this._finishRun(false);
        return;
      }
    }

    // 清理死亡/出界对象
    this.playerBulletPool.sweep(this.playerBullets);
    this.enemyBulletPool.sweep(this.enemyBullets);
    this.enemyPool.sweep(this.enemies);
    this.pickupPool.sweep(this.pickups);
    this.fxPool.sweep(this.particles);
    // Boss单独清理
    for (let i = this.bosses.length - 1; i >= 0; i--) {
      if (this.bosses[i].dead) {
        const b = this.bosses[i];
        this.bossPool.release(b);
        this.bosses.splice(i, 1);
        if (this.inBossBattle && this.bosses.filter(x=>!x.dead).length === 0) {
          // Boss战结束
          this.inBossBattle = false;
          audio.startBGM(this.stageId === 1 ? 'stage1' : this.stageId === 2 ? 'stage2' : 'stage3');
          // 关卡模式下，关卡完成
          if (this.mode === 'campaign' && !this._ended) {
            this._ended = true;
            setTimeout(() => this._finishRun(true), 1200);
          }
        }
      }
    }

    // UI
    this.ui.update(this);
  }

  _draw(dt) {
    const r = this.renderer;
    r.beginFrame(dt, this);
    r.applyEffects(this);

    const ctx = r.ctx;

    // 道具
    for (const p of this.pickups) p.draw(ctx, this);
    // 敌机
    for (const e of this.enemies) e.draw(ctx, this);
    // Boss
    for (const b of this.bosses)  b.draw(ctx, this);
    // 玩家（含僚机）
    if (!this.player.dead) {
      for (const w of this.wingmen) if (w.active) w.draw(ctx, this);
      this.player.draw(ctx, this);
    }
    // 子弹
    for (const b of this.playerBullets) b.draw(ctx, this);
    for (const b of this.enemyBullets)  b.draw(ctx, this);
    // 粒子
    for (const p of this.particles) p.draw(ctx);

    // 大招视觉
    r.drawUltVisual(this, dt);

    // 黑洞视觉补充
    if (this.blackHole && this.blackHole.t > 0) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = Colors.NEON_PURPLE;
      ctx.shadowBlur = 40; ctx.shadowColor = Colors.NEON_PURPLE;
      ctx.beginPath();
      ctx.arc(this.blackHole.x, this.blackHole.y, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(this.blackHole.x, this.blackHole.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    r.restoreShake();
  }

  _drawMenuBg(dt) {
    // 菜单下：依然绘制星空背景，增加动态飞行物
    const r = this.renderer;
    r.beginFrame(dt, this);
    const ctx = r.ctx;
    // 远景飞船横穿
    this._menuShipT = (this._menuShipT || 0) + dt * 0.05;
    if (!this._menuShips) this._menuShips = Array.from({length: 4}, (_, i) => ({
      x: -100 - i * 300, y: 120 + i * 90, sp: 0.08 + Math.random()*0.06, size: 0.6 + Math.random()*0.6
    }));
    for (const s of this._menuShips) {
      s.x = ((s.x + (this.width + 200) + dt * s.sp) % (this.width + 300)) - 150;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(s.size, s.size);
      ctx.shadowBlur = 12; ctx.shadowColor = Colors.NEON_CYAN;
      ctx.fillStyle = Colors.NEON_CYAN;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, -10); ctx.lineTo(22, 0); ctx.lineTo(0, 10); ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    r.restoreShake();
  }

  _drawPauseOverlay() {}

  // ============================================================
  //  公共接口：外部调用
  // ============================================================
  shake(mag, duration) {
    if (mag > this.shakeMag || this.shakeTime <= 0) {
      this.shakeMag = mag;
      this.shakeDur = duration;
      this.shakeTime = duration;
    }
  }
  flash(amt, color = null) {
    this.flashAmt = Math.max(this.flashAmt, amt);
    if (color) this.flashColor = color;
  }

  addScore(base, x, y) {
    // 连击加成
    const bonus = 1 + Math.min(2, this.combo * 0.05);
    const final = Math.floor(base * bonus);
    this.score += final;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.comboTimer = 2000;
    if (this.combo >= 3) this.ui.setCombo(this.combo);
    // 连击段位
    if (this.combo === 10 || this.combo === 25 || this.combo === 50 || this.combo === 100) {
      const tier = { 10: 'RAPID', 25: 'RAMPAGE', 50: 'UNSTOPPABLE', 100: 'GODLIKE' }[this.combo];
      this.addFloat(tier + '!', this.width / 2, this.height * 0.35, Colors.NEON_PINK, 'big');
      audio.sfxComboTier();
    }
    if (x !== undefined) this.addFloat(`+${final}`, x, y, Colors.NEON_YELLOW);
  }

  onEnemyKilled(e) {
    this.kills++;
    this.player.addEnergy(1.2);
  }

  // 击杀判定：12%暴击（额外2倍分）+ 财宝机金币奖励
  registerKill(e) {
    if (Math.random() < 0.12) {
      const bonus = Math.floor(e.score * 2);
      this.addScore(bonus, e.x, e.y);
      this.addFloat('CRITICAL!', e.x, e.y - 40, Colors.NEON_PINK, 'big');
      audio.sfxCritical();
      this.shake(3, 150);
    }
    if (e.type === 'golden') {
      storage.addGold(50);
      this.addFloat('+50 GOLD', e.x, e.y + 26, '#ffd700');
    }
  }

  onGraze() {
    const bonus = this.player.data.grazeBonus || 1;
    this.addScore(Math.floor(10 * bonus));
    this.totalGraze++;
    this.grazeCombo++;
    this.grazeComboTimer = 1200;
    this.player.addEnergy(1 * bonus);
    this.ui.setGraze(this.grazeCombo);
  }

  onPickup(pk) {
    const p = this.player;
    audio.sfxPickup();
    switch (pk.ptype) {
      case PICKUP_TYPES.POWER:
        p.addPower(1);
        this.addFloat('POWER UP!', pk.x, pk.y - 20, Colors.NEON_RED, 'big');
        break;
      case PICKUP_TYPES.GOLD:
        const g = 50;
        this.addScore(g, pk.x, pk.y - 20);
        storage.addGold(5);
        break;
      case PICKUP_TYPES.HP:
        p.addHp(25);
        this.addFloat('HP +25', pk.x, pk.y - 20, Colors.NEON_GREEN);
        break;
      case PICKUP_TYPES.BOMB:
        p.addBomb(1);
        this.addFloat('BOMB +1', pk.x, pk.y - 20, Colors.NEON_YELLOW);
        break;
      case PICKUP_TYPES.ENERGY:
        p.addEnergy(50);
        this.addFloat('ENERGY +50', pk.x, pk.y - 20, Colors.NEON_PURPLE);
        break;
      case PICKUP_TYPES.WIPE: {
        // 全屏清弹
        for (const b of this.enemyBullets) {
          const pt = this.fxPool.acquire();
          pt.setup({ x: b.x, y: b.y, vx:0, vy:0, life:300, maxR:8, radius:6, color:Colors.NEON_CYAN, glow:14 });
          this.particles.push(pt);
          b.dead = true; b.active = false;
        }
        audio.sfxBomb();
        this.shake(6, 300);
        this.addFloat('SCREEN WIPE!', this.width/2, this.height*0.4, Colors.NEON_CYAN, 'big');
        break;
      }
      case PICKUP_TYPES.TIME: {
        // 所有敌方子弹减速3s
        for (const b of this.enemyBullets) {
          b.vx *= 0.3; b.vy *= 0.3;
          setTimeout(() => { if (!b.dead) { b.vx /= 0.3; b.vy /= 0.3; } }, 3000);
        }
        this.addFloat('SLOW 3s!', this.width/2, this.height*0.4, Colors.NEON_CYAN, 'big');
        break;
      }
    }
  }

  addFloat(text, x, y, color, size) {
    this.ui.addFloat(text, x, y, color, size);
  }

  spawnBoss(bossId) {
    this.pendingBoss = bossId;
    this.ui.showBossWarning(bossId, () => {
      const boss = this.bossPool.acquire();
      boss.spawn(bossId, this);
      this.bosses.push(boss);
      this.inBossBattle = true;
      audio.startBGM('boss');
      this.pendingBoss = null;
    });
  }

  // 受伤计数
  registerHitTaken() { this.hitsTaken++; }

  // ============================================================
  //  结束结算
  // ============================================================
  _finishRun(win) {
    this.state = GAME_STATE.RESULT;
    this.ui.onGameEnd();
    audio.stopBGM();
    setTimeout(() => audio.startBGM(win ? 'victory' : 'lose'), 100);

    const time = this.stageTime;
    // 评级
    let rank = 'C';
    if (win) {
      const hitOk = this.hitsTaken <= (this.mode === 'campaign' ? 1 : 3);
      const perfect = this.hitsTaken === 0;
      const grazeOk = this.totalGraze >= 200;
      if (perfect && grazeOk) rank = 'S';
      else if ((perfect || this.hitsTaken <= 1) && this.maxCombo >= 40) rank = 'A';
      else if (this.player.power >= 6 && this.hitsTaken <= 3) rank = 'B';
      else rank = 'C';
      if (this.player.hp < this.player.maxHp * 0.15 && rank === 'C') rank = 'D';
    } else rank = 'D';

    const remainBonus = this.player.bomb * 1000 + Math.floor(this.player.hp) * 10;
    const finalScore = this.score + remainBonus;
    const goldReward = Math.floor(finalScore / 500) + (win ? 100 : 10);

    storage.setBestScore(finalScore);
    storage.addGold(goldReward);
    storage.addRanking(finalScore, (this.mode === 'campaign' ? 'STAGE' + this.stageId : 'ENDLESS'));

    if (win && this.mode === 'campaign') {
      storage.markStageCleared(this.stageId);
      if (this.stageId >= 1) storage.unlockShip('sf03');
    }

    this.ui.showResult({
      win, rank,
      time, score: finalScore,
      maxCombo: this.maxCombo,
      totalGraze: this.totalGraze,
      kills: this.kills, hitsTaken: this.hitsTaken,
      goldReward,
      mode: this.mode,
      hasNextStage: this.hasNextStage(),
    });

    this._ended = false;
    this._playerDeathTimer = null;
  }
}

export default Game;
