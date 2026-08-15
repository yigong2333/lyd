// ============================================================
//  Renderer.js - Canvas渲染器（含视差背景3层）
// ============================================================

import { Colors } from '../config/Colors.js';
import { TAU, rand, randInt } from './Utils.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this._applySize();

    // 离屏背景（3层星空）
    this._bgLayers = [
      this._makeStars(0.3, 220, [255, 255, 255], 0.8),
      this._makeStars(0.6, 120, [150, 200, 255], 1.2),
      this._makeStars(1.0,  70, [0, 200, 255], 2.2),
    ];
    this._bgOffsets = [0, 0, 0];
    this._bgScrollMul = [0.15, 0.4, 1.0];

    // 网格 + 星云（离屏画一次）
    this._gridCanvas = this._makeGridCanvas();
    this._gridOffset = 0;

    // HUD装饰线
    this.warnFlash = 0;
    this.scanLineT = 0;
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this._applySize();
  }

  _applySize() {
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  // ---------- 生成星空数据 ----------
  _makeStars(densityMul, count, color, baseSize) {
    const arr = [];
    const W = 2000, H = 2000;
    count = Math.floor(count * densityMul);
    for (let i = 0; i < count; i++) {
      arr.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: baseSize * (0.5 + Math.random() * 1.4),
        a: 0.35 + Math.random() * 0.65,
        color: `rgba(${color[0]},${color[1]},${color[2]},`,
        tw: Math.random() * TAU,
      });
    }
    arr.W = W; arr.H = H;
    return arr;
  }

  _makeGridCanvas() {
    const c = document.createElement('canvas');
    const W = 200, H = 200;
    c.width = W; c.height = H;
    const cx = c.getContext('2d');
    cx.strokeStyle = 'rgba(0, 240, 255, 0.10)';
    cx.lineWidth = 1;
    for (let x = 0; x <= W; x += 40) {
      cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, H); cx.stroke();
    }
    for (let y = 0; y <= H; y += 40) {
      cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke();
    }
    // 十字中心点
    cx.strokeStyle = 'rgba(0, 240, 255, 0.18)';
    cx.beginPath(); cx.moveTo(W/2, 0); cx.lineTo(W/2, H); cx.stroke();
    cx.beginPath(); cx.moveTo(0, H/2); cx.lineTo(W, H/2); cx.stroke();
    return c;
  }

  // ---------- 每帧开始：清屏 + 画背景 ----------
  beginFrame(dt, game) {
    const ctx = this.ctx;
    const W = this.width, H = this.height;

    // 背景颜色（Boss战红色偏红）
    const baseR = game.inBossBattle ? Math.min(14, 5 + this.warnFlash * 8) : 5;
    const baseG = 0;
    const baseB = game.inBossBattle ? 24 : 24;
    ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
    ctx.fillRect(0, 0, W, H);

    // 警告闪烁（Boss战时）
    if (game.inBossBattle) {
      this.warnFlash = (this.warnFlash + dt * 0.003) % 1;
      if (Math.floor(this.warnFlash * 4) % 2 === 0) {
        ctx.fillStyle = 'rgba(255, 51, 102, 0.05)';
        ctx.fillRect(0, 0, W, H);
      }
    }

    // 视差星空三层（垂直滚动）
    for (let i = 0; i < this._bgLayers.length; i++) {
      const scroll = (game.globalTime || 0) * 0.03 * this._bgScrollMul[i];
      this._drawStars(ctx, this._bgLayers[i], scroll, W, H);
    }

    // 中层网格（循环）
    this._gridOffset = (this._gridOffset + dt * 0.03 * 0.4) % this._gridCanvas.height;
    const pattern = ctx.createPattern(this._gridCanvas, 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.translate(0, this._gridOffset);
    ctx.fillStyle = pattern;
    ctx.fillRect(0, -this._gridCanvas.height, W, H + this._gridCanvas.height * 2);
    ctx.restore();

    // 扫描线
    this.scanLineT = (this.scanLineT + dt * 0.0004) % 1;
    const scanY = this.scanLineT * H;
    const grad = ctx.createLinearGradient(0, scanY - 60, 0, scanY + 60);
    grad.addColorStop(0, 'rgba(0,240,255,0)');
    grad.addColorStop(0.5, 'rgba(0,240,255,0.08)');
    grad.addColorStop(1, 'rgba(0,240,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, scanY - 60, W, 120);

    // 中央准星装饰（淡）
    this._drawHUDCenter(ctx, W, H, game);
  }

  _drawStars(ctx, layer, scroll, W, H) {
    const { W: LW, H: LH } = layer;
    ctx.save();
    for (const s of layer) {
      let y = (s.y + scroll * 1000) % LH;
      if (y < 0) y += LH;
      // 平铺3份保证覆盖
      const yy = (y / LH) * H;
      const xx = (s.x / LW) * W;
      // 闪烁
      s.tw += 0.01;
      const a = s.a * (0.6 + Math.sin(s.tw) * 0.4);
      ctx.fillStyle = s.color + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(xx, yy, s.r, 0, TAU);
      ctx.fill();
      // 近处星星加发光
      if (s.r > 1.8) {
        ctx.shadowBlur = 6;
        ctx.shadowColor = s.color + '1)';
        ctx.fillStyle = s.color + '1)';
        ctx.beginPath();
        ctx.arc(xx, yy, s.r * 0.6, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    ctx.restore();
  }

  _drawHUDCenter(ctx, W, H, game) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = Colors.NEON_CYAN;
    ctx.lineWidth = 1;
    // 顶部瞄准框
    ctx.strokeRect(W*0.5 - 40, 80, 80, 80);
    // 四角L型
    const corner = (x, y) => {
      ctx.beginPath();
      ctx.moveTo(x, y + 14); ctx.lineTo(x, y); ctx.lineTo(x + 14, y); ctx.stroke();
    };
    const pad = 30;
    corner(pad, pad);
    ctx.save(); ctx.translate(W, 0); ctx.scale(-1,1); corner(pad, pad); ctx.restore();
    ctx.save(); ctx.translate(0, H); ctx.scale(1,-1); corner(pad, pad); ctx.restore();
    ctx.save(); ctx.translate(W, H); ctx.scale(-1,-1); corner(pad, pad); ctx.restore();
    ctx.restore();
  }

  // ---------- 震屏 / 闪白 应用 ----------
  applyEffects(game) {
    const ctx = this.ctx;
    if (game.shakeTime > 0) {
      const mag = game.shakeMag * (game.shakeTime / game.shakeDur);
      const sx = (Math.random() - 0.5) * mag;
      const sy = (Math.random() - 0.5) * mag;
      ctx.save();
      ctx.translate(sx, sy);
      this._shakeApplied = true;
    } else this._shakeApplied = false;

    // 残影拖影（低透明覆盖前帧）
    if (game.motionBlur) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalCompositeOperation = 'source-over';
    }
    // 闪白
    if (game.flashAmt > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = game.flashColor || `rgba(255, 255, 255, ${game.flashAmt})`;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }
  }

  // 结束震屏还原
  restoreShake() {
    if (this._shakeApplied) this.ctx.restore();
  }

  // 终极技能视觉（激光/EMP/时间）
  drawUltVisual(game, dt) {
    const ctx = this.ctx;
    const u = game.ultVisual;
    if (!u) return;
    u.t += dt;
    const t = u.t / u.duration;
    if (t >= 1) { game.ultVisual = null; return; }

    if (u.type === 'laser') {
      ctx.save();
      // 横向激光：多条贯穿
      for (let i = 0; i < 6; i++) {
        const y = game.height * (0.15 + i * 0.14);
        const w = this.width * (1 - Math.abs(t - 0.5) * 2);
        const x = (this.width - w) / 2;
        const alpha = t < 0.15 ? t/0.15 : (1 - (t - 0.15)/0.85);
        ctx.globalAlpha = Math.max(0, alpha) * 0.9;
        const g = ctx.createLinearGradient(x, y, x + w, y);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, Colors.NEON_YELLOW);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.shadowBlur = 30; ctx.shadowColor = Colors.NEON_YELLOW;
        ctx.fillStyle = g;
        ctx.fillRect(x, y - 14, w, 28);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(x, y - 3, w, 6);
      }
      ctx.restore();
    } else if (u.type === 'emp') {
      ctx.save();
      const r = 30 + t * Math.max(this.width, this.height) * 1.2;
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = Colors.NEON_PINK;
      ctx.lineWidth = 10;
      ctx.shadowBlur = 30; ctx.shadowColor = Colors.NEON_PINK;
      ctx.beginPath();
      ctx.arc(u.x, u.y, r, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = Colors.NEON_CYAN;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(u.x, u.y, r * 0.7, 0, TAU);
      ctx.stroke();
      ctx.restore();
    } else if (u.type === 'time') {
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.45;
      ctx.fillStyle = Colors.NEON_PURPLE;
      ctx.fillRect(0, 0, this.width, this.height);
      // 环形波纹
      for (let i = 0; i < 4; i++) {
        const tt = (t + i * 0.25) % 1;
        ctx.globalAlpha = (1 - tt) * 0.5;
        ctx.strokeStyle = Colors.NEON_CYAN;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.width/2, this.height/2, tt * Math.max(this.width, this.height), 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

export default Renderer;
