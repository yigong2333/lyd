// ============================================================
//  AudioManager.js - 音效/BGM管理器
//  使用 Web Audio API 实时合成音效（无需音频文件，开箱即用）
//  BGM：用程序化合成简单循环（或静默），避免素材依赖
// ============================================================

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.enabled = true;
    this.bgmOsc = null;
    this.bgmTimer = null;
    this.initialized = false;
  }

  /** 首次用户交互时调用，解锁AudioContext */
  ensureInit() {
    if (this.initialized) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.4;
      this.sfxGain.connect(this.masterGain);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.08;
      this.bgmGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.warn('WebAudio不可用：', e);
    }
  }

  // ============ 通用合成 ============
  /**
   * 基础声音：频率 f0->f1 扫描，音量env，时长d，波形type，可选失真
   */
  _tone({ f0 = 440, f1 = 440, d = 0.1, type = 'sine', vol = 0.5, attack = 0.005, release = 0.05, dist = 0 }) {
    if (!this.enabled || !this.initialized) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, ctx.currentTime);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), ctx.currentTime + d);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d + release);

    let node = osc;
    if (dist > 0) {
      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i / 128) - 1;
        curve[i] = ((Math.PI + dist) * x) / (Math.PI + dist * Math.abs(x));
      }
      shaper.curve = curve;
      node.connect(shaper);
      node = shaper;
    }
    node.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(ctx.currentTime + d + release + 0.02);
  }

  _noise({ d = 0.2, vol = 0.3, filterFreq = 1000 }) {
    if (!this.enabled || !this.initialized) return;
    const ctx = this.ctx;
    const bufSize = Math.floor(ctx.sampleRate * d);
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    src.connect(filter); filter.connect(gain); gain.connect(this.sfxGain);
    src.start();
  }

  // ============ 具体音效 ============
  sfxShoot(power = 1) {
    this._tone({ f0: 1400 + power * 80, f1: 900, d: 0.035, type: 'square', vol: 0.12, dist: 4 });
  }
  sfxChargedShoot() {
    this._tone({ f0: 120, f1: 900, d: 0.22, type: 'sawtooth', vol: 0.25, dist: 8 });
    this._tone({ f0: 600, f1: 1600, d: 0.18, type: 'square', vol: 0.18 });
  }
  sfxHit() {
    this._tone({ f0: 300, f1: 100, d: 0.05, type: 'square', vol: 0.18, dist: 6 });
  }
  sfxEnemyDieSmall() {
    this._noise({ d: 0.12, vol: 0.18, filterFreq: 1400 });
    this._tone({ f0: 500, f1: 120, d: 0.08, type: 'triangle', vol: 0.12 });
  }
  sfxEnemyDieBig() {
    this._noise({ d: 0.5, vol: 0.35, filterFreq: 700 });
    this._tone({ f0: 200, f1: 50, d: 0.4, type: 'sawtooth', vol: 0.22, dist: 6 });
  }
  sfxBossExplode() {
    for (let i = 0; i < 5; i++) setTimeout(() => this.sfxEnemyDieBig(), i * 120);
    this._tone({ f0: 80, f1: 20, d: 1.2, type: 'sawtooth', vol: 0.3, dist: 10 });
  }
  sfxPlayerHit() {
    this._noise({ d: 0.15, vol: 0.3, filterFreq: 400 });
    this._tone({ f0: 180, f1: 60, d: 0.2, type: 'square', vol: 0.2, dist: 8 });
  }
  sfxGraze() {
    this._tone({ f0: 2200, f1: 2800, d: 0.02, type: 'sine', vol: 0.06 });
  }
  sfxPickup() {
    this._tone({ f0: 800, f1: 1600, d: 0.08, type: 'triangle', vol: 0.18 });
    setTimeout(() => this._tone({ f0: 1200, f1: 2200, d: 0.06, type: 'triangle', vol: 0.15 }), 50);
  }
  sfxPowerUp() {
    [0, 80, 160].forEach((t, i) => setTimeout(() => {
      this._tone({ f0: 500 + i * 300, f1: 1200 + i * 400, d: 0.1, type: 'square', vol: 0.16 });
    }, t));
  }
  sfxBomb() {
    this._noise({ d: 1.0, vol: 0.5, filterFreq: 900 });
    this._tone({ f0: 400, f1: 30, d: 0.9, type: 'sawtooth', vol: 0.3, dist: 10 });
  }
  sfxWarn() {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => this._tone({ f0: 440, f1: 440, d: 0.1, type: 'square', vol: 0.22 }), i * 160);
    }
  }
  sfxButton() {
    this._tone({ f0: 700, f1: 1100, d: 0.04, type: 'square', vol: 0.1 });
  }
  sfxPhase() {
    this._noise({ d: 0.4, vol: 0.3, filterFreq: 2200 });
    this._tone({ f0: 1000, f1: 100, d: 0.4, type: 'sawtooth', vol: 0.2, dist: 8 });
  }
  sfxCritical() {
    this._tone({ f0: 900, f1: 1800, d: 0.1, type: 'square', vol: 0.22 });
    setTimeout(() => this._tone({ f0: 1200, f1: 2400, d: 0.12, type: 'square', vol: 0.2 }), 70);
  }
  sfxGolden() {
    [880, 1320, 1760, 2200].forEach((f, i) => setTimeout(() => {
      this._tone({ f0: f, f1: f, d: 0.09, type: 'triangle', vol: 0.2 });
    }, i * 90));
  }
  sfxComboTier() {
    this._tone({ f0: 523, f1: 523, d: 0.12, type: 'square', vol: 0.2 });
    setTimeout(() => this._tone({ f0: 784, f1: 784, d: 0.12, type: 'square', vol: 0.2 }), 100);
    setTimeout(() => this._tone({ f0: 1047, f1: 1047, d: 0.2, type: 'square', vol: 0.2 }), 200);
  }
  sfxFury() {
    this._noise({ d: 0.8, vol: 0.35, filterFreq: 500 });
    this._tone({ f0: 60, f1: 30, d: 0.8, type: 'sawtooth', vol: 0.3, dist: 8 });
  }

  // ============ BGM 程序化合成 ============
  /**
   * 简单电子乐BGM：播放基础低音 loop + 随机高音点缀
   */
  startBGM(pattern = 'stage1') {
    if (!this.initialized || !this.enabled) return;
    this.stopBGM();

    const patterns = {
      menu:    { tempo: 90,  bass: [110, 110, 146, 123], lead: [330, 392, 440, 523] },
      stage1:  { tempo: 130, bass: [82, 82, 98, 98, 110, 110, 98, 82], lead: [330, 440, 523, 392, 494, 587, 523, 440] },
      stage2:  { tempo: 150, bass: [73, 73, 92, 73, 82, 82, 103, 82], lead: [293, 392, 466, 523, 494, 587, 659, 523] },
      stage3:  { tempo: 168, bass: [65, 65, 82, 73, 65, 65, 98, 82], lead: [261, 349, 415, 466, 523, 466, 415, 349] },
      boss:    { tempo: 175, bass: [55, 65, 55, 73, 55, 65, 82, 73], lead: [220, 330, 261, 392, 440, 392, 330, 440] },
      victory: { tempo: 110, bass: [110, 130, 146, 165, 175, 196, 220, 247], lead: [440, 494, 523, 587, 659, 698, 784, 880] },
      lose:    { tempo: 70,  bass: [146, 130, 110, 98],       lead: [220, 196, 174, 146] },
    };
    const P = patterns[pattern] || patterns.stage1;
    const beatMs = 60000 / P.tempo;
    let step = 0;

    const tick = () => {
      if (!this.enabled || !this.initialized) return;
      const bass = P.bass[step % P.bass.length];
      const lead = P.lead[step % P.lead.length];
      // Bass
      this._bgmTone(bass, beatMs * 0.9, 'sawtooth', 0.35);
      // Lead 每拍上
      if (step % 2 === 0) this._bgmTone(lead, beatMs * 0.4, 'square', 0.16);
      // Hi-hat-like (噪声脉冲)
      if (step % 1 === 0) this._bgmNoise(beatMs * 0.05, 0.04, 6000);
      step++;
    };
    tick();
    this.bgmTimer = setInterval(tick, beatMs);
  }

  _bgmTone(freq, d, type, vol) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d);
    osc.connect(gain); gain.connect(this.bgmGain);
    osc.start();
    osc.stop(ctx.currentTime + d + 0.02);
  }

  _bgmNoise(d, vol, filterFreq) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const bufSize = Math.floor(ctx.sampleRate * d);
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = filterFreq;
    src.connect(filter); filter.connect(gain); gain.connect(this.bgmGain);
    src.start();
  }

  stopBGM() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  setMuted(mute) {
    this.enabled = !mute;
    if (this.masterGain) this.masterGain.gain.value = mute ? 0 : 0.5;
  }
}

export const audio = new AudioManager();
export default audio;
