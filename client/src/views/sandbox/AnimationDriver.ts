import type { MockSocket } from './MockSocket.js';
import type { Scenario } from './types.js';

export class AnimationDriver {
  private socket: MockSocket;
  private scenario: Scenario;
  private speed = 1;
  private delayOverrides = new Map<number, number>();
  private _currentStepIndex = -1;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private playing = false;

  onStepChange?: (stepIndex: number) => void;
  onComplete?: () => void;

  constructor(socket: MockSocket, scenario: Scenario) {
    this.socket = socket;
    this.scenario = scenario;
  }

  get currentStepIndex() { return this._currentStepIndex; }
  get isPlaying() { return this.playing; }
  get stepCount() { return this.scenario.steps.length; }

  setSpeed(speed: number) { this.speed = speed; }

  setDelayOverride(stepIndex: number, delayMs: number) {
    this.delayOverrides.set(stepIndex, delayMs);
  }

  clearDelayOverrides() { this.delayOverrides.clear(); }

  setScenario(scenario: Scenario) {
    this.stop();
    this.scenario = scenario;
    this._currentStepIndex = -1;
  }

  play() {
    this.playing = true;
    if (this._currentStepIndex === -1) {
      this.executeStep(0);
    } else {
      this.scheduleNext();
    }
  }

  pause() {
    this.playing = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  stop() {
    this.pause();
    this._currentStepIndex = -1;
  }

  restart() {
    this.stop();
    this.play();
  }

  private executeStep(index: number) {
    if (index >= this.scenario.steps.length) {
      this.playing = false;
      this.onComplete?.();
      return;
    }

    this._currentStepIndex = index;
    const step = this.scenario.steps[index];
    this.socket.emit(step.event, step.data);
    this.onStepChange?.(index);
    this.scheduleNext();
  }

  private scheduleNext() {
    if (!this.playing) return;
    const index = this._currentStepIndex;
    const step = this.scenario.steps[index];
    if (!step) return;

    const baseDelay = this.delayOverrides.get(index) ?? step.delayAfterMs;
    const scaledDelay = Math.round(baseDelay / this.speed);

    if (scaledDelay === 0) {
      this.executeStep(index + 1);
    } else {
      this.timer = setTimeout(() => {
        this.executeStep(index + 1);
      }, scaledDelay);
    }
  }
}
