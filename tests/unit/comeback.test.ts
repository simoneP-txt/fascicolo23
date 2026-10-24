// Comeback (Review Focus 1): the window back in front after the video. The wait ends at the first focus that
// follows a blur. A focus with no blur before it, such as leaving fullscreen or a click on the game while the
// browser opens, does nothing, a second round of blur and focus brings nothing more, and a cancelled wait never
// comes back. Node's EventTarget stands in for the window.
import { expect, test, vi } from 'vitest';
import { awaitComeback } from '../../src/ui/comeback';

const fire = (target: EventTarget, ...types: string[]) => {
  for (const type of types) target.dispatchEvent(new Event(type));
};

test('a focus with no blur before it does nothing', () => {
  const window = new EventTarget();
  const back = vi.fn();
  awaitComeback(window, back);
  fire(window, 'focus', 'focus');
  expect(back).not.toHaveBeenCalled();
  fire(window, 'blur', 'focus'); // and the wait goes on
  expect(back).toHaveBeenCalledOnce();
});

test('a blur, then a focus, comes back once', () => {
  const window = new EventTarget();
  const back = vi.fn();
  awaitComeback(window, back);
  fire(window, 'blur');
  expect(back).not.toHaveBeenCalled();
  fire(window, 'focus', 'blur', 'focus');
  expect(back).toHaveBeenCalledOnce();
});

test('cancelled, it never comes back', () => {
  const window = new EventTarget();
  const back = vi.fn();
  const cancel = awaitComeback(window, back);
  fire(window, 'blur');
  cancel();
  fire(window, 'focus', 'blur', 'focus');
  expect(back).not.toHaveBeenCalled();
});
