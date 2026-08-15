// ============================================================
//  Utils.js - 通用工具函数库
//  包含：数学、随机、碰撞、插值、Canvas辅助等
// ============================================================

// ------------------- 数学常量 -------------------
export const PI   = Math.PI;
export const TAU  = Math.PI * 2;
export const RAD  = Math.PI / 180;
export const DEG  = 180 / Math.PI;

// ------------------- 数学函数 -------------------
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp  = (a, b, t) => a + (b - a) * t;
export const map   = (v, a1, a2, b1, b2) => (v - a1) / (a2 - a1) * (b2 - b1) + b1;

/** 正弦波 0~1 */
export const sin01 = (t) => (Math.sin(t) + 1) * 0.5;

/** 按角度转方向向量 */
export const angleToVec = (angle) => ({ x: Math.cos(angle), y: Math.sin(angle) });

/** 两点间角度（弧度） */
export const angleBetween = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);

/** 两点距离平方（避免开根号） */
export const dist2 = (ax, ay, bx, by) => {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
};

/** 两点距离 */
export const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));

/** 圆形碰撞检测（用平方距离，性能友好） */
export const circleHit = (ax, ay, ar, bx, by, br) => {
  const r = ar + br;
  return dist2(ax, ay, bx, by) <= r * r;
};

// ------------------- 随机 -------------------
/** [a, b) 均匀随机浮点 */
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);

/** [a, b] 整数随机 */
export const randInt = (a, b) => Math.floor(rand(a, b + 1));

/** -1 ~ 1 的正负随机 */
export const randSign = () => (Math.random() < 0.5 ? -1 : 1);

/** 按概率 true/false */
export const chance = (p) => Math.random() < p;

/** 从数组中随机取一个 */
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ------------------- 数组/对象池辅助 -------------------
export const removeAt = (arr, i) => {
  const last = arr.length - 1;
  if (i !== last) arr[i] = arr[last];
  arr.pop();
};

/** 线性查找并移除第一个符合条件的元素 */
export const removeIf = (arr, fn) => {
  for (let i = 0; i < arr.length; i++) {
    if (fn(arr[i])) { removeAt(arr, i); return true; }
  }
  return false;
};

// ------------------- 缓动函数 (easing) -------------------
export const Ease = {
  linear:     (t) => t,
  outCubic:   (t) => 1 - Math.pow(1 - t, 3),
  inOutQuad:  (t) => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2,
  outBack:    (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
};

// ------------------- Canvas辅助 -------------------
/**
 * 画一个发光圆形（玩家弹/敌方弹通用）
 */
export function drawGlowCircle(ctx, x, y, r, color, glowColor, blur = 10) {
  ctx.save();
  ctx.shadowBlur = blur;
  ctx.shadowColor = glowColor;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/**
 * 画一个描边发光多边形（用于敌机等几何图形）
 */
export function drawGlowPoly(ctx, pts, fill, stroke, lineW = 1.5, blur = 8) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  if (fill) {
    ctx.shadowBlur = blur;
    ctx.shadowColor = stroke;
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = lineW;
    ctx.shadowBlur = blur;
    ctx.shadowColor = stroke;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * 画HUD风格进度条（带斜纹）
 */
export function drawStripedBar(ctx, x, y, w, h, ratio, color) {
  ctx.save();
  // 边框
  ctx.strokeStyle = color;
  ctx.shadowBlur = 6;
  ctx.shadowColor = color;
  ctx.strokeRect(x, y, w, h);
  // 填充
  ctx.beginPath();
  ctx.rect(x + 1, y + 1, Math.max(0, (w - 2) * ratio), h - 2);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.shadowBlur = 8;
  ctx.shadowColor = color;
  ctx.fillRect(x, y, w, h);
  // 斜纹
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#000';
  const off = (performance.now() * 0.05) % 16;
  for (let sx = -16 + off; sx < w + 16; sx += 8) {
    ctx.beginPath();
    ctx.moveTo(x + sx, y);
    ctx.lineTo(x + sx + 4, y);
    ctx.lineTo(x + sx + 4 - h, y + h);
    ctx.lineTo(x + sx - h, y + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ------------------- 格式化 -------------------
export const padZero = (n, len = 7) => String(n).padStart(len, '0');

export const formatTime = (ms) => {
  const sec = Math.floor(ms / 1000);
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
};

// ------------------- 移动端检测 -------------------
export const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
