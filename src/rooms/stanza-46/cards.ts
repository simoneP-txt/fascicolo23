// Suspect cards (mockups 11 and 03), shared by the room and the finale: the pinned paper with the silhouette in
// its panel, the name, the line between guillemets and the "Trascina qui?" slot a clue lands in. Once the case
// is closed each card shows its verdict in place of the line and the slot: "ESCLUSO" under a cleared suspect,
// whose card dims, and the "COLPEVOLE?" stamp beating onto the culprit's panel, whose card is ringed in red.
import { paper, stamp } from '../../ui/card';
import { el } from '../../ui/dom';
import { svg } from '../../ui/svg';
import { SUSPECT_ART } from './art';
import type { Stanza46Content } from './content';
import type { SuspectId } from './deduction';

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
  const slot = el('div', 'suspect__slot', texts.slot);
  slot.dataset.slot = '';
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
