// Case opening (mockup 05): a night sky with stars, a moon and two hills, the witness on the far hill, and
// the case folder with its tab, grain and red elastic. "Vuoi aprire il caso?" with a "Sì?" that opens it,
// and an empty dashed slot with three speed lines, because its "No?" has already run off: a tilted card
// that jumps somewhere else on the stage, with a transform, as soon as the mouse reaches it.
import './intro.css';
import type { Content } from '../engine/types';
import { button } from './button';
import { paper } from './card';
import { el } from './dom';
import { STAGE_HEIGHT, STAGE_WIDTH, type Stage } from './stage';
import { figure, svg } from './svg';

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export const MIN_JUMP = 480; // stage pixels between the pointer and the center of the new spot
const MARGIN = 96; // the card keeps this far from the stage edges, tilt included
const TRIES = 32;
const TILT = 9; // degrees; every jump flips the card the other way

/** The top left corner of a spot for a box of this size: the first of up to TRIES random spots inside the
 *  stage margins whose center lies at least MIN_JUMP from the pointer, or else the try farthest from it. */
export function pickSpot(pointer: Point, size: Size, random: () => number): Point {
  let farthest = { spot: { x: MARGIN, y: MARGIN }, distance: -1 };
  for (let i = 0; i < TRIES; i++) {
    const spot = {
      x: MARGIN + random() * (STAGE_WIDTH - 2 * MARGIN - size.width),
      y: MARGIN + random() * (STAGE_HEIGHT - 2 * MARGIN - size.height),
    };
    const distance = Math.hypot(spot.x + size.width / 2 - pointer.x, spot.y + size.height / 2 - pointer.y);
    if (distance >= MIN_JUMP) return spot;
    if (distance > farthest.distance) farthest = { spot, distance };
  }
  return farthest.spot;
}

// [x, y, radius, opacity] of each star in mockup 05.
const STARS = [
  [120, 96, 2, 0.8], [264, 184, 1.6, 0.6], [408, 72, 2.2, 0.9], [560, 152, 1.4, 0.6], [712, 64, 1.8, 0.7],
  [856, 112, 1.4, 0.5], [1016, 56, 2, 0.8], [1160, 104, 1.6, 0.6], [1304, 72, 2.4, 0.9], [1456, 232, 1.4, 0.5],
  [1712, 96, 2, 0.8], [1816, 248, 1.6, 0.6], [184, 352, 1.4, 0.5], [88, 560, 1.8, 0.6], [1760, 400, 1.4, 0.5],
  [1840, 584, 2, 0.7], [440, 424, 1.2, 0.4], [1672, 512, 1.2, 0.4],
];

const NIGHT = `<svg class="intro__night" viewBox="0 0 1920 1080" aria-hidden="true">
  <rect width="1920" height="1080" fill="var(--night)"/>
  ${STARS.map(([x, y, r, opacity]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--paper)" opacity="${opacity}"/>`).join('')}
  <circle cx="1576" cy="176" r="48" fill="var(--paper)"/>
  <circle cx="1598" cy="164" r="44" fill="var(--night)"/>
  <path d="M0 816 Q 360 712 760 776 T 1920 744 L 1920 1080 L 0 1080 Z" fill="var(--hill-far)"/>
  <path d="M0 952 Q 560 888 1104 880 Q 1500 760 1920 800 L 1920 1080 L 0 1080 Z" fill="var(--hill-near)"/>
</svg>`;

const SPEED_LINES = `<svg class="intro__lines" viewBox="0 0 160 96" width="160" height="96" aria-hidden="true">
  <path d="M8 32 L104 16 M16 56 L136 40 M8 80 L96 68" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linecap="round" opacity="0.45"/>
</svg>`;

export function renderIntro(content: Content, stage: Stage, onOpen: () => void): HTMLElement {
  const texts = content.ui.intro;
  const screen = el('section', 'screen intro');
  screen.dataset.screen = 'intro';

  const onHill = figure();
  onHill.classList.add('intro__figure');

  const yes = button(texts.yes, 'primary', onOpen);
  yes.classList.add('intro__yes');
  const slot = el('div', 'intro__slot');
  slot.setAttribute('aria-hidden', 'true');
  slot.append(svg(SPEED_LINES));
  const actions = el('div', 'intro__actions');
  actions.append(yes, slot);

  const band = el('div', 'intro__band');
  band.setAttribute('aria-hidden', 'true');
  const body = paper('intro__body');
  body.append(
    band,
    el('div', 'label intro__label', texts.label),
    el('p', 'intro__case', content.ui.case),
    el('h1', 'intro__question', texts.question),
    actions,
  );
  const folder = el('div', 'intro__folder');
  folder.append(el('div', 'label intro__tab', content.ui.file), body);

  // The card stays where intro.css puts it; each jump moves it by a transform from there.
  let tilt = TILT;
  const no = button(texts.no, 'outline', () => runAway(centerOf(no)));
  no.classList.add('intro__no');
  no.style.transform = `rotate(${tilt}deg)`;
  const runAway = (pointer: Point) => {
    const spot = pickSpot(pointer, { width: no.offsetWidth, height: no.offsetHeight }, Math.random);
    tilt = -tilt;
    no.style.transform = `translate(${spot.x - no.offsetLeft}px, ${spot.y - no.offsetTop}px) rotate(${tilt}deg)`;
  };
  const centerOf = (node: HTMLElement) => {
    const box = node.getBoundingClientRect();
    return stage.toStage(box.left + box.width / 2, box.top + box.height / 2);
  };
  no.addEventListener('pointerenter', (event) => runAway(stage.toStage(event.clientX, event.clientY)));

  screen.append(svg(NIGHT), onHill, folder, no);
  return screen;
}
