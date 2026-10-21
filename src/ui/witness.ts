// Witness: the speech bubble on the board and in every room, with its label and the current line.
import type { Content } from '../engine/types';
import { el } from './dom';

export interface Witness {
  el: HTMLElement;
  say(text: string): void;
}

export function createWitness(content: Content): Witness {
  const bubble = el('aside', 'card witness');
  bubble.dataset.witness = '';
  const line = el('p', 'witness__line');
  bubble.append(el('div', 'label', content.ui.witnessLabel), line);
  return {
    el: bubble,
    say(text) {
      line.textContent = text;
    },
  };
}
