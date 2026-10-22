// Witness: the speech bubble with the silhouette under it (tail 'down', as in the rooms) or beside it
// ('right'). Every line it says ends with exactly one question mark, the running gag, whatever text a room
// hands it, and pops the bubble out of its tail.
import './witness.css';
import type { Content } from '../engine/types';
import { el, replay } from './dom';
import { figure } from './svg';

export interface Witness {
  el: HTMLElement;
  say(text: string): void;
}

/** The line as the witness says it: trailing spaces, periods, exclamations and ellipses become one "?". */
export function question(text: string): string {
  return `${text.trim().replace(/[\s.!?…]+$/u, '')}?`;
}

export function createWitness(content: Content, tail: 'down' | 'right'): Witness {
  const witness = el('div', `witness witness--${tail}`);
  witness.dataset.witness = '';
  const line = el('p', 'witness__line');
  const bubble = el('aside', 'witness__bubble');
  bubble.append(el('div', 'label witness__label', content.ui.witnessLabel), line);
  const silhouette = figure();
  silhouette.classList.add('witness__figure');
  witness.append(bubble, silhouette);
  return {
    el: witness,
    say(text) {
      line.textContent = question(text);
      replay(bubble, 'pop');
    },
  };
}
