// ============================================================
//  Tank.js - 坦克基类（移动/射击/碰撞/绘制）
// ============================================================
//
//  四方向移动 + 格子对齐（经典坦克手感）
//  炮塔随方向旋转，由几何图形组合绘制（无图片）
// ============================================================

import { Entity } from './Entity.js';
import { DIR, DIR_VEC, TILE_SIZE, Colors } from '../config/Colors.js';
import { clamp, TAU, roundRect } from '../core/Utils.js';

export class Tank extends Entity {
  constructor(gridX, gridY, data) {
    super(gridX * TILE_SIZE, gridY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    this.type = 'tank';
    this.data = data;
    this.dir = DIR.UP;
    this.maxHp = data.maxHp || data.hp || 3;
    this.hp = this.maxHp;
    this.speed = (data.speed || 2) * TILE_SIZE; // 格/秒 -> 像素/秒
    this.fireRate = data.fireRate || 400;
    this.fireCD = 0;
    this.bulletSpeed = data.bulletSpeed || 6;
    this.bulletDamage = data.bulletDamage || 1;
    this.bulletType = data.bulletType || 'normal';
    this.maxBullets = data.maxBullets || 1;
    this.color = data.color || '#888';
    this.activeBullets = 0;
    this.isPlayer = false;

    // 状态
    this.moving = false;
    this.flashTime = 0;       // 受击闪烁
    this.shieldTime = 0;      // 护盾
    this.frozen = false;      // 冻结
    this.frozenTime = 0;
    this.spawnTime = 300;     // 出生无敌
    this._game = null;
  }

  setGame(g) { this._game = g; }

  // 格子坐标
  get gridX() { return Math.floor(this.cx / TILE_SIZE); }
  get gridY() { return Math.floor(this.cy / TILE_SIZE); }

  // 是否在格子中心附近（用于对齐）
  _nearCenter(axis) {
    if (axis === 'x') {
      const center = (this.gridX + 0.5) * TILE_SIZE;
      return Math.abs(this.cx - center) < this.speed * 0.02 + 2;
    } else {
      const center = (this.gridY + 0.5) * TILE_SIZE;
      return Math.abs(this.cy - center) < this.speed * 0.02 + 2;
    }
  }

  // 尝试改变方向，并做格子对齐
  _changeDir(newDir) {
    if (newDir < 0) { this.moving = false; return; }
    if (newDir === this.dir) { this.moving = true; return; }
    // 转弯时对齐到当前格子中线
    if (newDir === DIR.UP || newDir === DIR.DOWN) {
      // 垂直移动，对齐 x
      const center = (this.gridX + 0.5) * TILE_SIZE;
      if (Math.abs(this.cx - center) < TILE_SIZE * 0.5) {
        this.x = center - this.w / 2;
      }
    } else {
      const center = (this.gridY + 0.5) * TILE_SIZE;
      if (Math.abs(this.cy - center) < TILE_SIZE * 0.5) {
        this.y = center - this.h / 2;
      }
    }
    this.dir = newDir;
    this.moving = true;
  }

  // 检查目标位置是否可通行
  _canMoveTo(newX, newY) {
    if (!this._game) return true;
    // 边界
    if (newX < 0 || newY < 0 || newX + this.w > this._game.mapPixelW || newY + this.h > this._game.mapPixelH) {
      return false;
    }
    // 检查覆盖的格子
    return this._game.canTankBeAt(this, newX, newY);
  }

  _tryMove(dt) {
    if (!this.moving || this.dir < 0 || this.frozen) return;
    const v = DIR_VEC[this.dir];
    const dist = this.speed * dt / 1000;
    if (dist <= 0) return;
    let nx = this.x + v.x * dist;
    let ny = this.y + v.y * dist;
    if (this._canMoveTo(nx, ny)) {
      this.x = nx; this.y = ny;
    } else {
      // 撞墙时：先尝试吸附到最近的格子边界，确保卡住时也能转向
      if (v.x !== 0) {
        // 水平方向：吸附到最近的格子 x 边界
        const targetCx = v.x > 0 ? Math.ceil(this.cx / TILE_SIZE) * TILE_SIZE - TILE_SIZE / 2
                                 : Math.floor(this.cx / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
        const targetX = targetCx - this.w / 2;
        if (this._canMoveTo(targetX, this.y)) {
          this.x = targetX;
        }
      } else if (v.y !== 0) {
        // 垂直方向：吸附到最近的格子 y 边界
        const targetCy = v.y > 0 ? Math.ceil(this.cy / TILE_SIZE) * TILE_SIZE - TILE_SIZE / 2
                                 : Math.floor(this.cy / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
        const targetY = targetCy - this.h / 2;
        if (this._canMoveTo(this.x, targetY)) {
          this.y = targetY;
        }
      }
      // 注意：不设置 moving=false，让下帧继续尝试（方向仍然保持按住时）
      // 只有完全无法前进时才停止，避免反复抖动
      this.moving = false;
    }
  }

  // 射击
  fire() {
    if (this.fireCD > 0) return false;
    if (this.activeBullets >= this.maxBullets) return false;
    if (this.frozen) return false;
    this.fireCD = this.fireRate;
    if (this._game) this._game.spawnBullet(this);
    return true;
  }

  takeDamage(dmg = 1) {
    if (this.spawnTime > 0 || this.shieldTime > 0) return false;
    this.hp -= dmg;
    this.flashTime = 150;
    if (this.hp <= 0) {
      this.destroy();
    }
    return true;
  }

  destroy() {
    this.alive = false;
    if (this._game) this._game.onTankDestroyed(this);
  }

  update(dt) {
    if (this.spawnTime > 0) this.spawnTime -= dt;
    if (this.fireCD > 0) this.fireCD -= dt;
    if (this.flashTime > 0) this.flashTime -= dt;
    if (this.shieldTime > 0) this.shieldTime -= dt;
    if (this.frozenTime > 0) {
      this.frozenTime -= dt;
      if (this.frozenTime <= 0) this.frozen = false;
    }
    if (!this.frozen) this._tryMove(dt);
  }

  // ---------- 绘制 ----------
  draw(ctx) {
    const { x, y, w, h, dir, color } = this;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const flash = this.flashTime > 0 && Math.floor(this.flashTime / 50) % 2 === 0;
    const t = performance.now();
    const hw = w / 2;
    const hh = h / 2;

    ctx.save();

    // 出生闪烁
    if (this.spawnTime > 0 && Math.floor(this.spawnTime / 60) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // 旋转到方向
    const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2]; // UP,RIGHT,DOWN,LEFT
    ctx.translate(cx, cy);
    ctx.rotate(angles[dir]);

    // ====== 履带（两侧，带动画） ======
    const trackW = Math.max(5, w * 0.16);
    const trackColor = flash ? '#fff' : '#1a1a2e';
    const trackEdge = flash ? '#fff' : '#0a0a16';

    // 履带底
    ctx.fillStyle = trackColor;
    ctx.fillRect(-hw, -hh, trackW, h);
    ctx.fillRect(hw - trackW, -hh, trackW, h);

    // 履带边缘
    ctx.strokeStyle = trackEdge;
    ctx.lineWidth = 1;
    ctx.strokeRect(-hw, -hh, trackW, h);
    ctx.strokeRect(hw - trackW, -hh, trackW, h);

    // 履带动画段（移动时滚动）
    const segCount = Math.floor(h / 5);
    const scrollOffset = this.moving ? (t / 40) % 5 : 0;
    ctx.fillStyle = flash ? '#ccc' : '#3a3a5e';
    for (let i = 0; i < segCount; i++) {
      const ty = -hh + i * 5 + scrollOffset;
      if (ty + 2 > hh) continue;
      ctx.fillRect(-hw + 1, ty, trackW - 2, 2);
      ctx.fillRect(hw - trackW + 1, ty, trackW - 2, 2);
    }

    // ====== 车身（霓虹渐变） ======
    const bodyGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
    if (flash) {
      bodyGrad.addColorStop(0, '#ffffff');
      bodyGrad.addColorStop(1, '#cccccc');
    } else {
      // 深色底 + 主色渐变
      const darkColor = this._darken(color, 0.4);
      bodyGrad.addColorStop(0, darkColor);
      bodyGrad.addColorStop(0.5, color);
      bodyGrad.addColorStop(1, darkColor);
    }

    ctx.shadowColor = color;
    ctx.shadowBlur = this.isPlayer ? 12 : 8;
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, -hw + trackW, -hh + 2, w - trackW * 2, h - 4, 3);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 车身霓虹边框
    ctx.strokeStyle = flash ? '#fff' : color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 车身装饰线条
    ctx.strokeStyle = flash ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-hw + trackW + 2, -hh + h * 0.3);
    ctx.lineTo(hw - trackW - 2, -hh + h * 0.3);
    ctx.moveTo(-hw + trackW + 2, -hh + h * 0.7);
    ctx.lineTo(hw - trackW - 2, -hh + h * 0.7);
    ctx.stroke();

    // ====== 炮塔（能量核心） ======
    const turretR = w * 0.24;
    const pulse = 0.7 + 0.3 * Math.sin(t / 200);

    // 外光环
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 * pulse;
    ctx.fillStyle = flash ? '#fff' : this._darken(color, 0.2);
    ctx.beginPath();
    ctx.arc(0, 0, turretR, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 能量核心内圈
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, turretR * 0.7);
    coreGrad.addColorStop(0, flash ? '#fff' : '#ffffff');
    coreGrad.addColorStop(0.4, flash ? '#fff' : color);
    coreGrad.addColorStop(1, flash ? '#ccc' : this._darken(color, 0.5));
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, turretR * 0.7, 0, TAU);
    ctx.fill();

    // 核心高光点
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(-turretR * 0.2, -turretR * 0.2, turretR * 0.25, 0, TAU);
    ctx.fill();

    // 旋转能量环
    ctx.strokeStyle = flash ? '#fff' : color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4 * pulse;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + t / 300;
      const r1 = turretR * 0.85;
      const r2 = turretR * 1.0;
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // ====== 炮管（流线型） ======
    const barrelW = Math.max(4, w * 0.14);
    const barrelH = hh * 0.85;
    // 炮管主体
    ctx.fillStyle = flash ? '#fff' : '#1a1a2e';
    ctx.fillRect(-barrelW / 2, -hh - 2, barrelW, barrelH);
    // 炮管霓虹描边
    ctx.strokeStyle = flash ? '#fff' : color;
    ctx.lineWidth = 1;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.strokeRect(-barrelW / 2, -hh - 2, barrelW, barrelH);
    ctx.shadowBlur = 0;
    // 炮口
    ctx.fillStyle = flash ? '#fff' : color;
    ctx.fillRect(-barrelW / 2 - 1, -hh - 4, barrelW + 2, 3);
    // 炮口能量光
    ctx.fillStyle = flash ? '#fff' : 'rgba(255,255,255,0.8)';
    ctx.globalAlpha = 0.5 * pulse;
    ctx.beginPath();
    ctx.arc(0, -hh - 1, barrelW * 0.4, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    // ====== 方向指示器（箭头） ======
    if (this.isPlayer) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.moveTo(0, -turretR * 0.5);
      ctx.lineTo(-3, -turretR * 0.2);
      ctx.lineTo(3, -turretR * 0.2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();

    // ====== 玩家技能就绪光环 ======
    if (this.isPlayer && this.skillCD !== undefined && this.skillCD <= 0) {
      ctx.save();
      const auraPulse = 0.4 + 0.3 * Math.sin(t / 250);
      ctx.globalAlpha = auraPulse;
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -t / 30;
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.62, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // ====== Boss 阶段光环 ======
    if (this.isBoss) {
      ctx.save();
      const phaseColors = ['#ff00ff', '#ff4400', '#ff0000'];
      const pColor = phaseColors[this.bossPhase] || '#ff00ff';
      const bPulse = 0.3 + 0.2 * Math.sin(t / 150);
      ctx.globalAlpha = bPulse;
      ctx.strokeStyle = pColor;
      ctx.shadowColor = pColor;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.55, 0, TAU);
      ctx.stroke();
      // 旋转粒子
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + t / 200;
        const px = cx + Math.cos(a) * w * 0.55;
        const py = cy + Math.sin(a) * w * 0.55;
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = pColor;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    // ====== 护盾 ======
    if (this.shieldTime > 0) {
      ctx.save();
      const blink = this.shieldTime < 1000 ? Math.floor(this.shieldTime / 100) % 2 === 0 : true;
      if (blink) {
        const shieldPulse = 0.4 + 0.3 * Math.sin(t / 200);
        ctx.globalAlpha = shieldPulse;
        ctx.strokeStyle = Colors.NEON_CYAN;
        ctx.shadowColor = Colors.NEON_CYAN;
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, w * 0.68, 0, TAU);
        ctx.stroke();
        // 六边形旋转
        ctx.globalAlpha = shieldPulse * 0.5;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + t / 600;
          const px = cx + Math.cos(a) * w * 0.62;
          const py = cy + Math.sin(a) * w * 0.62;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }

    // ====== HP条 ======
    if (this.hp < this.maxHp && this.alive) {
      ctx.save();
      const bw = w;
      const bh = 3;
      const by = y - 7;
      // 背景
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(x, by, bw, bh);
      // 血量
      const hpRatio = this.hp / this.maxHp;
      const hpColor = hpRatio > 0.5 ? Colors.NEON_GREEN : (hpRatio > 0.25 ? Colors.NEON_YELLOW : Colors.NEON_RED);
      ctx.fillStyle = hpColor;
      ctx.shadowColor = hpColor;
      ctx.shadowBlur = 4;
      ctx.fillRect(x, by, bw * hpRatio, bh);
      ctx.restore();
    }
  }

  // 颜色变暗辅助
  _darken(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, ((n >> 16) & 0xff) - Math.round(255 * amt));
    const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(255 * amt));
    const b = Math.max(0, (n & 0xff) - Math.round(255 * amt));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }
}
