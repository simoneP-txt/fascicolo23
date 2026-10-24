// Rapture: the code of the door is the time found in the library, and the orders game follows the rule of the
// study. Eight orders share the run's time in equal windows, half of them questions; two imperatives are
// BioShock traps. Executing a question is right, any other press an error; a question let go is an error, an
// imperative let go is right; each order takes one mark. The third error loses the run at once, reported once,
// and the next run is ten seconds slower. Time is faked, so every window passes at once.
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import json from '../../content/content.json';
import { validateContent } from '../../src/engine/content';
import { rooms } from '../../src/rooms';
import type { RaptureContent } from '../../src/rooms/rapture/content';
import { CONTROL_IDS, createChallenge, isQuestion, type ControlId } from '../../src/rooms/rapture/orders';

const content = validateContent(json, rooms);
const room = content.rooms.rapture as RaptureContent;
const { orders, run: rules } = room;
const slot = (rules.seconds * 1000) / orders.length; // the window of each order in the first run

/** A control that is not this one. */
const other = (control: ControlId): ControlId => CONTROL_IDS.find((id) => id !== control)!;

function newChallenge() {
  const onLost = vi.fn();
  return { onLost, challenge: createChallenge(orders, rules, () => Date.now(), onLost) };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('eight orders in forty-five seconds, half of them questions', () => {
  expect(orders).toHaveLength(8);
  expect(orders.filter(isQuestion)).toHaveLength(4);
  expect(rules.seconds).toBe(45);
});

test('two imperatives are BioShock traps', () => {
  const traps = orders.filter((order) => order.text.startsWith('Would you kindly') && order.text.endsWith('!'));
  expect(traps.length).toBeGreaterThanOrEqual(2);
});

test('every order names a control of the panel', () => {
  expect(Object.keys(room.controls).sort()).toEqual([...CONTROL_IDS].sort());
  for (const order of orders) expect(CONTROL_IDS).toContain(order.control);
});

test('the code is the time found in the library', () =>
  expect(room.code).toBe(content.clues['time-0451'].label.replace(':', '')));

test('executing a question is right', () => {
  const run = newChallenge().challenge.start();
  expect(isQuestion(orders[0])).toBe(true);
  expect(run.press(orders[0].control)).toBe('right');
  expect(run.view()).toMatchObject({ index: 0, mark: 'right', errors: 0, state: 'running' });
});

test('executing an imperative is an error', () => {
  const run = newChallenge().challenge.start();
  run.press(orders[0].control);
  vi.advanceTimersByTime(slot);
  expect(run.view().index).toBe(1);
  expect(isQuestion(orders[1])).toBe(false);
  expect(run.press(orders[1].control)).toBe('wrong');
  expect(run.view()).toMatchObject({ index: 1, mark: 'wrong', errors: 1 });
});

test('pressing another control on a question is an error', () => {
  const run = newChallenge().challenge.start();
  expect(run.press(other(orders[0].control))).toBe('wrong');
  expect(run.view().errors).toBe(1);
});

test('a question left to expire is an error', () => {
  const run = newChallenge().challenge.start();
  vi.advanceTimersByTime(slot - 1);
  expect(run.view()).toMatchObject({ index: 0, errors: 0 });
  vi.advanceTimersByTime(1);
  expect(run.view()).toMatchObject({ index: 1, errors: 1 });
});

test('an imperative left alone is right', () => {
  const run = newChallenge().challenge.start();
  run.press(orders[0].control);
  vi.advanceTimersByTime(2 * slot); // through order 2, an imperative
  expect(run.view()).toMatchObject({ index: 2, errors: 0 });
});

test('a settled order takes no second mark', () => {
  const run = newChallenge().challenge.start();
  expect(run.press(orders[0].control)).toBe('right');
  expect(run.press(orders[0].control)).toBeNull();
  expect(run.press(other(orders[0].control))).toBeNull();
  expect(run.view().errors).toBe(0);
});

test('the time runs down over the whole run', () => {
  const run = newChallenge().challenge.start();
  expect(run.view().left).toBe(rules.seconds * 1000);
  vi.advanceTimersByTime(2 * slot + 1000);
  expect(run.view().left).toBe(rules.seconds * 1000 - 2 * slot - 1000);
});

test('the third error loses the run, reports once, and the next run is slower', () => {
  const { challenge, onLost } = newChallenge();
  expect([challenge.attempt(), challenge.seconds()]).toEqual([1, 45]);
  const run = challenge.start();
  expect(run.press(other(orders[0].control))).toBe('wrong');
  vi.advanceTimersByTime(slot);
  expect(run.press(orders[1].control)).toBe('wrong');
  vi.advanceTimersByTime(slot);
  expect(run.view().state).toBe('running');
  expect(run.press(other(orders[2].control))).toBe('wrong');
  expect(run.view()).toMatchObject({ index: 2, errors: 3, state: 'lost' });
  expect(onLost).toHaveBeenCalledOnce();
  const left = run.view().left;

  vi.advanceTimersByTime(60_000);
  expect(run.view()).toMatchObject({ index: 2, state: 'lost', left });
  expect(run.press(orders[3].control)).toBeNull();
  expect(onLost).toHaveBeenCalledOnce();

  const next = challenge.start();
  expect([challenge.attempt(), challenge.seconds()]).toEqual([2, 55]);
  expect(next.view()).toMatchObject({ index: 0, errors: 0, left: 55_000, state: 'running' });
});

test('three questions let go lose the run when the third window closes', () => {
  const { challenge, onLost } = newChallenge();
  const run = challenge.start();
  const questions = orders.flatMap((order, i) => (isQuestion(order) ? [i] : []));
  vi.advanceTimersByTime((questions[2] + 1) * slot - 1);
  expect(run.view().state).toBe('running');
  vi.advanceTimersByTime(30_000);
  expect(run.view()).toMatchObject({ index: questions[2], errors: 3, state: 'lost', left: rules.seconds * 1000 - (questions[2] + 1) * slot });
  expect(onLost).toHaveBeenCalledOnce();
});

test('a clean run is won', () => {
  const { challenge, onLost } = newChallenge();
  const run = challenge.start();
  for (const order of orders) {
    vi.advanceTimersByTime(slot / 2);
    if (isQuestion(order)) expect(run.press(order.control)).toBe('right');
    vi.advanceTimersByTime(slot / 2);
  }
  expect(run.view()).toMatchObject({ index: orders.length - 1, errors: 0, left: 0, state: 'won' });
  expect(run.press(orders[0].control)).toBeNull();
  expect(onLost).not.toHaveBeenCalled();
  expect([challenge.attempt(), challenge.seconds()]).toEqual([1, 45]);
});
