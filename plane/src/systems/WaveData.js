// ============================================================
//  WaveData.js + 关卡数据 Stage1/2/3 + 无尽模式配置
//  用时间轴声明式写法，便于数值调整
// ============================================================

import { TAU } from '../core/Utils.js';

/**
 * 波次事件类型：
 *   {t, type: 'spawn', key, x, y, opts}            生成1个敌人
 *   {t, type: 'formation', key, n, pattern, ...}  生成编队
 *   {t, type: 'elite'}                            精英出场
 *   {t, type: 'boss', bossId}                     Boss出场
 *   {t, type: 'drop', pickup, x, y}               手动投放道具
 *   {t, type: 'bg', msg}                          背景提示/剧情字幕
 */

export const Stage1 = {
  id: 1,
  name: 'STAGE 1 · 小行星带',
  duration: 80000,  // 80秒 + Boss战
  bgTheme: 'asteroid',
  enemyHpMul: 1.0,
  enemyBulletMul: 1.0,
  events: [
    // 预热
    { t: 1000, type: 'bg', msg: '任务区域：小行星带 · 清剿侦察编队' },
    // 第一波 V型编队
    { t: 4000, type: 'formation', key: 'drone', n: 8, pattern: 'V', y: -40, spacing: 34 },
    // 穿插S型
    { t: 10000, type: 'formation', key: 'drone_wave', n: 6, pattern: 'LINE', y: -30, x: 80, spacingY: 60 },
    { t: 10000, type: 'formation', key: 'drone_wave', n: 6, pattern: 'LINE', y: -30, side: 'right', xOffset: -80, spacingY: 60 },
    // 投道具P
    { t: 15000, type: 'drop', pickup: 'P', x: 0.5, y: -20 },
    // 中型机突击
    { t: 17000, type: 'spawn', key: 'striker', x: 0.35, y: -20 },
    { t: 17500, type: 'spawn', key: 'striker', x: 0.65, y: -20 },
    // 自杀式神风
    { t: 23000, type: 'formation', key: 'kamikaze', n: 5, pattern: 'SCATTER_TOP', y: -40 },
    // 第二波V型 + 精英
    { t: 28000, type: 'formation', key: 'drone', n: 12, pattern: 'DOUBLE_V', y: -40 },
    { t: 30000, type: 'drop', pickup: 'B', x: 0.5, y: -20 },
    { t: 32000, type: 'elite', x: 0.5, y: -40 },
    // 轰炸编队
    { t: 40000, type: 'spawn', key: 'bomber', x: 0.2, y: -20 },
    { t: 41000, type: 'spawn', key: 'bomber', x: 0.8, y: -20 },
    { t: 42000, type: 'formation', key: 'drone_wave', n: 8, pattern: 'HORIZONTAL_SINE', y: -20 },
    { t: 46000, type: 'drop', pickup: 'HP', x: 0.3, y: -20 },
    { t: 46000, type: 'drop', pickup: 'P',  x: 0.7, y: -20 },
    // 精英 + 中型机混合
    { t: 50000, type: 'spawn', key: 'striker', x: 0.2, y: -20 },
    { t: 50500, type: 'spawn', key: 'striker', x: 0.4, y: -20 },
    { t: 51000, type: 'spawn', key: 'striker', x: 0.6, y: -20 },
    { t: 51500, type: 'spawn', key: 'striker', x: 0.8, y: -20 },
    { t: 57000, type: 'elite', x: 0.3, y: -30 },
    { t: 57500, type: 'elite', x: 0.7, y: -30 },
    // 神风冲击
    { t: 63000, type: 'formation', key: 'kamikaze', n: 10, pattern: 'RUSH', y: -40 },
    // 补给
    { t: 67000, type: 'drop', pickup: 'HP', x: 0.25, y: -20 },
    { t: 67000, type: 'drop', pickup: 'B',  x: 0.5, y: -20 },
    { t: 67000, type: 'drop', pickup: 'E',  x: 0.75, y: -20 },
    // Boss 警告
    { t: 72000, type: 'boss', bossId: 'crab' },
  ]
};

