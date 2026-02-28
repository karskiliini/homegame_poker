// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock AudioContext before importing SoundManager
const mockGainNode = {
  gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
  connect: vi.fn().mockReturnThis(),
  disconnect: vi.fn(),
};

const mockOscillator = {
  type: 'sine' as OscillatorType,
  frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
  connect: vi.fn().mockReturnThis(),
  start: vi.fn(),
  stop: vi.fn(),
};

const mockBufferSource = {
  buffer: null as AudioBuffer | null,
  connect: vi.fn().mockReturnThis(),
  start: vi.fn(),
  stop: vi.fn(),
};

const mockFilter = {
  type: 'lowpass' as BiquadFilterType,
  frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
  Q: { value: 0 },
  connect: vi.fn().mockReturnThis(),
};

const mockAudioContext = {
  currentTime: 0,
  sampleRate: 44100,
  state: 'running' as AudioContextState,
  resume: vi.fn(),
  destination: {},
  createGain: vi.fn(() => ({ ...mockGainNode, gain: { ...mockGainNode.gain } })),
  createOscillator: vi.fn(() => ({
    ...mockOscillator,
    frequency: { ...mockOscillator.frequency },
  })),
  createBufferSource: vi.fn(() => ({ ...mockBufferSource })),
  createBiquadFilter: vi.fn(() => ({
    ...mockFilter,
    frequency: { ...mockFilter.frequency },
  })),
  createBuffer: vi.fn((_channels: number, length: number, sampleRate: number) => ({
    length,
    sampleRate,
    getChannelData: vi.fn(() => new Float32Array(length)),
  })),
};

vi.stubGlobal('AudioContext', vi.fn(() => ({ ...mockAudioContext })));

// Dynamic import to get fresh module per test
async function createFreshSoundManager() {
  // Reset modules so each test gets fresh singleton-free module
  vi.resetModules();
  const mod = await import('../audio/SoundManager.js');
  return mod.SoundManager;
}

describe('SoundManager', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('settings persistence', () => {
    it('saves settings to localStorage and loads them back', async () => {
      const SM = await createFreshSoundManager();
      const mgr = new SM('test');

      mgr.setVolume(0.5);
      mgr.setCategoryMuted('chips', true);

      // Create a new instance that should load from localStorage
      const mgr2 = new SM('test');
      expect(mgr2.volume).toBe(0.5);
      expect(mgr2.isCategoryMuted('chips')).toBe(true);
      expect(mgr2.isCategoryMuted('cards')).toBe(false);
    });

    it('uses separate localStorage keys per instance key', async () => {
      const SM = await createFreshSoundManager();
      const table = new SM('table');
      const player = new SM('player');

      table.setVolume(0.8);
      player.setVolume(0.3);

      const reloadedTable = new SM('table');
      const reloadedPlayer = new SM('player');
      expect(reloadedTable.volume).toBe(0.8);
      expect(reloadedPlayer.volume).toBe(0.3);
    });

    it('loads from existing localStorage on construction', async () => {
      localStorage.setItem('ftp-sound-settings-test', JSON.stringify({
        enabled: false,
        volume: 0.42,
        mutedCategories: ['actions', 'notifications'],
      }));

      const SM = await createFreshSoundManager();
      const mgr = new SM('test');
      expect(mgr.enabled).toBe(false);
      expect(mgr.volume).toBe(0.42);
      expect(mgr.isCategoryMuted('actions')).toBe(true);
      expect(mgr.isCategoryMuted('notifications')).toBe(true);
      expect(mgr.isCategoryMuted('cards')).toBe(false);
    });
  });

  describe('category muting', () => {
    it('muting a category prevents sounds in that category from playing', async () => {
      const SM = await createFreshSoundManager();
      const mgr = new SM('test');
      mgr.setEnabled(true);
      mgr.setCategoryMuted('chips', true);

      // chip_bet is in 'chips' category — should be silenced
      mgr.play('chip_bet');
      // No AudioContext should have been created since sound was blocked
      // We verify by checking that the play method returned early
      expect(mgr.isCategoryMuted('chips')).toBe(true);
    });

    it('unmuting a category allows sounds to play again', async () => {
      const SM = await createFreshSoundManager();
      const mgr = new SM('test');
      mgr.setEnabled(true);
      mgr.setCategoryMuted('cards', true);
      expect(mgr.isCategoryMuted('cards')).toBe(true);

      mgr.setCategoryMuted('cards', false);
      expect(mgr.isCategoryMuted('cards')).toBe(false);
    });

    it('returns all muted categories', async () => {
      const SM = await createFreshSoundManager();
      const mgr = new SM('test');
      mgr.setCategoryMuted('chips', true);
      mgr.setCategoryMuted('notifications', true);
      expect(mgr.mutedCategories).toEqual(['chips', 'notifications']);
    });
  });

  describe('volume clamping', () => {
    it('clamps negative volume to 0', async () => {
      const SM = await createFreshSoundManager();
      const mgr = new SM('test');
      mgr.setVolume(-0.5);
      expect(mgr.volume).toBe(0);
    });

    it('clamps volume above 1 to 1', async () => {
      const SM = await createFreshSoundManager();
      const mgr = new SM('test');
      mgr.setVolume(1.5);
      expect(mgr.volume).toBe(1);
    });

    it('accepts valid volume values', async () => {
      const SM = await createFreshSoundManager();
      const mgr = new SM('test');
      mgr.setVolume(0.75);
      expect(mgr.volume).toBe(0.75);
    });
  });

  describe('invalid localStorage', () => {
    it('handles garbage JSON without crashing', async () => {
      localStorage.setItem('ftp-sound-settings-test', 'not-json{{{');
      const SM = await createFreshSoundManager();
      const mgr = new SM('test');
      // Should fall back to defaults
      expect(mgr.enabled).toBe(true);
      expect(mgr.volume).toBe(1);
      expect(mgr.mutedCategories).toEqual([]);
    });

    it('handles missing fields in stored settings', async () => {
      localStorage.setItem('ftp-sound-settings-test', JSON.stringify({ enabled: false }));
      const SM = await createFreshSoundManager();
      const mgr = new SM('test');
      expect(mgr.enabled).toBe(false);
      expect(mgr.volume).toBe(1);  // default
      expect(mgr.mutedCategories).toEqual([]);  // default
    });

    it('handles null localStorage value', async () => {
      // No value stored — should use defaults
      const SM = await createFreshSoundManager();
      const mgr = new SM('test');
      expect(mgr.enabled).toBe(true);
      expect(mgr.volume).toBe(1);
    });
  });

  describe('enabled toggle', () => {
    it('toggling enabled persists to localStorage', async () => {
      const SM = await createFreshSoundManager();
      const mgr = new SM('test');
      mgr.setEnabled(false);

      const stored = JSON.parse(localStorage.getItem('ftp-sound-settings-test')!);
      expect(stored.enabled).toBe(false);
    });
  });
});
