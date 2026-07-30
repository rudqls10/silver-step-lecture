/**
 * counter.ts - 운동 횟수 카운팅 모듈 (TypeScript 버전)
 */

export interface ExerciseCounterOptions {
  targetCount?: number;
  milestones?: number[];
  bufferSize?: number;
  onCountUpdate?: (count: number, target: number) => void;
  onMilestone?: (count: number) => void;
  onComplete?: (count: number) => void;
  onCountBeep?: () => void;
}

export class ExerciseCounter {
  targetCount: number;
  count: number;
  lastState: 'UP' | 'DOWN' | null;
  milestones: number[];
  isComplete: boolean;
  stateBuffer: string[];
  bufferSize: number;

  onCountUpdate: (count: number, target: number) => void;
  onMilestone: (count: number) => void;
  onComplete: (count: number) => void;
  onCountBeep: () => void;

  constructor(options: ExerciseCounterOptions = {}) {
    this.targetCount = options.targetCount || 3;
    this.count = 0;
    this.lastState = null;
    this.milestones = options.milestones || [5];
    this.isComplete = false;

    this.stateBuffer = [];
    this.bufferSize = options.bufferSize || 3;

    this.onCountUpdate = options.onCountUpdate || (() => {});
    this.onMilestone = options.onMilestone || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onCountBeep = options.onCountBeep || (() => {});
  }

  update(rawState: string | null) {
    if (!rawState || rawState === 'TRANSITIONING' || rawState === 'NOT_DETECTED' || this.isComplete) return;

    this.stateBuffer.push(rawState);
    if (this.stateBuffer.length > this.bufferSize) {
      this.stateBuffer.shift();
    }

    const state = this._getStableState();
    if (!state || state === this.lastState) return;

    if (this.lastState === 'DOWN' && state === 'UP') {
      this.count++;

      this.onCountBeep();
      this.onCountUpdate(this.count, this.targetCount);

      if (this.milestones.includes(this.count)) {
        this.onMilestone(this.count);
      }

      if (this.count >= this.targetCount) {
        this.isComplete = true;
        this.onComplete(this.count);
      }
    }

    this.lastState = state as 'UP' | 'DOWN';
  }

  private _getStableState(): 'UP' | 'DOWN' | null {
    if (this.stateBuffer.length < this.bufferSize) return null;

    const upCount = this.stateBuffer.filter((s) => s === 'UP').length;
    const downCount = this.stateBuffer.filter((s) => s === 'DOWN').length;
    const threshold = Math.ceil(this.bufferSize / 2);

    if (upCount >= threshold) return 'UP';
    if (downCount >= threshold) return 'DOWN';
    return null;
  }

  get progress(): number {
    return Math.min(this.count / this.targetCount, 1);
  }

  reset() {
    this.count = 0;
    this.lastState = null;
    this.isComplete = false;
    this.stateBuffer = [];
  }
}
