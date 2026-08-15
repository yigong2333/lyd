// ============================================================
//  ObjectPool.js - 通用对象池
//  用于子弹、粒子、敌机等频繁创建销毁的对象，避免GC卡顿
// ============================================================

export class ObjectPool {
  /**
   * @param {Function} createFn   工厂函数，返回一个新的空对象
   * @param {Number}   initialSize 初始池大小
   */
  constructor(createFn, initialSize = 64) {
    this.createFn = createFn;
    this.pool = [];
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this._make());
    }
  }

  _make() {
    const obj = this.createFn();
    obj.__pooled = true;
    obj.active  = false;
    return obj;
  }

  /** 取出一个可用对象，自动标记 active=true */
  acquire() {
    const obj = this.pool.pop() || this._make();
    obj.active = true;
    if (obj.reset) obj.reset();
    return obj;
  }

  /** 归还对象，标记 active=false */
  release(obj) {
    if (!obj || !obj.__pooled) return;
    obj.active = false;
    this.pool.push(obj);
  }

  /** 批量归还数组中 active=false 的对象 */
  sweep(arr) {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (!arr[i].active) {
        this.release(arr[i]);
        // 与末尾交换后pop（性能好，顺序无关）
        const tmp = arr[i];
        arr[i] = arr[arr.length - 1];
        arr[arr.length - 1] = tmp;
        arr.pop();
      }
    }
  }

  /** 当前池中空闲对象数 */
  get freeSize() { return this.pool.length; }
}

export default ObjectPool;
