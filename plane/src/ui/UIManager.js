// ============================================================
//  UI.js - UI控制总管理
//  管理 DOM HUD层 + 各菜单面板
// ============================================================

import { storage } from '../core/Storage.js';
import { PlayerData, MAX_POWER } from '../config/PlayerData.js';
import { BossData } from '../config/BossData.js';
import { Colors } from '../config/Colors.js';
import { padZero, formatTime, isMobile } from '../core/Utils.js';
import { audio } from '../core/AudioManager.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    // DOM引用
    this.$ = (id) => document.getElementById(id);
    this.dom = {
      hud:         this.$('hud'),
      score:       this.$('score-value'),
      combo:       this.$('combo-display'),
      comboVal:    this.$('combo-value'),
      graze:       this.$('graze-display'),
      grazeVal:    this.$('graze-value'),
      powerDots:   this.$('power-dots'),
      bestDisplay: this.$('best-score-display'),
      bestValue:   this.$('hud-best-value'),
      hpBar:       this.$('hp-bar'),
      hpText:      this.$('hp-text'),
      enBar:       this.$('en-bar'),
      bombIcons:   this.$('bomb-icons'),
      chargeWrap:  this.$('charge-wrap'),
      chargeBar:   this.$('charge-bar'),
      stageProg:   this.$('stage-progress'),
      stageName:   this.$('stage-name'),
      stageBar:    this.$('stage-bar'),
      stagePct:    this.$('stage-percent'),
      bossWrap:    this.$('boss-health-wrap'),
      bossName:    this.$('boss-name'),
      bossPhase:   this.$('boss-phase'),
      bossBar:     this.$('boss-health-bar'),
      floating:    this.$('floating-layer'),
      warn:        this.$('boss-warning'),
      warnName:    this.$('warning-boss-name'),
      mobile:      this.$('mobile-controls'),
      mainMenu:    this.$('main-menu'),
      hangar:      this.$('hangar-menu'),
      pauseMenu:   this.$('pause-menu'),
      result:      this.$('result-screen'),
      ranking:     this.$('ranking-screen'),
      rankingList: this.$('ranking-list'),
      bestScore:   this.$('best-score'),
      resultTitle: this.$('result-title'),
      resultRank:  this.$('result-rank'),
      rTime:       this.$('r-time'),
      rScore:      this.$('r-score'),
      rCombo:      this.$('r-combo'),
      rGraze:      this.$('r-graze'),
      rKills:      this.$('r-kills'),
      rHits:       this.$('r-hits'),
      rGold:       this.$('r-gold'),
    };
    this._buildPowerDots();
    this._bindMenuButtons();
    this._bindHangar();
    this.showMainMenu();
    // 移动端显示虚拟按钮
    if (isMobile) this.dom.mobile.classList.remove('hidden');
  }

  // ---------- 火力等级点 ----------
  _buildPowerDots() {
    this.dom.powerDots.innerHTML = '';
    for (let i = 0; i < MAX_POWER; i++) {
      const d = document.createElement('div');
      d.className = 'power-dot';
      this.dom.powerDots.appendChild(d);
    }
  }

  // ---------- 菜单按钮绑定 ----------
  _bindMenuButtons() {
    // 通用：所有带 data-action 的 cyber-btn
    const bind = (root) => {
      root.querySelectorAll('.cyber-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          audio.ensureInit(); audio.sfxButton();
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
        g.startCampaign(g.getNextUnlockedStageId());
        break;
      case 'endless':
        this.hideAllMenus();
        g.startEndless();
        break;
      case 'hangar':
        this.dom.mainMenu.classList.add('hidden');
        this._refreshHangar();
        this.dom.hangar.classList.remove('hidden');
        break;
      case 'ranking':
        this.dom.mainMenu.classList.add('hidden');
        this._refreshRanking();
        this.dom.ranking.classList.remove('hidden');
        break;
      case 'back-to-menu':
        this.hideAllMenus();
        this.showMainMenu();
        break;
      case 'resume':
        this.dom.pauseMenu.classList.add('hidden');
        g.resume();
        break;
      case 'restart':
        this.dom.pauseMenu.classList.add('hidden');
        g.restart();
        break;
      case 'quit':
        this.dom.pauseMenu.classList.add('hidden');
        this.dom.result.classList.add('hidden');
        g.quitToMenu();
        this.showMainMenu();
        break;
      case 'retry':
        this.dom.result.classList.add('hidden');
        g.restart();
        break;
      case 'next-stage':
        this.dom.result.classList.add('hidden');
        g.nextStage();
        break;
    }
  }

  _bindHangar() {
    // 飞机卡片
    this.dom.hangar.querySelectorAll('.ship-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.ship;
        if (!storage.isShipUnlocked(id)) return;
        storage.setSelectedShip(id);
        this.dom.hangar.querySelectorAll('.ship-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        audio.sfxButton();
      });
    });
    // 僚机选项
    this.dom.hangar.querySelectorAll('.wm-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        storage.setSelectedWingman(opt.dataset.wm);
        this.dom.hangar.querySelectorAll('.wm-opt').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        audio.sfxButton();
      });
    });
    // 初始选择同步
    const savedShip = storage.selectedShip;
    this.dom.hangar.querySelectorAll('.ship-card').forEach(card => {
      if (card.dataset.ship === savedShip) card.classList.add('selected');
      if (!storage.isShipUnlocked(card.dataset.ship)) card.classList.add('locked');
    });
    const savedWM = storage.selectedWingman;
    this.dom.hangar.querySelectorAll('.wm-opt').forEach(opt => {
      if (opt.dataset.wm === savedWM) opt.classList.add('selected');
    });
  }

  _refreshHangar() {
    this.dom.hangar.querySelectorAll('.ship-card').forEach(card => {
      const id = card.dataset.ship;
      card.classList.toggle('locked', !storage.isShipUnlocked(id));
    });
  }

  _refreshRanking() {
    const list = this.dom.rankingList;
    list.innerHTML = '';
    const data = storage.ranking;
    if (data.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty-row';
      li.textContent = '暂无记录，去创造第一名吧！';
      list.appendChild(li);
      return;
    }
    data.forEach((r, i) => {
      const li = document.createElement('li');
      if (i === 0) li.classList.add('top1');
      if (i === 1) li.classList.add('top2');
      if (i === 2) li.classList.add('top3');
      const name = document.createElement('span');
      name.className = 'rk-name';
      name.textContent = `#${i+1} ${r.name}`;
      const score = document.createElement('span');
      score.className = 'rk-score';
      score.textContent = r.score.toLocaleString();
      li.appendChild(name);
      li.appendChild(score);
      list.appendChild(li);
    });
  }

  hideAllMenus() {
    ['mainMenu','hangar','pauseMenu','result','ranking'].forEach(k => {
      this.dom[k].classList.add('hidden');
    });
  }

  showMainMenu() {
    this.hideAllMenus();
    this.dom.bestScore.textContent = storage.bestScore.toLocaleString();
    this.dom.mainMenu.classList.remove('hidden');
    this.dom.hud.classList.add('hidden');
  }

  // ---------- 游戏开始 ----------
  onGameStart() {
    this.hideAllMenus();
    this.dom.hud.classList.remove('hidden');
    this.setCombo(0); this.setGraze(0);
  }

  onGameEnd() {
    this.dom.hud.classList.add('hidden');
  }

  // ---------- 每帧刷新HUD ----------
  update(game) {
    const p = game.player;
    if (!p) return;
    // 分数
    this.dom.score.textContent = padZero(game.score, 7);

    // 最高分计分板：实时显示历史最高分，破纪录时高亮
    const best = storage.bestScore;
    const isRecord = game.score > best;
    const displayBest = isRecord ? game.score : best;
    this.dom.bestValue.textContent = padZero(displayBest, 7);
    this.dom.bestDisplay.classList.toggle('new-record', isRecord);

    // 火力点
    const dots = this.dom.powerDots.children;
    for (let i = 0; i < dots.length; i++) {
      const on = i < p.power;
      const max = on && i === dots.length - 1 && p.power === MAX_POWER;
      dots[i].classList.toggle('on', on);
      dots[i].classList.toggle('max', !!max);
    }

    // HP/EN
    this.dom.hpBar.style.width = (p.hp / p.maxHp * 100) + '%';
    this.dom.hpText.textContent = `${Math.max(0, Math.ceil(p.hp))}/${p.maxHp}`;
    this.dom.enBar.style.width = (p.energy / p.maxEnergy * 100) + '%';

    // Bomb图标
    if (this._lastBomb !== p.bomb) {
      this._lastBomb = p.bomb;
      this.dom.bombIcons.innerHTML = '';
      for (let i = 0; i < p.bomb; i++) {
        const d = document.createElement('div');
        d.className = 'bomb-icon'; d.textContent = '💣';
        this.dom.bombIcons.appendChild(d);
      }
    }

    // 蓄力条
    const charging = p.chargeTime > 150;
    this.dom.chargeWrap.classList.toggle('hidden', !charging);
    if (charging) {
      const r = Math.min(1, p.chargeTime / (p.data.charge.time || 1500));
      this.dom.chargeBar.style.width = (r * 100) + '%';
    }

    // 关卡进度
    this.dom.stageName.textContent = game.stageName || '';
    this.dom.stageBar.style.width = (game.spawner.progress * 100) + '%';
    this.dom.stagePct.textContent = Math.floor(game.spawner.progress * 100) + '%';
    const showStage = !game.inBossBattle && game.mode === 'campaign';
    this.dom.stageProg.classList.toggle('hidden', !showStage);

    // Boss血条
    const liveBoss = game.bosses.find(b => !b.dead && b.entered);
    if (liveBoss) {
      this.dom.bossWrap.classList.remove('hidden');
      const name = BossData[liveBoss.bossId]?.name || 'BOSS';
      this.dom.bossName.textContent = name;
      this.dom.bossPhase.textContent = `PHASE ${liveBoss.phase + 1}/3`;
      this.dom.bossBar.style.width = Math.max(0, liveBoss.hp / liveBoss.maxHp * 100) + '%';
    } else {
      this.dom.bossWrap.classList.add('hidden');
    }

    // 连击 & 擦弹（CSS显示）
    this.dom.combo.classList.toggle('hidden', game.combo < 3);
    this.dom.graze.classList.toggle('hidden', game.grazeCombo < 2);
  }

  setCombo(c) { this.dom.comboVal.textContent = c; }
  setGraze(c) { this.dom.grazeVal.textContent = c; }

  // ---------- Boss警告 ----------
  showBossWarning(bossId, cb) {
    const name = (BossData[bossId]?.name || 'BOSS').toUpperCase();
    this.dom.warnName.textContent = `INCOMING ENEMY: ${name}`;
    this.dom.warn.classList.remove('hidden');
    audio.sfxWarn();
    setTimeout(() => {
      this.dom.warn.classList.add('hidden');
      cb && cb();
    }, 2400);
  }

  // ---------- 浮动文字 ----------
  addFloat(text, x, y, color = Colors.NEON_YELLOW, size = '') {
    // 将Canvas坐标转换为屏幕坐标（考虑自适应）
    const rect = this.game.renderer.canvas.getBoundingClientRect();
    const sx = (x / this.game.width) * rect.width + rect.left;
    const sy = (y / this.game.height) * rect.height + rect.top;
    const el = document.createElement('div');
    el.className = 'float-text ' + size;
    el.style.left = sx + 'px';
    el.style.top  = sy + 'px';
    el.style.color = color;
    el.style.transform = 'translate(-50%, -50%)';
    el.textContent = text;
    this.dom.floating.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  // ---------- 暂停 ----------
  showPause() { this.dom.pauseMenu.classList.remove('hidden'); }
  hidePause() { this.dom.pauseMenu.classList.add('hidden'); }

  // ---------- 结算 ----------
  showResult(data) {
    this.dom.result.classList.remove('hidden');
    const t = this.dom.resultTitle;
    if (data.win) {
      t.textContent = '✦ 任务达成 ✦';
      t.classList.remove('result-lose'); t.classList.add('result-win');
    } else {
      t.textContent = '✦ 任务失败 ✦';
      t.classList.remove('result-win'); t.classList.add('result-lose');
    }
    this.dom.resultRank.textContent = data.rank || 'C';
    this.dom.rTime.textContent  = formatTime(data.time);
    this.dom.rScore.textContent = data.score.toLocaleString();
    this.dom.rCombo.textContent = data.maxCombo;
    this.dom.rGraze.textContent = data.totalGraze;
    this.dom.rKills.textContent = data.kills;
    this.dom.rHits.textContent  = data.hitsTaken;
    this.dom.rGold.textContent  = '+' + data.goldReward;

    // 按钮：有下一关显示next，否则隐藏
    const btns = this.dom.result.querySelectorAll('.cyber-btn');
    let nextBtn = null;
    btns.forEach(b => { if (b.dataset.action === 'next-stage') nextBtn = b; });
    if (nextBtn) nextBtn.style.display = (data.win && data.mode === 'campaign' && data.hasNextStage) ? '' : 'none';
  }

  hideResult() { this.dom.result.classList.add('hidden'); }
}

export default UIManager;
