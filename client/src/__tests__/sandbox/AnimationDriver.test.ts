import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MockSocket } from '../../views/sandbox/MockSocket.js';
import { AnimationDriver } from '../../views/sandbox/AnimationDriver.js';
import type { Scenario } from '../../views/sandbox/types.js';

const testScenario: Scenario = {
  id: 'test',
  name: 'Test',
  description: 'Test scenario',
  steps: [
    { name: 'Step 1', event: 'evt:a', data: { value: 1 }, delayAfterMs: 100 },
    { name: 'Step 2', event: 'evt:b', data: { value: 2 }, delayAfterMs: 200 },
    { name: 'Step 3', event: 'evt:c', data: { value: 3 }, delayAfterMs: 0 },
  ],
};

describe('AnimationDriver', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('emits first step immediately on play', () => {
    const socket = new MockSocket();
    const handler = vi.fn();
    socket.on('evt:a', handler);
    const driver = new AnimationDriver(socket, testScenario);
    driver.play();
    expect(handler).toHaveBeenCalledWith({ value: 1 });
  });

  it('emits subsequent steps after their delays', () => {
    const socket = new MockSocket();
    const hB = vi.fn();
    socket.on('evt:b', hB);
    const driver = new AnimationDriver(socket, testScenario);
    driver.play();
    expect(hB).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(hB).toHaveBeenCalledWith({ value: 2 });
  });

  it('respects speed multiplier', () => {
    const socket = new MockSocket();
    const hB = vi.fn();
    socket.on('evt:b', hB);
    const driver = new AnimationDriver(socket, testScenario);
    driver.setSpeed(2);
    driver.play();
    vi.advanceTimersByTime(49);
    expect(hB).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(hB).toHaveBeenCalled();
  });

  it('pause() stops progression', () => {
    const socket = new MockSocket();
    const hB = vi.fn();
    socket.on('evt:b', hB);
    const driver = new AnimationDriver(socket, testScenario);
    driver.play();
    driver.pause();
    vi.advanceTimersByTime(500);
    expect(hB).not.toHaveBeenCalled();
  });

  it('reports current step index', () => {
    const socket = new MockSocket();
    const driver = new AnimationDriver(socket, testScenario);
    expect(driver.currentStepIndex).toBe(-1);
    driver.play();
    expect(driver.currentStepIndex).toBe(0);
    vi.advanceTimersByTime(100);
    expect(driver.currentStepIndex).toBe(1);
  });

  it('calls onStepChange callback', () => {
    const socket = new MockSocket();
    const driver = new AnimationDriver(socket, testScenario);
    const cb = vi.fn();
    driver.onStepChange = cb;
    driver.play();
    expect(cb).toHaveBeenCalledWith(0);
    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledWith(1);
  });

  it('calls onComplete when scenario finishes', () => {
    const socket = new MockSocket();
    const driver = new AnimationDriver(socket, testScenario);
    const cb = vi.fn();
    driver.onComplete = cb;
    driver.play();
    vi.advanceTimersByTime(100); // step 2
    vi.advanceTimersByTime(200); // step 3
    expect(cb).toHaveBeenCalled();
  });

  it('restart() replays from beginning', () => {
    const socket = new MockSocket();
    const hA = vi.fn();
    socket.on('evt:a', hA);
    const driver = new AnimationDriver(socket, testScenario);
    driver.play();
    vi.advanceTimersByTime(300);
    driver.restart();
    expect(hA).toHaveBeenCalledTimes(2);
    expect(driver.currentStepIndex).toBe(0);
  });

  it('respects delay overrides', () => {
    const socket = new MockSocket();
    const hB = vi.fn();
    socket.on('evt:b', hB);
    const driver = new AnimationDriver(socket, testScenario);
    driver.setDelayOverride(0, 500);
    driver.play();
    vi.advanceTimersByTime(100);
    expect(hB).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(hB).toHaveBeenCalled();
  });
});
