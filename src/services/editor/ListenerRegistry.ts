/**
 * ListenerRegistry
 *
 * Records every addEventListener call so that a single disposeAll() removes
 * them all.  Eliminates the manual currentHandle* tracking pattern and makes
 * listener cleanup structurally impossible to get wrong.
 *
 * disposeAll() is idempotent: calling it multiple times is safe.
 */

type Entry = {
  target: EventTarget;
  type: string;
  handler: EventListenerOrEventListenerObject;
  options: AddEventListenerOptions | boolean | undefined;
};

export class ListenerRegistry {
  private entries: Entry[] = [];

  register(
    target: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean
  ): void {
    target.addEventListener(type, handler, options);
    this.entries.push({ target, type, handler, options });
  }

  disposeAll(): void {
    for (const { target, type, handler, options } of this.entries) {
      target.removeEventListener(type, handler, options);
    }
    this.entries = [];
  }
}
