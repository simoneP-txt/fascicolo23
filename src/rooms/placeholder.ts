// Placeholder room: the real id and clues, with one button that solves the room and one that counts a
// wrong attempt and shows the error meme. Phase 4 replaces each placeholder with its real puzzle.
import type { Room, RoomId } from '../engine/types';
import { button } from '../ui/button';
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
      const solve = button(texts.solve, 'primary', () => ctx.complete());
      const wrong = button(texts.error, 'outline', () => {
        ctx.reportError();
        ctx.meme('error');
      });
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
