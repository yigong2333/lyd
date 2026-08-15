// ============================================================
//  AISystem.js - 敌方AI行为树调度
// ============================================================

export class AISystem {
  constructor(game) {
    this.game = game;
  }

  update(dt) {
    const { enemies, player, base } = this.game;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.spawnTime > 0) continue;
      if (e.frozen) continue;
      e.thinkTimer -= dt;
      if (e.thinkTimer <= 0) {
        e.think(player, base);
        e.thinkTimer = e.aiCfg.thinkInterval || 600;
      }
    }
  }
}
