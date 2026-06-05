import { describe, it, expect, vi } from 'vitest';
import { DelayScheduler } from '../DelayScheduler';
import { RuleExecutionContext } from '../types';

function makeContext(timeElapsed: number = 0): RuleExecutionContext {
  return {
    gameState: {
      isPlaying: true,
      isPaused: false,
      score: 0,
      timeElapsed,
      flags: new Map(),
      counters: new Map(),
    },
    objects: new Map(),
    events: [],
    canvas: { width: 1080, height: 1920 },
  };
}

describe('DelayScheduler', () => {
  it('schedules an action and fires it when timeElapsed >= targetTime', () => {
    const scheduler = new DelayScheduler();
    const executeList = vi.fn();

    scheduler.schedule('a', 2.0, [{ type: 'addScore', points: 5 }], {
      mode: 'replace',
      cancelOnGameEnd: true,
      selfObjectId: 'stage',
    });

    // Tick at t=1.5 — not yet ready
    scheduler.tick(1.5, makeContext(1.5), executeList);
    expect(executeList).not.toHaveBeenCalled();

    // Tick at t=2.0 — ready
    scheduler.tick(2.0, makeContext(2.0), executeList);
    expect(executeList).toHaveBeenCalledOnce();
    expect(executeList.mock.calls[0][0]).toEqual([{ type: 'addScore', points: 5 }]);
  });

  it('cancelDelay prevents action from firing', () => {
    const scheduler = new DelayScheduler();
    const executeList = vi.fn();

    scheduler.schedule('b', 1.0, [{ type: 'addScore', points: 10 }], {
      mode: 'replace',
      cancelOnGameEnd: false,
      selfObjectId: 'stage',
    });

    scheduler.cancel('b');

    scheduler.tick(5.0, makeContext(5.0), executeList);
    expect(executeList).not.toHaveBeenCalled();
  });

  it("mode:'replace' leaves exactly 1 entry for the same delayId", () => {
    const scheduler = new DelayScheduler();

    scheduler.schedule('c', 5.0, [{ type: 'addScore', points: 1 }], {
      mode: 'replace',
      cancelOnGameEnd: false,
      selfObjectId: 'stage',
    });
    scheduler.schedule('c', 10.0, [{ type: 'addScore', points: 2 }], {
      mode: 'replace',
      cancelOnGameEnd: false,
      selfObjectId: 'stage',
    });

    expect(scheduler.getPendingCount('c')).toBe(1);
  });

  it("mode:'ignore' does not add a second entry if one already exists", () => {
    const scheduler = new DelayScheduler();

    scheduler.schedule('d', 5.0, [{ type: 'addScore', points: 1 }], {
      mode: 'ignore',
      cancelOnGameEnd: false,
      selfObjectId: 'stage',
    });
    scheduler.schedule('d', 10.0, [{ type: 'addScore', points: 2 }], {
      mode: 'ignore',
      cancelOnGameEnd: false,
      selfObjectId: 'stage',
    });

    expect(scheduler.getPendingCount('d')).toBe(1);
  });

  it('cancelGameEndItems removes cancelOnGameEnd:true items but keeps false items', () => {
    const scheduler = new DelayScheduler();

    scheduler.schedule('keep', 5.0, [{ type: 'addScore', points: 1 }], {
      mode: 'append',
      cancelOnGameEnd: false,
      selfObjectId: 'stage',
    });
    scheduler.schedule('remove', 5.0, [{ type: 'addScore', points: 2 }], {
      mode: 'append',
      cancelOnGameEnd: true,
      selfObjectId: 'stage',
    });

    expect(scheduler.getPendingCount()).toBe(2);
    scheduler.cancelGameEndItems();
    expect(scheduler.getPendingCount()).toBe(1);
    expect(scheduler.getPendingCount('keep')).toBe(1);
    expect(scheduler.getPendingCount('remove')).toBe(0);
  });

  it('reset clears all pending items', () => {
    const scheduler = new DelayScheduler();
    scheduler.schedule('x', 1.0, [{ type: 'addScore', points: 1 }], {
      mode: 'append',
      cancelOnGameEnd: false,
      selfObjectId: 'stage',
    });
    expect(scheduler.getPendingCount()).toBe(1);
    scheduler.reset();
    expect(scheduler.getPendingCount()).toBe(0);
  });
});
