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
  private _soloSteps: Set<number> = new Set();

  onStepChange?: (stepIndex: number) => void;
  onComplete?: () => void;

  constructor(socket: MockSocket, scenario: Scenario) {
    this.socket = socket;
    this.scenario = scenario;
  }

  get currentStepIndex() { return this._currentStepIndex; }
  get isPlaying() { return this.playing; }
  get stepCount() { return this.scenario.steps.length; }
  get soloSteps() { return this._soloSteps; }

  setSpeed(speed: number) { this.speed = speed; }

  setDelayOverride(stepIndex: number, delayMs: number) {
    this.delayOverrides.set(stepIndex, delayMs);
  }

  clearDelayOverrides() { this.delayOverrides.clear(); }

  /** Set steps to loop through. Empty set = play all steps normally. */
  setSoloSteps(steps: Set<number>) {
    this._soloSteps = new Set(steps);
  }

  setScenario(scenario: Scenario) {
    this.stop();
    this.scenario = scenario;
    this._currentStepIndex = -1;
  }

  play() {
    this.playing = true;
    if (this._soloSteps.size > 0) {
      // Start from the first solo step
      const sorted = this.sortedSoloSteps();
      this.executeStep(sorted[0]);
    } else if (this._currentStepIndex === -1) {
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

  seekTo(targetIndex: number) {
    this.stop();
    const clamped = Math.min(targetIndex, this.scenario.steps.length - 1);
    for (let i = 0; i <= clamped; i++) {
      const step = this.scenario.steps[i];
      this.socket.emit(step.event, step.data);
    }
    this._currentStepIndex = clamped;
    this.onStepChange?.(clamped);
  }

  private sortedSoloSteps(): number[] {
    return [...this._soloSteps].sort((a, b) => a - b);
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

    let nextIndex: number;
    const inSoloMode = this._soloSteps.size > 0;

    if (inSoloMode) {
      const sorted = this.sortedSoloSteps();
      const pos = sorted.indexOf(index);
      // Next solo step, or wrap to first
      nextIndex = sorted[(pos + 1) % sorted.length];
    } else {
      nextIndex = index + 1;
    }

    // Solo mode with 0 delay: use minimum 500ms to avoid infinite loop
    const effectiveDelay = inSoloMode && scaledDelay === 0 ? 500 : scaledDelay;

    if (effectiveDelay === 0) {
      this.executeStep(nextIndex);
    } else {
      this.timer = setTimeout(() => {
        this.executeStep(nextIndex);
      }, effectiveDelay);
    }
  }
}
