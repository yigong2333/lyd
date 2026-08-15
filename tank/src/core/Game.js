// ============================================================
//  Game.js - 游戏主类（状态机 + 主循环 + 系统集成）
// ============================================================

import { TILE_SIZE, GRID_W, GRID_H, DIR, DIR_VEC, TileType, Colors } from '../config/Colors.js';
import { PlayerTank } from '../entities/PlayerTank.js';
import { EnemyTank } from '../entities/EnemyTank.js';
import { Bullet } from '../entities/Bullet.js';
import { Particle, spawnExplosion } from '../entities/Particle.js';
import { Powerup } from '../entities/Powerup.js';
import { ObjectPool } from './ObjectPool.js';
import { InputManager } from './InputManager.js';
import { Renderer } from './Renderer.js';
import { LevelManager } from '../systems/LevelManager.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { AISystem } from '../systems/AISystem.js';
import { SpawnSystem } from '../systems/SpawnSystem.js';
import { UIManager } from '../ui/UIManager.js';
import { storage } from './Storage.js';
import { audio } from './AudioManager.js';
import { PlayerTanks } from '../config/TankData.js';
import { PowerupData } from '../config/TankData.js';

const STATE = { MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused', RESULT: 'result' };

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = STATE.MENU;

    this.mapPixelW = GRID_W * TILE_SIZE;
    this.mapPixelH = GRID_H * TILE_SIZE;

    // 系统初始化（顺序：先 level，再依赖 level 的）
    this.input = new InputManager(canvas);
    this.audio = audio;
    this.storage = storage;
    this.level = new LevelManager(this);
    this.renderer = new Renderer(this);
    this.collision = new CollisionSystem(this);
    this.ai = new AISystem(this);
    this.spawn = new SpawnSystem(this);
    this.ui = new UIManager(this);

    // 实体
    this.player = null;
    this.enemies = [];
    this.powerups = [];
    this.bullets = new ObjectPool(
      () => new Bullet(),
      (b) => b.reset(),
      20
    );
    this.particles = new ObjectPool(
      () => new Particle(),
      (p) => p.reset(),
      60
    );

    // 游戏数据
    this.mode = 'campaign';   // 'campaign' | 'endless'
    this.selectedTank = storage.selectedTank;
    this.score = 0;
    this.kills = 0;
    this.runStartTime = 0;
    this.runTime = 0;
    this.shake = 0;
    this.flash = 0;
    this.freezeTimer = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;

    // 时间
    this._lastT = 0;
    this._running = false;

    this._bindResize();
  }

  _bindResize() {
    const resize = () => this.renderer.resize();
    window.addEventListener('resize', resize);
    resize();
  }

  start() {
    this._running = true;
    this._lastT = performance.now();
    this.audio.ensureInit();
    requestAnimationFrame((t) => this._loop(t));
  }

  _loop(t) {
    if (!this._running) return;
    let dt = t - this._lastT;
    this._lastT = t;
    if (dt > 50) dt = 50;

    this.input.beginFrame(dt);

    switch (this.state) {
      case STATE.MENU:
        this.renderer.drawMenuBackground(dt);
        break;
      case STATE.PLAYING:
        this.update(dt);
        this.renderer.draw();
        break;
      case STATE.PAUSED:
        this.renderer.draw();
        this.renderer.drawPauseOverlay();
        break;
      case STATE.RESULT:
        this.renderer.draw();
        break;
    }

    this.input.endFrame();
    requestAnimationFrame((tt) => this._loop(tt));
  }

  // ============================================================
  //  游戏流程控制
  // ============================================================

  startCampaign(levelIdx = 0) {
    this.mode = 'campaign';
    this.score = 0;
    this.kills = 0;
    this.runStartTime = performance.now();
    this._resetEntities();
    this.level.loadLevel(levelIdx);
    this._spawnPlayer();
    this.state = STATE.PLAYING;
    this.audio.sfxLevelStart();
    this.audio.playBGM('stage1');
  }

  startEndless() {
    this.mode = 'endless';
    this.score = 0;
    this.kills = 0;
    this.runStartTime = performance.now();
    this._resetEntities();
    this.level.loadEndless(Date.now() % 100000);
    this._spawnPlayer();
    this.state = STATE.PLAYING;
    this.audio.sfxLevelStart();
    this.audio.playBGM('stage1');
  }

  _resetEntities() {
    this.enemies = [];
    this.powerups = [];
    this.bullets.clear();
    this.particles.clear();
    this.player = null;
    this.shake = 0;
    this.flash = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
  }

  _spawnPlayer() {
    const spawn = this.level.playerSpawn;
    this.player = new PlayerTank(spawn.x, spawn.y, this.selectedTank);
    this.player.setGame(this);
    this.player.spawnTime = 2000;
  }

  pause() {
    if (this.state === STATE.PLAYING) {
      this.state = STATE.PAUSED;
      this.audio.stopBGM();
      this.ui.showPause();
    }
  }

  resume() {
    if (this.state === STATE.PAUSED) {
      this.state = STATE.PLAYING;
      this.audio.playBGM('stage1');
      this.ui.hidePause();
    }
  }

  quitToMenu() {
    this.state = STATE.MENU;
    this.audio.stopBGM();
    this.audio.playBGM('menu');
    this.ui.showMainMenu();
  }

  // ============================================================
  //  更新
  // ============================================================

  update(dt) {
    this.runTime = performance.now() - this.runStartTime;

    // 暂停请求
    if (this.input.pauseRequested) {
      this.pause();
      return;
    }

    // 冻结道具
    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
    }

    // 连击衰减
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // 系统
    this.spawn.update(dt);
    if (this.freezeTimer <= 0) this.ai.update(dt);
    this.level.update(dt);

    // 玩家
    if (this.player && this.player.alive) {
      this.player.update(dt, this.input);
    }

    // 敌人
    for (const e of this.enemies) {
      if (e.alive) e.update(dt);
    }

    // 子弹
    this.bullets.forEach((b) => {
      b.update(dt);
      // 超出地图边界则销毁
      if (b.active && (b.x < -20 || b.y < -20 || b.x > this.mapPixelW + 20 || b.y > this.mapPixelH + 20)) {
        b.destroy();
      }
      // 释放时递减发射者的活跃子弹计数
      if (!b.active) {
        if (b.owner === 'player' && b.ownerTank) {
          this.playerDecrementBullet(b);
        }
      }
      return !b.active;
    });

    // 粒子
    this.particles.forEach((p) => {
      p.update(dt);
      return !p.active;
    });

    // 道具
    for (const p of this.powerups) {
      if (p.alive) p.update(dt);
    }
    this.powerups = this.powerups.filter(p => p.alive);

    // 碰撞
    this.collision.process();

    // 清理死亡敌人
    this.enemies = this.enemies.filter(e => e.alive);

    // 屏幕特效衰减
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 0.02);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 0.003);

    // 胜负判定
    this._checkWinLose();

    // UI
    this.ui.update(dt);
  }

  _checkWinLose() {
    // 失败：基地被毁
    if (this.level.base && !this.level.base.alive) {
      this._finishRun(false);
      return;
    }
    // 失败：玩家生命耗尽
    if (this.player && !this.player.alive && this.player.lives <= 0) {
      this._finishRun(false);
      return;
    }
    // 胜利（仅战役）
    if (this.mode === 'campaign') {
      if (this.spawn.allWavesDone && this.enemies.length === 0) {
        this._finishRun(true);
      }
    }
  }

  _finishRun(win) {
    if (this.state === STATE.RESULT) return;
    this.state = STATE.RESULT;
    this.audio.stopBGM();
    if (win) {
      this.audio.sfxVictory();
      this.audio.playBGM('victory');
      this.storage.markLevelCleared(this.level.levelIndex + 1);
    } else {
      this.audio.sfxDefeat();
    }
    // 更新最高分
    if (this.score > this.storage.bestScore) {
      this.storage.bestScore = this.score;
    }
    this.storage.addKills(this.kills);
    this.storage.addRanking({
      score: this.score,
      kills: this.kills,
      time: this.runTime,
      mode: this.mode,
      win,
      date: Date.now(),
    });
    this.ui.showResult(win);
  }

  // ============================================================
  //  实体生成
  // ============================================================

  spawnBullet(tank) {
    const b = this.bullets.acquire();
    const v = DIR_VEC[tank.dir];
    const cx = tank.cx + v.x * (tank.w / 2);
    const cy = tank.cy + v.y * (tank.h / 2);
    let bt = tank.bulletType;
    // 火力升级：散弹
    if (tank.isPlayer && tank.powerLevel >= 2 && bt === 'normal') {
      this.spawnSpreadBullets(tank);
      return;
    }
    b.spawn(cx - 3, cy - 3, tank.dir, {
      speed: tank.bulletSpeed,
      damage: tank.bulletDamage,
      owner: tank.isPlayer ? 'player' : 'enemy',
      bulletType: bt,
    });
    b.ownerTank = tank;
    if (tank.isPlayer) tank.activeBullets++;
    this.audio.sfxShoot();
  }

  spawnSpreadBullets(tank) {
    const dirs = [tank.dir];
    // 左右各偏一个方向
    const left = (tank.dir + 3) % 4;
    const right = (tank.dir + 1) % 4;
    dirs.push(left, right);
    for (const d of dirs) {
      const b = this.bullets.acquire();
      const v = DIR_VEC[d];
      const cx = tank.cx + v.x * (tank.w / 2);
      const cy = tank.cy + v.y * (tank.h / 2);
      b.spawn(cx - 3, cy - 3, d, {
        speed: tank.bulletSpeed,
        damage: tank.bulletDamage,
        owner: tank.isPlayer ? 'player' : 'enemy',
        bulletType: 'normal',
      });
      b.ownerTank = tank;
      if (tank.isPlayer) tank.activeBullets++;
    }
    this.audio.sfxShoot();
  }

  spawnChargedBullet(tank, ratio) {
    const b = this.bullets.acquire();
    const v = DIR_VEC[tank.dir];
    const cx = tank.cx + v.x * (tank.w / 2);
    const cy = tank.cy + v.y * (tank.h / 2);
    const dmg = Math.round(tank.chargeDamage * ratio);
    b.spawn(cx - 7, cy - 7, tank.dir, {
      speed: tank.bulletSpeed * 0.8,
      damage: dmg,
      owner: 'player',
      bulletType: 'charged',
      life: 2000,
    });
    b.ownerTank = tank;
    tank.activeBullets++;
    this.audio.sfxExplosion();
    this.shake = 4;
  }

  // ============================================================
  //  回调
  // ============================================================

  onTankDestroyed(tank) {
    spawnExplosion(this.particles, tank.cx, tank.cy, tank.color, tank.isBoss ? 30 : 16);
    this.shake = tank.isBoss ? 12 : 6;
    this.audio.sfxExplosion();
    if (tank.isPlayer) return; // 玩家死亡由 onPlayerDestroyed 处理
    // 敌人击杀（连击加成：每5连击多1倍，上限3倍）
    this.kills++;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.comboTimer = 6000;
    const isGolden = tank.typeId === 'golden';
    const comboMult = isGolden ? 5 : Math.min(3, 1 + Math.floor((this.combo - 1) / 5));
    const pts = (tank.score || 100) * comboMult;
    this.score += pts;
    if (isGolden) {
      const p = new Powerup(tank.cx - 12, tank.cy - 12, 'random');
      this.powerups.push(p);
      this.audio.sfxGolden();
      this.ui.addFloatText(tank.cx, tank.cy - 20, 'GOLD!', '#ffd700');
    }
    this.spawn.maybeDropPowerup(tank.cx, tank.cy, tank.isBoss);
    this.ui.addFloatText(tank.cx, tank.cy, `+${pts}`, Colors.NEON_YELLOW);
    if (this.combo >= 2 && !isGolden) {
      this.ui.addFloatText(tank.cx, tank.cy + 22, `COMBO x${this.combo}`, '#ff00d4');
      this.audio.sfxCombo();
    }
  }

  onPlayerDestroyed(tank) {
    spawnExplosion(this.particles, tank.cx, tank.cy, tank.color, 24);
    this.shake = 10;
    this.flash = 0.5;
    this.audio.sfxExplosion();
    this.player.lives--;
    if (this.player.lives > 0) {
      // 复活
      setTimeout(() => {
        if (this.state === STATE.PLAYING) {
          this.player.respawn(this.level.playerSpawn.x, this.level.playerSpawn.y);
        }
      }, 1500);
    }
  }

  playerDecrementBullet(b) {
    if (!b || b.counted) return;
    if (this.player && b.ownerTank === this.player) {
      this.player.activeBullets = Math.max(0, this.player.activeBullets - 1);
      b.counted = true;
    }
  }

  damageBase(dmg) {
    if (!this.level.base || !this.level.base.alive) return;
    this.level.base.hp -= dmg;
    this.level.base.danger = 500;
    this.flash = 0.3;
    this.shake = 6;
    this.audio.sfxBaseAlert();
    if (this.level.base.hp <= 0) {
      this.level.base.alive = false;
      spawnExplosion(this.particles,
        this.level.base.x + this.level.base.w / 2,
        this.level.base.y + this.level.base.h / 2,
        Colors.BASE, 40);
      this.shake = 20;
    }
  }

  collectPowerup(p) {
    p.destroy();
    this.audio.sfxPowerup();
    let type = p.powerType;
    if (type === 'random') {
      const types = ['star', 'speed', 'shield', 'heart', 'bomb', 'freeze', 'base'];
      type = types[Math.floor(Math.random() * types.length)];
    }
    const data = PowerupData[type];
    this.ui.addFloatText(p.cx, p.cy, data.name, data.color);

    switch (type) {
      case 'star':
      case 'speed':
      case 'shield':
      case 'heart':
        this.player.applyPowerup(type);
        break;
      case 'bomb':
        // 清屏
        for (const e of this.enemies) {
          if (e.alive && !e.isBoss) {
            e.takeDamage(99);
          } else if (e.alive) {
            e.takeDamage(2);
          }
        }
        this.flash = 0.6;
        this.shake = 15;
        break;
      case 'freeze':
        this.freezeTimer = 5000;
        for (const e of this.enemies) { e.frozen = true; e.frozenTime = 5000; }
        break;
      case 'base':
        this.level.fortifyBase();
        break;
      case 'airstrike':
        this._doAirstrike();
        break;
      case 'rapid':
        if (this.player) this.player.rapidTime = 10000;
        break;
    }
    this.score += 50;
  }

  _doAirstrike() {
    this.flash = 0.25;
    this.audio.sfxAirstrike();
    this.ui.addFloatText(this.player.cx, this.player.cy - 40, '空袭来袭!', '#ff4444');
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        if (this.state !== STATE.PLAYING) return;
        let tx, ty;
        const alive = this.enemies.filter(e => e.alive);
        if (alive.length > 0) {
          const t = alive[Math.floor(Math.random() * alive.length)];
          tx = t.cx; ty = t.cy;
        } else {
          const pos = this.findEmptyTile();
          tx = pos ? pos.x * TILE_SIZE + TILE_SIZE / 2 : this.mapPixelW / 2;
          ty = pos ? pos.y * TILE_SIZE + TILE_SIZE / 2 : this.mapPixelH / 2;
        }
        this._bombTile(tx, ty, i === 2 ? 5 : 3);
      }, 500 + i * 700);
    }
  }

  _bombTile(px, py, dmg) {
    spawnExplosion(this.particles, px, py, '#ff4444', 12);
    // 伤害范围内敌人
    for (const e of this.enemies) {
      if (e.alive && Math.abs(e.cx - px) < TILE_SIZE * 1.5 && Math.abs(e.cy - py) < TILE_SIZE * 1.5) {
        e.takeDamage(dmg);
      }
    }
    // 破坏 3x3 砖墙
    const gx0 = Math.floor(px / TILE_SIZE) - 1;
    const gy0 = Math.floor(py / TILE_SIZE) - 1;
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        const w = this.level.walls.get(gx0 + dx, gy0 + dy);
        if (w && w.type === TileType.BRICK) w.hit();
      }
    }
    this.shake = 8;
    this.audio.sfxExplosion();
  }

  findEmptyTile() {
    for (let i = 0; i < 50; i++) {
      const x = 1 + Math.floor(Math.random() * (GRID_W - 2));
      const y = 5 + Math.floor(Math.random() * 15);
      if (this.level.getTile(x, y) === TileType.EMPTY && !this._tankAt(x, y)) {
        return { x, y };
      }
    }
    return null;
  }

  _tankAt(gx, gy) {
    const px = gx * TILE_SIZE, py = gy * TILE_SIZE;
    const all = [this.player, ...this.enemies].filter(t => t && t.alive);
    for (const t of all) {
      if (t.x < px + TILE_SIZE && t.x + t.w > px && t.y < py + TILE_SIZE && t.y + t.h > py) return true;
    }
    return false;
  }

  // ============================================================
  //  碰撞查询（坦克位置合法性）
  // ============================================================

  canTankBeAt(tank, newX, newY) {
    // 检查覆盖的所有格子
    const x0 = Math.floor(newX / TILE_SIZE);
    const y0 = Math.floor(newY / TILE_SIZE);
    const x1 = Math.floor((newX + tank.w - 1) / TILE_SIZE);
    const y1 = Math.floor((newY + tank.h - 1) / TILE_SIZE);
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        // 墙壁
        const wall = this.level.walls.get(gx, gy);
        if (wall && wall.isSolid()) return false;
        // 阻挡地形
        const t = this.level.getTile(gx, gy);
        if (t === TileType.WATER && !tank.isPlayer) return false;
        if (t === TileType.WATER && tank.isPlayer) return false; // 玩家也不能过水
        if (t === TileType.BASE) return false;
      }
    }
    // 坦克间碰撞
    const all = [this.player, ...this.enemies].filter(t => t && t.alive && t !== tank);
    for (const t of all) {
      if (newX < t.x + t.w && newX + tank.w > t.x &&
          newY < t.y + t.h && newY + tank.h > t.y) return false;
    }
    return true;
  }

  // ============================================================
  //  工具
  // ============================================================

  get enemiesAlive() { return this.enemies.length; }
  get baseHp() { return this.level.base ? this.level.base.hp : 0; }

  nextLevel() {
    const next = this.level.levelIndex + 1;
    if (next < this.level.levelCount) {
      this.startCampaign(next);
    } else {
      this.quitToMenu();
    }
  }
}
