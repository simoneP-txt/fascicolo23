// Placeholder room: the real id and clues, with one button that solves the room and one that counts a
// wrong attempt. Phase 4 replaces each placeholder with its real puzzle.
import type { Room, RoomId } from '../engine/types';
import { el } from '../ui/dom';
import { GRAPH } from './graph';

export function placeholderRoom(id: RoomId, audienceHelp: boolean): Room {
  let view: HTMLElement | null = null;
  return {
    id,
    requires: [...GRAPH[id].requires],
    gives: [...GRAPH[id].gives],
    audienceHelp,
    mount(root, ctx) {
      const texts = ctx.content.placeholder!;
      const solve = el('button', 'button', texts.solve);
      const wrong = el('button', 'button button--quiet', texts.error);
      solve.addEventListener('click', () => ctx.complete());
      wrong.addEventListener('click', () => ctx.reportError());
      view = el('div', 'placeholder-room');
      view.append(solve, wrong);
      root.append(view);
    },
    unmount() {
      view?.remove();
      view = null;
    },
  };
}
