// ============================================================
//  EnemyData.js - 敌机数据表
// ============================================================

export const EnemyData = {
  drone: {      // 小型侦察机
    type: 'drone', hp: 3, speed: 2.6, radius: 14,
    score: 100, damage: 8, dropP: 0.08, dropGold: 0.3,
    color: 'drone',
    fireCD: 0, // 不开火
    behavior: 'dive', // 行为模式
  },
  drone_wave: {
    type: 'drone', hp: 2, speed: 3.2, radius: 12,
    score: 80, damage: 6, dropP: 0.04, dropGold: 0.2,
    color: 'drone', fireCD: 0, behavior: 'sine', // S型走位
  },
  striker: {    // 中型突击者
    type: 'striker', hp: 14, speed: 1.4, radius: 20,
    score: 300, damage: 12, dropP: 0.35, dropHp: 0.1, dropGold: 0.8,
    color: 'striker',
    fireCD: 1400, bulletType: 'fan5', bulletSpeed: 3.2,
    behavior: 'stop_fire',
  },
  elite: {      // 精英机
    type: 'elite', hp: 60, speed: 1.0, radius: 28,
    score: 1200, damage: 18, dropP: 1, dropRandom: 1,
    color: 'elite',
    fireCD: 900, bulletType: 'spiral_circle', bulletSpeed: 2.6,
    behavior: 'pattern',
    healthBar: true,
  },
  bomber: {     // 轰炸机
    type: 'bomber', hp: 45, speed: 0.7, radius: 32,
    score: 700, damage: 22, dropHp: 0.7, dropGold: 1,
    color: 'bomber',
    fireCD: 2200, bulletType: 'big_slow', bulletSpeed: 1.6,
    behavior: 'straight', healthBar: true,
  },
  kamikaze: {   // 自杀式
    type: 'kamikaze', hp: 5, speed: 5.5, radius: 13,
    score: 150, damage: 25, dropEnergy: 0.15,
    color: 'kamikaze', fireCD: 0,
    behavior: 'aimed', // 朝玩家追踪
  },

  golden: {     // 金色财宝机（随机乱入，掉金币雨）
    type: 'golden', hp: 6, speed: 3.4, radius: 16,
    score: 1500, damage: 10, dropGold: 5, dropBomb: 0.3,
    color: 'golden', fireCD: 0,
    behavior: 'sine', // S型走位
  },
  splitter: {   // 分裂者（击毁分裂成2个小机）
    type: 'splitter', hp: 20, speed: 1.5, radius: 20,
    score: 400, damage: 10, dropP: 0.35,
    color: 'splitter',
    fireCD: 1500, bulletType: 'aimed', bulletSpeed: 2.6,
    behavior: 'pattern', healthBar: true,
  },

  // Boss召唤的护卫
  minion: {
    type: 'drone', hp: 6, speed: 3, radius: 13,
    score: 120, damage: 10, dropP: 0.1,
    color: 'elite', fireCD: 1800, bulletType: 'aimed', bulletSpeed: 3,
    behavior: 'orbit',
  }
};

export default EnemyData;
