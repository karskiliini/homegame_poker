import type { SoundType } from '@poker/shared';

class SoundManager {
  private ctx: AudioContext | null = null;
  private _enabled: boolean;

  constructor(defaultEnabled: boolean) {
    this._enabled = defaultEnabled;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  setEnabled(enabled: boolean) {
    this._enabled = enabled;
  }

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  play(sound: SoundType) {
    if (!this._enabled) return;

    switch (sound) {
      case 'card_deal': this.playCardDeal(); break;
      case 'card_flip': this.playCardFlip(); break;
      case 'chip_bet': this.playChipBet(); break;
      case 'chip_win': this.playChipWin(); break;
      case 'check': this.playCheck(); break;
      case 'fold': this.playFold(); break;
      case 'all_in': this.playAllIn(); break;
      case 'timer_warning': this.playTimerWarning(); break;
      case 'your_turn': this.playYourTurn(); break;
    }
  }

  // Crisp card slide sound
  private playCardDeal() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const duration = 0.12;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * 0.4 * (1 - t * t);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 1.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(now);
    source.stop(now + duration);
  }

  // Card flip with body
  private playCardFlip() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    // Snap
    const bufferSize = Math.floor(ctx.sampleRate * 0.05);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3 * Math.exp(-i / (bufferSize * 0.2));
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1500;
    const gain = ctx.createGain();
    gain.gain.value = 0.3;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(now);
    source.stop(now + 0.05);

    // Thud
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now + 0.02);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.15, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(gain2).connect(ctx.destination);
    osc.start(now + 0.02);
    osc.stop(now + 0.12);
  }

  // Metallic chip clink
  private playChipBet() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    // Multiple metallic clicks
    const freqs = [4000, 3200, 2800];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const start = now + i * 0.03;
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.06);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.06);
    });

    // Low body
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 300;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Satisfying win sound - ascending chips cascade
  private playChipWin() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    // Ascending chip cascade
    const notes = [523, 659, 784, 988, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const start = now + i * 0.08;
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.15);

      // Metallic overtone
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2.5;
      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0.08, start);
      gain2.gain.exponentialRampToValueAtTime(0.01, start + 0.08);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(start);
      osc2.stop(start + 0.08);
    });
  }

  // Soft knock/tap
  private playCheck() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);

    // Wooden knock body
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 150;
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.12, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.05);
  }

  // Cards tossed onto table
  private playFold() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const duration = 0.15;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * 0.25 * Math.exp(-t * 5);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(now);
    source.stop(now + duration);
  }

  // Dramatic all-in sound
  private playAllIn() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    // Rising sweep
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.25);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.setValueAtTime(0.18, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.linearRampToValueAtTime(3000, now + 0.25);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);

    // Impact
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(200, now + 0.25);
    osc2.frequency.exponentialRampToValueAtTime(60, now + 0.5);
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.25, now + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.25);
    osc2.stop(now + 0.5);
  }

  // Urgent tick
  private playTimerWarning() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);

    // Second tick
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 1200;
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.2, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.12);
  }

  // Two-tone notification
  private playYourTurn() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    const notes = [660, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const start = now + i * 0.15;
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.12);
    });
  }
}

// Table view instance: sounds ON by default
export const tableSoundManager = new SoundManager(true);

// Player view instance: sounds OFF by default
export const playerSoundManager = new SoundManager(false);
