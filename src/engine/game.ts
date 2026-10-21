// Game controller: owns the state and the save, moves between the case opening, the board and the
// rooms, builds each room's context and runs the audience help and the auto-help ladder. Every way out
// of a room goes through exit(), so the countdown ends, the session timer stops and unmount always
// runs. It never touches the DOM: the screen is a GameUi.
import { audienceStatus, startCountdown, type AudienceStatus, type Countdown } from './audience';
import { createLadder, type HelpStatus, type Ladder } from './autohelp';
import { isOpen } from './clues';
import { clear, load, save, type StorageLike } from './save';
import * as rules from './state';
import type { GameState } from './state';
import type { Content, GameContext, Room, RoomId } from './types';

const TICK_MS = 250;

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
  setAudience(status: AudienceStatus): void;
  setHelp(help: HelpStatus): void;
  showHint(text: string, n: number, total: number): void;
}

export interface Game {
  readonly state: GameState;
  start(): void; // the case opening if the case is not open yet, else the board
  openCase(): void;
  enter(id: RoomId): void; // only from the board, through an open and unsolved door
  leave(): void; // "Torna alla lavagna?"
  solve(): void; // ctx.complete(), Ctrl+Shift+N and the confirmed skip all land here
  startAudience(): void; // "Aiuto del pubblico?"
  finishAudience(): void; // "Abbiamo finito?"
  hint(force: boolean): void; // "Un indizio?", or Ctrl+Shift+H with force
  giveBackToken(): void; // Ctrl+Shift+G
  debugEnter(id: RoomId): void; // the debug menu: opens the case, adds the room's clues, enters it
  reset(): void; // Ctrl+Shift+R, once confirmed
}

export interface GameDeps {
  content: Content;
  rooms: readonly Room[];
  audio: Sfx;
  storage?: StorageLike;
  now?: () => number;
  ui(game: Game): GameUi;
}

interface Session {
  room: Room;
  timer: ReturnType<typeof setInterval>;
  countdown: Countdown | null;
  shown: string; // the audience status last sent to the screen
  ladder: Ladder;
  help: HelpStatus; // the help buttons last sent to the screen
}

export function createGame(deps: GameDeps): Game {
  const { content, rooms, audio, storage } = deps;
  const now = deps.now ?? (() => Date.now());
  let state = load(content.tokens, storage);
  let session: Session | null = null;
  let onBoard = false;
  // One ladder per room for the whole game: leaving pauses it, coming back resumes it.
  const ladders = new Map<RoomId, Ladder>();

  const persist = (next: GameState) => {
    state = next;
    save(state, storage);
  };

  const showBoard = () => {
    onBoard = true;
    ui.showBoard(state);
    ui.narrate(content.witness.board);
  };

  const showAudience = () => {
    if (!session) return;
    const status = audienceStatus(session.room.audienceHelp, state.tokens, content.tokens, session.countdown);
    const key = JSON.stringify(status);
    if (key === session.shown) return;
    session.shown = key;
    ui.setAudience(status);
  };

  // New help buttons are announced by the witness.
  const showHelp = () => {
    if (!session) return;
    const help = session.ladder.status();
    const before = session.help;
    if (help.hint === before.hint && help.skip === before.skip) return;
    session.help = help;
    if ((help.hint && !before.hint) || (help.skip && !before.skip)) ui.narrate(content.witness.help);
    ui.setHelp(help);
  };

  const showHint = (index: number) => {
    const hints = content.rooms[session!.room.id].hints;
    ui.showHint(hints[index], index + 1, hints.length);
  };

  // The token is spent when the countdown ends, however it ends.
  const endAudience = () => {
    if (!session?.countdown) return;
    session.countdown = null;
    session.ladder.resume();
    persist(rules.useToken(state));
    showAudience();
  };

  const tick = () => {
    if (session?.countdown?.done()) endAudience();
    showAudience();
    showHelp();
  };

  // The only way out of a room: whatever the room does wrong, the game goes on.
  const exit = () => {
    if (!session) return;
    endAudience();
    session.ladder.pause();
    clearInterval(session.timer);
    const { room } = session;
    session = null;
    guard(() => room.unmount());
    audio.stopAll();
  };

  const mount = (room: Room) => {
    onBoard = false;
    const roomContent = content.rooms[room.id];
    let ladder = ladders.get(room.id);
    if (ladder) ladder.resume();
    else ladders.set(room.id, (ladder = createLadder(roomContent.help, roomContent.hints.length, now)));
    const help = ladder.status();
    const current: Session = { room, timer: setInterval(tick, TICK_MS), countdown: null, shown: '', ladder, help };
    session = current;
    const live = () => session === current; // a room that outlives its exit is ignored

    const root = ui.showRoom(room);
    ui.narrate(roomContent.witness.intro);
    showAudience();
    ui.setHelp(help);
    if (ladder.revealed() > 0) showHint(ladder.revealed() - 1);

    const ctx: GameContext = {
      content: roomContent,
      hasClue: (id) => state.clues.includes(id),
      narrate: (text) => live() && ui.narrate(text),
      playSfx: (name) => live() && audio.play(name),
      reportError: () => {
        if (!live()) return;
        current.ladder.error();
        showHelp();
      },
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
      const { room } = session;
      persist(rules.complete(state, room));
      exit();
      ladders.delete(room.id);
      showBoard();
    },
    startAudience() {
      if (!session || session.countdown || !session.room.audienceHelp || state.tokens === 0) return;
      session.countdown = startCountdown(content.audienceSeconds, now);
      session.ladder.pause();
      showAudience();
    },
    finishAudience() {
      endAudience();
    },
    hint(force) {
      if (!session) return;
      const index = session.ladder.reveal(force);
      if (index !== null) showHint(index);
      showHelp();
    },
    giveBackToken() {
      persist(rules.giveBackToken(state, content.tokens));
      if (session) showAudience();
      else if (onBoard) showBoard();
    },
    debugEnter(id) {
      const room = rooms.find((candidate) => candidate.id === id);
      if (!room) return;
      exit();
      persist(rules.addClues(rules.openCase(state), room.requires));
      mount(room);
    },
    reset() {
      exit();
      ladders.clear();
      clear(storage);
      state = rules.newState(content.tokens);
      onBoard = false;
      ui.showIntro();
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
