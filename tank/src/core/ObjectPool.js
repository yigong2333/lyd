// ============================================================
//  ObjectPool.js - 对象池（子弹/粒子复用）
// ============================================================

export class ObjectPool {
  constructor(factory, resetFn, prealloc = 0) {
    this._factory = factory;
    this._resetFn = resetFn;
    this._free = [];
    this._active = [];
    for (let i = 0; i < prealloc; i++) {
      this._free.push(factory());
    }
  }

  acquire() {
    const obj = this._free.pop() || this._factory();
    this._active.push(obj);
    return obj;
  }

  release(obj) {
    const idx = this._active.indexOf(obj);
    if (idx >= 0) {
      this._active.splice(idx, 1);
      if (this._resetFn) this._resetFn(obj);
      this._free.push(obj);
    }
  }

  forEach(fn) {
    for (let i = this._active.length - 1; i >= 0; i--) {
      const obj = this._active[i];
      if (fn(obj, i)) {
        this._active.splice(i, 1);
        if (this._resetFn) this._resetFn(obj);
        this._free.push(obj);
      }
    }
  }

  get active() { return this._active; }
  get count() { return this._active.length; }

  clear() {
    while (this._active.length) {
      const obj = this._active.pop();
      if (this._resetFn) this._resetFn(obj);
      this._free.push(obj);
    }
  }
}
