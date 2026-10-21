// Game lifecycle: intro or board at start, doors that follow the clue graph, rooms mounted once and
// completed once, and an unmount on every way out of a room, even when the room itself is broken. A
// broken room can still be solved, and a room's context goes inert once the player leaves it.
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { validOrders } from '../../src/engine/clues';
import { SAVE_KEY, load, save } from '../../src/engine/save';
import { newState, openCase } from '../../src/engine/state';
import { graphRooms } from '../../src/rooms/graph';
import { content, ctxOf, memoryStorage, setup } from './fakes';

// A room session runs an interval; fake timers keep it out of the real clock.
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

// A game whose case is already open, showing the board.
function onBoard() {
  const storage = memoryStorage();
  save(openCase(newState(3)), storage);
  const t = setup(storage);
  t.game.start();
  return t;
}

test('a new game opens on the intro, a saved one on the board', () => {
  const fresh = setup();
  fresh.game.start();
  expect(fresh.ui.showIntro).toHaveBeenCalledOnce();
  expect(fresh.ui.showBoard).not.toHaveBeenCalled();

  const saved = onBoard();
  expect(saved.ui.showBoard).toHaveBeenCalledOnce();
  expect(saved.ui.showIntro).not.toHaveBeenCalled();
});

test('opening the case saves it and shows the board', () => {
  const { game, ui, storage } = setup();
  game.start();
  game.openCase();
  expect(game.state.opened).toBe(true);
  expect(load(3, storage).opened).toBe(true);
  expect(ui.showBoard).toHaveBeenCalledWith(game.state);
  expect(ui.narrate).toHaveBeenLastCalledWith(content.witness.board);
});

test('a closed door does not open', () => {
  const { game, ui, room } = onBoard();
  game.enter('biblioteca');
  game.enter('stanza-46');
  expect(ui.showRoom).not.toHaveBeenCalled();
  expect(room('biblioteca').mount).not.toHaveBeenCalled();
});

test('entering twice mounts the room once', () => {
  const { game, room } = onBoard();
  game.enter('studio');
  game.enter('studio');
  game.enter('scacchiera');
  expect(room('studio').mount).toHaveBeenCalledOnce();
  expect(room('scacchiera').mount).not.toHaveBeenCalled();
});

test('a room gets its own content and the witness asks its question', () => {
  const { game, ui, room } = onBoard();
  game.enter('studio');
  expect(ctxOf(room('studio')).content).toBe(content.rooms.studio);
  expect(ui.narrate).toHaveBeenLastCalledWith(content.rooms.studio.witness.intro);
});

test('completing twice awards the room once', () => {
  const { game, ui, room, storage } = onBoard();
  game.enter('studio');
  const ctx = ctxOf(room('studio'));
  ctx.complete();
  ctx.complete();
  expect(game.state.solved).toEqual(['studio']);
  expect(game.state.clues).toEqual(['rule', 'profile']);
  expect(room('studio').unmount).toHaveBeenCalledOnce();
  expect(ui.showBoard).toHaveBeenCalledTimes(2);
  expect(load(3, storage).solved).toEqual(['studio']);
});

test('a solved room does not open again', () => {
  const { game, room } = onBoard();
  game.enter('studio');
  ctxOf(room('studio')).complete();
  game.enter('studio');
  expect(room('studio').mount).toHaveBeenCalledOnce();
});

test('leaving unmounts the room and stops its sounds', () => {
  const { game, ui, room, audio } = onBoard();
  game.enter('studio');
  const ctx = ctxOf(room('studio'));
  game.leave();
  expect(room('studio').unmount).toHaveBeenCalledOnce();
  expect(audio.stopAll).toHaveBeenCalledOnce();
  expect(ui.showBoard).toHaveBeenCalledTimes(2);

  ctx.complete();
  ctx.narrate('Ancora qui');
  expect(game.state.solved).toEqual([]);
  expect(ui.narrate).not.toHaveBeenCalledWith('Ancora qui');
});

test('every valid order solves all five rooms', () => {
  for (const order of validOrders(graphRooms())) {
    const { game, room } = onBoard();
    for (const id of order) {
      game.enter(id);
      expect(room(id).mount, id).toHaveBeenCalledOnce();
      ctxOf(room(id)).complete();
    }
    expect(game.state.solved).toEqual(order);
  }
});

test('the context answers for the room', () => {
  const { game, ui, room, audio } = onBoard();
  game.enter('scacchiera');
  const ctx = ctxOf(room('scacchiera'));
  expect(ctx.hasClue('g4')).toBe(false);
  ctx.narrate('Ciao');
  expect(ui.narrate).toHaveBeenLastCalledWith('Ciao');
  ctx.playSfx('click');
  expect(audio.play).toHaveBeenCalledWith('click');
  ctx.complete();

  game.enter('biblioteca');
  expect(ctxOf(room('biblioteca')).hasClue('g4')).toBe(true);
});

