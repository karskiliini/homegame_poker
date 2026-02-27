export class ActionTimer {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private deadline: number = 0;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;

  start(
    durationSeconds: number,
    onTimeout: () => void,
    onTick?: (remaining: number) => void,
  ) {
    this.cancel();
    this.deadline = Date.now() + durationSeconds * 1000;

    this.timer = setTimeout(() => {
      this.cancel();
      onTimeout();
    }, durationSeconds * 1000);

    if (onTick) {
      this.intervalTimer = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((this.deadline - Date.now()) / 1000));
        onTick(remaining);
      }, 1000);
    }
  }

  cancel() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  getRemaining(): number {
    return Math.max(0, Math.ceil((this.deadline - Date.now()) / 1000));
  }
}
