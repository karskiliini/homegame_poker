// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock AudioContext
vi.stubGlobal('AudioContext', vi.fn(() => ({
  currentTime: 0,
  sampleRate: 44100,
  state: 'running',
  resume: vi.fn(),
  destination: {},
  createGain: vi.fn(() => ({
    gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn().mockReturnThis(),
  })),
  createOscillator: vi.fn(() => ({
    type: 'sine',
    frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn().mockReturnThis(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    connect: vi.fn().mockReturnThis(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createBiquadFilter: vi.fn(() => ({
    type: 'lowpass',
    frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    Q: { value: 0 },
    connect: vi.fn().mockReturnThis(),
  })),
  createBuffer: vi.fn((_c: number, len: number, sr: number) => ({
    length: len,
    sampleRate: sr,
    getChannelData: vi.fn(() => new Float32Array(len)),
  })),
})));

// We need to import React for JSX
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { SoundManager } from '../audio/SoundManager.js';

// Mock the useT hook
vi.mock('../hooks/useT.js', () => ({
  useT: () => (key: string) => key,
}));

async function renderComponent(soundManager: SoundManager) {
  // Dynamic import so mocks are in place
  const { SoundToggle } = await import('../components/SoundToggle.js');
  const container = document.createElement('div');
  document.body.appendChild(container);

  let root: ReturnType<typeof createRoot>;
  await act(async () => {
    root = createRoot(container);
    root.render(React.createElement(SoundToggle, { soundManager }));
  });

  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      document.body.removeChild(container);
    },
  };
}

describe('SoundToggle', () => {
  let mgr: SoundManager;

  beforeEach(() => {
    localStorage.clear();
    mgr = new SoundManager('test-toggle');
    // Clean up any leftover DOM
    document.body.innerHTML = '';
  });

  it('renders a speaker icon button', async () => {
    const { container, cleanup } = await renderComponent(mgr);
    const btn = container.querySelector('button');
    expect(btn).not.toBeNull();
    const svg = btn!.querySelector('svg');
    expect(svg).not.toBeNull();
    cleanup();
  });

  it('clicking the speaker icon opens the settings panel', async () => {
    const { container, cleanup } = await renderComponent(mgr);
    const btn = container.querySelector('button')!;

    await act(async () => {
      btn.click();
    });

    // Panel should now be visible (has a volume slider)
    const slider = container.querySelector('input[type="range"]');
    expect(slider).not.toBeNull();
    cleanup();
  });

  it('volume slider updates the soundManager', async () => {
    const { container, cleanup } = await renderComponent(mgr);
    const btn = container.querySelector('button')!;

    await act(async () => { btn.click(); });

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(slider).not.toBeNull();

    // Simulate volume change
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )!.set!;
      nativeInputValueSetter.call(slider, '0.5');
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(mgr.volume).toBe(0.5);
    cleanup();
  });

  it('category toggle updates soundManager', async () => {
    const { container, cleanup } = await renderComponent(mgr);
    const btn = container.querySelector('button')!;

    await act(async () => { btn.click(); });

    // Find category toggle wrappers with data-category attribute
    const categoryDivs = container.querySelectorAll('[data-category]');
    expect(categoryDivs.length).toBe(4);

    // Click the button inside the first category toggle (cards)
    const cardsToggleBtn = categoryDivs[0].querySelector('button')!;
    await act(async () => {
      cardsToggleBtn.click();
    });

    expect(mgr.isCategoryMuted('cards')).toBe(true);
    cleanup();
  });

  it('clicking outside the panel closes it', async () => {
    const { container, cleanup } = await renderComponent(mgr);
    const btn = container.querySelector('button')!;

    await act(async () => { btn.click(); });

    // Panel should be open
    expect(container.querySelector('input[type="range"]')).not.toBeNull();

    // Click outside (on document body)
    await act(async () => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    // Panel should be closed
    expect(container.querySelector('input[type="range"]')).toBeNull();
    cleanup();
  });
});
