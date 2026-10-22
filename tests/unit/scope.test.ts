// Room scope: the timers a room starts go through its scope, and unmount clears them all at once, so no
// timer of a room fires after the room has left the stage.
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createScope } from '../../src/rooms/scope';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('clear() cancels what is still pending', () => {
  const scope = createScope();
  const once = vi.fn();
  const repeat = vi.fn();
  scope.later(100, once);
  scope.every(50, repeat);
  scope.clear();
  vi.advanceTimersByTime(500);
  expect(once).not.toHaveBeenCalled();
  expect(repeat).not.toHaveBeenCalled();
});

test('later() runs once, every() repeats until cleared', () => {
  const scope = createScope();
  const once = vi.fn();
  const repeat = vi.fn();
  scope.later(100, once);
  scope.every(100, repeat);
  vi.advanceTimersByTime(350);
  expect(once).toHaveBeenCalledOnce();
  expect(repeat).toHaveBeenCalledTimes(3);
  scope.clear();
  vi.advanceTimersByTime(300);
  expect(repeat).toHaveBeenCalledTimes(3);
});
