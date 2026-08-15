// ============================================================
//  InputManager.js - 输入管理器
//  统一处理：键盘、鼠标、触屏；对外暴露统一接口
// ============================================================

import { isMobile } from './Utils.js';

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;

    // 键盘状态
    this.keys = new Set();
    this.keyPressed = new Set();   // 单帧按下触发

    // 指针/触屏
    this.pointer = {
      x: 0, y: 0,
      down: false,
      pressed: false,       // 本帧按下
      released: false,      // 本帧释放
      holdTime: 0,          // 按住时长（ms）
      moved: false,         // 本帧是否有移动
      movedInHold: false,   // 本次按住期间是否发生过移动
    };

    // 相对玩家：是否在"拖动"（触屏移动模式）
    this.dragEnabled = isMobile;
    this.dragOffset = { x: 0, y: 0 }; // 玩家手指与战机中心的偏移

    // 虚拟按钮（移动端）
    this.vButtons = { bomb: false, bombPressed: false, skill: false, skillPressed: false };

    this._bind();
  }

  _bind() {
    // ---------- 键盘 ----------
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (!this.keys.has(k)) this.keyPressed.add(k);
      this.keys.add(k);
      // 阻止空格/方向键滚动
      if (['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d'].includes(k)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    // ---------- 指针（鼠标/触屏统一）----------
    const rect = () => this.canvas.getBoundingClientRect();

    const getPos = (e) => {
      const r = rect();
      const px = (e.clientX - r.left) * (this.canvas.width / r.width);
      const py = (e.clientY - r.top)  * (this.canvas.height / r.height);
      return { x: px, y: py };
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const p = getPos(e);
      this.pointer.x = p.x; this.pointer.y = p.y;
      this.pointer.down = true;
      this.pointer.pressed = true;
      this.pointer.holdTime = 0;
      this.pointer.movedInHold = false;
    });
    this.canvas.addEventListener('pointermove', (e) => {
      const p = getPos(e);
      if (this.pointer.down && (this.pointer.x !== p.x || this.pointer.y !== p.y)) {
        this.pointer.moved = true;
        this.pointer.movedInHold = true;
      }
      this.pointer.x = p.x; this.pointer.y = p.y;
    });
    const upHandler = (e) => {
      if (this.pointer.down) {
        this.pointer.down = false;
        this.pointer.released = true;
      }
    };
    this.canvas.addEventListener('pointerup', upHandler);
    this.canvas.addEventListener('pointercancel', upHandler);
    this.canvas.addEventListener('pointerleave', upHandler);

    // ---------- 虚拟按钮 ----------
    const bindBtn = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      const onDown = (e) => {
        e.preventDefault();
        this.vButtons[key] = true;
        this.vButtons[key + 'Pressed'] = true;
      };
      const onUp = (e) => { e.preventDefault(); this.vButtons[key] = false; };
      el.addEventListener('pointerdown', onDown);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
      el.addEventListener('pointerleave', onUp);
    };
    bindBtn('btn-bomb', 'bomb');
    bindBtn('btn-skill', 'skill');
  }

  /** 每帧开始调用，清空单帧标记 */
  beginFrame(dt) {
    this.keyPressed.clear();
    this.pointer.pressed = false;
    this.pointer.released = false;
    this.pointer.moved = false;
    if (this.pointer.down) this.pointer.holdTime += dt;
    else this.pointer.holdTime = 0;

    // 清除vButton单帧pressed（由InputManager在消费后重置）
  }

  /** 每帧结束调用，重置消费型状态 */
  endFrame() {
    this.vButtons.bombPressed = false;
    this.vButtons.skillPressed = false;
  }

  // ---------- 查询 ----------
  isDown(...keys) { return keys.some(k => this.keys.has(k.toLowerCase())); }

  /** 方向输入 归一化向量 (WASD + 方向键) */
  getAxis() {
    let x = 0, y = 0;
    if (this.isDown('arrowleft', 'a'))  x -= 1;
    if (this.isDown('arrowright', 'd')) x += 1;
    if (this.isDown('arrowup', 'w'))    y -= 1;
    if (this.isDown('arrowdown', 's'))  y += 1;
    const len = Math.hypot(x, y);
    if (len > 0) { x /= len; y /= len; }
    return { x, y };
  }

  /** Bomb按下（空格/Q/虚拟键） */
  bombPressed() {
    const k = this.keyPressed.has(' ') || this.keyPressed.has('q');
    const v = this.vButtons.bombPressed;
    return k || v;
  }
  /** 技能1按下 (E) */
  skillPressed() {
    return this.keyPressed.has('e') || this.vButtons.skillPressed;
  }
  /** 暂停按下 (ESC/P) */
  pausePressed() {
    return this.keyPressed.has('escape') || this.keyPressed.has('p');
  }

  /** 是否在蓄力（长按不动，PC：左键+无位移 > 200ms；移动端：按住不动） */
  isCharging(threshold = 180) {
    if (!this.pointer.down) return false;
    if (this.pointer.holdTime < threshold) return false;
    // 移动端：只有按住且没怎么移动，才算蓄力（否则就是拖动移动）
    if (this.dragEnabled && this.pointer.movedInHold) return false;
    return true;
  }
}

export default InputManager;
