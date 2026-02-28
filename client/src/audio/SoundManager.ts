import type { SoundType } from '@poker/shared';
import type { SoundParams } from '../themes/types.js';
import { basicTheme } from '../themes/basic.js';

class SoundManager {
  private ctx: AudioContext | null = null;
  private _enabled: boolean;
  private params: SoundParams;

  constructor(defaultEnabled: boolean) {
    this._enabled = defaultEnabled;
    this.params = basicTheme.soundParams;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  setEnabled(enabled: boolean) {
    this._enabled = enabled;
  }

  setParams(params: SoundParams) {
    this.params = params;
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
    const p = this.params.cardDeal;

    const bufferSize = Math.floor(ctx.sampleRate * p.duration);
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
    filter.frequency.value = p.filterFreq;
    filter.Q.value = p.filterQ;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(p.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + p.duration);

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(now);
    source.stop(now + p.duration);
  }

  // Card flip with body
  private playCardFlip() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const p = this.params.cardFlip;

    // Snap
    const bufferSize = Math.floor(ctx.sampleRate * p.snapDuration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3 * Math.exp(-i / (bufferSize * 0.2));
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = p.snapFilterFreq;
    const gain = ctx.createGain();
    gain.gain.value = p.snapGain;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(now);
    source.stop(now + p.snapDuration);

    // Thud
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(p.thudFreqStart, now + 0.02);
    osc.frequency.exponentialRampToValueAtTime(p.thudFreqEnd, now + p.thudDuration);
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(p.thudGain, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + p.thudDuration);
    osc.connect(gain2).connect(ctx.destination);
    osc.start(now + 0.02);
    osc.stop(now + p.thudDuration);
  }

  // Metallic chip clink
  private playChipBet() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const p = this.params.chipBet;

    // Multiple metallic clicks
    p.freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const start = now + i * p.freqGap;
      gain.gain.setValueAtTime(p.freqGain, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + p.freqDuration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + p.freqDuration);
    });

    // Low body
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = p.bodyFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(p.bodyGain, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Satisfying win sound - ascending chips cascade
  private playChipWin() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const p = this.params.chipWin;

    // Ascending chip cascade
    p.notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const start = now + i * p.noteGap;
      gain.gain.setValueAtTime(p.noteGain, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + p.noteDuration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + p.noteDuration);

      // Metallic overtone
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * p.overtoneMultiplier;
      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(p.overtoneGain, start);
      gain2.gain.exponentialRampToValueAtTime(0.01, start + p.noteGap);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(start);
      osc2.stop(start + p.noteGap);
    });
  }

  // Soft knock/tap
  private playCheck() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const p = this.params.check;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(p.freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(p.freqEnd, now + p.duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(p.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + p.duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + p.duration);

    // Wooden knock body
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = p.bodyFreq;
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(p.bodyGain, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.05);
  }

  // Cards tossed onto table
  private playFold() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const p = this.params.fold;

    const bufferSize = Math.floor(ctx.sampleRate * p.duration);
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
    filter.frequency.setValueAtTime(p.filterStart, now);
    filter.frequency.exponentialRampToValueAtTime(p.filterEnd, now + p.duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(p.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + p.duration);

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(now);
    source.stop(now + p.duration);
  }

  // Dramatic all-in sound
  private playAllIn() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const p = this.params.allIn;

    // Rising sweep
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(p.sweepFreqStart, now);
    osc.frequency.exponentialRampToValueAtTime(p.sweepFreqEnd, now + p.sweepDuration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(p.sweepGain, now);
    gain.gain.setValueAtTime(p.sweepGain * 1.2, now + p.sweepDuration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.01, now + p.sweepDuration + 0.05);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.linearRampToValueAtTime(3000, now + p.sweepDuration);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + p.sweepDuration + 0.05);

    // Impact
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(p.impactFreqStart, now + p.sweepDuration);
    osc2.frequency.exponentialRampToValueAtTime(p.impactFreqEnd, now + p.sweepDuration + p.impactDuration);
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(p.impactGain, now + p.sweepDuration);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + p.sweepDuration + p.impactDuration);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + p.sweepDuration);
    osc2.stop(now + p.sweepDuration + p.impactDuration);
  }

  // Urgent tick
  private playTimerWarning() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const p = this.params.timerWarning;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = p.freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(p.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + p.tickDuration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + p.tickDuration);

    // Second tick
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = p.freq;
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(p.gain, now + p.tickGap);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + p.tickGap + p.tickDuration);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + p.tickGap);
    osc2.stop(now + p.tickGap + p.tickDuration);
  }

  // Two-tone notification
  private playYourTurn() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const p = this.params.yourTurn;

    p.notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const start = now + i * p.noteGap;
      gain.gain.setValueAtTime(p.gain, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + p.noteDuration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + p.noteDuration);
    });
  }
}

// Table view instance: sounds ON by default
export const tableSoundManager = new SoundManager(true);

// Player view instance: sounds OFF by default
export const playerSoundManager = new SoundManager(false);
