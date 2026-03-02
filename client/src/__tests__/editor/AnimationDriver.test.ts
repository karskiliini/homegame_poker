import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MockSocket } from '../../views/editor/MockSocket.js';
import { AnimationDriver } from '../../views/editor/AnimationDriver.js';
import type { Scenario } from '../../views/editor/types.js';

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

  it('solo step loops the same step repeatedly', () => {
    const socket = new MockSocket();
    const hB = vi.fn();
    socket.on('evt:b', hB);
    const driver = new AnimationDriver(socket, testScenario);
    driver.setSoloSteps(new Set([1]));
    driver.play();
    expect(hB).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(200);
    expect(hB).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(200);
    expect(hB).toHaveBeenCalledTimes(3);
  });

  it('solo step with 0 delay uses minimum 500ms', () => {
    const socket = new MockSocket();
    const hC = vi.fn();
    socket.on('evt:c', hC);
    const driver = new AnimationDriver(socket, testScenario);
    driver.setSoloSteps(new Set([2])); // step 3 has delayAfterMs: 0
    driver.play();
    expect(hC).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(hC).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(400);
    expect(hC).toHaveBeenCalledTimes(2);
  });

  it('multi-step solo loops through selected steps in order', () => {
    const socket = new MockSocket();
    const hA = vi.fn();
    const hC = vi.fn();
    socket.on('evt:a', hA);
    socket.on('evt:c', hC);
    const driver = new AnimationDriver(socket, testScenario);
    driver.setSoloSteps(new Set([0, 2])); // steps 0 and 2
    driver.play();
    // Starts with step 0
    expect(hA).toHaveBeenCalledTimes(1);
    expect(hC).toHaveBeenCalledTimes(0);
    // After step 0 delay (100ms), plays step 2
    vi.advanceTimersByTime(100);
    expect(hC).toHaveBeenCalledTimes(1);
    // Step 2 has 0ms delay → uses 500ms min, then loops back to step 0
    vi.advanceTimersByTime(500);
    expect(hA).toHaveBeenCalledTimes(2);
  });

  it('clearing solo steps resumes normal playback', () => {
    const socket = new MockSocket();
    const driver = new AnimationDriver(socket, testScenario);
    driver.setSoloSteps(new Set([1]));
    expect(driver.soloSteps.size).toBe(1);
    driver.setSoloSteps(new Set());
    expect(driver.soloSteps.size).toBe(0);
  });
});
