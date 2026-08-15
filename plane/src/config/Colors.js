// ============================================================
//  Colors.js - 科技霓虹风格颜色常量配置
//  供所有实体/渲染/UI统一使用，保持风格一致
// ============================================================

export const Colors = {
  // ---------- 背景色 ----------
  BG_DEEP:   '#050018',
  BG_LAYER1: '#0a0a2e',
  BG_LAYER2: '#120a3c',

  // ---------- 霓虹主色 ----------
  NEON_CYAN:   '#00f0ff',
  NEON_PINK:   '#ff00d4',
  NEON_PURPLE: '#a200ff',
  NEON_YELLOW: '#fff200',
  NEON_GREEN:  '#00ff88',
  NEON_RED:    '#ff3366',
  WHITE:       '#ffffff',

  // ---------- 玩家战机 ----------
  PLAYER: {
    FALCON_BODY:   '#00f0ff',   // 猎鹰 - 青
    FALCON_COCK:   '#ffffff',
    THUNDER_BODY:  '#fff200',   // 雷霆 - 黄
    THUNDER_COCK:  '#ff3366',
    PHANTOM_BODY:  '#a200ff',   // 幻影 - 紫
    PHANTOM_COCK:  '#00f0ff',
    TRAIL_1:       '#00f0ff',   // 尾焰渐变 外层
    TRAIL_2:       '#4488ff',
    TRAIL_3:       '#a200ff',   // 尾焰渐变 内层
  },

  // ---------- 子弹 ----------
  BULLET: {
    PLAYER:        '#eaffff',   // 玩家弹芯
    PLAYER_GLOW:   '#00f0ff',
    PLAYER_MAX:    '#fff200',   // Lv8金色穿透
    PLAYER_CHARGED:'#ffffff',   // 蓄力弹芯
    PLAYER_CHG_GLOW:'#fff200',

    ENEMY_NORMAL:  '#ff00d4',   // 敌方普通
    ENEMY_AIMED:   '#ff3366',   // 自机狙 红
    ENEMY_BIG:     '#ff8800',   // 大弹 橙
    ENEMY_LASER:   '#ff0066',   // 激光
    ENEMY_PURPLE:  '#a200ff',   // 紫色弹幕
    ENEMY_CYAN:    '#00f0ff',
    ENEMY_YELLOW:  '#fff200',
  },

  // ---------- 敌机 ----------
  ENEMY: {
    DRONE:     '#ff5588',   // 小型 - 粉红
    STRIKER:   '#ff8844',   // 中型 - 橙
    ELITE:     '#aa00ff',   // 精英 - 紫
    BOMBER:    '#44aaff',   // 轰炸 - 蓝
    KAMIKAZE:  '#ff3366',   // 自杀 - 红
    GOLDEN:    '#ffd700',   // 财宝 - 金
    SPLITTER:  '#ffaa00',   // 分裂者 - 橙金
  },

  // ---------- 道具 ----------
  PICKUP: {
    POWER:  '#ff3366',  // P - 红
    GOLD:   '#fff200',  // $ - 黄
    HP:     '#00ff88',  // HP - 绿
    BOMB:   '#ff4488',  // B - 粉
    ENERGY: '#a200ff',  // E - 紫
    WIPE:   '#00ffff',  // S - 青
    TIME:   '#88ffff',  // T - 淡青
    TIMESLOW:'#88ffff', // T - 淡青（兼容别名）
  },

  // ---------- 粒子/特效 ----------
  FX: {
    EXPLOSION_IN:  '#fff200',
    EXPLOSION_MID: '#ff8800',
    EXPLOSION_OUT: '#ff3366',
    SHOCKWAVE:     'rgba(0, 240, 255, 0.5)',
    BOMB:          'rgba(255, 242, 0, 0.6)',
    GRAZE:         '#00f0ff',
    CHARGED_HIT:   '#fff200',
    DASH:          '#a200ff',
  },

  // ---------- Boss ----------
  BOSS: {
    CRAB_BODY:   '#cc2244',   // 机械巨蟹 - 红
    CRAB_ACCENT: '#ff4466',
    CARRIER_BODY:'#2244aa',   // 量子母舰 - 蓝
    CARRIER_QUANTUM:'#00ddff',
    ABYSS_BODY:  '#440066',   // 深渊吞噬者 - 紫黑
    ABYSS_GLOW:  '#ff00dd',
  }
};

export default Colors;
