// Game controller: owns the state and the save, moves between the case opening, the board, the rooms and
// the finale, builds each room's context and runs the audience help and the auto-help ladder. Every way
// out of a room goes through exit(), so the countdown ends, the session timer stops and every hold on the
// help clock is released; the room is unmounted once its screen has left. Animations (a room coming on
// screen, a meme) hold the help clock while they play. Room 46 ends the game: once solved, the finale
// takes the board's place, now and at every start, and its button hands the whole link to the browser
// once per finale shown. When the window comes back from the video the epilogue takes the finale's place,
// once, and from then on every start opens on it. It never touches the DOM: the screen is a GameUi, the
// browser is GameDeps.open.
import { audienceStatus, startCountdown, type AudienceStatus, type Countdown } from './audience';
import { createLadder, type HelpStatus, type Ladder } from './autohelp';
import { isOpen } from './clues';
import { assembleLink, linkParts } from './link';
import { clear, load, save, type StorageLike } from './save';
import * as rules from './state';
import type { GameState } from './state';
import type { Content, GameContext, Meme, Room, RoomId } from './types';

const TICK_MS = 250;

/** The room that ends the game: once it is solved the finale takes the board's place. */
export const FINALE: RoomId = 'stanza-46';

/** The sounds the game can play. */
export interface Sfx {
  play(name: string): void;
  stopAll(): void;
}

/** The fragment just won: a room's, or "youtu.be/" when the case opens. */
export type Earned = RoomId | 'fascicolo';

/** What the game asks of the screen. */
export interface GameUi {
  showIntro(): void;
  showBoard(state: GameState, earned: Earned | null): void; // earned: the fragment the board celebrates
  showFinale(state: GameState, earned: boolean): void; // earned: the wish of the last fragment plays first
  showEpilogue(): void; // the closing scene, after the video
  showRoom(room: Room, shown: () => void): HTMLElement; // the element the room mounts into; shown: it is on screen
  narrate(text: string): void;
  setAudience(status: AudienceStatus): void;
  setHelp(help: HelpStatus): void;
  showHint(text: string, n: number, total: number): void;
  showMeme(meme: Meme, done: () => void): void; // done, once, when the meme has gone
}

export interface Game {
  readonly state: GameState;
  // The case opening if the case is not open yet, the finale once Room 46 is solved, the epilogue once its video
  // was opened, else the board.
  start(): void;
  openCase(): void;
  enter(id: RoomId): void; // only from the board, through an open and unsolved door
  leave(): void; // "Torna alla lavagna?"
  solve(): void; // ctx.complete(), Ctrl+Shift+N and the end of a confirmed skip all land here
  skip(): void; // the confirmed "Apri la porta?": the consolation meme, then solve()
  startAudience(): void; // "Aiuto del pubblico?"
  finishAudience(): void; // "Abbiamo finito?"
  hint(force: boolean): void; // "Un indizio?", or Ctrl+Shift+H with force
  giveBackToken(): void; // Ctrl+Shift+G
  debugEnter(id: RoomId): void; // the debug menu: opens the case, adds the room's clues, enters it
  watch(): void; // "Guarda la confessione?": saves watched and opens the video, once per finale shown
  comeBack(): void; // the window is back after the video: the epilogue, once
  reset(): void; // Ctrl+Shift+R, once confirmed
}

export interface GameDeps {
  content: Content;
  rooms: readonly Room[];
  audio: Sfx;
  storage?: StorageLike;
  now?: () => number;
  open(url: string): void; // hands the video link to the browser
  ui(game: Game, screenGone: () => void): GameUi; // the screen calls screenGone once the old screen has left
}

interface Session {
  room: Room;
  timer: ReturnType<typeof setInterval>;
  countdown: Countdown | null;
  shown: string; // the audience status last sent to the screen
  ladder: Ladder;
  help: HelpStatus; // the help buttons last sent to the screen
  holds: Set<() => void>; // animations holding the help clock, each released once
}

