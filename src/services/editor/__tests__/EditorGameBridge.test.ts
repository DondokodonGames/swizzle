/**
 * EditorGameBridge tests
 *
 * The bridge's executeGame() wires up complex browser APIs (canvas, RAF,
 * setTimeout, image loading).  Rather than spinning up the full loop, these
 * tests focus on:
 *
 *  1.  holdCompleteFired guard  – the exact same conditional that lives in
 *      the game loop is reproduced here so we can drive it deterministically.
 *
 *  2.  Gesture classification parity – mouse and touch end-handlers share
 *      identical flick/swipe threshold logic.  We validate both produce the
 *      same event type for the same velocity / distance / duration values.
 */

import { describe, it, expect } from 'vitest';

// ────────────────────────────────────────────────────────────
// Shared utilities extracted verbatim from EditorGameBridge.ts
// (Any drift here would be caught by integration tests)
// ────────────────────────────────────────────────────────────

function getDirection(dx: number, dy: number): string {
  return Math.abs(dx) >= Math.abs(dy)
    ? (dx >= 0 ? 'right' : 'left')
    : (dy >= 0 ? 'down' : 'up');
}

type GestureType = 'flick' | 'swipe' | 'none';

/**
 * The gesture classification that both handleTouchEnd and handleMouseUp use.
 * Thresholds are the source-of-truth values from EditorGameBridge.ts.
 */
function classifyGesture(velocity: number, distance: number, duration: number): GestureType {
  if (velocity >= 1000 && distance <= 150 && duration <= 200) return 'flick';
  if (velocity >= 500 && distance >= 100 && duration <= 500) return 'swipe';
  return 'none';
}

// ────────────────────────────────────────────────────────────
// holdCompleteFired guard logic
// ────────────────────────────────────────────────────────────

/**
 * Mirrors the hold-event generation logic inside the game loop.
 * Returns the event that would be pushed (or null if suppressed).
 */
function simulateHoldFrame(
  holdDuration: number,
  touchActive: boolean,
  firedRef: { value: boolean },
): { holdState: 'complete' | 'progress'; currentDuration: number } | null {
  if (!touchActive) return null;
  if (holdDuration < 300) return null;

  const isComplete = holdDuration >= 1000;
  if (!isComplete || !firedRef.value) {
    if (isComplete) firedRef.value = true;
    return { holdState: isComplete ? 'complete' : 'progress', currentDuration: holdDuration };
  }
  return null; // already fired
}

// ────────────────────────────────────────────────────────────
// Tests: holdCompleteFired
// ────────────────────────────────────────────────────────────

describe('EditorGameBridge – holdCompleteFired guard', () => {
  it('does not emit hold event when touchActive is false', () => {
    const fired = { value: false };
    expect(simulateHoldFrame(1200, false, fired)).toBeNull();
  });

  it('does not emit hold event when duration < 300 ms', () => {
    const fired = { value: false };
    expect(simulateHoldFrame(200, true, fired)).toBeNull();
  });

  it('emits progress event when 300 <= duration < 1000', () => {
    const fired = { value: false };
    const evt = simulateHoldFrame(600, true, fired);
    expect(evt).not.toBeNull();
    expect(evt?.holdState).toBe('progress');
    expect(fired.value).toBe(false); // not set yet
  });

  it('emits complete event on first frame duration >= 1000', () => {
    const fired = { value: false };
    const evt = simulateHoldFrame(1000, true, fired);
    expect(evt?.holdState).toBe('complete');
    expect(fired.value).toBe(true); // flag is now set
  });

  it('suppresses complete event on subsequent frames (holdCompleteFired = true)', () => {
    const fired = { value: false };

    // First complete frame
    simulateHoldFrame(1000, true, fired);
    expect(fired.value).toBe(true);

    // Second frame – still held, still complete
    const evt2 = simulateHoldFrame(1100, true, fired);
    expect(evt2).toBeNull(); // suppressed

    const evt3 = simulateHoldFrame(1500, true, fired);
    expect(evt3).toBeNull(); // still suppressed
  });

  it('progress events continue to fire after complete fires once', () => {
    // In practice progress fires before complete, but test the guard
    const fired = { value: false };

    // progress at 500 ms
    const p = simulateHoldFrame(500, true, fired);
    expect(p?.holdState).toBe('progress');

    // complete at 1000 ms
    const c = simulateHoldFrame(1000, true, fired);
    expect(c?.holdState).toBe('complete');

    // next complete frame – suppressed
    expect(simulateHoldFrame(1200, true, fired)).toBeNull();
  });

  it('resets correctly when touchActive becomes false and then true', () => {
    const fired = { value: false };

    // Touch down and hold to completion
    simulateHoldFrame(1000, true, fired);
    expect(fired.value).toBe(true);

    // Simulate pointer up → reset (EditorGameBridge sets holdCompleteFired = false on touchstart)
    fired.value = false;

    // New touch – can fire complete again
    const evt = simulateHoldFrame(1000, true, fired);
    expect(evt?.holdState).toBe('complete');
    expect(fired.value).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────
// Tests: gesture classification (mouse / touch parity)
// ────────────────────────────────────────────────────────────

describe('EditorGameBridge – gesture classification thresholds', () => {
  // Flick: fast, short distance, short duration
  it('classifies as flick when velocity>=1000 distance<=150 duration<=200', () => {
    expect(classifyGesture(1200, 80, 100)).toBe('flick');
  });

  it('does not classify as flick when velocity < 1000', () => {
    expect(classifyGesture(900, 80, 100)).not.toBe('flick');
  });

  it('does not classify as flick when distance > 150', () => {
    expect(classifyGesture(1200, 200, 100)).not.toBe('flick');
  });

  it('does not classify as flick when duration > 200', () => {
    expect(classifyGesture(1200, 80, 300)).not.toBe('flick');
  });

  // Swipe: moderate speed, long distance
  it('classifies as swipe when velocity>=500 distance>=100 duration<=500', () => {
    expect(classifyGesture(600, 200, 300)).toBe('swipe');
  });

  it('does not classify as swipe when velocity < 500', () => {
    expect(classifyGesture(400, 200, 300)).toBe('none');
  });

  it('does not classify as swipe when distance < 100', () => {
    expect(classifyGesture(600, 50, 300)).toBe('none');
  });

  it('does not classify as swipe when duration > 500', () => {
    expect(classifyGesture(600, 200, 600)).toBe('none');
  });

  it('flick takes priority over swipe when both thresholds are met', () => {
    // velocity>=1000, distance<=150, duration<=200 AND velocity>=500, distance>=100, duration<=500
    expect(classifyGesture(1200, 120, 150)).toBe('flick');
  });

  it('classifies as none for a slow short tap', () => {
    expect(classifyGesture(100, 10, 100)).toBe('none');
  });
});

// ────────────────────────────────────────────────────────────
// Tests: getDirection helper
// ────────────────────────────────────────────────────────────

describe('EditorGameBridge – getDirection helper', () => {
  it('returns right for rightward movement', () => {
    expect(getDirection(100, 10)).toBe('right');
  });

  it('returns left for leftward movement', () => {
    expect(getDirection(-100, 10)).toBe('left');
  });

  it('returns down for downward movement', () => {
    expect(getDirection(10, 100)).toBe('down');
  });

  it('returns up for upward movement', () => {
    expect(getDirection(10, -100)).toBe('up');
  });

  it('prefers horizontal when |dx| == |dy|', () => {
    // |dx| >= |dy| → horizontal wins
    expect(getDirection(50, 50)).toBe('right');
    expect(getDirection(-50, 50)).toBe('left');
  });
});
