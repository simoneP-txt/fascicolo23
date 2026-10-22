// Board: the case board drawn from the game state. The case title, the classified link (src/ui/link.ts)
// with a black bar for every missing fragment, a card per room (solved, open, or closed with what it
// lacks), the clues found so far and the audience tokens. Once every fragment is earned, the provisional
// finale: the "CASO RISOLTO?" stamp and the button that opens the video (phase 5 moves both into Room 46).
// The fragment just won stays under its bar until reveal(), which the screen calls once the wish is over.
// The cards, buttons and stamps are the shared components; Task 3.6 lays the board out like mockup 01.
import '../ui/board.css';
import { tokenRow } from '../ui/audience';
import { button } from '../ui/button';
import { chip, clueCard, paper, stamp } from '../ui/card';
import { el } from '../ui/dom';
import { renderLink } from '../ui/link';
import { isOpen } from './clues';
import type { Earned } from './game';
import { assembleLink, linkParts } from './link';
import type { GameState } from './state';
import type { ClueId, Content, Room, RoomId } from './types';

export interface BoardView {
  el: HTMLElement;
  reveal(): void; // after the wish: the bar over the fragment won comes off
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
  onEnter: (id: RoomId) => void,
): BoardView {
  const screen = el('section', 'screen board');
  screen.dataset.screen = 'board';

  const title = paper('board__title');
  title.append(el('div', 'label', content.ui.file), el('h1', 'board__case', content.ui.case));

  const complete = linkParts(content.link, state).every((part) => part.shown);
  const line = renderLink(content, state, earned);
  const link = paper('board__link');
  link.append(el('div', 'label', complete ? content.ui.link.done : content.ui.link.label), line.el);

  const doors = el('div', 'board__doors');
  doors.append(...rooms.map((room) => doorCard(room, content, state, onEnter)));

  const clues = el('div', 'board__clues');
  for (const clue of state.clues) clues.append(clueCard(content, clue));

  // The tokens left, shown here but used inside the rooms.
  const tokens = paper('board__tokens');
  tokens.append(el('div', 'board__tokens-title', content.ui.audience.button), tokenRow(state.tokens, content.tokens));

  screen.append(title, link, doors, clues, tokens);
  if (complete) screen.append(finale(content));
  return { el: screen, reveal: () => line.peel() };
}

function finale(content: Content): HTMLElement {
  // Electron hands https links to the system browser (electron/main.ts).
  const watch = button(content.ui.finale.watch, 'primary', () =>
    window.open(assembleLink(content.link.map((part) => part.text)), '_blank'),
  );
  const solved = stamp(content.ui.finale.stamp);
  solved.classList.add('board__stamp');
  const block = el('div', 'board__finale');
  block.append(solved, watch);
  return block;
}

function doorCard(room: Room, content: Content, state: GameState, onEnter: (id: RoomId) => void): HTMLElement {
  const card = paper('door');
  card.dataset.door = room.id;
  card.append(el('h2', 'door__name', content.rooms[room.id].name));
  if (state.solved.includes(room.id)) {
    const fragment = chip(content.link.find((part) => part.room === room.id)?.text ?? '');
    fragment.classList.add('door__fragment');
    const solved = stamp(content.ui.solved);
    solved.classList.add('door__stamp');
    card.classList.add('door--solved');
    card.append(fragment, solved);
  } else if (isOpen(room, state.clues)) {
    const enter = button(content.ui.enter, 'primary', () => onEnter(room.id));
    enter.classList.add('door__enter');
    card.append(enter);
  } else {
    card.classList.add('door--closed');
    card.append(el('div', 'door__missing', doorText(room, state.clues, content)));
  }
  return card;
}
