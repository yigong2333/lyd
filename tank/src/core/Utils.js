// ============================================================
//  Utils.js - 数学/碰撞/绘制工具
// ============================================================

export const TAU = Math.PI * 2;

export const clamp = (v, min, max) => v < min ? min : (v > max ? max : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
export const dist2 = (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; };

export const rand = (min, max) => Math.random() * (max - min) + min;
export const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
export const randChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p) => Math.random() < p;

export const aabb = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x &&
  a.y < b.y + b.h && a.y + a.h > b.y;

export const circleHit = (x1, y1, r1, x2, y2, r2) =>
  dist2(x1, y1, x2, y2) < (r1 + r2) * (r1 + r2);

export const angleToDir = (ang) => {
  let d = ((ang % TAU) + TAU) % TAU;
  if (d >= Math.PI * 1.75 || d < Math.PI * 0.25) return 1;
  if (d < Math.PI * 0.75) return 2;
  if (d < Math.PI * 1.25) return 3;
  return 0;
};

export const lighten = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + Math.round(255 * amt), 0, 255);
  const g = clamp(((n >> 8) & 0xff) + Math.round(255 * amt), 0, 255);
  const b = clamp((n & 0xff) + Math.round(255 * amt), 0, 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

export const darken = (hex, amt) => lighten(hex, -amt);

export const padZero = (n, len = 6) => String(n).padStart(len, '0');

export const formatTime = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${padZero(Math.floor(s / 60), 2)}:${padZero(s % 60, 2)}`;
};

export const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

// ========== Canvas 绘制辅助 ==========

export const roundRect = (ctx, x, y, w, h, r) => {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

export const glowRect = (ctx, x, y, w, h, color, glow = 8) => {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
};

export const glowCircle = (ctx, x, y, r, color, glow = 10) => {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
};

export const mulberry32 = (seed) => {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
