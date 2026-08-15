// ============================================================
//  EnemyAIData.js - 敌方AI配置
// ============================================================

export const AIConfig = {
  patrol: {
    thinkInterval: 800,
    shootChance: 0.1,
    preferDirections: null,
  },
  chase: {
    thinkInterval: 500,
    shootChance: 0.2,
    trackPlayer: true,
    trackBase: 0.3,
  },
  guard: {
    thinkInterval: 600,
    shootChance: 0.15,
    guardRadius: 5,
    chaseOnSight: true,
  },
  ambush: {
    thinkInterval: 400,
    shootChance: 0.5,
    hideInGrass: true,
    detectRange: 7,
    aimAhead: true,
  },
  suicide: {
    thinkInterval: 400,
    shootChance: 0,
    fuseRange: 2.5,
    speedBoost: 1.6,
  },
  boss: {
    thinkInterval: 300,
    shootChance: 0.4,
    phases: [
      { hpRange: [0.66, 1.0],  pattern: 'spread',  moveSpeed: 1.2 },
      { hpRange: [0.33, 0.66], pattern: 'laser',   moveSpeed: 1.5, summon: true },
      { hpRange: [0,    0.33], pattern: 'barrage', moveSpeed: 2.0 },
    ],
  },
};
