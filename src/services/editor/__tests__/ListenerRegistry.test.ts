/**
 * Characterization tests for ListenerRegistry.
 *
 * These fix the observable contract:
 *   - register() wires up the listener (events fire)
 *   - disposeAll() unwires every registered listener (events stop firing)
 *   - disposeAll() is idempotent (safe to call multiple times)
 *   - multiple listeners on the same or different targets all get removed
 *   - capture-flag option round-trips correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListenerRegistry } from '../ListenerRegistry';

let registry: ListenerRegistry;
beforeEach(() => {
  registry = new ListenerRegistry();
});

describe('ListenerRegistry – register', () => {
  it('wires up a listener so events are received', () => {
    const target = new EventTarget();
    const handler = vi.fn();

    registry.register(target, 'click', handler);
    target.dispatchEvent(new Event('click'));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('wires up multiple listeners on the same target/type', () => {
    const target = new EventTarget();
    const h1 = vi.fn();
    const h2 = vi.fn();

    registry.register(target, 'click', h1);
    registry.register(target, 'click', h2);
    target.dispatchEvent(new Event('click'));

    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it('wires up listeners on different targets', () => {
    const t1 = new EventTarget();
    const t2 = new EventTarget();
    const h1 = vi.fn();
    const h2 = vi.fn();

    registry.register(t1, 'click', h1);
    registry.register(t2, 'focus', h2);

    t1.dispatchEvent(new Event('click'));
    t2.dispatchEvent(new Event('focus'));

    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });
});

describe('ListenerRegistry – disposeAll', () => {
  it('removes a single registered listener', () => {
    const target = new EventTarget();
    const handler = vi.fn();

    registry.register(target, 'click', handler);
    registry.disposeAll();
    target.dispatchEvent(new Event('click'));

    expect(handler).not.toHaveBeenCalled();
  });

  it('removes all listeners across multiple targets', () => {
    const t1 = new EventTarget();
    const t2 = new EventTarget();
    const h1 = vi.fn();
    const h2 = vi.fn();

    registry.register(t1, 'click', h1);
    registry.register(t2, 'focus', h2);
    registry.disposeAll();

    t1.dispatchEvent(new Event('click'));
    t2.dispatchEvent(new Event('focus'));

    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });

  it('removes all listeners across multiple types on the same target', () => {
    // Use a DOM element to avoid jsdom's passive-default check on bare EventTarget
    const target = document.createElement('div');
    const h1 = vi.fn();
    const h2 = vi.fn();

    registry.register(target, 'mousedown', h1);
    registry.register(target, 'keydown', h2);
    registry.disposeAll();

    target.dispatchEvent(new Event('mousedown'));
    target.dispatchEvent(new Event('keydown'));

    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });

  it('is idempotent: calling disposeAll twice does not throw', () => {
    const target = new EventTarget();
    const handler = vi.fn();

    registry.register(target, 'click', handler);
    registry.disposeAll();

    expect(() => registry.disposeAll()).not.toThrow();

    target.dispatchEvent(new Event('click'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('clears entries so re-registration works independently', () => {
    const target = new EventTarget();
    const handler = vi.fn();

    registry.register(target, 'click', handler);
    registry.disposeAll();

    // Re-register after dispose
    registry.register(target, 'click', handler);
    target.dispatchEvent(new Event('click'));
    expect(handler).toHaveBeenCalledTimes(1);

    registry.disposeAll();
    target.dispatchEvent(new Event('click'));
    expect(handler).toHaveBeenCalledTimes(1); // not called again
  });

  it('passes capture option through so removal matches the registration', () => {
    const parent = document.createElement('div');
    const child = document.createElement('div');
    parent.appendChild(child);
    document.body.appendChild(parent);

    const captureHandler = vi.fn();
    registry.register(parent, 'click', captureHandler, { capture: true });
    registry.disposeAll();

    // Dispatch on child — should not bubble up to parent capture listener
    child.dispatchEvent(new Event('click', { bubbles: true }));
    expect(captureHandler).not.toHaveBeenCalled();

    document.body.removeChild(parent);
  });
});
