// Room 46 (mockup 11, the plan's decisions 2, 4-6, 15 and 17-19): the case link at the top with its last bar, the
// four suspects pinned in a row, and on the right the three clues in a column over the thread of the accusation and
// "Ricomincia?", on a sea whose waves sway along the bottom. A clue card or the thread's end is dragged onto a
// suspect, or picked with a click and dropped with a second one (src/ui/drag.ts). A clue on a suspect it fits
// lands in the slot as its short label, with the stamp and the witness's line, and leaves a dashed place in the
// column; a suspect holds as many as fit it. On a suspect it does not fit, a clue flies back to the column, buzzes,
// counts an error and gets the witness's reason; let go anywhere else it goes back where it was and counts nothing.
// A pinned clue dragged onto the column, or picked and then dropped there with a click, comes back with no error;
// moved onto another suspect, it is judged again. "Ricomincia?" brings every pinned clue back and counts nothing.
// With the three clues pinned the thread's end pulses and the witness invites the accusation, until one comes back.
// The thread on a suspect accuses: before the three clues are pinned the accusation is blind, counts an error and
// gets the next of the witness's lines, every blindTries-th with the video meme; with the three, the fiancé
// objects and the two others are innocent, each with a meme, an error and the witness's line, and the thread goes
// back to its pin. The culprit closes the case: every card shows its verdict, the clues come back to the column,
// the thread's end stays on the culprit, the stamp beats, the area is marked solved, the solve is saved at once (so
// an app closed during the beat reopens on the finale) and the room completes after --duration-beat. Gestures and
// "Ricomincia?" wait while a card or the thread flies and during the beat, the second click of a double click never
// reaches a suspect, and every visit starts over.
import './stanza46.css';
import type { Room } from '../../engine/types';
import { button } from '../../ui/button';
import { clueCard, paper } from '../../ui/card';
import { durationOf, el, replay } from '../../ui/dom';
import { draggable } from '../../ui/drag';
import { renderLink } from '../../ui/link';
import { svg } from '../../ui/svg';
import { GRAPH } from '../graph';
import { createScope } from '../scope';
import { SEA_TOP, WAVES } from './art';
import { shortClue, showVerdict, suspectCard } from './cards';
import { STANZA46_SCHEMA, type Stanza46Content } from './content';
import { accuse, culprits, EVIDENCE, fits, getsHelp, minuteOf, SUSPECT_IDS, type Evidence, type SuspectId } from './deduction';

const PIN = { x: 1496, y: 656 }; // where the thread is pinned, under the column
const KNOB = { x: 1792, y: 672 }; // the middle of its free end, at rest
const REST = `M${PIN.x} ${PIN.y} C 1552 704, 1608 632, 1656 672 S 1736 696, ${KNOB.x - 16} ${KNOB.y}`; // its slack curve
const SAG = 80; // how far below its lower end a stretched thread sags

const scope = createScope();
const cleanups = new Set<() => void>(); // the drags
let view: HTMLElement | null = null;
let frame = 0; // the animation frame that follows the thread's end in flight

