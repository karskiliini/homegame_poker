import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnimationDriver } from '../views/editor/AnimationDriver.js';
import { MockSocket } from '../views/editor/MockSocket.js';
import type { Scenario } from '../views/editor/types.js';

const testScenario: Scenario = {
  id: 'test',
  name: 'Test',
  description: 'Test scenario',
  steps: [
    { name: 'Step 0', event: 'table:game_state', data: { step: 0 }, delayAfterMs: 500 },
    { name: 'Step 1', event: 'table:player_action', data: { step: 1 }, delayAfterMs: 300 },
    { name: 'Step 2', event: 'table:game_state', data: { step: 2 }, delayAfterMs: 200 },
    { name: 'Step 3', event: 'table:pot_award', data: { step: 3 }, delayAfterMs: 0 },
  ],
};

describe('AnimationDriver', () => {
  let socket: MockSocket;
  let driver: AnimationDriver;

  beforeEach(() => {
    socket = new MockSocket();
    driver = new AnimationDriver(socket, testScenario);
  });

  describe('seekTo', () => {
    it('emits all steps from 0 to target index synchronously', () => {
      const emitted: { event: string; data: any }[] = [];
      const origEmit = socket.emit.bind(socket);
      socket.emit = (event: string, ...args: any[]) => {
        emitted.push({ event, data: args[0] });
        origEmit(event, ...args);
      };

      driver.seekTo(2);

      expect(emitted).toEqual([
        { event: 'table:game_state', data: { step: 0 } },
        { event: 'table:player_action', data: { step: 1 } },
        { event: 'table:game_state', data: { step: 2 } },
      ]);
    });

    it('sets currentStepIndex to target', () => {
      driver.seekTo(2);
      expect(driver.currentStepIndex).toBe(2);
    });

    it('calls onStepChange with target index', () => {
      const onChange = vi.fn();
      driver.onStepChange = onChange;
      driver.seekTo(2);
      expect(onChange).toHaveBeenCalledWith(2);
    });

    it('stops playback before seeking', () => {
      driver.play();
      expect(driver.isPlaying).toBe(true);
      driver.seekTo(1);
      expect(driver.isPlaying).toBe(false);
    });

    it('seekTo(0) emits only step 0', () => {
      const emitted: string[] = [];
      const origEmit = socket.emit.bind(socket);
      socket.emit = (event: string, ...args: any[]) => {
        emitted.push(event);
        origEmit(event, ...args);
      };
      driver.seekTo(0);
      expect(emitted).toEqual(['table:game_state']);
    });

    it('clamps to last step index', () => {
      driver.seekTo(99);
      expect(driver.currentStepIndex).toBe(3);
    });
  });
});
