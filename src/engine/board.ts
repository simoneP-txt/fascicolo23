// Board (mockup 01): the case board drawn from the game state, the screen the players come back to after
// every room. On the cork the host paints (tokens.css) hang the case title, the classified link
// (src/ui/link.ts) with a black bar for every missing fragment, the night window, a card per room (solved
// with its fragment and stamp, open with a red outline and "Entra?", closed with a lock and what it lacks)
// and the clues in the order found, each joined by a red string to every door that needs it. The tokens
// left hang under the window; under them, on the bare cork, sits "Azzera partita?", a quiet link that calls
// onReset (decision 20), only while content.json has its line. Once Room 46 is solved the game ends on its
// finale; only the epilogue leads back here, every door solved, and Room 46's offers "Entra?" beside its
// stamp to see the epilogue again (decision 21 of phase 6). The other solved doors stay shut.
// With a fragment just won the board waits under the wish: the fragment stays under its bar, and the stamp,
// clue cards and strings the room brought (data-new) stay out of sight until reveal(), which board.css plays.
import '../ui/board.css';
import { tokenRow } from '../ui/audience';
import { doorArt, nightWindow } from '../ui/board-art';
import { button } from '../ui/button';
import { chip, clueCard, paper, stamp } from '../ui/card';
import { durationOf, el } from '../ui/dom';
import { renderLink } from '../ui/link';
import { STAGE_HEIGHT, STAGE_WIDTH } from '../ui/stage';
import { icon, svg } from '../ui/svg';
import { isOpen, type GraphRoom } from './clues';
import { FINALE, type Earned, type Sfx } from './game';
import { linkParts } from './link';
import type { GameState } from './state';
import type { ClueId, Content, Room, RoomId } from './types';

export interface BoardView {
  el: HTMLElement;
  reveal(): void; // after the wish: the bar comes off, the stamp beats, the new clues come down, their strings stretch
}

export interface Spot {
  x: number; // stage px of the top left corner
  y: number;
  tilt: number; // degrees
}

/** Where each door card hangs, as in mockup 01. */
export const DOOR_SPOTS: Record<RoomId, Spot> = {
  studio: { x: 560, y: 232, tilt: -2 },
  scacchiera: { x: 944, y: 232, tilt: 1.5 },
  rapture: { x: 592, y: 744, tilt: 1 },
  'stanza-46': { x: 960, y: 744, tilt: -1.5 },
  biblioteca: { x: 1328, y: 744, tilt: -1 },
};

/** Where the clue cards hang, in the order found: the row of mockup 01, with room for all five. */
export const CLUE_SPOTS: Spot[] = [
  { x: 560, y: 568, tilt: -3 },
  { x: 800, y: 568, tilt: 2 },
  { x: 1040, y: 568, tilt: -2 },
  { x: 1280, y: 568, tilt: 1.5 },
  { x: 1520, y: 568, tilt: -1 },
];

// Card sizes as board.css (doors) and card.css (clues) set them: a string needs a clue's middle and a
// door's pin.
const DOOR_WIDTH = 288;
const CLUE_WIDTH = 224;
const CLUE_HEIGHT = 128;

/** A string for each clue found and each door that needs it: in the order found, then in the order of the rooms. */
export function boardStrings(clues: readonly ClueId[], rooms: readonly GraphRoom[]): { clue: ClueId; room: RoomId }[] {
  return clues.flatMap((clue) =>
    rooms.filter((room) => room.requires.includes(clue)).map((room) => ({ clue, room: room.id })),
  );
}

/** What a closed door says: the room's own line, or the line of the first clue it still misses. */
export function doorText(room: Pick<Room, 'id' | 'requires'>, clues: readonly ClueId[], content: Content): string {
  const missing = room.requires.find((clue) => !clues.includes(clue));
  return content.rooms[room.id].locked ?? (missing ? content.clues[missing].missing : '');
}

