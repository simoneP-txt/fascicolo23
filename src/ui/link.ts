// Classified link (mockup 01): the fragments in link order, the case opening's in ink and the rest in red. A
// fragment not won yet is a black bar as wide as its text, with no text under it, so neither the screen nor
// the page gives it away. The fragment just won starts under its bar as well: peel() puts its text in and
// lifts the bar off (link.css), and a timer takes the bar away once --duration-peel is over.
import './link.css';
import type { Earned } from '../engine/game';
import type { LinkPart } from '../engine/link';
import { durationOf, el } from './dom';

export interface LinkView {
  el: HTMLElement;
  peel(): void; // the bar over the fragment just won comes off; nothing happens after the first call
}

/** The link from its parts, as the engine's linkParts() or a room's ctx.link() gives them. */
export function renderLink(parts: readonly LinkPart[], earned: Earned | null): LinkView {
  const line = el('div', 'link');
  let covered: { node: HTMLElement; text: string } | null = null;
  for (const part of parts) {
    const fragment = el('span', 'link__part');
    fragment.dataset.fragment = part.room;
    if (part.shown && part.room !== earned) {
      fragment.textContent = part.text;
    } else {
      fragment.dataset.hidden = '';
      fragment.style.width = `${part.text.length}ch`; // the bar is as long as what it hides
      if (part.shown) covered = { node: fragment, text: part.text };
    }
    line.append(fragment);
  }

  return {
    el: line,
    peel() {
      if (!covered) return;
      const { node, text } = covered;
      covered = null;
      delete node.dataset.hidden;
      node.style.width = '';
      node.textContent = text;
      node.dataset.peel = '';
      setTimeout(() => delete node.dataset.peel, durationOf('--duration-peel'));
    },
  };
}
