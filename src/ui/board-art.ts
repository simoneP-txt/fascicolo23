// Board art (mockup 01), hand-written SVG in the one style of the game: the night window on the cork (stars,
// a crescent moon, two hills and the window cross) and the small drawing on each door card. The drawings
// carry no text and every color is a token, so a closed door can fade its drawing from CSS.
import type { RoomId } from '../engine/types';
import { svg } from './svg';

// [x, y, radius, opacity] of each star behind the glass.
const STARS = [
  [40, 48, 2, 0.8], [112, 96, 1.6, 0.7], [192, 40, 2.2, 0.85],
  [64, 152, 1.4, 0.6], [304, 160, 1.8, 0.7], [152, 168, 1.4, 0.6],
];

const star = ([x, y, r, opacity]: number[]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--paper)" opacity="${opacity}"/>`;

// The glass inside the 16 px frame, 352x424.
const NIGHT_WINDOW = `<svg class="board__night" viewBox="0 0 352 424" aria-hidden="true">
  <rect width="352" height="424" fill="var(--night)"/>
  ${STARS.map(star).join('')}
  <circle cx="264" cy="88" r="26" fill="var(--paper)"/>
  <circle cx="274" cy="82" r="24" fill="var(--night)"/>
  <path d="M0 296 Q 88 248 176 280 T 352 264 L 352 424 L 0 424 Z" fill="var(--window-hill-far)"/>
  <path d="M0 424 L 0 352 Q 120 224 248 296 Q 304 320 352 328 L 352 424 Z" fill="var(--window-hill-near)"/>
  <rect x="170" width="12" height="424" fill="var(--frame)"/>
  <rect y="200" width="352" height="12" fill="var(--frame)"/>
</svg>`;

// Each drawing on a 120x96 grid: the study's lamp, the chessboard's king, Rapture's porthole, Room 46's door
// over the waves and the library's books.
const DOORS: Record<RoomId, string> = {
  studio:
    '<path d="M54 38 L80 46 L104 84 L40 84 Z" fill="var(--lamp)" opacity="0.4"/>' +
    '<rect x="34" y="82" width="52" height="6" fill="var(--ink)"/>' +
    '<path d="M60 82 L48 54 L66 32" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M60 22 L88 30 L80 46 L54 38 Z" fill="var(--ink)"/>',
  scacchiera:
    '<rect x="36" y="82" width="48" height="8" rx="2" fill="var(--ink)"/>' +
    '<rect x="42" y="74" width="36" height="8" fill="var(--ink)"/>' +
    '<path d="M46 74 L52 42 L68 42 L74 74 Z" fill="var(--ink)"/>' +
    '<rect x="46" y="36" width="28" height="6" fill="var(--ink)"/>' +
    '<circle cx="60" cy="27" r="9" fill="var(--ink)"/>' +
    '<rect x="58" y="4" width="4" height="15" fill="var(--ink)"/>' +
    '<rect x="53" y="8" width="14" height="4" fill="var(--ink)"/>',
  rapture:
    '<circle cx="60" cy="48" r="36" fill="var(--teal)" stroke="var(--gold)" stroke-width="6"/>' +
    '<circle cx="60" cy="48" r="24" fill="var(--porthole)"/>' +
    '<circle cx="52" cy="54" r="4" fill="var(--paper)"/>' +
    '<circle cx="64" cy="40" r="3" fill="var(--paper)"/>' +
    '<circle cx="58" cy="30" r="2" fill="var(--paper)"/>' +
    '<circle cx="60" cy="9" r="3" fill="var(--gold)"/>' +
    '<circle cx="60" cy="87" r="3" fill="var(--gold)"/>' +
    '<circle cx="21" cy="48" r="3" fill="var(--gold)"/>' +
    '<circle cx="99" cy="48" r="3" fill="var(--gold)"/>',
  'stanza-46':
    '<rect x="38" y="12" width="44" height="72" fill="none" stroke="var(--ink)" stroke-width="4"/>' +
    '<rect x="50" y="24" width="20" height="12" fill="var(--ink)"/>' +
    '<circle cx="74" cy="52" r="3.5" fill="var(--ink)"/>' +
    '<path d="M6 90 Q 18 82 30 90 T 54 90 T 78 90 T 102 90 T 118 88" ' +
    'fill="none" stroke="var(--wave-3)" stroke-width="4" stroke-linecap="round"/>',
  biblioteca:
    '<path d="M14 22 Q 30 12 46 22" fill="none" stroke="var(--sage)" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M64 14 Q 80 4 96 14" fill="none" stroke="var(--sage)" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="20" y="36" width="14" height="48" fill="var(--book-1)"/>' +
    '<rect x="36" y="28" width="12" height="56" fill="var(--book-3)"/>' +
    '<rect x="50" y="42" width="16" height="42" fill="var(--book-4)"/>' +
    '<path d="M70 84 L88 38 L100 42 L82 88 Z" fill="var(--book-2)"/>' +
    '<rect x="10" y="84" width="100" height="5" fill="var(--ink)"/>',
};

/** The night behind the board's window: stars, moon, two hills and the window cross. */
export function nightWindow(): SVGSVGElement {
  return svg(NIGHT_WINDOW);
}

/** The drawing on a door card. */
export function doorArt(id: RoomId): SVGSVGElement {
  return svg(`<svg class="door__drawing" viewBox="0 0 120 96" aria-hidden="true">${DOORS[id]}</svg>`);
}
