// ============================================================
//  Colors.js - 校园霓虹配色常量
// ============================================================

export const Colors = {
  BG_DARK:    '#0a1628',
  BG_GROUND:  '#1a2a3a',
  GRID_LINE:  'rgba(0, 240, 255, 0.08)',

  WALL: {
    BRICK:      '#d4782a',    // 砖墙暖橙
    BRICK_DARK: '#a05a1a',
    BRICK_GLOW: '#ff9a3a',
    STEEL:      '#6090c0',    // 钢墙金属蓝
    STEEL_DARK: '#3a6090',
    STEEL_GLOW: '#80b0e0',
  },
  TERRAIN: {
    GRASS:      '#2a8a3a',
    GRASS_DARK: '#1a6a2a',
    WATER:      '#1a6aaa',
    WATER_DARK: '#0a4a8a',
    ICE:        '#88ccff',
  },
  BASE:      '#ffaa00',
  BASE_GLOW: '#ffdd44',
  BASE_DANGER: '#ff3366',

  PLAYER: {
    SCHOLAR: '#00aaff',    // 学霸·蓝
    ATHLETE: '#ff8800',    // 体育生·橙
    ARTIST:  '#aa00ff',    // 文艺委员·紫
  },
  ENEMY: {
    SCOUT:   '#888888',    // 新生·灰
    STRIKER: '#ff4444',    // 突击兵·红
    HEAVY:   '#446644',    // 重装·深绿
    SNIPER:  '#ffdd00',    // 狙击手·黄
    BOSS:    '#ff00ff',    // Boss·品红
    SUICIDE: '#ff2200',    // 自爆兵·亮红
    GOLDEN:  '#ffd700',    // 金坦克·金
  },

  NEON_CYAN:   '#00f0ff',
  NEON_PINK:   '#ff00d4',
  NEON_YELLOW: '#fff200',
  NEON_GREEN:  '#00ff88',
  NEON_RED:    '#ff3366',
  NEON_PURPLE: '#a200ff',
  WHITE:       '#ffffff',

  BULLET: {
    PLAYER:      '#eaffff',
    PLAYER_GLOW: '#00f0ff',
    ENEMY:       '#ff8844',
    ENEMY_GLOW:  '#ff4400',
    HEAVY:       '#ffaa00',
    HEAVY_GLOW:  '#ff6600',
  },
  FX: {
    EXPLOSION_IN:  '#fff200',
    EXPLOSION_MID: '#ff8800',
    EXPLOSION_OUT: '#ff3366',
    SHOCKWAVE:     'rgba(0, 240, 255, 0.5)',
    SPARK:         '#ffdd00',
  },

  POWERUP: {
    STAR:    '#fff200',
    SPEED:   '#00ff88',
    SHIELD:  '#00f0ff',
    HEART:   '#ff3366',
    BOMB:    '#ff8800',
    FREEZE:  '#88ccff',
    BASE:    '#ffaa00',
    RANDOM:  '#ff00d4',
    AIRSTRIKE: '#ff4444',
    RAPID:   '#00ffcc',
  },
};

// 方向常量
export const DIR = {
  UP:    0,
  RIGHT: 1,
  DOWN:  2,
  LEFT:  3,
};

export const DIR_VEC = [
  { x:  0, y: -1 },  // UP
  { x:  1, y:  0 },  // RIGHT
  { x:  0, y:  1 },  // DOWN
  { x: -1, y:  0 },  // LEFT
];

// 格子类型
export const TileType = {
  EMPTY:  0,
  BRICK:  1,
  STEEL:  2,
  GRASS:  3,
  WATER:  4,
  BASE:   5,
  ICE:    6,
};

export const TILE_SIZE = 32;
export const GRID_W = 26;
export const GRID_H = 26;
