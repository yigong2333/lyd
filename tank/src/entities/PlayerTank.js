// ============================================================
//  PlayerTank.js - 玩家坦克
// ============================================================

import { Tank } from './Tank.js';
import { DIR, TILE_SIZE } from '../config/Colors.js';
import { PlayerTanks } from '../config/TankData.js';

export class PlayerTank extends Tank {
  constructor(gridX, gridY, tankId = 'scholar') {
    const data = PlayerTanks[tankId] || PlayerTanks.scholar;
    super(gridX, gridY, data);
    this.tankId = tankId;
    this.isPlayer = true;
    this.lives = 3;
    this.skill = data.skill;
    this.skillCD = 0;
    this.chargeDamage = data.chargeDamage || 3;
    this.chargeTime = data.chargeTime || 1200;
    this.dashTime = data.dashTime || 300;
    this.dashCD = data.dashCD || 4000;
    this.shieldCD = data.shieldCD || 8000;
    this.dashActive = 0;
    this.rapidTime = 0;   // 急速射击剩余ms
    // 道具增益
    this.powerLevel = 0;     // 火力升级等级
    this.speedBoost = 0;     // 速度提升剩余ms
    this._baseSpeed = this.speed;  // 保存原始速度，避免累积变化
  }

  update(dt, input) {
    // 方向输入
    if (input && !this.dashActive) {
      this._changeDir(input.moveDir);
    }
    // 冲刺
    if (this.dashActive > 0) {
      this.dashActive -= dt;
      this.moving = true;
      if (this.dashActive <= 0) { this.dashActive = 0; this.spawnTime = 0; }
    }
    // 速度加成 — 使用原始速度，避免累积
    if (this.speedBoost > 0) {
      this.speed = this._baseSpeed * 1.5;
      this.speedBoost -= dt;
    } else {
      this.speed = this._baseSpeed;
    }

    // 急速射击道具：射速翻倍
    if (this.rapidTime > 0) {
      this.rapidTime -= dt;
      this.fireRate = Math.max(80, (this.data.fireRate || 400) / 2);
    } else {
      this.fireRate = this.data.fireRate || 400;
    }

    super.update(dt);

    // 射击
    if (input && input.firePressed) {
      this.fire();
    }
    // 蓄力释放
    if (input && !input.firePressed && input.getChargeTime() > 200 && this.skill === 'charge') {
      this._releaseCharge(input.getChargeTime());
    }
    // 技能
    if (input && input.skillJustPressed && this.skillCD <= 0) {
      this._useSkill();
    }
    if (this.skillCD > 0) this.skillCD -= dt;
  }

  _releaseCharge(chargeMs) {
    if (this.fireCD > 0) return;
    if (this.activeBullets >= this.maxBullets) return;
    const ratio = Math.min(1, chargeMs / this.chargeTime);
    if (ratio < 0.3) return;
    this.fireCD = this.fireRate;
    if (this._game) this._game.spawnChargedBullet(this, ratio);
  }

  _useSkill() {
    if (this.skill === 'dash') {
      this.dashActive = this.dashTime;
      this.spawnTime = this.dashTime; // 冲刺无敌
      this.skillCD = this.dashCD;
      this.moving = true;
      if (this._game) this._game.audio.sfxSkill();
    } else if (this.skill === 'shield') {
      this.shieldTime = 3000;
      this.skillCD = this.shieldCD;
      if (this._game) this._game.audio.sfxSkill();
    }
  }

  // 玩家死亡处理（消耗生命）
  destroy() {
    this.alive = false;
    if (this._game) this._game.onPlayerDestroyed(this);
  }

  respawn(gridX, gridY) {
    this.x = gridX * TILE_SIZE;
    this.y = gridY * TILE_SIZE;
    this.dir = DIR.UP;
    this.hp = this.maxHp;
    this.alive = true;
    this.spawnTime = 2000;
    this.fireCD = 0;
    this.activeBullets = 0;
    this.dashActive = 0;
    this.shieldTime = 0;
    this.rapidTime = 0;
    this.speed = this._baseSpeed;
    this.speedBoost = 0;
  }

  applyPowerup(type) {
    switch (type) {
      case 'star':
        this.powerLevel = Math.min(3, this.powerLevel + 1);
        this.bulletDamage = (this.data.bulletDamage || 1) + this.powerLevel;
        if (this.powerLevel >= 2) this.bulletType = 'spread3';
        break;
      case 'speed':
        this.speedBoost = 10000;
        break;
      case 'shield':
        this.shieldTime = 8000;
        break;
      case 'heart':
        this.hp = Math.min(this.maxHp + 1, this.hp + 1);
        if (this.hp > this.maxHp) this.maxHp = this.hp;
        break;
    }
  }
}