test('a room that throws on mount does not block the game', () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const { game, ui, room } = onBoard();
  room('studio').mount.mockImplementation(() => {
    throw new Error('broken mount');
  });
  room('studio').unmount.mockImplementation(() => {
    throw new Error('broken unmount');
  });
  game.enter('studio');
  game.leave();
  expect(ui.showBoard).toHaveBeenCalledTimes(2);
  expect(error).toHaveBeenCalledTimes(2);
  error.mockRestore();
});

test('a room that throws on mount can still be solved with Ctrl+Shift+N or the skip', () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const { game, ui, room } = onBoard();
  for (const id of ['studio', 'scacchiera'] as const) {
    room(id).mount.mockImplementation(() => {
      throw new Error('broken mount');
    });
  }
  game.enter('studio');
  game.solve();
  expect(game.state.solved).toEqual(['studio']);

  game.enter('scacchiera');
  vi.advanceTimersByTime(content.rooms.scacchiera.help.skipAfterSec * 1000);
  expect(ui.setHelp).toHaveBeenLastCalledWith({ hint: true, skip: true });
  game.solve();
  expect(game.state.solved).toEqual(['studio', 'scacchiera']);
  error.mockRestore();
});

test('a room that outlives its exit cannot touch the next room', () => {
  const { game, ui, room } = onBoard();
  game.enter('studio');
  const old = ctxOf(room('studio'));
  game.leave();
  game.enter('scacchiera');
  for (let i = 0; i < content.rooms.studio.help.hintAfterErrors!; i++) old.reportError();
  old.complete();
  expect(game.state.solved).toEqual([]);
  expect(room('scacchiera').unmount).not.toHaveBeenCalled();

  // Its errors did not count for it either.
  game.leave();
  game.enter('studio');
  expect(ui.setHelp).toHaveBeenLastCalledWith({ hint: false, skip: false });
});

// Host actions behind the hidden hotkeys.

test('Ctrl+Shift+N on the board does nothing', () => {
  const { game, ui } = onBoard();
  game.solve();
  expect(game.state.solved).toEqual([]);
  expect(ui.showBoard).toHaveBeenCalledOnce();
});

test('Ctrl+Shift+G never goes over the maximum', () => {
  const { game } = onBoard();
  game.giveBackToken();
  expect(game.state.tokens).toBe(3);
});

test('Ctrl+Shift+G gives back a spent token and redraws the screen', () => {
  const storage = memoryStorage();
  save({ ...openCase(newState(3)), tokens: 1 }, storage);
  const { game, ui } = setup(storage);
  game.start();
  game.giveBackToken();
  expect(game.state.tokens).toBe(2);
  expect(load(3, storage).tokens).toBe(2);
  expect(ui.showBoard).toHaveBeenLastCalledWith(game.state);

  game.enter('studio');
  game.giveBackToken();
  expect(ui.setAudience).toHaveBeenLastCalledWith({ mode: 'ready', tokens: 3, max: 3 });
});

test('reset empties the save and returns to the intro', () => {
  const { game, ui, room, storage } = onBoard();
  game.enter('studio');
  game.reset();
  expect(room('studio').unmount).toHaveBeenCalledOnce();
  expect(storage.getItem(SAVE_KEY)).toBeNull();
  expect(game.state).toEqual(newState(3));
  expect(ui.showIntro).toHaveBeenCalledOnce();
});

test('reset also forgets the help progress', () => {
  const { game, ui } = onBoard();
  game.enter('studio');
  vi.advanceTimersByTime(content.rooms.studio.help.hintAfterSec! * 1000);
  game.reset();
  game.openCase();
  game.enter('studio');
  expect(ui.setHelp).toHaveBeenLastCalledWith({ hint: false, skip: false });
});

test('the debug menu enters any room with its required clues', () => {
  const { game, ui, room } = setup();
  game.start();
  game.debugEnter('stanza-46');
  expect(game.state.opened).toBe(true);
  expect(game.state.clues).toEqual(expect.arrayContaining(['profile', 'time-0451', 'confession']));
  expect(room('stanza-46').mount).toHaveBeenCalledOnce();
  expect(ui.showRoom).toHaveBeenLastCalledWith(room('stanza-46'));
});

test('the debug menu leaves the open room first', () => {
  const { game, room } = onBoard();
  game.enter('studio');
  game.debugEnter('rapture');
  expect(room('studio').unmount).toHaveBeenCalledOnce();
  expect(room('rapture').mount).toHaveBeenCalledOnce();
});
