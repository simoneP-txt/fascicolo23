// Host hotkeys: Ctrl+Shift with N, H, G, D and R map to their actions by physical key; other keys,
// extra or missing modifiers and held-down repeats do nothing; no text on screen names them.
import { expect, test, vi } from 'vitest';
import json from '../../content/content.json';
import { hotkeyAction, installHotkeys, type HotkeyAction } from '../../src/engine/hotkeys';

const key = (code: string, extra: Partial<Pick<KeyboardEvent, 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey' | 'repeat'>> = {}) => ({
  ctrlKey: true,
  shiftKey: true,
  altKey: false,
  metaKey: false,
  repeat: false,
  code,
  ...extra,
});

test('each host key maps to its action', () => {
  expect(hotkeyAction(key('KeyN'))).toBe('solve');
  expect(hotkeyAction(key('KeyH'))).toBe('hint');
  expect(hotkeyAction(key('KeyG'))).toBe('giveBack');
  expect(hotkeyAction(key('KeyD'))).toBe('debug');
  expect(hotkeyAction(key('KeyR'))).toBe('reset');
});

test('other keys, other modifiers and repeats do nothing', () => {
  expect(hotkeyAction(key('KeyX'))).toBeNull();
  expect(hotkeyAction(key('toString'))).toBeNull();
  expect(hotkeyAction(key('KeyN', { shiftKey: false }))).toBeNull();
  expect(hotkeyAction(key('KeyN', { ctrlKey: false }))).toBeNull();
  expect(hotkeyAction(key('KeyN', { altKey: true }))).toBeNull();
  expect(hotkeyAction(key('KeyN', { metaKey: true }))).toBeNull();
  expect(hotkeyAction(key('KeyN', { repeat: true }))).toBeNull();
});

test('an installed hotkey runs its handler and keeps the key from the browser', () => {
  const target = new EventTarget();
  const handlers = { solve: vi.fn(), hint: vi.fn(), giveBack: vi.fn(), debug: vi.fn(), reset: vi.fn() } satisfies Record<
    HotkeyAction,
    () => void
  >;
  const uninstall = installHotkeys(target, handlers);
  const press = () => {
    const event = Object.assign(new Event('keydown', { cancelable: true }), key('KeyG'));
    target.dispatchEvent(event);
    return event;
  };
  expect(press().defaultPrevented).toBe(true);
  expect(handlers.giveBack).toHaveBeenCalledOnce();
  uninstall();
  press();
  expect(handlers.giveBack).toHaveBeenCalledOnce();
});

test('no text on screen names the hotkeys', () => {
  expect(JSON.stringify(json)).not.toMatch(/ctrl|shift|maiusc/i);
});
