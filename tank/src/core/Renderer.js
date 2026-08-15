// ============================================================
//  Renderer.js - Canvas 渲染器
// ============================================================
//
//  渲染层级（从底到顶）:
//  1. 地面背景（深色 + 网格线 + 校园纹理）
//  2. 水路（波纹动画）
//  3. 墙壁底层（砖墙/钢墙，含"浩源""浪尖儿"字形）
//  4. 道具
//  5. 坦克（敌方 → 玩家）
//  6. 子弹
//  7. 粒子特效
//  8. 草丛（覆盖坦克，实现隐蔽效果）
//  9. 基地
//  10. UI叠加层（震屏/闪白/扫描线）
// ============================================================

import { TILE_SIZE, GRID_W, GRID_H, TileType, Colors, DIR, DIR_VEC } from '../config/Colors.js';
import { TAU } from './Utils.js';
import { GRAFFITI_TEXTS } from '../config/MapData.js';

export class Renderer {
  constructor(game) {
    this.game = game;
    this.ctx = game.ctx;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this._time = 0;
    this._menuStars = [];
    this._initMenuStars();
  }

  _initMenuStars() {
    for (let i = 0; i < 80; i++) {
      this._menuStars.push({
        x: Math.random(),
        y: Math.random(),
        s: Math.random() * 2 + 0.5,
        sp: Math.random() * 0.02 + 0.005,
      });
    }
  }

  resize() {
    const cv = this.game.canvas;
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    cv.width = vw * dpr;
    cv.height = vh * dpr;
    cv.style.width = vw + 'px';
    cv.style.height = vh + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 计算缩放：地图 832x832 适配视口
    const mapW = this.game.mapPixelW;
    const mapH = this.game.mapPixelH;
    const pad = 80; // 给HUD留空间
    const sx = (vw - pad) / mapW;
    const sy = (vh - pad) / mapH;
    this.scale = Math.min(sx, sy, 1.5);
    this.offsetX = (vw - mapW * this.scale) / 2;
    this.offsetY = (vh - mapH * this.scale) / 2;
    this.viewW = vw;
    this.viewH = vh;
  }

  // ============================================================
  //  主绘制
  // ============================================================

