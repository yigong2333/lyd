// ============================================================
//  main.js - 启动入口
// ============================================================

import { Game } from './core/Game.js';
import { audio } from './core/AudioManager.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const game = new Game(canvas);
  window.__game = game; // 调试用

  // 首次交互后初始化音频（浏览器策略要求）
  const initAudio = () => {
    audio.ensureInit();
    audio.resume();
    window.removeEventListener('click', initAudio);
    window.removeEventListener('keydown', initAudio);
    window.removeEventListener('touchstart', initAudio);
  };
  window.addEventListener('click', initAudio);
  window.addEventListener('keydown', initAudio);
  window.addEventListener('touchstart', initAudio);

  game.start();
});
