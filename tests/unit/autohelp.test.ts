// Auto-help ladder: hints and the skip unlock at the thresholds in content.json (time or errors), paused
// time does not count, Rapture never shows the hint button but Ctrl+Shift+H still works, and inside the
// game the ladder pauses for the audience, announces new help and survives leaving the room.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createLadder } from '../../src/engine/autohelp';
import { save } from '../../src/engine/save';
import { newState, openCase } from '../../src/engine/state';
import type { RoomId } from '../../src/engine/types';
import { content, ctxOf, memoryStorage, setup } from './fakes';

const studio = content.rooms.studio.help;
const rapture = content.rooms.rapture.help;

// A clock moved by hand, in seconds.
function clock() {
  let ms = 0;
  return { now: () => ms, advance: (seconds: number) => (ms += seconds * 1000) };
}

test('the hint button appears at the time threshold', () => {
  const c = clock();
  const ladder = createLadder(studio, 2, c.now);
  c.advance(studio.hintAfterSec! - 1);
  expect(ladder.status().hint).toBe(false);
  c.advance(1);
  expect(ladder.status().hint).toBe(true);
});

test('the hint button appears after three errors', () => {
  const ladder = createLadder(studio, 2, clock().now);
  ladder.error();
  ladder.error();
  expect(ladder.status().hint).toBe(false);
  ladder.error();
  expect(ladder.status().hint).toBe(true);
});

test('the second hint comes at its own threshold', () => {
  const c = clock();
  const ladder = createLadder(studio, 2, c.now);
  c.advance(studio.hintAfterSec!);
  expect(ladder.reveal(false)).toBe(0);
  expect(ladder.status().hint).toBe(false);
  expect(ladder.reveal(false)).toBeNull();
  c.advance(studio.secondHintAfterSec! - studio.hintAfterSec!);
  expect(ladder.status().hint).toBe(true);
  expect(ladder.reveal(false)).toBe(1);
  expect(ladder.status().hint).toBe(false);
  expect(ladder.revealed()).toBe(2);
});

test('the skip button appears at its threshold', () => {
  const c = clock();
  const ladder = createLadder(studio, 2, c.now);
  c.advance(studio.skipAfterSec - 1);
  expect(ladder.status().skip).toBe(false);
  c.advance(1);
  expect(ladder.status().skip).toBe(true);
});

test('paused time does not count', () => {
  const c = clock();
  const ladder = createLadder(studio, 2, c.now);
  c.advance(100);
  ladder.pause();
  ladder.pause();
  c.advance(1000);
  ladder.resume();
  c.advance(1000);
  expect(ladder.status().hint).toBe(false);
  ladder.resume();
  c.advance(studio.hintAfterSec! - 101);
  expect(ladder.status().hint).toBe(false);
  c.advance(1);
  expect(ladder.status().hint).toBe(true);
});

test('Rapture never shows the hint button but Ctrl+Shift+H works', () => {
  const c = clock();
  const ladder = createLadder(rapture, 2, c.now);
  c.advance(600);
  for (let i = 0; i < 5; i++) ladder.error();
  expect(ladder.status().hint).toBe(false);
  expect(ladder.reveal(false)).toBeNull();
  expect(ladder.reveal(true)).toBe(0);
  expect(ladder.reveal(true)).toBe(1);
  expect(ladder.reveal(true)).toBeNull();
});

test('Rapture opens the door after three lost runs or 300 seconds', () => {
  const byErrors = createLadder(rapture, 2, clock().now);
  byErrors.error();
  byErrors.error();
  expect(byErrors.status().skip).toBe(false);
  byErrors.error();
  expect(byErrors.status().skip).toBe(true);

  const c = clock();
  const byTime = createLadder(rapture, 2, c.now);
  c.advance(rapture.skipAfterSec - 1);
  expect(byTime.status().skip).toBe(false);
  c.advance(1);
  expect(byTime.status().skip).toBe(true);
});

describe('in the game', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function inRoom(id: RoomId) {
    const storage = memoryStorage();
    save(openCase(newState(3)), storage);
    const t = setup(storage);
    t.game.start();
    t.game.enter(id);
    return t;
  }
  const seconds = (s: number) => vi.advanceTimersByTime(s * 1000);

  test('the audience countdown stops the help clock', () => {
    const { game, ui } = inRoom('scacchiera');
    seconds(content.rooms.scacchiera.help.hintAfterSec! - 10);
    game.startAudience();
    seconds(content.audienceSeconds);
    expect(ui.setHelp).toHaveBeenLastCalledWith({ hint: false, skip: false });
    seconds(10);
    expect(ui.setHelp).toHaveBeenLastCalledWith({ hint: true, skip: false });
  });

  test('the witness announces new help', () => {
    const { ui } = inRoom('studio');
    seconds(studio.hintAfterSec!);
    expect(ui.narrate).toHaveBeenLastCalledWith(content.witness.help);
  });

  test("a room's errors unlock the hint", () => {
    const { ui, room } = inRoom('studio');
    const ctx = ctxOf(room('studio'));
    for (let i = 0; i < 3; i++) ctx.reportError();
    expect(ui.setHelp).toHaveBeenLastCalledWith({ hint: true, skip: false });
  });

  test('the hint button shows the next hint', () => {
    const { game, ui } = inRoom('studio');
    seconds(studio.hintAfterSec!);
    game.hint(false);
    expect(ui.showHint).toHaveBeenLastCalledWith(content.rooms.studio.hints[0], 1, 2);
    expect(ui.setHelp).toHaveBeenLastCalledWith({ hint: false, skip: false });
  });

  test('leaving keeps the help progress of that room', () => {
    const { game, ui } = inRoom('studio');
    seconds(studio.hintAfterSec!);
    game.hint(false);
    game.leave();
    seconds(600);
    ui.showHint.mockClear();
    game.enter('studio');
    expect(ui.showHint).toHaveBeenCalledWith(content.rooms.studio.hints[0], 1, 2);
    expect(ui.setHelp).toHaveBeenLastCalledWith({ hint: false, skip: false });
  });

  test('the skip completes the room like Ctrl+Shift+N', () => {
    const { game, ui } = inRoom('studio');
    seconds(studio.skipAfterSec);
    expect(ui.setHelp).toHaveBeenLastCalledWith({ hint: true, skip: true });
    game.solve();
    expect(game.state.solved).toEqual(['studio']);
    expect(game.state.clues).toEqual(['rule', 'profile']);
  });
});
