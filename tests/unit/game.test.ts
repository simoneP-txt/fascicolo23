// Game lifecycle: intro or board at start, doors that follow the clue graph, rooms mounted once and
// completed once, and an unmount on every way out of a room, even when the room itself is broken.
import { expect, test, vi } from 'vitest';
import { validOrders } from '../../src/engine/clues';
import { load, save } from '../../src/engine/save';
import { newState, openCase } from '../../src/engine/state';
import { graphRooms } from '../../src/rooms/graph';
import { content, ctxOf, memoryStorage, setup } from './fakes';

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
