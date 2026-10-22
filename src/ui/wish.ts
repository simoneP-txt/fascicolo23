// Wish (mockup 13): every fragment won arrives with the same scene, the homage of docs/PLAN.md ("Il
// desiderio"). A shooting star crosses the night to the corner of the card, a flash lights up the rays and
// the halo, five gold stars land one after another, the card turns over to show the fragment (its number,
// where it comes from, the clues it brings) and the witness asks its question. wish.css times every step
// in percent of the one duration, --duration-wish, and moves only transform and opacity. The scene paints
// its own sky, so it takes no veil. "Continua?" stays hidden until the end, from a timer: a screen change
// can take the scene away before any animation event, and then the timer only shows a button nobody sees.
// Its click closes the scene and runs onDone once. Clicks on the stage wait a moment when the scene comes
// and when it goes (hush).
import './wish.css';
import type { Earned, Sfx } from '../engine/game';
import type { ClueId, Content } from '../engine/types';
import { button } from './button';
import { chip, paper } from './card';
import { durationOf, el } from './dom';
import { hush } from './stage';
import { svg } from './svg';
import { createWitness } from './witness';

export interface WishCard {
  n: number; // the fragment's place in the link, from 1
  fragment: string;
  from: string; // where it comes from: "dal fascicolo", "dallo studio"
  clues: string[]; // the labels of the clues it brings
}

export function wishCard(content: Content, earned: Earned, gives: readonly ClueId[]): WishCard {
  const index = content.link.findIndex((part) => part.room === earned);
  return {
    n: index + 1,
    fragment: content.link[index].text,
    from: earned === 'fascicolo' ? content.ui.wish.from : content.rooms[earned].from,
    clues: gives.map((clue) => content.clues[clue].label),
  };
}

const FULL_SIZE = 3; // characters that fit the card at --text-fragment, wide ones included; longer takes --text-display

// The drawings of mockup 13, in stage coordinates: each viewBox is the box its element covers on the stage.
const RAYS =
  'M960 552 L1720 552 L1713 651 Z M960 552 L1618 932 L1563 1015 Z M960 552 L1340 1210 L1251 1254 Z ' +
  'M960 552 L960 1312 L861 1305 Z M960 552 L580 1210 L497 1155 Z M960 552 L302 932 L258 843 Z ' +
  'M960 552 L200 552 L207 453 Z M960 552 L302 172 L357 89 Z M960 552 L580 -106 L669 -150 Z ' +
  'M960 552 L960 -208 L1059 -201 Z M960 552 L1340 -106 L1423 -51 Z M960 552 L1618 172 L1662 261 Z';

const GLOW = `<svg class="wish__glow" viewBox="200 -208 1520 1520" width="1520" height="1520" aria-hidden="true">
  <path d="${RAYS}" fill="var(--gold)" opacity="0.1"/>
  <circle cx="960" cy="552" r="360" fill="var(--gold)" opacity="0.06"/>
  <circle cx="960" cy="552" r="280" fill="var(--gold)" opacity="0.06"/>
</svg>`;

// [x, y, radius, opacity] of each star in the sky.
const SKY_STARS = [
  [136, 112, 2, 0.8], [312, 232, 1.6, 0.6], [488, 96, 2.2, 0.9], [216, 440, 1.4, 0.5], [1456, 456, 1.8, 0.7],
  [1616, 696, 1.4, 0.5], [1776, 400, 2, 0.8], [1504, 128, 1.6, 0.6], [360, 640, 1.6, 0.6],
];

const SKY = `<svg class="wish__sky" viewBox="0 0 1920 1080" aria-hidden="true">
  ${SKY_STARS.map(([x, y, r, opacity]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--paper)" opacity="${opacity}"/>`).join('')}
  <path d="M0 960 Q 480 896 960 928 T 1920 912 L 1920 1080 L 0 1080 Z" fill="var(--sea)"/>
</svg>`;

const COMET = `<svg class="wish__comet" viewBox="1152 48 736 248" width="736" height="248" aria-hidden="true">
  <path d="M1880 54 L1180 262 L1172 282 Z" fill="var(--gold)" opacity="0.85"/>
  <path d="M1880 56 L1180 268 L1176 276 Z" fill="var(--paper)"/>
  <path d="M1176 248 L1182 266 L1200 272 L1182 278 L1176 296 L1170 278 L1152 272 L1170 266 Z" fill="var(--paper)"/>
</svg>`;

const STAR = `<svg class="wish__star" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
  <path d="M24 2 L30 17 L46 18 L33 28 L38 44 L24 35 L10 44 L15 28 L2 18 L18 17 Z"
    fill="var(--gold)" stroke="var(--paper)" stroke-width="1.5" stroke-linejoin="round"/>
</svg>`;

export function showWish(parent: HTMLElement, content: Content, card: WishCard, audio: Sfx, onDone: () => void): void {
  const texts = content.ui.wish;
  const scene = el('div', 'wish');
  scene.dataset.wish = '';

  const glow = svg(GLOW);
  glow.dataset.bleed = ''; // the rays run past the stage edges, where the scene clips them
  const flash = el('div', 'wish__flash');
  flash.dataset.bleed = '';
  const stars = el('div', 'wish__stars');
  for (let i = 0; i < 5; i++) {
    const star = svg(STAR);
    star.style.setProperty('--star', String(i));
    stars.append(star);
  }

  const face = el('div', 'wish__face');
  const fragment = el('div', 'wish__fragment', card.fragment);
  if (card.fragment.length > FULL_SIZE) fragment.classList.add('wish__fragment--long');
  face.append(
    el('div', 'label', texts.label.replace('{n}', String(card.n))),
    fragment,
    el('div', 'wish__rule'),
    el('div', 'wish__from', card.from),
  );
  if (card.clues.length > 0) {
    const clues = el('div', 'wish__clues');
    clues.append(el('div', 'label', card.clues.length === 1 ? texts.clue : texts.clues), ...card.clues.map((clue) => chip(clue)));
    face.append(clues);
  }
  const sheet = paper('wish__card', { pin: true });
  sheet.append(face);

  let open = true;
  const next = button(texts.continue, 'gold', () => {
    if (!open) return;
    open = false;
    scene.remove();
    hush();
    onDone();
  });
  next.classList.add('wish__continue');
  next.hidden = true;
  const column = el('div', 'wish__column');
  column.append(sheet, next);

  const witness = createWitness(content, 'right');
  witness.el.classList.add('wish__witness');
  witness.say(content.witness.wish);

  scene.append(glow, svg(SKY), flash, svg(COMET), stars, column, witness.el);
  parent.append(scene);
  hush();
  setTimeout(() => (next.hidden = false), durationOf('--duration-wish'));
  audio.play('wish');
}