export function renderBoard(
  content: Content,
  rooms: readonly Room[],
  state: GameState,
  earned: Earned | null,
  audio: Sfx,
  onEnter: (id: RoomId) => void,
  onReset: () => void,
): BoardView {
  const screen = el('section', 'screen board');
  screen.dataset.screen = 'board';
  const won = rooms.find((room) => room.id === earned); // none when the case has just opened
  const fresh = new Set(won?.gives);

  const title = paper('board__title', { pin: true });
  title.append(el('div', 'label', content.ui.file), el('h1', 'board__case', content.ui.case));

  const parts = linkParts(content.link, state);
  const complete = parts.every((part) => part.shown);
  const line = renderLink(parts, earned);
  const link = paper('board__link', { pin: true });
  link.append(el('div', 'label', complete ? content.ui.link.done : content.ui.link.label), line.el);

  const view = el('div', 'board__window');
  view.append(nightWindow());

  const doors = rooms.map((room) => doorCard(room, content, state, room.id === earned, onEnter));
  const clues = state.clues.map((clue, i) => {
    const card = place(clueCard(content, clue, CLUE_SPOTS[i].tilt), CLUE_SPOTS[i]);
    if (fresh.has(clue)) card.dataset.new = '';
    return card;
  });

  // The strings first, so every card hangs over them.
  screen.append(strings(state.clues, rooms, fresh), title, link, view, tokens(content, state), ...doors, ...clues);
  if (content.ui.reset.button) {
    const reset = button(content.ui.reset.button, 'link', onReset, 'restart');
    reset.classList.add('board__reset');
    screen.append(reset);
  }

  let revealed = false;
  return {
    el: screen,
    reveal() {
      if (revealed) return;
      revealed = true;
      line.peel();
      if (!won) return;
      screen.dataset.reveal = '';
      // The thud comes as the stamp lands, unless the board has left the stage by then.
      const landing = durationOf('--duration-peel') + durationOf('--duration-stamp');
      setTimeout(() => screen.isConnected && audio.play('stamp'), landing);
    },
  };
}

function place(node: HTMLElement, spot: Spot): HTMLElement {
  node.style.left = `${spot.x}px`;
  node.style.top = `${spot.y}px`;
  return node;
}

// One layer of red strings over the whole stage. Each runs from the middle of its clue card, hidden behind
// it, and sags into the pin of its door from the side, level with it. pathLength 1 lets board.css stretch
// a string with its dash, whatever its length.
function strings(clues: readonly ClueId[], rooms: readonly GraphRoom[], fresh: ReadonlySet<ClueId>): SVGSVGElement {
  const paths = boardStrings(clues, rooms).map(({ clue, room }) => {
    const from = CLUE_SPOTS[clues.indexOf(clue)];
    const to = DOOR_SPOTS[room];
    const [x0, y0] = [from.x + CLUE_WIDTH / 2, from.y + CLUE_HEIGHT / 2];
    const [x1, y1] = [to.x + DOOR_WIDTH / 2, to.y];
    const curve = `M${x0} ${y0} Q ${(x0 + x1) / 2} ${y1} ${x1} ${y1}`;
    const isNew = fresh.has(clue) ? ' data-new=""' : '';
    return `<path data-string="${clue} ${room}"${isNew} d="${curve}" pathLength="1"/>`;
  });
  return svg(`<svg class="board__strings" viewBox="0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}" aria-hidden="true"
    fill="none" stroke="var(--red)" stroke-width="3" stroke-linecap="round">${paths.join('')}</svg>`);
}

function doorCard(room: Room, content: Content, state: GameState, won: boolean, onEnter: (id: RoomId) => void): HTMLElement {
  const spot = DOOR_SPOTS[room.id];
  const card = place(paper('door', { pin: true, tilt: spot.tilt }), spot);
  card.dataset.door = room.id;
  const art = el('div', 'door__art');
  art.append(doorArt(room.id));
  card.append(art, el('h2', 'door__name', content.rooms[room.id].name));
  if (state.solved.includes(room.id)) {
    const fragment = chip(content.link.find((part) => part.room === room.id)?.text ?? '');
    fragment.classList.add('door__fragment');
    const solved = stamp(content.ui.solved);
    solved.classList.add('door__stamp');
    if (won) solved.dataset.new = '';
    card.classList.add('door--solved');
    card.append(fragment, solved);
    if (room.id === FINALE && state.watched) {
      const again = button(content.ui.enter, 'primary', () => onEnter(room.id));
      again.classList.add('door__enter', 'door__again');
      card.append(again);
    }
  } else if (isOpen(room, state.clues)) {
    const enter = button(content.ui.enter, 'primary', () => onEnter(room.id));
    enter.classList.add('door__enter');
    card.classList.add('door--open');
    card.append(enter);
  } else {
    const lock = icon('lock');
    lock.classList.add('door__lock');
    lock.dataset.lock = '';
    art.append(lock);
    card.classList.add('door--closed');
    card.append(el('div', 'door__missing', doorText(room, state.clues, content)));
  }
  return card;
}

// The tokens left, shown here but used inside the rooms.
function tokens(content: Content, state: GameState): HTMLElement {
  const card = paper('board__tokens', { pin: true });
  card.append(el('div', 'board__tokens-title', content.ui.audience.button), tokenRow(state.tokens, content.tokens));
  return card;
}
