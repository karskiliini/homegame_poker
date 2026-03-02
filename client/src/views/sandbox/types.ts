export interface ScenarioStep {
  /** Display name shown in the phase indicator */
  name: string;
  /** Socket event name (e.g. 'table:game_state') */
  event: string;
  /** Event payload */
  data: any;
  /** Default delay (ms) AFTER this step before the next one fires */
  delayAfterMs: number;
  /** Which server delay constant this step's delay corresponds to (for slider binding) */
  delayKey?: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  steps: ScenarioStep[];
}