export const Stage2 = {
  id: 2,
  name: 'STAGE 2 · 量子风暴区',
  duration: 95000,
  bgTheme: 'quantum',
  enemyHpMul: 1.5,
  enemyBulletMul: 1.15,
  events: [
    { t: 500,  type: 'bg', msg: '进入量子风暴区 · 注意电磁干扰' },
    // 开场密集S型
    { t: 3000, type: 'formation', key: 'drone_wave', n: 10, pattern: 'WAVE_BOTH', y: -30 },
    { t: 9000, type: 'spawn', key: 'striker', x: 0.2, y: -20 },
    { t: 9000, type: 'spawn', key: 'striker', x: 0.8, y: -20 },
    { t: 10000, type: 'formation', key: 'drone', n: 8, pattern: 'V', side: 'left', y: -40 },
    { t: 10000, type: 'formation', key: 'drone', n: 8, pattern: 'V', side: 'right', y: -40 },
    { t: 16000, type: 'drop', pickup: 'P', x: 0.3, y: -20 },
    { t: 16000, type: 'drop', pickup: 'P', x: 0.7, y: -20 },
    // 轰炸
    { t: 20000, type: 'spawn', key: 'bomber', x: 0.2, y: -20 },
    { t: 21000, type: 'spawn', key: 'bomber', x: 0.5, y: -20 },
    { t: 22000, type: 'spawn', key: 'bomber', x: 0.8, y: -20 },
    { t: 27000, type: 'formation', key: 'kamikaze', n: 8, pattern: 'SCATTER_TOP', y: -40 },
    // 精英出场
    { t: 32000, type: 'elite', x: 0.3, y: -30 },
    { t: 32500, type: 'elite', x: 0.7, y: -30 },
    { t: 38000, type: 'drop', pickup: 'HP', x: 0.5, y: -20 },
    { t: 38000, type: 'drop', pickup: 'B', x: 0.25, y: -20 },
    { t: 38000, type: 'drop', pickup: 'E', x: 0.75, y: -20 },
    // 中型机弹幕齐射
    { t: 43000, type: 'formation', key: 'striker', n: 4, pattern: 'LINE_H', y: -20 },
    { t: 48000, type: 'formation', key: 'drone_wave', n: 10, pattern: 'HORIZONTAL_SINE', y: -30 },
    { t: 48000, type: 'formation', key: 'drone_wave', n: 10, pattern: 'HORIZONTAL_SINE', y: -80, delay: 1500 },
    { t: 55000, type: 'elite', x: 0.5, y: -40 },
    { t: 55000, type: 'spawn', key: 'kamikaze', x: 0.1, y: -20 },
    { t: 55300, type: 'spawn', key: 'kamikaze', x: 0.9, y: -20 },
    { t: 55600, type: 'spawn', key: 'kamikaze', x: 0.2, y: -20 },
    { t: 55900, type: 'spawn', key: 'kamikaze', x: 0.8, y: -20 },
    { t: 62000, type: 'formation', key: 'drone', n: 16, pattern: 'DOUBLE_V', y: -40 },
    { t: 68000, type: 'elite', x: 0.25, y: -30 },
    { t: 68200, type: 'elite', x: 0.5, y: -40 },
    { t: 68400, type: 'elite', x: 0.75, y: -30 },
    // 补给
    { t: 76000, type: 'drop', pickup: 'P',  x: 0.3, y: -20 },
    { t: 76000, type: 'drop', pickup: 'HP', x: 0.5, y: -20 },
    { t: 76000, type: 'drop', pickup: 'P',  x: 0.7, y: -20 },
    // 最终神风
    { t: 82000, type: 'formation', key: 'kamikaze', n: 14, pattern: 'RUSH', y: -40 },
    { t: 89000, type: 'boss', bossId: 'carrier' },
  ]
};