export function createGame(deps: GameDeps): Game {
  const { content, rooms, audio, storage } = deps;
  const now = deps.now ?? (() => Date.now());
  let state = load(content.tokens, storage);
  let session: Session | null = null;
  let leaving: Room | null = null; // left, but its screen is still on the way out
  let onBoard = false;
  let finale: 'shown' | 'watched' | null = null; // the finale on screen, and whether its button was pressed
  // One ladder per room for the whole game: leaving pauses it, coming back resumes it.
  const ladders = new Map<RoomId, Ladder>();

  const persist = (next: GameState) => {
    state = next;
    save(state, storage);
  };

  const showBoard = (earned: Earned | null = null) => {
    onBoard = true;
    ui.showBoard(state, earned);
    ui.narrate(content.witness.board);
  };

  const showFinale = (earned: boolean) => {
    onBoard = false;
    finale = 'shown';
    ui.showFinale(state, earned);
    ui.narrate(content.witness.finale);
  };

  const showEpilogue = () => {
    onBoard = false;
    finale = null;
    ui.showEpilogue();
    ui.narrate(content.witness.epilogue);
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

  // An animation holds the help clock: the ladder pauses now and resumes once, at release() or when
  // the room is left, whichever comes first.
  const hold = (current: Session): (() => void) => {
    current.ladder.pause();
    const release = () => {
      if (current.holds.delete(release)) current.ladder.resume();
    };
    current.holds.add(release);
    return release;
  };

  // The room that left is unmounted once: when its screen has left, or before any room mounts.
  const retire = () => {
    const room = leaving;
    leaving = null;
    if (room) guard(() => room.unmount());
  };

  // The only way out of a room: whatever the room does wrong, the game goes on.
  const exit = () => {
    if (!session) return;
    endAudience();
    for (const release of [...session.holds]) release();
    session.ladder.pause();
    clearInterval(session.timer);
    leaving = session.room;
    session = null;
    audio.stopAll();
  };

  const mount = (room: Room) => {
    retire();
    onBoard = false;
    finale = null;
    const roomContent = content.rooms[room.id];
    let ladder = ladders.get(room.id);
    if (ladder) ladder.resume();
    else ladders.set(room.id, (ladder = createLadder(roomContent.help, roomContent.hints.length, now)));
    const help = ladder.status();
    const current: Session = { room, timer: setInterval(tick, TICK_MS), countdown: null, shown: '', ladder, help, holds: new Set() };
    session = current;
    const live = () => session === current; // a room that outlives its exit is ignored

    const root = ui.showRoom(room, hold(current)); // the help clock waits until the room is on screen
    ui.narrate(roomContent.witness.intro);
    showAudience();
    ui.setHelp(help);
    if (ladder.revealed() > 0) showHint(ladder.revealed() - 1);

    const ctx: GameContext = {
      content: roomContent,
      common: { clues: content.clues, ui: content.ui },
      hasClue: (id) => state.clues.includes(id),
      link: () => linkParts(content.link, state),
      narrate: (text) => live() && ui.narrate(text),
      playSfx: (name) => live() && audio.play(name),
      meme: (id) => live() && Object.hasOwn(content.memes, id) && ui.showMeme(content.memes[id], hold(current)),
      reportError: () => {
        if (!live()) return;
        current.ladder.error();
        showHelp();
      },
      won: () => live() && persist(rules.complete(state, room)),
      complete: () => live() && game.solve(),
    };
    guard(() => room.mount(root, ctx));
  };

  const game: Game = {
    get state() {
      return state;
    },
    start() {
      if (state.solved.includes(FINALE) && state.watched) showEpilogue();
      else if (state.solved.includes(FINALE)) showFinale(false);
      else if (state.opened) showBoard();
      else ui.showIntro();
    },
    openCase() {
      if (session) return;
      persist(rules.openCase(state));
      showBoard('fascicolo');
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
      if (room.id === FINALE) showFinale(true);
      else showBoard(room.id);
    },
    skip() {
      if (!session) return;
      const current = session;
      const release = hold(current);
      ui.showMeme(content.memes.consolation, () => {
        release();
        if (session === current) game.solve();
      });
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
    watch() {
      if (finale !== 'shown') return;
      finale = 'watched';
      persist(rules.watch(state));
      deps.open(assembleLink(content.link.map((part) => part.text))); // always the whole link, whatever was skipped
    },
    comeBack() {
      if (finale === 'watched') showEpilogue(); // only from the finale whose button opened the video
    },
    reset() {
      exit();
      retire();
      ladders.clear();
      clear(storage);
      state = rules.newState(content.tokens);
      onBoard = false;
      finale = null;
      ui.showIntro();
    },
  };
  const ui = deps.ui(game, retire);
  return game;
}

function guard(run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(error);
  }
}
