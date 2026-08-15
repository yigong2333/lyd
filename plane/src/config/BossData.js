// ============================================================
//  BossData.js - Boss各阶段配置
//  每个Boss 3个Phase，每个Phase有独立AI与弹幕模式
// ============================================================

import { TAU } from '../core/Utils.js';

export const BossData = {
  crab: {
    id: 'crab',
    name: '机械巨蟹 MECHA-CRAB',
    stageId: 1,
    maxHp: 2200,
    radius: 72,
    colorBody: '#cc2244',
    colorAccent: '#ff4466',
    phases: [
      {
        // P1: 66%~100%
        hpRange: [0.66, 1.0],
        spellCard: '「双钳夹击」',
        timers: { fan: 1200, claw: 2000 },
        moves: 'sway',      // 左右摇摆
        moveSpeed: 1.2,
      },
      {
        // P2: 33%~66%
        hpRange: [0.33, 0.66],
        spellCard: '「浮游方阵·炮」',
        summon: { count: 4, type: 'minion', cd: 8000 },
        timers: { circle: 1400, fan: 900 },
        moves: 'sway',
        moveSpeed: 1.6,
      },
      {
        // P3: 0~33%
        hpRange: [0, 0.33],
        spellCard: '「激光十字·终焉」',
        timers: { spiral: 500, laser: 2600, aimed: 1400 },
        moves: 'chase',
        moveSpeed: 2.2,
      },
    ],
  },

  carrier: {
    id: 'carrier',
    name: '量子母舰 QUANTUM CARRIER',
    stageId: 2,
    maxHp: 4600,
    radius: 96,
    colorBody: '#2244aa',
    colorAccent: '#00ddff',
    phases: [
      { hpRange: [0.66, 1.0], spellCard: '「双舷齐射·导弹风暴」',
        timers: { missile: 1300, fan: 1000 }, moves: 'sway', moveSpeed: 0.8 },
      { hpRange: [0.33, 0.66], spellCard: '「载具展开·群狼战术」',
        summon: { count: 6, type: 'drone_wave', cd: 7000 },
        timers: { ring: 1800, striker: 1500 }, moves: 'hover', moveSpeed: 0 },
      { hpRange: [0, 0.33], spellCard: '「量子核心·回旋湮灭」',
        timers: { tripleSpiral: 450, teleport: 3500, aimedBurst: 1100 }, moves: 'teleport', moveSpeed: 1.2 },
    ],
  },

  abyss: {
    id: 'abyss',
    name: '深渊吞噬者 ABYSSAL DEVOURER',
    stageId: 3,
    maxHp: 9500,
    radius: 100,
    colorBody: '#440066',
    colorAccent: '#ff00dd',
    phases: [
      { hpRange: [0.66, 1.0], spellCard: '「蛇形轨道·狙杀」',
        timers: { aimedBarrage: 420, circle: 1500 }, moves: 'snake', moveSpeed: 2.4 },
      { hpRange: [0.33, 0.66], spellCard: '「虚空巨口·扇形地狱」',
        timers: { megaFan: 650, wall: 2500, random: 1200 }, moves: 'sway', moveSpeed: 1.8 },
      { hpRange: [0, 0.33], spellCard: '「深空湮灭·终焉」',
        summon: { count: 2, type: 'elite', cd: 12000 },
        timers: { hell: 180, blackHole: 6000, lasers: 1800 }, moves: 'chase', moveSpeed: 2.8 },
    ],
  }
};

export default BossData;
