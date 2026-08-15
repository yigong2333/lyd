// ============================================================
//  InputManager.js - 键盘 + 触屏输入
// ============================================================
//
//  PC:    WASD/方向键移动, 空格/J 射击, K/Shift 技能, ESC/P 暂停
//  移动端: 虚拟摇杆(左下) + 射击/技能按钮(右下)
// ============================================================

import { DIR, DIR_VEC } from '../config/Colors.js';
import { isMobile } from './Utils.js';

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.pressed = {};        // 单次按下标记
    this.released = {};

    // 动作状态
    this.moveDir = -1;        // 当前移动方向 (-1 无)
    this.firePressed = false;
    this.skillPressed = false;
    this.fireJustPressed = false;
    this.skillJustPressed = false;
    this.pauseRequested = false;

    // 蓄力相关
    this.charging = false;
    this.chargeStartTime = 0;

    // 虚拟摇杆
    this.joystick = { active: false, baseX: 0, baseY: 0, dx: 0, dy: 0 };
    this.touchFire = false;
    this.touchSkill = false;

    this._bind();
  }

  _bind() {
    window.addEventListener('keydown', (e) => this._onKey(e, true));
    window.addEventListener('keyup', (e) => this._onKey(e, false));

    if (isMobile) {
      this._bindTouch();
    }
  }

  _onKey(e, down) {
    const k = e.key.toLowerCase();
    // 防止页面滚动
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'spacebar'].includes(k)) {
      e.preventDefault();
    }
    if (down && !this.keys[k]) {
      this.pressed[k] = true;
    }
    if (!down) {
      this.released[k] = true;
    }
    this.keys[k] = down;
  }

  _bindTouch() {
    // 虚拟摇杆区域 — 由 UIManager 创建 DOM 元素，这里通过事件委托处理
    // 实际触摸绑定在 UIManager 创建的按钮上，通过 setJoystick/setButton 调用
  }

  // 由 UIManager 的虚拟摇杆调用
  setJoystick(baseX, baseY) {
    this.joystick.active = true;
    this.joystick.baseX = baseX;
    this.joystick.baseY = baseY;
  }
  updateJoystick(dx, dy) {
    this.joystick.dx = dx;
    this.joystick.dy = dy;
  }
  endJoystick() {
    this.joystick.active = false;
    this.joystick.dx = 0;
    this.joystick.dy = 0;
  }
  setTouchFire(down) { this.touchFire = down; if (down) this.fireJustPressed = true; }
  setTouchSkill(down) { this.touchSkill = down; if (down) this.skillJustPressed = true; }

  beginFrame(dt) {
    // 计算移动方向
    let dir = -1;
    if (this.keys['arrowup'] || this.keys['w']) dir = DIR.UP;
    else if (this.keys['arrowright'] || this.keys['d']) dir = DIR.RIGHT;
    else if (this.keys['arrowdown'] || this.keys['s']) dir = DIR.DOWN;
    else if (this.keys['arrowleft'] || this.keys['a']) dir = DIR.LEFT;

    // 虚拟摇杆覆盖
    if (this.joystick.active) {
      const { dx, dy } = this.joystick;
      const dead = 8;
      if (Math.abs(dx) > dead || Math.abs(dy) > dead) {
        if (Math.abs(dx) > Math.abs(dy)) {
          dir = dx > 0 ? DIR.RIGHT : DIR.LEFT;
        } else {
          dir = dy > 0 ? DIR.DOWN : DIR.UP;
        }
      }
    }
    this.moveDir = dir;

    // 射击
    const fireKey = this.keys[' '] || this.keys['spacebar'] || this.keys['j'];
    const wasCharging = this.charging;
    this.firePressed = !!fireKey || this.touchFire;

    if (fireKey && !wasCharging) {
      this.fireJustPressed = true;
      this.charging = true;
      this.chargeStartTime = performance.now();
    }
    if (!this.firePressed && wasCharging) {
      this.charging = false;
    }

    // 技能
    const skillKey = this.keys['k'] || this.keys['shift'];
    if ((skillKey && !this.skillPressed) || this.touchSkill) {
      this.skillJustPressed = true;
    }
    this.skillPressed = !!skillKey || this.touchSkill;

    // 暂停
    if (this.pressed['escape'] || this.pressed['p']) {
      this.pauseRequested = true;
    }
  }

  endFrame() {
    this.pressed = {};
    this.released = {};
    this.fireJustPressed = false;
    this.skillJustPressed = false;
    this.pauseRequested = false;
  }

  getChargeTime() {
    return this.charging ? performance.now() - this.chargeStartTime : 0;
  }
}

export { isMobile };
