// ============================================================
//  AudioManager.js - Web Audio API 程序化合成音效/BGM
// ============================================================

import { storage } from './Storage.js';

class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this._bgmTimer = null;
    this._initialized = false;
  }

  ensureInit() {
    if (this._initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = storage.getSettings().sfx;
      this.sfxGain.connect(this.master);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = storage.getSettings().bgm * 0.3;
      this.bgmGain.connect(this.master);

      this._initialized = true;
    } catch (e) {
      console.warn('Audio init failed', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  // ---------- 基础合成 ----------
  _tone(freq, dur, type = 'square', vol = 0.3, dest = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(dest || this.sfxGain);
    osc.start(t);
    osc.stop(t + dur);
  }

  _noise(dur, vol = 0.3, filterFreq = 1000) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const bufSize = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(this.sfxGain);
    src.start(t);
  }

  _sweep(f1, f2, dur, type = 'sawtooth', vol = 0.3) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + dur);
  }

  // ---------- 音效 ----------
  sfxShoot() { this._tone(880, 0.08, 'square', 0.15); }
  sfxHit() { this._noise(0.05, 0.2, 2000); }
  sfxExplosion() {
    this._sweep(220, 40, 0.3, 'sawtooth', 0.3);
    this._noise(0.3, 0.2, 600);
  }
  sfxBrickBreak() { this._noise(0.08, 0.15, 3000); }
  sfxPowerup() {
    this._tone(523, 0.08, 'square', 0.2);
    setTimeout(() => this._tone(659, 0.08, 'square', 0.2), 80);
    setTimeout(() => this._tone(784, 0.12, 'square', 0.2), 160);
  }
  sfxPlayerHit() { this._sweep(440, 110, 0.25, 'square', 0.25); }
  sfxBaseAlert() {
    this._tone(880, 0.15, 'square', 0.2);
    setTimeout(() => this._tone(660, 0.15, 'square', 0.2), 200);
  }
  sfxLevelStart() {
    this._tone(392, 0.15, 'triangle', 0.25);
    setTimeout(() => this._tone(523, 0.15, 'triangle', 0.25), 150);
    setTimeout(() => this._tone(659, 0.25, 'triangle', 0.25), 300);
  }
  sfxVictory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => setTimeout(() => this._tone(f, 0.2, 'triangle', 0.25), i * 150));
  }
  sfxDefeat() {
    this._sweep(440, 55, 0.8, 'sawtooth', 0.3);
  }
  sfxButton() { this._tone(1200, 0.04, 'square', 0.1); }
  sfxCharge() { this._sweep(220, 880, 0.3, 'sine', 0.15); }
  sfxSkill() { this._sweep(660, 1320, 0.2, 'triangle', 0.2); }
  sfxCombo() {
    this._tone(880, 0.08, 'square', 0.15);
    setTimeout(() => this._tone(1320, 0.1, 'square', 0.12), 60);
  }
  sfxGolden() {
    [880, 1100, 1320, 1760].forEach((f, i) => setTimeout(() => this._tone(f, 0.1, 'triangle', 0.18), i * 80));
  }
  sfxSuicide() {
    for (let i = 0; i < 4; i++) setTimeout(() => this._tone(1200 - i * 120, 0.08, 'square', 0.15), i * 130);
  }
  sfxAirstrike() {
    this._sweep(1600, 200, 0.6, 'sawtooth', 0.25);
    this._noise(0.6, 0.15, 1200);
  }

  // ---------- BGM ----------
  // 简单循环旋律
  playBGM(name) {
    this.stopBGM();
    if (!this.ctx) return;
    const melodies = {
      menu:   [262, 330, 392, 523, 392, 330],
      stage1: [330, 392, 440, 392, 330, 294],
      boss:   [440, 466, 523, 466, 440, 392],
      victory:[523, 659, 784, 1047, 784, 659],
    };
    const notes = melodies[name] || melodies.stage1;
    let idx = 0;
    const playNote = () => {
      if (!this._bgmTimer) return;
      this._tone(notes[idx], 0.3, 'triangle', 0.08, this.bgmGain);
      idx = (idx + 1) % notes.length;
    };
    playNote();
    this._bgmTimer = setInterval(playNote, 400);
  }

  stopBGM() {
    if (this._bgmTimer) {
      clearInterval(this._bgmTimer);
      this._bgmTimer = null;
    }
  }

  setSfxVolume(v) { if (this.sfxGain) this.sfxGain.gain.value = v; }
  setBgmVolume(v) { if (this.bgmGain) this.bgmGain.gain.value = v * 0.3; }
}

export const audio = new AudioManager();