export const stanza46: Room<Stanza46Content> = {
  id: 'stanza-46',
  requires: [...GRAPH['stanza-46'].requires],
  gives: [...GRAPH['stanza-46'].gives],
  audienceHelp: true,
  schema: STANZA46_SCHEMA,
  mount(root, ctx) {
    const texts = ctx.content;
    const quotes = Object.fromEntries(texts.suspects.map(({ id, quote }) => [id, quote])) as Record<SuspectId, string>;
    const crime = minuteOf(ctx.common.clues['time-0451'].label);
    const culprit = culprits(quotes, crime, new Set(EVIDENCE))[0];
    const pinned = new Map<Evidence, HTMLElement>(); // each clue pinned, and the suspect card that holds it
    let blind = 0; // blind accusations in this visit
    let moving = 0; // cards, or the thread's end, in flight
    let closed = false; // the culprit is accused: the beat runs

    const line = renderLink(ctx.link(), null);
    const link = paper('stanza46__link', { pin: true, tilt: -0.4 });
    link.append(el('div', 'label', texts.link.oneLeft), line.el);

    const cards = new Map(SUSPECT_IDS.map((id) => [id, suspectCard(texts, id)]));
    const row = el('div', 'stanza46__suspects');
    row.append(...cards.values());
    // The second click of a double click may come once the card or the thread has landed: it stops here, before
    // any suspect, or any clue a suspect holds, hears it.
    row.addEventListener(
      'click',
      (event) => {
        if (event.detail > 1) event.stopPropagation();
      },
      { capture: true },
    );

    // Each clue is a button holding its card twice: the whole card, which the column shows, and the short label,
    // which a suspect's slot shows (stanza46.css).
    const handles = new Map<Evidence, HTMLButtonElement>();
    const spots = new Map<Evidence, HTMLElement>();
    const column = el('div', 'stanza46__column');
    column.dataset.column = '';
    for (const clue of EVIDENCE) {
      const handle = el('button', 'stanza46__evidence');
      handle.type = 'button';
      handle.dataset.evidence = clue;
      handle.append(clueCard(ctx.common, clue), shortClue(ctx.common, texts, clue));
      const spot = el('div', 'stanza46__spot');
      spot.dataset.spot = clue;
      spot.append(handle);
      handles.set(clue, handle);
      spots.set(clue, spot);
      column.append(spot);
    }

    // The thread: its curve and pin on one layer over the whole stage, its free end a button.
    const string = svg(`<svg class="stanza46__string" viewBox="0 0 1920 1080" aria-hidden="true">
      <path d="${REST}" fill="none" stroke="var(--red)" stroke-width="3" stroke-linecap="round"/>
      <circle cx="${PIN.x}" cy="${PIN.y}" r="12" fill="var(--red)"/></svg>`);
    const curve = string.querySelector('path')!;
    const knob = el('button', 'stanza46__knob');
    knob.type = 'button';
    knob.dataset.thread = '';
    knob.setAttribute('aria-label', texts.thread.prompt);
    knob.style.left = `${KNOB.x}px`;
    knob.style.top = `${KNOB.y}px`;
    knob.append(
      svg(`<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
        <circle cx="32" cy="32" r="16" fill="var(--red)" stroke="var(--paper)" stroke-width="4"/></svg>`),
    );

    const restart = button(texts.restart, 'outline', startOver, 'restart');
    restart.classList.add('stanza46__restart');
    restart.hidden = true;

    const sea = el('div', 'stanza46__sea');
    sea.dataset.bleed = ''; // each wave runs a wavelength past the stage, which the screen cuts
    sea.style.top = `${SEA_TOP}px`;
    sea.append(...WAVES.map((markup) => svg(markup)));

    view = el('div', 'stanza46');
    view.append(
      sea,
      link,
      row,
      column,
      el('div', 'label stanza46__thread', texts.thread.label),
      string,
      knob,
      el('p', 'stanza46__prompt', texts.thread.prompt),
      restart,
    );
    root.append(view);
    const area = view;

    // Stage pixels from window pixels, through the room's area, which is laid out at stage size.
    const toStage = (x: number, y: number) => {
      const box = root.getBoundingClientRect();
      const scale = box.width / root.offsetWidth;
      return { x: (x - box.left) / scale, y: (y - box.top) / scale };
    };
    const middleOf = (node: Element) => {
      const box = node.getBoundingClientRect();
      return toStage(box.left + box.width / 2, box.top + box.height / 2);
    };

    const showBusy = () => area.toggleAttribute('data-busy', moving > 0 || closed);
    const wait = (ms: number, then?: () => void) => {
      moving++;
      showBusy();
      scope.later(ms, () => {
        moving--;
        showBusy();
        then?.();
      });
    };

    // The thread's end pulses while the three clues are pinned, and "Ricomincia?" shows while any is, until the
    // case is closed.
    const showPins = () => {
      knob.toggleAttribute('data-ready', pinned.size === EVIDENCE.length && !closed);
      restart.hidden = pinned.size === 0 || closed;
    };

    // From its slack curve at rest to a sagging line to wherever its end is now.
    const drawString = () => {
      const end = middleOf(knob);
      const home = Math.hypot(end.x - KNOB.x, end.y - KNOB.y) < 1;
      const sag = Math.max(PIN.y, end.y) + SAG;
      curve.setAttribute('d', home ? REST : `M${PIN.x} ${PIN.y} Q ${(PIN.x + end.x) / 2} ${sag} ${end.x} ${end.y}`);
    };
    // The curve follows the end while it flies, frame by frame, and settles where the flight ends.
    const follow = () => {
      cancelAnimationFrame(frame);
      const step = () => {
        drawString();
        if (knob.dataset.flying !== undefined) frame = requestAnimationFrame(step);
      };
      step();
    };
    knob.addEventListener('pointermove', () => knob.dataset.dragging !== undefined && drawString());
    knob.addEventListener('transitionend', drawString);

    // A card or the thread's end flies from where it is drawn to where it is laid out, over --duration-fly.
    const fly = (node: HTMLElement, transform: string, then?: () => void) => {
      node.dataset.flying = '';
      node.style.transform = transform;
      wait(durationOf('--duration-fly'), () => {
        delete node.dataset.flying;
        then?.();
      });
    };
    const flyHome = (node: HTMLElement) => {
      if (node.style.transform) fly(node, '');
    };
    const threadHome = () => {
      if (!knob.style.transform) return;
      fly(knob, '', drawString);
      follow();
    };

    // A clue card moved into a suspect's slot, after the clues of the column above it, or back into its place in
    // the column, flies there from where it is drawn. A slot shows "Trascina qui?" only while it holds nothing.
    const settle = (clue: Evidence, into: HTMLElement) => {
      const handle = handles.get(clue)!;
      const from = handle.parentElement!;
      const before = middleOf(handle);
      const after = [...into.querySelectorAll<HTMLElement>('[data-evidence]')].find(
        (other) => EVIDENCE.indexOf(other.dataset.evidence as Evidence) > EVIDENCE.indexOf(clue),
      );
      into.insertBefore(handle, after ?? null);
      for (const slot of [from, into]) {
        if (slot.dataset.slot !== undefined) slot.toggleAttribute('data-filled', !!slot.querySelector('[data-evidence]'));
      }
      handle.style.transform = '';
      const landed = middleOf(handle);
      handle.style.transform = `translate(${before.x - landed.x}px, ${before.y - landed.y}px)`;
      handle.getBoundingClientRect(); // laid out where it was, so the way to its place comes as a transition
      fly(handle, '');
    };

    const unpin = (clue: Evidence) => {
      pinned.delete(clue);
      settle(clue, spots.get(clue)!);
      showPins();
    };

    // A clue dropped on a suspect, from the column or from another suspect.
    const pin = (clue: Evidence, card: HTMLElement) => {
      const handle = handles.get(clue)!;
      const holder = pinned.get(clue);
      if (holder === card) return flyHome(handle); // back to its own place in the slot
      if (!fits(clue, card.dataset.suspect as SuspectId, quotes, crime)) {
        ctx.reportError();
        ctx.playSfx('buzz');
        ctx.narrate(texts.witness.bounce[clue]);
        if (holder) return unpin(clue); // judged again on the way, it goes back to the column
        if (handle.style.transform) return fly(handle, '');
        replay(handle, 'nope');
        return wait(durationOf('--duration-nope'));
      }
      pinned.set(clue, card);
      settle(clue, card.querySelector<HTMLElement>('[data-slot]')!);
      showPins();
      ctx.playSfx('stamp');
      ctx.narrate(pinned.size === EVIDENCE.length ? texts.witness.ready : texts.witness.pinned[clue]);
    };

    // A pinned clue dropped on the column comes back to its place, with no error.
    const takeBack = (clue: Evidence) => {
      if (pinned.has(clue)) unpin(clue);
    };

    // "Ricomincia?": every pinned clue back in the column, and the witness's first question; nothing is counted.
    function startOver() {
      if (moving > 0 || closed) return;
      for (const clue of [...pinned.keys()]) unpin(clue);
      ctx.narrate(texts.witness.intro);
    }

    // The culprit accused with the three clues pinned: the verdicts, the clues back in the column as the closed
    // case lists them, the thread's end onto the culprit's card where its slot was, then the beat.
    const close = (card: HTMLElement) => {
      closed = true;
      showBusy();
      showPins();
      root.dataset.solved = '';
      ctx.won();
      const end = middleOf(card.querySelector('[data-slot]')!);
      for (const [id, suspect] of cards) showVerdict(suspect, texts, id === culprit);
      for (const clue of pinned.keys()) spots.get(clue)!.append(handles.get(clue)!);
      fly(knob, `translate(${end.x - KNOB.x}px, ${end.y - KNOB.y}px)`, drawString);
      follow();
      ctx.playSfx('stamp');
      ctx.narrate(texts.witness.solved);
      scope.later(durationOf('--duration-beat'), () => ctx.complete());
    };

    const accuseOn = (card: HTMLElement) => {
      const suspect = card.dataset.suspect as SuspectId;
      const verdict = accuse(new Set(pinned.keys()), suspect, culprit);
      if (verdict === 'guilty') return close(card);
      ctx.reportError();
      if (verdict === 'blind') {
        ctx.playSfx('buzz');
        ctx.narrate(texts.witness.blind[blind % texts.witness.blind.length]);
        blind++;
        if (getsHelp(blind, texts.blindTries)) ctx.meme('getHelp');
      } else {
        ctx.meme(verdict);
        const reason = texts.witness.accused[suspect as keyof Stanza46Content['witness']['accused']];
        if (reason) ctx.narrate(reason);
      }
      threadHome();
    };

    // A clue lands on a suspect, or, once pinned, on the column too; the thread's end lands on a suspect.
    const suspects = () => [...cards.values()];
    for (const [clue, handle] of handles) {
      cleanups.add(
        draggable(handle, {
          targets: () => (pinned.has(clue) ? [...suspects(), column] : suspects()),
          drop: (target) => (target === column ? takeBack(clue) : pin(clue, target)),
          cancel: () => flyHome(handle),
        }),
      );
    }
    cleanups.add(draggable(knob, { targets: suspects, drop: accuseOn, cancel: threadHome }));
  },
  unmount() {
    scope.clear();
    for (const release of cleanups) release();
    cleanups.clear();
    cancelAnimationFrame(frame);
    view?.remove();
    view = null;
  },
};
