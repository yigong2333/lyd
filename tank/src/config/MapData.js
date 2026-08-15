// ============================================================
//  MapData.js - 关卡地图数据 + "浩源""浪尖儿"地板涂鸦
// ============================================================
//
//  格子类型字符映射:
//    . = 空地    B = 砖墙    S = 钢墙
//    G = 草丛    W = 水路    I = 冰面
//    E = 基地    P = 玩家出生(空地)
// ============================================================

import { TileType, GRID_W, GRID_H } from './Colors.js';

const CHAR_MAP = {
  '.': TileType.EMPTY,
  'B': TileType.BRICK,
  'S': TileType.STEEL,
  'G': TileType.GRASS,
  'W': TileType.WATER,
  'I': TileType.ICE,
  'E': TileType.BASE,
  'P': TileType.EMPTY,
};

const isTextChar = (ch) => false; // 文字不再作为砖墙

// ========== "浩源""浪尖儿" 地板涂鸦数据 ==========
// 直接用中文文字渲染，清晰可读
export const GRAFFITI_TEXTS = [
  { text: '浩源',   col: 3,  row: 7, color: '#00f0ff' },
  { text: '浪尖儿', col: 13, row: 7, color: '#ff00d4' },
];

// ========== 关卡定义 ==========

function makeLevel1() {
  let grid = [
    '..........................',
    '..SSSS....SSSS....SSSS....',
    '..S..S....S..S....S..S....',
    '..S..S....S..S....S..S....',
    '..SSSS....SSSS....SSSS....',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........BBEEBB..........',
    '..........................',
    '..........................',
    '...SS....BBBBBB....SS.....',
    '...SS....BBBBBB....SS.....',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '............PP............',
    '..........................',
  ];
  return grid;
}

function makeLevel2() {
  let grid = [
    '..........................',
    '.SSSSS....SSSSS....SSSSS..',
    '.S...S....S...S....S...S..',
    '.S...S....S...S....S...S..',
    '.SSSSS....SSSSS....SSSSS..',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    'WWWWWW..........WWWWWW....',
    'WWWWWW...BBEEBB.WWWWWW....',
    'WWWWWW..........WWWWWW....',
    '..........................',
    '...GGG....BBBBBB....GGG...',
    '...GGG....BBBBBB....GGG...',
    '...GGG..............GGG...',
    '..........................',
    '..........................',
    '..........................',
    '............PP............',
    '..........................',
  ];
  return grid;
}

function makeLevel3() {
  let grid = [
    '..........................',
    '..SSSS....SSSS....SSSS....',
    '..S..S....S..S....S..S....',
    '..S..S....S..S....S..S....',
    '..SSSS....SSSS....SSSS....',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    'GGGGGG............GGGGGG..',
    'GGGGGG............GGGGGG..',
    '..........................',
    '..........................',
    '..........BBEEBB..........',
    '..........................',
    '..........................',
    '...II....BBBBBB....II.....',
    '...II....BBBBBB....II.....',
    '..........................',
    'WWWW..........WWWW........',
    'WWWW..........WWWW........',
    '..........................',
    '..........................',
    '............PP............',
    '..........................',
  ];
  return grid;
}

function makeLevel4() {
  let grid = [
    '..........................',
    '.SSSSSSSSSSSSSSSSSSSSSSSS.',
    '.S........................',
    '.S........................',
    '.S....SSSS....SSSS....SSS.',
    '......S..S....S..S....S...',
    '......S..S....S..S....S...',
    '......SSSS....SSSS....SSS.',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........BBEEBB..........',
    '..........................',
    '..........................',
    '.SSS....BBBBBBBB....SSS...',
    '.SSS....BBBBBBBB....SSS...',
    '..........................',
    'GGGGGGG..........GGGGGGG..',
    'GGGGGGG..........GGGGGGG..',
    '..........................',
    '..........................',
    '............PP............',
    '..........................',
  ];
  return grid;
}

function makeLevel5() {
  let grid = [
    '..........................',
    '.SSSSSSSSSSSSSSSSSSSSSSSS.',
    '.S........................',
    '.S.SSSS....SSSS....SSSS.S.',
    '.S.S..S....S..S....S..S.S.',
    '.S.S..S....S..S....S..S.S.',
    '.S.SSSS....SSSS....SSSS.S.',
    '.S........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........BBEEBB..........',
    '..........................',
    '..........................',
    'SSSSS....BBBBBBBB....SSSSS',
    'SSSSS....BBBBBBBB....SSSSS',
    '..........................',
    'WWWWWWW..........WWWWWWW..',
    'WWWWWWW..........WWWWWWW..',
    'GGGGGGG..........GGGGGGG..',
    '..........................',
    '............PP............',
    '..........................',
  ];
  return grid;
}

