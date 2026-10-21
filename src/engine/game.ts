// Game controller: owns the state and the save, moves between the case opening, the board and the
// rooms, builds each room's context, and sends every way out of a room through exit() so that
// unmount always runs. It never touches the DOM: the screen is a GameUi.
import { isOpen } from './clues';
import { load, save, type StorageLike } from './save';
import * as rules from './state';
import type { GameState } from './state';
import type { Content, GameContext, Room, RoomId } from './types';

/** The sounds the game can play. */
export interface Sfx {
  play(name: string): void;
  stopAll(): void;
}

/** What the game asks of the screen. */
export interface GameUi {
  showIntro(): void;
  showBoard(state: GameState): void;
  showRoom(room: Room): HTMLElement; // the element the room mounts into
  narrate(text: string): void;
}

export interface Game {
  readonly state: GameState;
  start(): void; // the case opening if the case is not open yet, else the board
  openCase(): void;
  enter(id: RoomId): void; // only from the board, through an open and unsolved door
  leave(): void; // "Torna alla lavagna?"
  solve(): void; // ctx.complete(), Ctrl+Shift+N and the confirmed skip all land here
}

export interface GameDeps {
  content: Content;
  rooms: readonly Room[];
  audio: Sfx;
  storage?: StorageLike;
  ui(game: Game): GameUi;
}

interface Session {
  room: Room;
}

export function createGame(deps: GameDeps): Game {
  const { content, rooms, audio, storage } = deps;
  let state = load(content.tokens, storage);
  let session: Session | null = null;
  let onBoard = false;

  const persist = (next: GameState) => {
    state = next;
    save(state, storage);
  };

  const showBoard = () => {
    onBoard = true;
    ui.showBoard(state);
    ui.narrate(content.witness.board);
  };

  // The only way out of a room: whatever the room does wrong, the game goes on.
  const exit = () => {
    if (!session) return;
    const { room } = session;
    session = null;
    guard(() => room.unmount());
    audio.stopAll();
  };

  const mount = (room: Room) => {
    onBoard = false;
    const current: Session = { room };
    session = current;
    const live = () => session === current; // a room that outlives its exit is ignored
    const root = ui.showRoom(room);
    ui.narrate(content.rooms[room.id].witness.intro);
    const ctx: GameContext = {
      content: content.rooms[room.id],
      hasClue: (id) => state.clues.includes(id),
      narrate: (text) => live() && ui.narrate(text),
      playSfx: (name) => live() && audio.play(name),
      reportError: () => {},
      complete: () => live() && game.solve(),
    };
    guard(() => room.mount(root, ctx));
  };

  const game: Game = {
    get state() {
      return state;
    },
    start() {
      if (state.opened) showBoard();
      else ui.showIntro();
    },
    openCase() {
      if (session) return;
      persist(rules.openCase(state));
      showBoard();
    },
    enter(id) {
      const room = rooms.find((candidate) => candidate.id === id);
      if (!room || !onBoard || state.solved.includes(id) || !isOpen(room, state.clues)) return;
      mount(room);
    },
    leave() {
      if (!session) return;
      exit();
      showBoard();
    },
    solve() {
      if (!session) return;
      persist(rules.complete(state, session.room));
      exit();
      showBoard();
    },
  };
  const ui = deps.ui(game);
  return game;
}

function guard(run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(error);
  }
}
