// Witness: the speech bubble on the board and in every room. Every line it says ends with exactly one
// question mark, the running gag, whatever text a room hands it.
import type { Content } from '../engine/types';
import { el } from './dom';

export interface Witness {
  el: HTMLElement;
  say(text: string): void;
}

/** The line as the witness says it: trailing spaces, periods, exclamations and ellipses become one "?". */
export function question(text: string): string {
  return `${text.trim().replace(/[\s.!?…]+$/u, '')}?`;
}

export function createWitness(content: Content): Witness {
  const bubble = el('aside', 'card witness');
  bubble.dataset.witness = '';
  const line = el('p', 'witness__line');
  bubble.append(el('div', 'label', content.ui.witnessLabel), line);
  return {
    el: bubble,
    say(text) {
      line.textContent = question(text);
    },
  };
}
