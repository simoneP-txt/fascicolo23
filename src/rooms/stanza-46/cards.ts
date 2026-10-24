// Suspect cards (mockups 11 and 03), shared by the room and the finale: the pinned paper with the silhouette in
// its panel, the name, the line between guillemets and the "Trascina qui?" slot the clues pinned on the suspect
// land in. Once the case is closed each card shows its verdict in place of the line and the slot: "ESCLUSO" under a
// cleared suspect, whose card dims, and the "COLPEVOLE?" stamp beating onto the culprit's panel, whose card is
// ringed in red. A clue card with its short label, "Profilo" for the whole profile, stands for a clue on a suspect
// and on the finale.
import type { Content } from '../../engine/types';
import { clueCard, paper, stamp } from '../../ui/card';
import { el } from '../../ui/dom';
import { svg } from '../../ui/svg';
import { SUSPECT_ART } from './art';
import type { Stanza46Content } from './content';
import type { Evidence, SuspectId } from './deduction';

const TILTS: Record<SuspectId, number> = { giardiniere: -1.5, professore: 1, fidanzato: -1, diva: 1.2 }; // mockup 11

const textsOf = (texts: Stanza46Content, suspect: string) => texts.suspects.find((candidate) => candidate.id === suspect)!;

export function suspectCard(texts: Stanza46Content, suspect: SuspectId): HTMLElement {
  const { name, quote } = textsOf(texts, suspect);
  const card = paper('suspect', { pin: true, tilt: TILTS[suspect] });
  card.dataset.suspect = suspect;
  const art = el('div', 'suspect__art');
  art.append(svg(SUSPECT_ART[suspect]));
  const line = el('p', 'suspect__quote', quote);
  line.dataset.quote = '';
  const slot = el('div', 'suspect__slot');
  slot.dataset.slot = '';
  slot.append(el('span', 'suspect__ask', texts.slot)); // the clues pinned here come after it, and hide it
  card.append(art, el('h2', 'suspect__name', name), line, slot);
  return card;
}

/** The card as the closed case shows it: the verdict line in place of the quote and the slot, and its stamp. */
export function showVerdict(card: HTMLElement, texts: Stanza46Content, guilty: boolean): void {
  const quote = card.querySelector<HTMLElement>('[data-quote]')!;
  card.querySelector<HTMLElement>('[data-slot]')!.hidden = true;
  quote.hidden = true;
  card.dataset.outcome = guilty ? 'guilty' : 'out';
  const verdict = el('p', 'suspect__verdict', textsOf(texts, card.dataset.suspect!).verdict);
  verdict.dataset.verdict = '';
  quote.after(verdict);
  if (guilty) {
    const mark = stamp(texts.stamps.guilty);
    mark.classList.add('suspect__stamp');
    card.append(mark);
  } else {
    const mark = el('div', 'label suspect__out', texts.stamps.out);
    mark.dataset.stamp = '';
    card.append(mark);
  }
}

/** A clue card with the clue's short label, set in the type of its full one: a sentence in Cormorant Garamond, a
 *  code in Special Elite, as mockups 11 and 03 set "Profilo" and "04:51". It carries data-short. */
export function shortClue(common: Pick<Content, 'clues' | 'ui'>, texts: Stanza46Content, clue: Evidence): HTMLElement {
  const card = clueCard(common, clue);
  card.querySelector('.clue__text, .clue__code')!.textContent = texts.short[clue];
  card.dataset.short = '';
  return card;
}
