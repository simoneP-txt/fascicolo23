// Cards: the paper of the mockups (paper tone, a light grain of dots, a red pin and a tilt on request), the
// red stamp ("RISOLTO?", "CASO RISOLTO?"), the black chip that carries a fragment ("71") and the clue card,
// whose label reads as a code in Special Elite when it has no spaces (g4, 04:51) and as a sentence in
// Cormorant Garamond otherwise.
import './card.css';
import type { ClueId, Content } from '../engine/types';
import { el } from './dom';

export function paper(className: string, options: { pin?: boolean; tilt?: number } = {}): HTMLElement {
  const sheet = el('div', `paper ${className}`);
  if (options.pin) {
    const pin = el('span', 'paper__pin');
    pin.setAttribute('aria-hidden', 'true');
    sheet.append(pin);
  }
  if (options.tilt) sheet.style.rotate = `${options.tilt}deg`; // rotate, so transform stays free for motion
  return sheet;
}

export function stamp(text: string): HTMLElement {
  const node = el('div', 'stamp', text);
  node.dataset.stamp = '';
  return node;
}

export function chip(text: string): HTMLElement {
  return el('span', 'chip', text);
}

export function clueCard(content: Content, clue: ClueId, tilt?: number): HTMLElement {
  const label = content.clues[clue].label;
  const card = paper('clue', { pin: true, tilt });
  card.dataset.clue = clue;
  card.append(el('div', 'label', content.ui.clueLabel), el('div', /\s/.test(label) ? 'clue__text' : 'clue__code', label));
  return card;
}
