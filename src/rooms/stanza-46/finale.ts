// Finale (mockup 03, the plan's decisions 9, 11, 14 and 17): the case closed, as the screen that takes the board's
// place once Room 46 is solved. The link card at the top with the whole link, the four suspects with their
// verdicts, the culprit ringed in red under her stamp, and on the right the three clues with their short labels,
// joined by red strings to the suspects as mockup 03 draws them: the profile and the confession to the diva, the
// time to the fiance. The
// strings run behind the cards, over the sea whose waves sway along the bottom. With the fragment just won the
// link keeps the bar over it until reveal(), after the wish: the bar comes off, "CASO RISOLTO?" beats onto the
// link card with its thud and "Guarda la confessione?" comes up. Shown again later, the finale comes already
// revealed. The button switches off at its first press, so a double click opens one tab; the engine ignores a
// second watch() as well. From the press on, the finale waits for the window to come back from the video (the
// first focus after a blur), holds still for --duration-return (decision 20 of phase 6) and then calls onBack; it
// stops waiting, or holding, if it leaves the stage first.
import './stanza46.css';
import './finale.css';
import { FINALE, type Sfx } from '../../engine/game';
import { linkParts } from '../../engine/link';
import type { GameState } from '../../engine/state';
import type { Content } from '../../engine/types';
import { button, setEnabled } from '../../ui/button';
import { paper, stamp } from '../../ui/card';
import { awaitComeback } from '../../ui/comeback';
import { durationOf, el } from '../../ui/dom';
import { renderLink } from '../../ui/link';
import { STAGE_HEIGHT, STAGE_WIDTH } from '../../ui/stage';
import { svg } from '../../ui/svg';
import { SEA_TOP, WAVES } from './art';
import { shortClue, showVerdict, suspectCard } from './cards';
import type { Stanza46Content } from './content';
import { culprits, EVIDENCE, minuteOf, SUSPECT_IDS, type Evidence, type SuspectId } from './deduction';

export interface FinaleView {
  el: HTMLElement;
  reveal(): void; // after the wish: the bar comes off, the stamp beats, the button comes up; once
}

// The middle of each clue card, as finale.css stacks them from stage line 288 (96 tall, 24 apart, as in mockup
// 03): a string leaves its clue from behind it.
const CLUE_MIDDLES: Record<Evidence, number> = { profile: 336, 'time-0451': 456, confession: 576 };

// The curves of mockup 03, from the clue's middle: into the side of the diva's card, next to the column, or down
// past the row, along under it at stage line 812 and up into the bottom of a card whose middle is at x.
const intoSide = (y: number) => `M1752 ${y} Q 1600 ${y + 12} 1408 496`;
const fromBelow = (y: number, x: number) => `M1660 ${y} C 1560 ${y} 1590 812 1440 812 C ${x + 232} 812 ${x} 812 ${x} 740`;

/** The red strings of the closed case as mockup 03 draws them (decision 9, as decision 17 reads it): the profile
 *  and the confession to the diva, the time to the fiance. Each ends behind its suspect's card; the epilogue
 *  starts from them. */
export const FINALE_STRINGS: readonly { clue: Evidence; suspect: SuspectId; d: string }[] = [
  { clue: 'profile', suspect: 'diva', d: intoSide(CLUE_MIDDLES.profile) },
  { clue: 'time-0451', suspect: 'fidanzato', d: fromBelow(CLUE_MIDDLES['time-0451'], 1008) },
  { clue: 'confession', suspect: 'diva', d: intoSide(CLUE_MIDDLES.confession) },
];

/** The strings on a drawing the size of the stage, as the finale shows them and the epilogue opens on them. */
export function finaleStrings(): SVGSVGElement {
  const paths = FINALE_STRINGS.map(({ clue, suspect, d }) => `<path data-string="${clue} ${suspect}" d="${d}"/>`);
  return svg(`<svg class="finale__strings" viewBox="0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}" aria-hidden="true"
    fill="none" stroke="var(--red)" stroke-width="3" stroke-linecap="round">${paths.join('')}</svg>`);
}

export function renderFinale(
  content: Content,
  state: GameState,
  earned: boolean,
  audio: Sfx,
  onWatch: () => void,
  onBack: () => void,
): FinaleView {
  const texts = content.rooms['stanza-46'] as Stanza46Content;
  const quotes = Object.fromEntries(texts.suspects.map(({ id, quote }) => [id, quote])) as Record<SuspectId, string>;
  const crime = minuteOf(content.clues['time-0451'].label);
  const culprit = culprits(quotes, crime, new Set(EVIDENCE))[0];

  const screen = el('section', 'screen finale');
  screen.dataset.screen = 'finale';

  const sea = el('div', 'stanza46__sea');
  sea.dataset.bleed = ''; // each wave runs a wavelength past the stage, which the screen cuts
  sea.style.top = `${SEA_TOP}px`;
  sea.append(...WAVES.map((markup) => svg(markup)));

  const strings = finaleStrings();

  const parts = linkParts(content.link, state);
  const line = renderLink(parts, earned ? FINALE : null);
  const link = paper('finale__link', { pin: true, tilt: -0.5 });
  const solved = stamp(content.ui.finale.stamp);
  solved.classList.add('finale__stamp');
  if (earned) solved.dataset.new = '';
  const complete = parts.every((part) => part.shown);
  link.append(el('div', 'label', complete ? content.ui.link.done : content.ui.link.label), line.el, solved);

  const row = el('div', 'finale__suspects');
  for (const id of SUSPECT_IDS) {
    const card = suspectCard(texts, id);
    showVerdict(card, texts, id === culprit);
    row.append(card);
  }

  const clues = el('div', 'finale__clues');
  clues.append(...EVIDENCE.map((clue) => shortClue(content, texts, clue)));

  // The window coming back from the video calls onBack once, --duration-return later, so the window is back in
  // fullscreen before the epilogue starts (decision 20). The wait and the hold end with the finale: once the screen
  // has left the stage, the stage's next change of children cancels both.
  const waitForComeback = () => {
    const stage = screen.parentElement;
    if (!stage) return;
    let hold: ReturnType<typeof setTimeout> | undefined;
    const cancel = awaitComeback(window, () => (hold = setTimeout(onBack, durationOf('--duration-return'))));
    const watcher = new MutationObserver(() => {
      if (screen.isConnected) return;
      cancel();
      clearTimeout(hold);
      watcher.disconnect();
    });
    watcher.observe(stage, { childList: true });
  };

  // Switched off at the first press: a second press of a double click only shakes it.
  const watch = button(content.ui.finale.watch, 'primary', () => {
    setEnabled(watch, false);
    onWatch();
    waitForComeback();
  });
  watch.classList.add('finale__watch');

  screen.append(sea, strings, el('div', 'label finale__title', texts.header), link, row, clues);
  if (!earned) screen.append(watch);

  let revealed = !earned;
  return {
    el: screen,
    reveal() {
      if (revealed) return;
      revealed = true;
      line.peel();
      screen.dataset.reveal = '';
      // The thud comes as the stamp lands, and the button after it, unless the finale has left the stage by then.
      const landing = durationOf('--duration-peel') + durationOf('--duration-stamp');
      setTimeout(() => {
        if (!screen.isConnected) return;
        audio.play('stamp');
        watch.dataset.new = '';
        screen.append(watch);
      }, landing);
    },
  };
}