  draw() {
    this._time += 16;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.viewW, this.viewH);
    // 背景
    ctx.fillStyle = Colors.BG_DARK;
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    // 震屏
    if (this.game.shake > 0) {
      const s = this.game.shake;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    this._drawGround();
    this._drawGraffiti();
    this._drawWater();
    this._drawWalls();
    this._drawPowerups();
    this._drawTanks();
    this._drawBullets();
    this._drawParticles();
    this._drawGrass();
    this._drawBase();

    ctx.restore();

    // 全屏特效
    this._drawScanlines();
    if (this.game.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.game.flash})`;
      ctx.fillRect(0, 0, this.viewW, this.viewH);
    }
  }

  // ---------- 地面 ----------
  _drawGround() {
    const ctx = this.ctx;
    const w = this.game.mapPixelW, h = this.game.mapPixelH;
    ctx.fillStyle = Colors.BG_GROUND;
    ctx.fillRect(0, 0, w, h);
    // 网格线
    ctx.strokeStyle = Colors.GRID_LINE;
    ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_W; x++) {
      ctx.beginPath();
      ctx.moveTo(x * TILE_SIZE, 0);
      ctx.lineTo(x * TILE_SIZE, h);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_H; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * TILE_SIZE);
      ctx.lineTo(w, y * TILE_SIZE);
      ctx.stroke();
    }
    // 校园纹理：四角装饰
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.lineWidth = 2;
    const corners = [[2,2],[GRID_W-3,2],[2,GRID_H-3],[GRID_W-3,GRID_H-3]];
    for (const [cx, cy] of corners) {
      ctx.strokeRect(cx * TILE_SIZE, cy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  // ---------- 地板涂鸦："浩源""浪尖儿" ----------
  _drawGraffiti() {
    const ctx = this.ctx;
    const pulse = 0.5 + 0.5 * Math.sin(this._time / 600);
    const fontSize = Math.floor(TILE_SIZE * 3.5);

    for (const g of GRAFFITI_TEXTS) {
      const x = g.col * TILE_SIZE;
      const y = g.row * TILE_SIZE;
      const textW = g.text.length * fontSize * 0.95;
      const textH = fontSize;

      ctx.save();
      // 半透明背景框
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = g.color;
      ctx.fillRect(x - 4, y - 4, textW + 8, textH + 8);

      // 文字本体 — 多层渲染制造霓虹发光效果
      ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // 外层发光（大模糊）
      ctx.globalAlpha = 0.25 + 0.15 * pulse;
      ctx.shadowColor = g.color;
      ctx.shadowBlur = 20;
      ctx.fillStyle = g.color;
      ctx.fillText(g.text, x, y);

      // 中层发光
      ctx.globalAlpha = 0.35 + 0.15 * pulse;
      ctx.shadowBlur = 10;
      ctx.fillText(g.text, x, y);

      // 核心文字（亮白）
      ctx.globalAlpha = 0.5 + 0.2 * pulse;
      ctx.shadowBlur = 4;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(g.text, x, y);

      // 描边
      ctx.globalAlpha = 0.6;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = g.color;
      ctx.lineWidth = 2;
      ctx.strokeText(g.text, x, y);

      ctx.restore();
    }
  }

  // ---------- 水路 ----------
  _drawWater() {
    const ctx = this.ctx;
    const tiles = this.game.level.tiles;
    for (let r = 0; r < tiles.length; r++) {
      for (let c = 0; c < tiles[r].length; c++) {
        if (tiles[r][c] !== TileType.WATER) continue;
        const x = c * TILE_SIZE, y = r * TILE_SIZE;
        ctx.fillStyle = Colors.TERRAIN.WATER;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        // 波纹
        ctx.strokeStyle = 'rgba(136, 204, 255, 0.4)';
        ctx.lineWidth = 1;
        const ph = this._time / 300 + (c + r);
        ctx.beginPath();
        ctx.moveTo(x + 4, y + TILE_SIZE / 2 + Math.sin(ph) * 3);
        ctx.quadraticCurveTo(x + TILE_SIZE / 2, y + TILE_SIZE / 2 + Math.sin(ph + 1) * 5, x + TILE_SIZE - 4, y + TILE_SIZE / 2 + Math.sin(ph + 2) * 3);
        ctx.stroke();
      }
    }
  }

  // ---------- 墙壁 ----------
  _drawWalls() {
    const ctx = this.ctx;
    for (const w of this.game.level.walls) {
      if (w.alive) w.draw(ctx);
    }
  }

  // ---------- 草丛（覆盖层） ----------
  _drawGrass() {
    const ctx = this.ctx;
    const tiles = this.game.level.tiles;
    for (let r = 0; r < tiles.length; r++) {
      for (let c = 0; c < tiles[r].length; c++) {
        if (tiles[r][c] !== TileType.GRASS) continue;
        const x = c * TILE_SIZE, y = r * TILE_SIZE;
        ctx.fillStyle = Colors.TERRAIN.GRASS;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        // 草纹
        ctx.fillStyle = Colors.TERRAIN.GRASS_DARK;
        for (let i = 0; i < 3; i++) {
          const gx = x + 4 + i * 10;
          ctx.fillRect(gx, y + 6, 2, 6);
          ctx.fillRect(gx + 4, y + 10, 2, 8);
        }
      }
    }
  }

  // ---------- 基地 ----------
  _drawBase() {
    const base = this.game.level.base;
    if (!base || !base.alive) {
      // 基地被毁 — 画废墟
      if (base) {
        const ctx = this.ctx;
        ctx.fillStyle = '#330000';
        ctx.fillRect(base.x, base.y, base.w, base.h);
        ctx.fillStyle = '#660000';
        ctx.fillRect(base.x + 4, base.y + 4, base.w - 8, base.h - 8);
      }
      return;
    }
    const ctx = this.ctx;
    const pulse = 0.5 + 0.5 * Math.sin(this._time / 200);
    const danger = base.danger > 0;
    base.danger = Math.max(0, (base.danger || 0) - 16);
    ctx.save();
    ctx.shadowColor = danger ? Colors.BASE_DANGER : Colors.BASE_GLOW;
    ctx.shadowBlur = 8 + pulse * 8;
    ctx.fillStyle = danger ? Colors.BASE_DANGER : Colors.BASE;
    ctx.fillRect(base.x + 2, base.y + 2, base.w - 4, base.h - 4);
    ctx.shadowBlur = 0;
    // 鹰标（简化）
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(TILE_SIZE * 0.7)}px Consolas`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', base.x + base.w / 2, base.y + base.h / 2);
    ctx.restore();
  }

  // ---------- 道具 ----------
  _drawPowerups() {
    for (const p of this.game.powerups) {
      if (p.alive) p.draw(this.ctx);
    }
  }

  // ---------- 坦克 ----------
  _drawTanks() {
    // 先敌方后玩家
    for (const e of this.game.enemies) {
      if (e.alive) {
        // 草丛中半透明
        const t = this.game.level.getTile(e.gridX, e.gridY);
        if (t === TileType.GRASS) this.ctx.globalAlpha = 0.5;
        e.draw(this.ctx);
        this.ctx.globalAlpha = 1;
      }
    }
    if (this.game.player && this.game.player.alive) {
      const p = this.game.player;
      const t = this.game.level.getTile(p.gridX, p.gridY);
      if (t === TileType.GRASS) this.ctx.globalAlpha = 0.5;
      p.draw(this.ctx);
      this.ctx.globalAlpha = 1;
    }
  }

  // ---------- 子弹 ----------
  _drawBullets() {
    for (const b of this.game.bullets.active) {
      if (b.active) b.draw(this.ctx);
    }
  }

  // ---------- 粒子 ----------
  _drawParticles() {
    for (const p of this.game.particles.active) {
      if (p.active) p.draw(this.ctx);
    }
  }

  // ---------- 扫描线 ----------
  _drawScanlines() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#000';
    for (let y = 0; y < this.viewH; y += 3) {
      ctx.fillRect(0, y, this.viewW, 1);
    }
    ctx.restore();
  }

  // ============================================================
  //  菜单背景
  // ============================================================

  drawMenuBackground(dt) {
    this._time += dt;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.viewW, this.viewH);
    // 渐变背景
    const grad = ctx.createRadialGradient(this.viewW / 2, this.viewH / 2, 50, this.viewW / 2, this.viewH / 2, this.viewW);
    grad.addColorStop(0, Colors.BG_GROUND);
    grad.addColorStop(1, Colors.BG_DARK);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    // 星点
    for (const s of this._menuStars) {
      s.y += s.sp;
      if (s.y > 1) s.y = 0;
      ctx.fillStyle = `rgba(0, 240, 255, ${0.3 + s.s * 0.2})`;
      ctx.fillRect(s.x * this.viewW, s.y * this.viewH, s.s, s.s);
    }

    // 网格地平线
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
    ctx.lineWidth = 1;
    const horizon = this.viewH * 0.55;
    for (let i = 0; i < 20; i++) {
      const t = i / 20;
      const y = horizon + (this.viewH - horizon) * t * t;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.viewW, y);
      ctx.stroke();
    }
    // 透视竖线
    for (let i = -10; i <= 10; i++) {
      const x = this.viewW / 2 + i * (this.viewW / 8);
      ctx.beginPath();
      ctx.moveTo(this.viewW / 2, horizon);
      ctx.lineTo(x, this.viewH);
      ctx.stroke();
    }

    this._drawScanlines();
  }

  drawPauseOverlay() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(5, 0, 24, 0.7)';
    ctx.fillRect(0, 0, this.viewW, this.viewH);
    ctx.restore();
  }

  // 坐标转换：屏幕坐标 -> 世界坐标
  screenToWorld(sx, sy) {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale,
    };
  }
}