export const Levels = [
  {
    id: 1,
    name: '校园 · 操场',
    grid: makeLevel1(),
    enemySpawns: [{ x: 1, y: 0 }, { x: 12, y: 0 }, { x: 24, y: 0 }],
    playerSpawn: { x: 12, y: 24 },
    waves: [
      { count: 4, types: ['scout', 'scout', 'scout', 'scout'], interval: 3000 },
      { count: 4, types: ['striker', 'suicide', 'heavy', 'striker'], interval: 2500 },
      { count: 2, types: ['boss', 'striker'], interval: 4000 },
    ],
  },
  {
    id: 2,
    name: '校园 · 教学楼',
    grid: makeLevel2(),
    enemySpawns: [{ x: 1, y: 0 }, { x: 12, y: 0 }, { x: 24, y: 0 }],
    playerSpawn: { x: 12, y: 24 },
    waves: [
      { count: 4, types: ['scout', 'striker', 'scout', 'striker'], interval: 2800 },
      { count: 4, types: ['striker', 'heavy', 'suicide', 'striker'], interval: 2400 },
      { count: 2, types: ['boss', 'heavy'], interval: 4000 },
    ],
  },
  {
    id: 3,
    name: '校园 · 体育馆',
    grid: makeLevel3(),
    enemySpawns: [{ x: 1, y: 0 }, { x: 12, y: 0 }, { x: 24, y: 0 }],
    playerSpawn: { x: 12, y: 24 },
    waves: [
      { count: 4, types: ['striker', 'sniper', 'scout', 'striker'], interval: 2600 },
      { count: 4, types: ['heavy', 'sniper', 'striker', 'heavy'], interval: 2200 },
      { count: 2, types: ['boss', 'sniper', 'golden'], interval: 4000 },
    ],
  },
  {
    id: 4,
    name: '校园 · 图书馆',
    grid: makeLevel4(),
    enemySpawns: [{ x: 1, y: 0 }, { x: 12, y: 0 }, { x: 24, y: 0 }],
    playerSpawn: { x: 12, y: 24 },
    waves: [
      { count: 5, types: ['striker', 'heavy', 'sniper', 'striker', 'heavy'], interval: 2400 },
      { count: 5, types: ['sniper', 'suicide', 'heavy', 'sniper', 'suicide'], interval: 2000 },
      { count: 2, types: ['boss', 'heavy'], interval: 4000 },
    ],
  },
  {
    id: 5,
    name: '校园 · 天台',
    grid: makeLevel5(),
    enemySpawns: [{ x: 1, y: 0 }, { x: 12, y: 0 }, { x: 24, y: 0 }],
    playerSpawn: { x: 12, y: 24 },
    waves: [
      { count: 5, types: ['sniper', 'striker', 'heavy', 'suicide', 'golden'], interval: 2000 },
      { count: 5, types: ['heavy', 'suicide', 'striker', 'heavy', 'golden'], interval: 1800 },
      { count: 2, types: ['boss', 'boss'], interval: 4000 },
    ],
  },
];

export function parseGrid(gridStr) {
  const tiles = [];
  const textFlags = [];
  for (let r = 0; r < gridStr.length; r++) {
    const row = [];
    const textRow = [];
    for (let c = 0; c < gridStr[r].length; c++) {
      const ch = gridStr[r][c];
      row.push(CHAR_MAP[ch] !== undefined ? CHAR_MAP[ch] : TileType.EMPTY);
      textRow.push(isTextChar(ch));
    }
    tiles.push(row);
    textFlags.push(textRow);
  }
  return { tiles, textFlags };
}

export function generateEndlessMap(seed, wave) {
  let grid = [];
  for (let r = 0; r < GRID_H; r++) {
    let row = '';
    for (let c = 0; c < GRID_W; c++) row += '.';
    grid.push(row);
  }
  const rng = (() => {
    let s = seed + wave * 7919;
    return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  })();
  for (let i = 0; i < 4 + wave; i++) {
    const cx = 2 + Math.floor(rng() * (GRID_W - 4));
    const cy = 4 + Math.floor(rng() * 8);
    grid[cy] = setChar(grid[cy], cx, 'S');
    grid[cy] = setChar(grid[cy], cx + 1, 'S');
  }
  for (let i = 0; i < 8 + wave * 2; i++) {
    const cx = 1 + Math.floor(rng() * (GRID_W - 2));
    const cy = 5 + Math.floor(rng() * 14);
    if (grid[cy][cx] === '.') grid[cy] = setChar(grid[cy], cx, 'B');
  }
  for (let i = 0; i < 3; i++) {
    const cx = 2 + Math.floor(rng() * (GRID_W - 4));
    const cy = 18 + Math.floor(rng() * 4);
    grid[cy] = setChar(grid[cy], cx, 'G');
    grid[cy] = setChar(grid[cy], cx + 1, 'G');
  }
  grid[15] = setChar(grid[15], 10, 'B');
  grid[15] = setChar(grid[15], 11, 'E');
  grid[15] = setChar(grid[15], 12, 'E');
  grid[15] = setChar(grid[15], 13, 'B');
  grid[24] = setChar(grid[24], 12, 'P');
  grid[24] = setChar(grid[24], 13, 'P');
  return grid;
}

function setChar(str, idx, ch) {
  return str.substring(0, idx) + ch + str.substring(idx + 1);
}

export { GRID_W, GRID_H };
