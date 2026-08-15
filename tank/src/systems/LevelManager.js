// ============================================================
//  LevelManager.js - 关卡/地图管理
// ============================================================
//
//  解析 grid -> 格子类型数组 + 墙壁实体 + 基地位置
//  管理"浩源""浪尖儿"字形砖墙的渲染标记
// ============================================================

import { Levels, parseGrid, generateEndlessMap } from '../config/MapData.js';
import { TileType, TILE_SIZE, GRID_W, GRID_H } from '../config/Colors.js';
import { Wall } from '../entities/Wall.js';

// 墙壁快速查询表（按格子坐标）
export class WallMap {
  constructor() {
    this._map = new Map();
  }
  _key(x, y) { return y * GRID_W + x; }
  set(x, y, wall) { this._map.set(this._key(x, y), wall); }
  get(x, y) { return this._map.get(this._key(x, y)); }
  has(x, y) { return this._map.has(this._key(x, y)); }
  delete(x, y) { this._map.delete(this._key(x, y)); }
  clear() { this._map.clear(); }
  [Symbol.iterator]() { return this._map.values(); }
  get count() { return this._map.size; }
}

export class LevelManager {
  constructor(game) {
    this.game = game;
    this.currentLevel = null;
    this.levelIndex = 0;
    this.tiles = [];        // TileType[][]
    this.textFlags = [];    // 字形标记
    this.walls = new WallMap();
    this.base = null;       // {x,y,w,h,gridX,gridY,hp,alive}
    this.playerSpawn = { x: 12, y: 24 };
    this.enemySpawns = [];
  }

  loadLevel(index) {
    this.levelIndex = index;
    const level = Levels[index];
    this.currentLevel = level;
    this._build(level.grid);
    this.playerSpawn = level.playerSpawn;
    this.enemySpawns = level.enemySpawns;
    this.game.spawn.loadWaves(level.waves);
  }

  loadEndless(seed) {
    const grid = generateEndlessMap(seed, 1);
    this._build(grid);
    this.playerSpawn = { x: 12, y: 24 };
    this.enemySpawns = [{ x: 1, y: 0 }, { x: 12, y: 0 }, { x: 24, y: 0 }];
    this.game.spawn.startEndless();
  }

  _build(gridStr) {
    this.walls.clear();
    const { tiles, textFlags } = parseGrid(gridStr);
    this.tiles = tiles;
    this.textFlags = textFlags;
    this.base = null;

    for (let r = 0; r < tiles.length; r++) {
      for (let c = 0; c < tiles[r].length; c++) {
        const t = tiles[r][c];
        if (t === TileType.BRICK || t === TileType.STEEL) {
          const w = new Wall(c, r, t, textFlags[r][c]);
          this.walls.set(c, r, w);
        } else if (t === TileType.BASE) {
          // 基地：合并相邻 BASE 格
          if (!this.base) {
            this.base = {
              gridX: c, gridY: r,
              x: c * TILE_SIZE, y: r * TILE_SIZE,
              w: TILE_SIZE, h: TILE_SIZE,
              hp: 1, alive: true, danger: 0,
            };
          } else {
            // 扩展基地范围
            this.base.w = (c - this.base.gridX + 1) * TILE_SIZE;
            this.base.h = Math.max(this.base.h, (r - this.base.gridY + 1) * TILE_SIZE);
          }
        }
      }
    }
  }

  // 格子类型查询
  getTile(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= GRID_W || gy >= GRID_H) return TileType.STEEL; // 边界当钢墙
    return this.tiles[gy] ? this.tiles[gy][gx] : TileType.EMPTY;
  }

  // 坦克能否占据某格子（不含墙壁，墙壁单独查）
  tileBlocksTank(gx, gy) {
    const t = this.getTile(gx, gy);
    return t === TileType.STEEL || t === TileType.WATER || t === TileType.BASE;
  }

  // 重建砖墙（基地加固道具）
  fortifyBase() {
    if (!this.base) return;
    const bx = this.base.gridX, by = this.base.gridY;
    // 基地周围一圈变钢墙
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const gx = bx + dx, gy = by + dy;
        const t = this.getTile(gx, gy);
        if (t === TileType.BRICK) {
          const w = new Wall(gx, gy, TileType.STEEL, false);
          this.walls.set(gx, gy, w);
          this.tiles[gy][gx] = TileType.STEEL;
        }
      }
    }
    this._fortifyTimer = 10000;
  }

  update(dt) {
    if (this._fortifyTimer > 0) {
      this._fortifyTimer -= dt;
      if (this._fortifyTimer <= 0) {
        // 恢复为砖墙
        if (this.base) {
          const bx = this.base.gridX, by = this.base.gridY;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const gx = bx + dx, gy = by + dy;
              if (this.walls.has(gx, gy) && this.walls.get(gx, gy).type === TileType.STEEL) {
                const w = new Wall(gx, gy, TileType.BRICK, false);
                this.walls.set(gx, gy, w);
                this.tiles[gy][gx] = TileType.BRICK;
              }
            }
          }
        }
      }
    }
    // 清理死亡墙壁
    for (const w of this.walls) {
      if (!w.alive) {
        this.walls.delete(w.gridX, w.gridY);
        this.tiles[w.gridY][w.gridX] = TileType.EMPTY;
      }
    }
  }

  get levelCount() { return Levels.length; }
  get levelName() { return this.currentLevel ? this.currentLevel.name : ''; }
}
