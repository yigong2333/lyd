// ============================================================
//  UIManager.js - HUD/菜单/结算 UI 管理
// ============================================================
//
//  通过 DOM 层叠加 Canvas，所有菜单/HUD用 HTML+CSS 实现
// ============================================================

import { storage } from '../core/Storage.js';
import { audio } from '../core/AudioManager.js';
import { PlayerTanks, PlayerTankList, RankThresholds } from '../config/TankData.js';
import { Colors } from '../config/Colors.js';
import { padZero, formatTime, isMobile } from '../core/Utils.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    this.$ = (id) => document.getElementById(id);
    this.dom = {
      hud: this.$('hud'),
      score: this.$('score-value'),
      best: this.$('best-value'),
      lives: this.$('lives-value'),
      enemyCount: this.$('enemy-count'),
      waveText: this.$('wave-text'),
      waveBar: this.$('wave-bar'),
      waveLabel: this.$('wave-label'),
      floatLayer: this.$('float-layer'),
      combo: this.$('combo-display'),
      comboVal: this.$('combo-value'),
      rCombo: this.$('r-combo'),
      mainMenu: this.$('main-menu'),
      hangar: this.$('hangar-menu'),
      pauseMenu: this.$('pause-menu'),
      result: this.$('result-screen'),
      ranking: this.$('ranking-screen'),
      resultTitle: this.$('result-title'),
      resultRank: this.$('result-rank'),
      rScore: this.$('r-score'),
      rKills: this.$('r-kills'),
      rTime: this.$('r-time'),
      rGold: this.$('r-gold'),
      rankingList: this.$('ranking-list'),
      mobile: this.$('mobile-controls'),
      menuBest: this.$('menu-best'),
    };
    this._floatTexts = [];
    this._selectedIdx = PlayerTankList.indexOf(storage.selectedTank);
    if (this._selectedIdx < 0) this._selectedIdx = 0;

    this._bindButtons();
    this._bindMobile();
    this._refreshMenuBest();
    this.showMainMenu();
    if (isMobile) this.dom.mobile.classList.remove('hidden');
  }

  // ============================================================
  //  按钮绑定
  // ============================================================

  _bindButtons() {
    const bind = (root) => {
      root.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          audio.ensureInit(); audio.resume(); audio.sfxButton();
          this._onAction(btn.dataset.action);
        });
      });
    };
    bind(this.dom.mainMenu);
    bind(this.dom.hangar);
    bind(this.dom.pauseMenu);
    bind(this.dom.result);
    bind(this.dom.ranking);
  }

  _onAction(action) {
    const g = this.game;
    switch (action) {
      case 'campaign':
        this.hideAllMenus();
        g.startCampaign(0);
        this.showHUD();
        break;
      case 'continue':
        // 从最高未通关关卡开始
        {
          const cleared = storage.clearedLevels;
          let idx = 0;
          for (let i = 0; i < g.level.levelCount; i++) {
            if (cleared.includes(i + 1)) idx = i + 1;
          }
          if (idx >= g.level.levelCount) idx = 0;
          this.hideAllMenus();
          g.startCampaign(idx);
          this.showHUD();
        }
        break;
      case 'endless':
        this.hideAllMenus();
        g.startEndless();
        this.showHUD();
        break;
      case 'hangar':
        this._renderHangar();
        this.showOverlay('hangar');
        break;
      case 'ranking':
        this._renderRanking();
        this.showOverlay('ranking');
        break;
      case 'back':
        this.showMainMenu();
        break;
      case 'tank-prev':
        this._selectedIdx = (this._selectedIdx - 1 + PlayerTankList.length) % PlayerTankList.length;
        this._renderHangar();
        break;
      case 'tank-next':
        this._selectedIdx = (this._selectedIdx + 1) % PlayerTankList.length;
        this._renderHangar();
        break;
      case 'tank-confirm':
        storage.setSelectedTank(PlayerTankList[this._selectedIdx]);
        g.selectedTank = PlayerTankList[this._selectedIdx];
        this.showMainMenu();
        break;
      case 'resume':
        g.resume();
        this.hidePause();
        this.showHUD();
        break;
      case 'restart':
        this.hideAllMenus();
        if (g.mode === 'endless') g.startEndless();
        else g.startCampaign(g.level.levelIndex);
        this.showHUD();
        break;
      case 'next-level':
        this.hideAllMenus();
        g.nextLevel();
        this.showHUD();
        break;
      case 'quit':
        g.quitToMenu();
        break;
    }
  }

  // ============================================================
  //  菜单显示/隐藏
  // ============================================================

  hideAllMenus() {
    [this.dom.mainMenu, this.dom.hangar, this.dom.pauseMenu, this.dom.result, this.dom.ranking]
      .forEach(m => m && m.classList.add('hidden'));
    if (this.dom.hud) this.dom.hud.classList.add('hidden');
  }

  showMainMenu() {
    this.hideAllMenus();
    this.dom.mainMenu.classList.remove('hidden');
    this._refreshMenuBest();
    audio.playBGM('menu');
  }

  showHUD() {
    this.dom.hud.classList.remove('hidden');
  }

  showOverlay(name) {
    this.hideAllMenus();
    const map = { hangar: this.dom.hangar, ranking: this.dom.ranking, pause: this.dom.pauseMenu, result: this.dom.result };
    if (map[name]) map[name].classList.remove('hidden');
  }

  showPause() {
    this.showOverlay('pause');
  }
  hidePause() {
    this.dom.pauseMenu.classList.add('hidden');
  }

  showResult(win) {
    const g = this.game;
    this.showOverlay('result');
    this.dom.resultTitle.textContent = win ? '✦ 胜利 ✦' : '✦ 失败 ✦';
    this.dom.resultTitle.style.color = win ? Colors.NEON_GREEN : Colors.NEON_RED;
    // 评级
    const rank = this._calcRank(win);
    this.dom.resultRank.textContent = rank;
    this.dom.resultRank.style.color = this._rankColor(rank);
    this.dom.rScore.textContent = padZero(g.score, 6);
    this.dom.rKills.textContent = g.kills;
    this.dom.rTime.textContent = formatTime(g.runTime);
    if (this.dom.rCombo) this.dom.rCombo.textContent = g.maxCombo || 0;
    const gold = win ? 100 + g.kills * 10 : g.kills * 5;
    this.dom.rGold.textContent = '+' + gold;
    storage.setGold(storage.gold + gold);
    // 下一关按钮
    const nextBtn = this.dom.result.querySelector('[data-action="next-level"]');
    if (nextBtn) {
      nextBtn.style.display = (win && g.mode === 'campaign' && g.level.levelIndex < g.level.levelCount - 1) ? '' : 'none';
    }
  }

  _calcRank(win) {
    if (!win) return 'D';
    const g = this.game;
    const timeBonus = Math.max(0, 1 - g.runTime / 180000);
    const score = (g.kills / 10) * 0.5 + timeBonus * 0.5;
    if (score >= RankThresholds.S) return 'S';
    if (score >= RankThresholds.A) return 'A';
    if (score >= RankThresholds.B) return 'B';
    if (score >= RankThresholds.C) return 'C';
    return 'D';
  }

  _rankColor(r) {
    return { S: '#fff200', A: '#00ff88', B: '#00f0ff', C: '#ff8800', D: '#ff3366' }[r] || '#fff';
  }

  // ============================================================
  //  机库（坦克选择）
  // ============================================================

  _renderHangar() {
    const id = PlayerTankList[this._selectedIdx];
    const t = PlayerTanks[id];
    this.$('tank-name').textContent = t.name;
    this.$('tank-desc').textContent = t.desc;
    this.$('tank-hp').textContent = '❤'.repeat(t.maxHp);
    this.$('tank-speed').textContent = '★'.repeat(Math.round(t.speed));
    this.$('tank-fire').textContent = '★'.repeat(Math.round(t.fireRate / 200));
    this.$('tank-skill').textContent = t.skill;
    // 颜色预览
    const preview = this.$('tank-preview');
    if (preview) {
      preview.style.borderColor = t.color;
      preview.style.boxShadow = `0 0 20px ${t.color}`;
    }
    this.$('tank-index').textContent = `${this._selectedIdx + 1}/${PlayerTankList.length}`;
  }

  // ============================================================
  //  排行榜
  // ============================================================

  _renderRanking() {
    const list = storage.getRanking();
    this.dom.rankingList.innerHTML = '';
    if (list.length === 0) {
      this.dom.rankingList.innerHTML = '<li class="empty">暂无记录</li>';
      return;
    }
    list.forEach((e, i) => {
      const li = document.createElement('li');
      const win = e.win ? '胜' : '败';
      const mode = e.mode === 'endless' ? '无尽' : '战役';
      li.innerHTML = `
        <span class="rank-num">${i + 1}</span>
        <span class="rank-score">${padZero(e.score, 6)}</span>
        <span class="rank-meta">${mode} · ${win} · ${e.kills}杀 · ${formatTime(e.time)}</span>
      `;
      this.dom.rankingList.appendChild(li);
    });
  }

  _refreshMenuBest() {
    if (this.dom.menuBest) this.dom.menuBest.textContent = padZero(storage.bestScore, 6);
  }

  // ============================================================
  //  HUD 更新
  // ============================================================

  update(dt) {
    const g = this.game;
    if (this.dom.score) this.dom.score.textContent = padZero(g.score, 6);
    if (this.dom.best) this.dom.best.textContent = padZero(Math.max(storage.bestScore, g.score), 6);
    if (this.dom.lives) this.dom.lives.textContent = '♥'.repeat(g.player ? g.player.lives : 0);
    if (this.dom.enemyCount) this.dom.enemyCount.textContent = g.enemiesAlive;
    // 连击
    if (this.dom.combo) {
      if (g.combo >= 2) {
        this.dom.combo.classList.remove('hidden');
        this.dom.comboVal.textContent = g.combo;
      } else {
        this.dom.combo.classList.add('hidden');
      }
    }
    // 波次进度
    if (g.mode === 'campaign' && g.spawn.waves.length > 0) {
      const total = g.spawn.waves.length;
      const cur = Math.min(total, g.spawn.waveIndex + 1);
      if (this.dom.waveLabel) this.dom.waveLabel.textContent = `WAVE ${cur}/${total}`;
      if (this.dom.waveBar) this.dom.waveBar.style.width = `${(cur / total) * 100}%`;
    } else if (g.mode === 'endless') {
      if (this.dom.waveLabel) this.dom.waveLabel.textContent = `WAVE ${g.spawn.endlessWave}`;
      if (this.dom.waveBar) this.dom.waveBar.style.width = '100%';
    }
    // 浮动文字
    this._updateFloats(dt);
  }

  // ============================================================
  //  浮动文字
  // ============================================================

  addFloatText(worldX, worldY, text, color = '#fff') {
    const r = this.game.renderer;
    const sx = r.offsetX + worldX * r.scale;
    const sy = r.offsetY + worldY * r.scale;
    const el = document.createElement('div');
    el.className = 'float-text';
    el.textContent = text;
    el.style.color = color;
    el.style.left = sx + 'px';
    el.style.top = sy + 'px';
    el.style.textShadow = `0 0 6px ${color}`;
    this.dom.floatLayer.appendChild(el);
    this._floatTexts.push({ el, life: 1000, vy: -0.05 });
  }

  _updateFloats(dt) {
    for (let i = this._floatTexts.length - 1; i >= 0; i--) {
      const f = this._floatTexts[i];
      f.life -= dt;
      const top = parseFloat(f.el.style.top);
      f.el.style.top = (top + f.vy * dt) + 'px';
      f.el.style.opacity = Math.max(0, f.life / 1000);
      if (f.life <= 0) {
        f.el.remove();
        this._floatTexts.splice(i, 1);
      }
    }
  }

  showWaveText(text) {
    const el = this.dom.waveText;
    if (!el) return;
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth; // 触发重排
    el.classList.add('show');
  }

  // ============================================================
  //  移动端控制
  // ============================================================

  _bindMobile() {
    // 全屏跟随摇杆：手指在屏幕任意位置按下即生成摇杆，拖动控制方向
    const container = this.game.canvas || document.getElementById('game-container');
    const stick = this.$('joystick');
    const knob = this.$('joystick-knob');
    const fireBtn = this.$('btn-fire');
    const skillBtn = this.$('btn-skill');

    let baseX = 0, baseY = 0, touchId = null;
    const JOY_MAX = 40; // 摇杆最大半径

    const showStick = (cx, cy) => {
      if (!stick) return;
      stick.style.left = (cx - 45) + 'px';
      stick.style.top = (cy - 45) + 'px';
      stick.style.opacity = '1';
      stick.style.display = 'block';
    };
    const hideStick = () => {
      if (!stick) return;
      stick.style.opacity = '0';
      setTimeout(() => { if (stick.style.opacity === '0') stick.style.display = 'none'; }, 200);
      if (knob) knob.style.transform = '';
    };

    const onStart = (e) => {
      e.preventDefault();
      const t = e.touches ? e.touches[0] : e;
      baseX = t.clientX;
      baseY = t.clientY;
      touchId = e.touches ? t.identifier : 'mouse';
      this.game.input.setJoystick(baseX, baseY);
      showStick(baseX, baseY);
    };
    const onMove = (e) => {
      if (touchId === null) return;
      e.preventDefault();
      let t;
      if (e.touches) {
        for (const tc of e.touches) if (tc.identifier === touchId) { t = tc; break; }
        if (!t) return;
      } else t = e;
      const dx = t.clientX - baseX;
      const dy = t.clientY - baseY;
      this.game.input.updateJoystick(dx, dy);
      if (knob) {
        const len = Math.hypot(dx, dy);
        const k = len > JOY_MAX ? JOY_MAX / len : 1;
        knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
      }
    };
    const onEnd = (e) => {
      e.preventDefault();
      if (e.touches) {
        // 只响应当前摇杆手指的抬起
        let still = false;
        for (const tc of e.touches) if (tc.identifier === touchId) still = true;
        if (still) return;
      }
      touchId = null;
      this.game.input.endJoystick();
      hideStick();
    };

    if (container) {
      container.addEventListener('touchstart', onStart, { passive: false });
      container.addEventListener('touchmove', onMove, { passive: false });
      container.addEventListener('touchend', onEnd, { passive: false });
      container.addEventListener('touchcancel', onEnd, { passive: false });
      container.addEventListener('mousedown', onStart);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
    }

    if (fireBtn) {
      const f = (e) => { e.preventDefault(); this.game.input.setTouchFire(true); };
      const fEnd = (e) => { e.preventDefault(); this.game.input.setTouchFire(false); };
      fireBtn.addEventListener('touchstart', f, { passive: false });
      fireBtn.addEventListener('touchend', fEnd, { passive: false });
      fireBtn.addEventListener('mousedown', f);
      fireBtn.addEventListener('mouseup', fEnd);
    }
    if (skillBtn) {
      const s = (e) => { e.preventDefault(); this.game.input.setTouchSkill(true); };
      const sEnd = (e) => { e.preventDefault(); this.game.input.setTouchSkill(false); };
      skillBtn.addEventListener('touchstart', s, { passive: false });
      skillBtn.addEventListener('touchend', sEnd, { passive: false });
      skillBtn.addEventListener('mousedown', s);
      skillBtn.addEventListener('mouseup', sEnd);
    }
  }
}
