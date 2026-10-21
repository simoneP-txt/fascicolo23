// Audience help: a countdown that spends exactly one token when it ends, however it ends (time out,
// "Abbiamo finito?", leaving or solving the room), never two at once, a spent button at zero tokens
// and no button at all in Rapture.
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { audienceStatus, startCountdown } from '../../src/engine/audience';
import { load, save } from '../../src/engine/save';
import { addClues, newState, openCase, type GameState } from '../../src/engine/state';
import type { RoomId } from '../../src/engine/types';
import { content, memoryStorage, setup } from './fakes';

const COUNTDOWN = content.audienceSeconds * 1000;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function inRoom(id: RoomId, state: GameState = openCase(newState(3))) {
  const storage = memoryStorage();
  save(state, storage);
  const t = setup(storage);
  t.game.start();
  t.game.enter(id);
  return t;
}

test('the status follows tokens and room', () => {
  let now = 0;
  const countdown = startCountdown(30, () => now);
  expect(audienceStatus(false, 3, 3, null)).toEqual({ mode: 'off' });
  expect(audienceStatus(true, 3, 3, null)).toEqual({ mode: 'ready', tokens: 3, max: 3 });
  expect(audienceStatus(true, 0, 3, null)).toEqual({ mode: 'spent', tokens: 0, max: 3 });
  expect(audienceStatus(true, 3, 3, countdown)).toEqual({ mode: 'running', tokens: 3, max: 3, secondsLeft: 30 });
  now = 29_001;
  expect(countdown.secondsLeft()).toBe(1);
  expect(countdown.done()).toBe(false);
  now = 30_000;
  expect(countdown.done()).toBe(true);
});

test('the countdown shows the seconds left', () => {
  const { game, ui } = inRoom('studio');
  game.startAudience();
  expect(ui.setAudience).toHaveBeenLastCalledWith({ mode: 'running', tokens: 3, max: 3, secondsLeft: 30 });
  vi.advanceTimersByTime(1_000);
  expect(ui.setAudience).toHaveBeenLastCalledWith({ mode: 'running', tokens: 3, max: 3, secondsLeft: 29 });
});

test('a token is spent when the 30 seconds end', () => {
  const { game, ui, storage } = inRoom('studio');
  game.startAudience();
  vi.advanceTimersByTime(COUNTDOWN - 100);
  expect(game.state.tokens).toBe(3);
  vi.advanceTimersByTime(100);
  expect(game.state.tokens).toBe(2);
  expect(load(3, storage).tokens).toBe(2);
  expect(ui.setAudience).toHaveBeenLastCalledWith({ mode: 'ready', tokens: 2, max: 3 });
});

test('two countdowns cannot run together', () => {
  const { game } = inRoom('studio');
  game.startAudience();
  vi.advanceTimersByTime(10_000);
  game.startAudience();
  vi.advanceTimersByTime(COUNTDOWN);
  expect(game.state.tokens).toBe(2);
});

test('no countdown without tokens', () => {
  const { game, ui } = inRoom('studio', { ...openCase(newState(3)), tokens: 0 });
  game.startAudience();
  expect(ui.setAudience).toHaveBeenLastCalledWith({ mode: 'spent', tokens: 0, max: 3 });
  vi.advanceTimersByTime(COUNTDOWN);
  expect(game.state.tokens).toBe(0);
});

test('no countdown in Rapture', () => {
  const { game, ui } = inRoom('rapture', addClues(openCase(newState(3)), ['time-0451', 'rule']));
  game.startAudience();
  expect(ui.setAudience).toHaveBeenLastCalledWith({ mode: 'off' });
  vi.advanceTimersByTime(COUNTDOWN);
  expect(game.state.tokens).toBe(3);
});

test('finishing early spends the token at once', () => {
  const { game, ui } = inRoom('studio');
  game.startAudience();
  vi.advanceTimersByTime(5_000);
  game.finishAudience();
  expect(game.state.tokens).toBe(2);
  expect(ui.setAudience).toHaveBeenLastCalledWith({ mode: 'ready', tokens: 2, max: 3 });
});

test('leaving during the countdown spends the token and stops the timer', () => {
  const { game, ui } = inRoom('studio');
  game.startAudience();
  vi.advanceTimersByTime(5_000);
  game.leave();
  expect(game.state.tokens).toBe(2);
  const calls = ui.setAudience.mock.calls.length;
  vi.advanceTimersByTime(COUNTDOWN);
  expect(ui.setAudience.mock.calls.length).toBe(calls);
  expect(vi.getTimerCount()).toBe(0);
});

test('solving the room during the countdown spends one token', () => {
  const { game } = inRoom('studio');
  game.startAudience();
  vi.advanceTimersByTime(5_000);
  game.solve();
  vi.advanceTimersByTime(COUNTDOWN);
  expect(game.state.tokens).toBe(2);
  expect(game.state.solved).toEqual(['studio']);
});
