// Test doubles shared by the unit tests: an in-memory Storage, rooms that follow the real clue graph,
// a screen and a sound bank that only record calls, and a game wired to all of them. By default a fake
// screen change is over at once (the old screen has left, the new room is on screen); with slowScreens
// the test ends it itself.
import { vi } from 'vitest';
import json from '../../content/content.json';
import { validateContent } from '../../src/engine/content';
import { createGame, type GameUi, type Sfx } from '../../src/engine/game';
import type { StorageLike } from '../../src/engine/save';
import { ROOM_IDS, type GameContext, type Room, type RoomId } from '../../src/engine/types';
import { GRAPH } from '../../src/rooms/graph';

export const content = validateContent(json);

export function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

export function fakeRooms() {
  return ROOM_IDS.map((id) => ({
    id,
    requires: [...GRAPH[id].requires],
    gives: [...GRAPH[id].gives],
    audienceHelp: id !== 'rapture',
    mount: vi.fn<Room['mount']>(),
    unmount: vi.fn<Room['unmount']>(),
  }));
}
export type FakeRoom = ReturnType<typeof fakeRooms>[number];

export function fakeUi() {
  return {
    showIntro: vi.fn<GameUi['showIntro']>(),
    showBoard: vi.fn<GameUi['showBoard']>(),
    showRoom: vi.fn<GameUi['showRoom']>(() => ({}) as HTMLElement),
    narrate: vi.fn<GameUi['narrate']>(),
    setAudience: vi.fn<GameUi['setAudience']>(),
    setHelp: vi.fn<GameUi['setHelp']>(),
    showHint: vi.fn<GameUi['showHint']>(),
    showMeme: vi.fn<GameUi['showMeme']>(),
  } satisfies GameUi;
}

export function fakeAudio() {
  return { play: vi.fn<Sfx['play']>(), stopAll: vi.fn<Sfx['stopAll']>() } satisfies Sfx;
}

export function setup(storage = memoryStorage(), options: { slowScreens?: boolean } = {}) {
  const ui = fakeUi();
  const rooms = fakeRooms();
  const audio = fakeAudio();
  let screenGone = () => {};
  const game = createGame({
    content,
    rooms,
    audio,
    storage,
    ui: (_, gone) => {
      screenGone = gone;
      return ui;
    },
  });
  if (!options.slowScreens) {
    ui.showIntro.mockImplementation(() => screenGone());
    ui.showBoard.mockImplementation(() => screenGone());
    ui.showRoom.mockImplementation((_, shown) => {
      screenGone();
      shown();
      return {} as HTMLElement;
    });
  }
  const room = (id: RoomId) => rooms.find((candidate) => candidate.id === id)!;
  return {
    game,
    ui,
    rooms,
    room,
    audio,
    storage,
    screenGone: () => screenGone(), // the old screen has left the stage
    shown: () => ui.showRoom.mock.lastCall![1](), // the last room is on screen
  };
}

/** The context the game handed to the room's last mount. */
export function ctxOf(room: FakeRoom): GameContext {
  return room.mount.mock.lastCall![1];
}
