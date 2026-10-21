// Board: the case board drawn from the game state. The case title, the classified link with a black bar
// for every missing fragment, a card per room (solved, open, or closed with what it lacks), the clues
// found so far and the audience tokens. Phase 3 dresses it like mockup 01.
import { tokenRow } from '../ui/audience';
import { el } from '../ui/dom';
import { isOpen } from './clues';
import { linkParts } from './link';
import type { GameState } from './state';
import type { ClueId, Content, Room, RoomId } from './types';

/** What a closed door says: the room's own line, or the line of the first clue it still misses. */
export function doorText(room: Pick<Room, 'id' | 'requires'>, clues: readonly ClueId[], content: Content): string {
  const missing = room.requires.find((clue) => !clues.includes(clue));
  return content.rooms[room.id].locked ?? (missing ? content.clues[missing].missing : '');
}

export function renderBoard(content: Content, rooms: readonly Room[], state: GameState, onEnter: (id: RoomId) => void): HTMLElement {
  const screen = el('section', 'screen board');
  screen.dataset.screen = 'board';

  const title = el('div', 'card board__title');
  title.append(el('div', 'label', content.ui.file), el('h1', 'board__case', content.ui.case));

  const parts = linkParts(content.link, state);
  const line = el('div', 'link');
  for (const part of parts) {
    const fragment = el('span', 'link__part', part.shown ? part.text : '');
    fragment.dataset.fragment = part.room;
    if (!part.shown) {
      fragment.dataset.hidden = '';
      fragment.style.width = `${part.text.length}ch`; // the bar is as long as what it hides
    }
    line.append(fragment);
  }
  const link = el('div', 'card board__link');
  link.append(el('div', 'label', parts.every((part) => part.shown) ? content.ui.link.done : content.ui.link.label), line);

  const doors = el('div', 'board__doors');
  doors.append(...rooms.map((room) => doorCard(room, content, state, onEnter)));

  const clues = el('div', 'board__clues');
  for (const clue of state.clues) {
    const card = el('div', 'card clue');
    card.dataset.clue = clue;
    card.append(el('div', 'label', content.ui.clueLabel), el('div', 'clue__text', content.clues[clue].label));
    clues.append(card);
  }

  // The tokens left, shown here but used inside the rooms.
  const tokens = el('div', 'card board__tokens');
  tokens.append(el('div', 'board__tokens-title', content.ui.audience.button), tokenRow(state.tokens, content.tokens));

  screen.append(title, link, doors, clues, tokens);
  return screen;
}

function doorCard(room: Room, content: Content, state: GameState, onEnter: (id: RoomId) => void): HTMLElement {
  const card = el('article', 'card door');
  card.dataset.door = room.id;
  card.append(el('h2', 'door__name', content.rooms[room.id].name));
  if (state.solved.includes(room.id)) {
    const fragment = content.link.find((part) => part.room === room.id)?.text ?? '';
    card.classList.add('door--solved');
    card.append(el('div', 'door__fragment', fragment), el('div', 'stamp', content.ui.solved));
  } else if (isOpen(room, state.clues)) {
    const enter = el('button', 'button door__enter', content.ui.enter);
    enter.addEventListener('click', () => onEnter(room.id));
    card.append(enter);
  } else {
    card.classList.add('door--closed');
    card.append(el('div', 'door__missing', doorText(room, state.clues, content)));
  }
  return card;
}