export const Stage3 = {
  id: 3,
  name: 'STAGE 3 · 深空核心',
  duration: 110000,
  bgTheme: 'abyss',
  enemyHpMul: 2.2,
  enemyBulletMul: 1.3,
  events: [
    { t: 500,  type: 'bg', msg: '抵达深空核心 · 深渊吞噬者就在前方' },
    // 开场混合编队
    { t: 3000, type: 'formation', key: 'drone_wave', n: 8, pattern: 'WAVE_BOTH', y: -30 },
    { t: 3000, type: 'formation', key: 'kamikaze', n: 4, pattern: 'SCATTER_TOP', y: -40 },
    { t: 8000, type: 'spawn', key: 'striker', x: 0.15, y: -20 },
    { t: 8200, type: 'spawn', key: 'striker', x: 0.35, y: -20 },
    { t: 8400, type: 'spawn', key: 'striker', x: 0.5, y: -20 },
    { t: 8600, type: 'spawn', key: 'striker', x: 0.65, y: -20 },
    { t: 8800, type: 'spawn', key: 'striker', x: 0.85, y: -20 },
    { t: 14000, type: 'bomber', x: 0.5, y: -20 },
    { t: 14000, type: 'elite',  x: 0.2, y: -30 },
    { t: 14000, type: 'elite',  x: 0.8, y: -30 },
    { t: 21000, type: 'formation', key: 'drone', n: 20, pattern: 'DOUBLE_V', y: -40 },
    { t: 26000, type: 'drop', pickup: 'P', x: 0.25, y: -20 },
    { t: 26000, type: 'drop', pickup: 'B', x: 0.5, y: -20 },
    { t: 26000, type: 'drop', pickup: 'P', x: 0.75, y: -20 },
    // 轰炸群
    { t: 31000, type: 'spawn', key: 'bomber', x: 0.15, y: -20 },
    { t: 31500, type: 'spawn', key: 'bomber', x: 0.35, y: -20 },
    { t: 32000, type: 'spawn', key: 'bomber', x: 0.65, y: -20 },
    { t: 32500, type: 'spawn', key: 'bomber', x: 0.85, y: -20 },
    { t: 38000, type: 'formation', key: 'kamikaze', n: 16, pattern: 'RUSH', y: -40 },
    // 精英三重
    { t: 44000, type: 'elite', x: 0.2, y: -30 },
    { t: 44500, type: 'elite', x: 0.5, y: -35 },
    { t: 45000, type: 'elite', x: 0.8, y: -30 },
    { t: 51000, type: 'drop', pickup: 'HP', x: 0.2, y: -20 },
    { t: 51000, type: 'drop', pickup: 'B',  x: 0.4, y: -20 },
    { t: 51000, type: 'drop', pickup: 'E',  x: 0.6, y: -20 },
    { t: 51000, type: 'drop', pickup: 'P',  x: 0.8, y: -20 },
    // 神风
    { t: 56000, type: 'formation', key: 'kamikaze', n: 10, pattern: 'SCATTER_TOP', y: -40 },
    { t: 56500, type: 'formation', key: 'drone_wave', n: 10, pattern: 'WAVE_BOTH', y: -30 },
    { t: 63000, type: 'formation', key: 'striker', n: 5, pattern: 'LINE_H', y: -20 },
    // 精英群
    { t: 69000, type: 'elite', x: 0.15, y: -30 },
    { t: 69300, type: 'elite', x: 0.35, y: -35 },
    { t: 69600, type: 'elite', x: 0.5, y: -40 },
    { t: 69900, type: 'elite', x: 0.65, y: -35 },
    { t: 70200, type: 'elite', x: 0.85, y: -30 },
    { t: 78000, type: 'formation', key: 'bomber', n: 3, pattern: 'LINE_H', y: -30 },
    { t: 84000, type: 'drop', pickup: 'HP', x: 0.3, y: -20 },
    { t: 84000, type: 'drop', pickup: 'B',  x: 0.5, y: -20 },
    { t: 84000, type: 'drop', pickup: 'P',  x: 0.7, y: -20 },
    // 最后一波冲锋
    { t: 90000, type: 'formation', key: 'drone', n: 16, pattern: 'DOUBLE_V', y: -40 },
    { t: 95000, type: 'formation', key: 'kamikaze', n: 20, pattern: 'RUSH', y: -40 },
    { t: 102000, type: 'boss', bossId: 'abyss' },
  ]
};

/** 无尽模式：循环波次模板 */
export const EndlessTemplates = [
  // 每关循环：交替使用各种编队 + 精英 + 轰炸
  { after: 20000, minions: [
      {t: 2000, type:'formation', key:'drone', n:8, pattern:'V', y:-40},
      {t: 9000, type:'formation', key:'drone_wave', n:6, pattern:'WAVE_BOTH', y:-30},
      {t: 16000, type:'spawn', key:'striker', x:0.35, y:-20},
  ]},
];

export default { Stage1, Stage2, Stage3 };
