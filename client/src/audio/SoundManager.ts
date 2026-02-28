import type { SoundType, SoundCategory } from '@poker/shared';
import { SOUND_CATEGORIES } from '@poker/shared';
import type { SoundParams } from '../themes/types.js';
import { basicTheme } from '../themes/basic.js';

interface SoundSettings {
  enabled: boolean;
  volume: number;
  mutedCategories: SoundCategory[];
}

const DEFAULTS: SoundSettings = { enabled: true, volume: 1, mutedCategories: [] };

function loadSettings(key: string): SoundSettings {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULTS.enabled,
      volume: typeof parsed.volume === 'number' ? parsed.volume : DEFAULTS.volume,
      mutedCategories: Array.isArray(parsed.mutedCategories) ? parsed.mutedCategories : DEFAULTS.mutedCategories,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private _settings: SoundSettings;
  private storageKey: string;
  private params: SoundParams;

  constructor(instanceKey: string) {
    this.storageKey = `ftp-sound-settings-${instanceKey}`;
    this._settings = loadSettings(this.storageKey);
    this.params = basicTheme.soundParams;
  }

  private persist() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this._settings));
    } catch { /* localStorage may be unavailable */ }
  }

  // --- Public getters/setters ---

  get enabled(): boolean { return this._settings.enabled; }

  setEnabled(enabled: boolean) {
    this._settings.enabled = enabled;
    this.persist();
  }

  get volume(): number { return this._settings.volume; }

  setVolume(vol: number) {
    this._settings.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain) {
      this.masterGain.gain.value = this._settings.volume;
    }
    this.persist();
  }

  get mutedCategories(): SoundCategory[] { return [...this._settings.mutedCategories]; }

  isCategoryMuted(cat: SoundCategory): boolean {
    return this._settings.mutedCategories.includes(cat);
  }

  setCategoryMuted(cat: SoundCategory, muted: boolean) {
    const idx = this._settings.mutedCategories.indexOf(cat);
    if (muted && idx === -1) {
      this._settings.mutedCategories.push(cat);
    } else if (!muted && idx !== -1) {
      this._settings.mutedCategories.splice(idx, 1);
    }
    this.persist();
  }

  setParams(params: SoundParams) {
    this.params = params;
  }

  // --- Audio routing ---

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._settings.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /** Master output — all sound sources connect here instead of ctx.destination */
  private get out(): AudioNode {
    this.getCtx();
    return this.masterGain!;
  }

  play(sound: SoundType) {
    if (!this._settings.enabled) return;

    const cat = SOUND_CATEGORIES[sound];
    if (this._settings.mutedCategories.includes(cat)) return;

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

  // --- Improved synthesis ---

  private playCardDeal() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const p = this.params.cardDeal;

    // Onset click — short sine burst
    const clickOsc = ctx.createOscillator();
    clickOsc.type = 'sine';
    clickOsc.frequency.value = 2000;
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.3, now);
    clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.008);
    clickOsc.connect(clickGain).connect(this.out);
    clickOsc.start(now);
    clickOsc.stop(now + 0.008);

    // Highpass snap noise
    const snapSize = Math.floor(ctx.sampleRate * 0.03);
    const snapBuf = ctx.createBuffer(1, snapSize, ctx.sampleRate);
    const snapData = snapBuf.getChannelData(0);
    for (let i = 0; i < snapSize; i++) {
      snapData[i] = (Math.random() * 2 - 1) * 0.35 * Math.exp(-i / (snapSize * 0.15));
    }
    const snapSrc = ctx.createBufferSource();
    snapSrc.buffer = snapBuf;
    const snapFilter = ctx.createBiquadFilter();
    snapFilter.type = 'highpass';
    snapFilter.frequency.value = 3000;
    const snapGain = ctx.createGain();
    snapGain.gain.setValueAtTime(0.25, now);
    snapGain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
    snapSrc.connect(snapFilter).connect(snapGain).connect(this.out);
    snapSrc.start(now);
    snapSrc.stop(now + 0.03);

    // Lowpass body slide noise
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
    source.connect(filter).connect(gain).connect(this.out);
    source.start(now);
    source.stop(now + p.duration);
  }

  private playCardFlip() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const p = this.params.cardFlip;

    // Snap — highpass noise
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
    source.connect(filter).connect(gain).connect(this.out);
    source.start(now);
    source.stop(now + p.snapDuration);

    // Paper-flap middle layer — bandpass noise sweep
    const flapSize = Math.floor(ctx.sampleRate * 0.04);
    const flapBuf = ctx.createBuffer(1, flapSize, ctx.sampleRate);
    const flapData = flapBuf.getChannelData(0);
    for (let i = 0; i < flapSize; i++) {
      const t = i / flapSize;
      flapData[i] = (Math.random() * 2 - 1) * 0.2 * (1 - t);
    }
    const flapSrc = ctx.createBufferSource();
    flapSrc.buffer = flapBuf;
    const flapFilter = ctx.createBiquadFilter();
    flapFilter.type = 'bandpass';
    flapFilter.frequency.setValueAtTime(800, now + 0.01);
    flapFilter.frequency.linearRampToValueAtTime(2000, now + 0.05);
    flapFilter.Q.value = 2;
    const flapGain = ctx.createGain();
    flapGain.gain.setValueAtTime(0.15, now + 0.01);
    flapGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    flapSrc.connect(flapFilter).connect(flapGain).connect(this.out);
    flapSrc.start(now + 0.01);
    flapSrc.stop(now + 0.05);

    // Thud
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(p.thudFreqStart, now + 0.02);
    osc.frequency.exponentialRampToValueAtTime(p.thudFreqEnd, now + p.thudDuration);
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(p.thudGain, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + p.thudDuration);
    osc.connect(gain2).connect(this.out);
    osc.start(now + 0.02);
    osc.stop(now + p.thudDuration);
  }

  private playChipBet() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const p = this.params.chipBet;

    // Inharmonic ceramic partials
    const partials = [1.0, 2.76, 5.4, 8.9];
    const baseFreq = p.freqs[0] || 2200;
    partials.forEach((mult, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = baseFreq * mult;
      const gain = ctx.createGain();
      const vol = p.freqGain * (1 - i * 0.2);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + p.freqDuration * (1 - i * 0.15));
      osc.connect(gain).connect(this.out);
      osc.start(now);
      osc.stop(now + p.freqDuration);
    });

    // Noise impact transient
    const noiseSize = Math.floor(ctx.sampleRate * 0.015);
    const noiseBuf = ctx.createBuffer(1, noiseSize, ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseSize; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.25 * Math.exp(-i / (noiseSize * 0.1));
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 4000;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.015);
    noiseSrc.connect(noiseFilter).connect(noiseGain).connect(this.out);
    noiseSrc.start(now);
    noiseSrc.stop(now + 0.015);

    // Low body
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = p.bodyFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(p.bodyGain, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain).connect(this.out);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  private playChipWin() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const p = this.params.chipWin;

    p.notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const start = now + i * p.noteGap;
      gain.gain.setValueAtTime(p.noteGain, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + p.noteDuration);
      osc.connect(gain).connect(this.out);
      osc.start(start);
      osc.stop(start + p.noteDuration);

      // Metallic overtone
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * p.overtoneMultiplier;
      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(p.overtoneGain, start);
      gain2.gain.exponentialRampToValueAtTime(0.01, start + p.noteGap);
      osc2.connect(gain2).connect(this.out);
      osc2.start(start);
      osc2.stop(start + p.noteGap);

      // Resonant noise clink texture
      const clinkSize = Math.floor(ctx.sampleRate * 0.02);
      const clinkBuf = ctx.createBuffer(1, clinkSize, ctx.sampleRate);
      const clinkData = clinkBuf.getChannelData(0);
      for (let j = 0; j < clinkSize; j++) {
        clinkData[j] = (Math.random() * 2 - 1) * 0.1 * Math.exp(-j / (clinkSize * 0.15));
      }
      const clinkSrc = ctx.createBufferSource();
      clinkSrc.buffer = clinkBuf;
      const clinkFilter = ctx.createBiquadFilter();
      clinkFilter.type = 'bandpass';
      clinkFilter.frequency.value = freq * 2;
      clinkFilter.Q.value = 8;
      const clinkGain = ctx.createGain();
      clinkGain.gain.setValueAtTime(0.08, start);
      clinkGain.gain.exponentialRampToValueAtTime(0.01, start + 0.02);
      clinkSrc.connect(clinkFilter).connect(clinkGain).connect(this.out);
      clinkSrc.start(start);
      clinkSrc.stop(start + 0.02);
    });
  }

  private playCheck() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const p = this.params.check;

    // Double knock — two taps 50ms apart
    for (let tap = 0; tap < 2; tap++) {
      const offset = tap * 0.05;
      const vol = tap === 0 ? 1.0 : 0.7;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.freqStart, now + offset);
      osc.frequency.exponentialRampToValueAtTime(p.freqEnd, now + offset + p.duration);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(p.gain * vol, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, now + offset + p.duration);
      osc.connect(gain).connect(this.out);
      osc.start(now + offset);
      osc.stop(now + offset + p.duration);

      // Wooden knock body
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = p.bodyFreq;
      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(p.bodyGain * vol, now + offset);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.05);
      osc2.connect(gain2).connect(this.out);
      osc2.start(now + offset);
      osc2.stop(now + offset + 0.05);
    }
  }

  private playFold() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const p = this.params.fold;

    // Two staggered card-toss swooshes (60ms apart)
    for (let card = 0; card < 2; card++) {
      const offset = card * 0.06;
      const vol = card === 0 ? 1.0 : 0.8;

      const bufferSize = Math.floor(ctx.sampleRate * p.duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        data[i] = (Math.random() * 2 - 1) * 0.25 * vol * Math.exp(-t * 5);
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(p.filterStart, now + offset);
      filter.frequency.exponentialRampToValueAtTime(p.filterEnd, now + offset + p.duration);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(p.gain * vol, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, now + offset + p.duration);
      source.connect(filter).connect(gain).connect(this.out);
      source.start(now + offset);
      source.stop(now + offset + p.duration);
    }
  }

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
    osc.connect(filter).connect(gain).connect(this.out);
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
    osc2.connect(gain2).connect(this.out);
    osc2.start(now + p.sweepDuration);
    osc2.stop(now + p.sweepDuration + p.impactDuration);

    // Resonant gong ring
    const gongStart = now + p.sweepDuration;
    [220, 550].forEach((freq) => {
      const gongOsc = ctx.createOscillator();
      gongOsc.type = 'sine';
      gongOsc.frequency.value = freq;
      const gongGain = ctx.createGain();
      gongGain.gain.setValueAtTime(0.08, gongStart);
      gongGain.gain.exponentialRampToValueAtTime(0.01, gongStart + 0.5);
      gongOsc.connect(gongGain).connect(this.out);
      gongOsc.start(gongStart);
      gongOsc.stop(gongStart + 0.5);
    });

    // Sub-bass rumble
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.value = 40;
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.12, gongStart);
    subGain.gain.exponentialRampToValueAtTime(0.01, gongStart + 0.2);
    subOsc.connect(subGain).connect(this.out);
    subOsc.start(gongStart);
    subOsc.stop(gongStart + 0.2);
  }

  private playTimerWarning() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const p = this.params.timerWarning;

    // Detuned sine pair for clock-like beating effect
    [p.freq, p.freq + 3].forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(p.gain * 0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + p.tickDuration);
      osc.connect(gain).connect(this.out);
      osc.start(now);
      osc.stop(now + p.tickDuration);
    });

    // Second tick — also detuned pair
    [p.freq, p.freq + 3].forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(p.gain * 0.6, now + p.tickGap);
      gain.gain.exponentialRampToValueAtTime(0.01, now + p.tickGap + p.tickDuration);
      osc.connect(gain).connect(this.out);
      osc.start(now + p.tickGap);
      osc.stop(now + p.tickGap + p.tickDuration);
    });
  }

  private playYourTurn() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const p = this.params.yourTurn;

    p.notes.forEach((freq, i) => {
      // Main tone — triangle wave for softer character
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const start = now + i * p.noteGap;
      gain.gain.setValueAtTime(p.gain, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + p.noteDuration);
      osc.connect(gain).connect(this.out);
      osc.start(start);
      osc.stop(start + p.noteDuration);

      // Quiet delayed echo at 30% volume
      const echoOsc = ctx.createOscillator();
      echoOsc.type = 'triangle';
      echoOsc.frequency.value = freq;
      const echoGain = ctx.createGain();
      const echoStart = start + 0.02;
      echoGain.gain.setValueAtTime(p.gain * 0.3, echoStart);
      echoGain.gain.exponentialRampToValueAtTime(0.01, echoStart + p.noteDuration * 0.7);
      echoOsc.connect(echoGain).connect(this.out);
      echoOsc.start(echoStart);
      echoOsc.stop(echoStart + p.noteDuration * 0.7);
    });
  }
}

// Table view instance: sounds ON by default (loads from localStorage)
export const tableSoundManager = new SoundManager('table');

// Player view instance: sounds OFF by default (loads from localStorage)
export const playerSoundManager = new SoundManager('player');
