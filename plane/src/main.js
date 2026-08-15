// ============================================================
//  main.js - 入口文件
//  初始化 AudioContext（需要用户交互）+ 启动Game
// ============================================================

import { Game } from './core/Game.js';
import { audio } from './core/AudioManager.js';

// 全局 Game 引用（便于调试）
window.__GAME__ = null;

function boot() {
  const game = new Game();
  window.__GAME__ = game;

  // 初始化音频（首次交互后）
  const tryInitAudio = () => {
    audio.ensureInit();
    audio.startBGM('menu');
    window.removeEventListener('pointerdown', tryInitAudio);
    window.removeEventListener('keydown', tryInitAudio);
  };
  window.addEventListener('pointerdown', tryInitAudio);
  window.addEventListener('keydown', tryInitAudio);

  // 错误兜底
  window.addEventListener('error', (e) => {
    console.error('[GAME ERROR]', e.error || e.message);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
