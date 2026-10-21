// Host hotkeys: Ctrl+Shift with N, H, G, D or R, read from the physical key so any keyboard layout
// works. A held key does not repeat its action, and nothing on screen ever names these keys.
export type HotkeyAction = 'solve' | 'hint' | 'giveBack' | 'debug' | 'reset';

const KEYS: Record<string, HotkeyAction> = {
  KeyN: 'solve',
  KeyH: 'hint',
  KeyG: 'giveBack',
  KeyD: 'debug',
  KeyR: 'reset',
};

type KeyPress = Pick<KeyboardEvent, 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey' | 'code' | 'repeat'>;

export function hotkeyAction(event: KeyPress): HotkeyAction | null {
  if (!event.ctrlKey || !event.shiftKey || event.altKey || event.metaKey || event.repeat) return null;
  return Object.hasOwn(KEYS, event.code) ? KEYS[event.code] : null;
}

/** Listens before anything else on the page; returns a function that removes the listener. */
export function installHotkeys(target: EventTarget, handlers: Record<HotkeyAction, () => void>): () => void {
  const listener = (event: Event) => {
    const action = hotkeyAction(event as KeyboardEvent);
    if (!action) return;
    event.preventDefault();
    handlers[action]();
  };
  target.addEventListener('keydown', listener, { capture: true });
  return () => target.removeEventListener('keydown', listener, { capture: true });
}
