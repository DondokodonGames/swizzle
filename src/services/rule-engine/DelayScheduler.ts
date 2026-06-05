import type { GameAction } from '../../types/editor/GameScript';
import type { RuleExecutionContext } from './types';

interface PendingDelay {
  delayId: string;
  targetTime: number;
  actions: GameAction[];
  cancelOnGameEnd: boolean;
  selfObjectId: string;
}

export class DelayScheduler {
  private queue: PendingDelay[] = [];

  schedule(
    delayId: string,
    targetTime: number,
    actions: GameAction[],
    options: { mode: 'replace' | 'ignore' | 'append'; cancelOnGameEnd: boolean; selfObjectId: string }
  ): void {
    if (options.mode === 'replace') {
      this.queue = this.queue.filter(item => item.delayId !== delayId);
    } else if (options.mode === 'ignore') {
      if (this.queue.some(item => item.delayId === delayId)) return;
    }
    // 'append' always pushes
    this.queue.push({ delayId, targetTime, actions, cancelOnGameEnd: options.cancelOnGameEnd, selfObjectId: options.selfObjectId });
  }

  cancel(delayId: string): void {
    this.queue = this.queue.filter(item => item.delayId !== delayId);
  }

  tick(
    timeElapsed: number,
    context: RuleExecutionContext,
    executeList: (actions: GameAction[], context: RuleExecutionContext, selfObjectId: string) => void
  ): void {
    const ready: PendingDelay[] = [];
    const remaining: PendingDelay[] = [];
    for (const item of this.queue) {
      if (timeElapsed >= item.targetTime) ready.push(item);
      else remaining.push(item);
    }
    this.queue = remaining;
    for (const item of ready) {
      executeList(item.actions, context, item.selfObjectId);
    }
  }

  cancelGameEndItems(): void {
    this.queue = this.queue.filter(item => !item.cancelOnGameEnd);
  }

  reset(): void {
    this.queue = [];
  }

  // For testing
  getPendingCount(delayId?: string): number {
    if (delayId === undefined) return this.queue.length;
    return this.queue.filter(item => item.delayId === delayId).length;
  }
}
