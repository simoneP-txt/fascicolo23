// Game lifecycle: intro or board at start, doors that follow the clue graph, rooms mounted once and
// completed once, and an unmount on every way out of a room, even when the room itself is broken. A
// broken room can still be solved, and a room's context goes inert once the player leaves it. Every
// fragment won is celebrated on the board; memes and screen changes hold the help clock, and no hold
// outlives its room; a room is unmounted once its screen has left, and before it mounts again.
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
function onBoard(options: { slowScreens?: boolean } = {}) {
  const storage = memoryStorage();
  save(openCase(newState(3)), storage);
  const t = setup(storage, options);
  t.game.start();
  return t;
}

const HINT_ONLY = { hint: true, skip: false };

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
  expect(ui.showBoard).toHaveBeenCalledWith(game.state, 'fascicolo');
  expect(ui.narrate).toHaveBeenLastCalledWith(content.witness.board);
});

test('opening the case and solving a room celebrate their fragment', () => {
  const { game, ui, room } = setup();
  game.start();
  game.openCase();
  expect(ui.showBoard).toHaveBeenLastCalledWith(game.state, 'fascicolo');
  game.enter('studio');
  ctxOf(room('studio')).complete();
  expect(ui.showBoard).toHaveBeenLastCalledWith(game.state, 'studio');
  game.enter('scacchiera');
  game.leave();
  expect(ui.showBoard).toHaveBeenLastCalledWith(game.state, null);

  const saved = onBoard();
  expect(saved.ui.showBoard).toHaveBeenLastCalledWith(saved.game.state, null);
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
  game.skip();
  ui.showMeme.mock.lastCall![1](); // the consolation meme has gone
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
  old.meme('error');
  old.complete();
  expect(game.state.solved).toEqual([]);
  expect(ui.showMeme).not.toHaveBeenCalled();
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
  expect(ui.showBoard).toHaveBeenLastCalledWith(game.state, null);

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
  expect(ui.showRoom).toHaveBeenLastCalledWith(room('stanza-46'), expect.any(Function));
});

test('the debug menu leaves the open room first', () => {
  const { game, room } = onBoard();
  game.enter('studio');
  game.debugEnter('rapture');
  expect(room('studio').unmount).toHaveBeenCalledOnce();
  expect(room('rapture').mount).toHaveBeenCalledOnce();
});

// Memes and the confirmed skip.

test('a meme stops the help clock until it has gone', () => {
  const { game, ui, room } = onBoard();
  game.enter('scacchiera');
  vi.advanceTimersByTime(110_000);
  ctxOf(room('scacchiera')).meme('error');
  expect(ui.showMeme).toHaveBeenCalledWith(content.memes.error, expect.any(Function));
  vi.advanceTimersByTime(30_000);
  expect(ui.setHelp).not.toHaveBeenCalledWith(HINT_ONLY);
  ui.showMeme.mock.lastCall![1]();
  vi.advanceTimersByTime(10_000);
  expect(ui.setHelp).toHaveBeenLastCalledWith(HINT_ONLY);
});

test('leaving during a meme does not freeze the help ladder', () => {
  const { game, ui, room } = onBoard();
  game.enter('scacchiera');
  ctxOf(room('scacchiera')).meme('error');
  game.leave();
  game.enter('scacchiera');
  vi.advanceTimersByTime(content.rooms.scacchiera.help.hintAfterSec! * 1000);
  expect(ui.setHelp).toHaveBeenLastCalledWith(HINT_ONLY);
});

test('a meme that ends after its room was left changes nothing', () => {
  const { game, ui, room } = onBoard();
  game.enter('scacchiera');
  ctxOf(room('scacchiera')).meme('error');
  const done = ui.showMeme.mock.lastCall![1];
  game.leave();
  game.enter('scacchiera');
  game.startAudience(); // the countdown holds the help clock
  done(); // the old meme ends late
  vi.advanceTimersByTime(content.rooms.scacchiera.help.hintAfterSec! * 1000);
  expect(ui.setHelp).not.toHaveBeenCalledWith(HINT_ONLY);
  vi.advanceTimersByTime(content.audienceSeconds * 1000);
  expect(ui.setHelp).toHaveBeenLastCalledWith(HINT_ONLY);
});

test('an unknown meme does nothing', () => {
  const { game, ui, room } = onBoard();
  game.enter('studio');
  ctxOf(room('studio')).meme('nope');
  expect(ui.showMeme).not.toHaveBeenCalled();
});

test('the confirmed skip shows the consolation meme, then solves the room', () => {
  const { game, ui } = onBoard();
  game.enter('scacchiera');
  game.skip();
  expect(ui.showMeme).toHaveBeenCalledWith(content.memes.consolation, expect.any(Function));
  expect(game.state.solved).toEqual([]);
  ui.showMeme.mock.lastCall![1]();
  expect(game.state.solved).toEqual(['scacchiera']);
  expect(ui.showBoard).toHaveBeenLastCalledWith(game.state, 'scacchiera');
});

test('Ctrl+Shift+N during the consolation meme solves the room once', () => {
  const { game, ui } = onBoard();
  game.enter('scacchiera');
  game.skip();
  game.solve();
  ui.showMeme.mock.lastCall![1]();
  expect(game.state.solved).toEqual(['scacchiera']);
  expect(ui.showBoard).toHaveBeenCalledTimes(2); // at start, then once for the solve
});

// Screen changes: the UI says when the old screen has left and when a room is on screen.

test('a room is unmounted when its screen has left', () => {
  const t = onBoard({ slowScreens: true });
  t.game.enter('studio');
  t.game.leave();
  expect(t.room('studio').unmount).not.toHaveBeenCalled();
  t.screenGone();
  t.screenGone();
  expect(t.room('studio').unmount).toHaveBeenCalledOnce();
});

test('a room is unmounted before it mounts again', () => {
  const t = onBoard({ slowScreens: true });
  t.game.enter('studio');
  t.game.leave();
  t.game.enter('studio');
  const studio = t.room('studio');
  expect(studio.unmount).toHaveBeenCalledOnce();
  expect(studio.unmount.mock.invocationCallOrder[0]).toBeLessThan(studio.mount.mock.invocationCallOrder[1]);
});

test('reset unmounts the open room at once', () => {
  const t = onBoard({ slowScreens: true });
  t.game.enter('studio');
  t.game.reset();
  expect(t.room('studio').unmount).toHaveBeenCalledOnce();
});

test('the help clock starts when the room is on screen', () => {
  const t = onBoard({ slowScreens: true });
  t.game.enter('scacchiera');
  vi.advanceTimersByTime(200_000);
  expect(t.ui.setHelp).not.toHaveBeenCalledWith(HINT_ONLY);
  t.shown();
  vi.advanceTimersByTime(content.rooms.scacchiera.help.hintAfterSec! * 1000);
  expect(t.ui.setHelp).toHaveBeenLastCalledWith(HINT_ONLY);
});

test('a room left before it was on screen does not freeze the help ladder', () => {
  const t = onBoard({ slowScreens: true });
  t.game.enter('scacchiera');
  t.game.leave();
  t.game.enter('scacchiera');
  t.shown();
  vi.advanceTimersByTime(content.rooms.scacchiera.help.hintAfterSec! * 1000);
  expect(t.ui.setHelp).toHaveBeenLastCalledWith(HINT_ONLY);
});
