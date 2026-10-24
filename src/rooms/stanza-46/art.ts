// Room 46 drawings (mockups 11, 03 and 12): the four suspects as ink silhouettes on a 160x200 grid, each with the
// thing that tells it apart (the gardener's hat and shears, the professor's glasses and book, the fiancé at his
// laptop, the diva's hair, microphone and gold star), the three waves of the sea along the bottom of the
// stage, and for the epilogue the red block with its ragged top and the walker in two poses. A suspect's few
// colors are custom properties of its card (stanza46.css), so a cleared card can fade them as mockup 03 does.
// Each wave is its own drawing, a whole wavelength wider than the stage on either side, so it can sway by half a
// wavelength each way and never show its end.
import type { SuspectId } from './deduction';

const FIGURE = (shapes: string) =>
  `<svg class="suspect__figure" viewBox="0 0 160 200" width="128" height="160" fill="var(--ink)" aria-hidden="true">${shapes}</svg>`;

export const SUSPECT_ART: Record<SuspectId, string> = {
  giardiniere: FIGURE(`
    <ellipse cx="80" cy="72" rx="18" ry="21"/>
    <rect x="56" y="24" width="48" height="30" rx="6"/>
    <ellipse cx="80" cy="52" rx="54" ry="9"/>
    <path d="M42 200 Q 46 106 80 98 Q 114 106 118 200 Z"/>
    <path d="M116 126 L 150 94 M116 134 L 154 116" fill="none" stroke="var(--ink)" stroke-width="6" stroke-linecap="round"/>`),
  professore: FIGURE(`
    <ellipse cx="80" cy="64" rx="20" ry="24"/>
    <circle cx="72" cy="62" r="7" fill="var(--suspect-lens)" stroke="var(--ink)" stroke-width="2"/>
    <circle cx="88" cy="62" r="7" fill="var(--suspect-lens)" stroke="var(--ink)" stroke-width="2"/>
    <path d="M42 200 Q 46 108 80 98 Q 114 108 118 200 Z"/>
    <rect x="104" y="128" width="34" height="44" rx="2" fill="var(--suspect-book)" transform="rotate(-8 121 150)"/>`),
  fidanzato: FIGURE(`
    <ellipse cx="80" cy="64" rx="20" ry="24"/>
    <path d="M52 104 Q 80 80 108 104 L 120 200 L 40 200 Z"/>
    <path d="M50 160 L 58 124 L 108 124 L 116 160 Z" fill="var(--suspect-laptop)"/>
    <rect x="38" y="160" width="90" height="8" rx="2" fill="var(--suspect-desk)"/>`),
  diva: FIGURE(`
    <circle cx="58" cy="60" r="26"/>
    <circle cx="102" cy="60" r="26"/>
    <circle cx="70" cy="40" r="24"/>
    <circle cx="92" cy="40" r="24"/>
    <ellipse cx="80" cy="74" rx="19" ry="23"/>
    <path d="M38 200 Q 50 122 80 106 Q 110 122 122 200 Z"/>
    <path d="M114 136 L 132 108" fill="none" stroke="var(--ink)" stroke-width="6" stroke-linecap="round"/>
    <circle cx="135" cy="102" r="9"/>
    <path d="M140 18 L 144 28 L 154 32 L 144 36 L 140 46 L 136 36 L 126 32 L 136 28 Z" fill="var(--gold)"/>`),
};

export const SEA_TOP = 784; // stage line of the waves' top, as in mockup 11
const SEA_HEIGHT = 1080 - SEA_TOP;

/** A wave of mockup 11, in drawing units from SEA_TOP: half-waves of half this wavelength along base, each
 *  bending depth above or below it in turn, from a wavelength before the stage to at least one after. */
function wave(period: number, base: number, depth: number, layer: 'back' | 'mid' | 'front', crest = false): string {
  const half = period / 2;
  const right = -period + Math.ceil((1920 + 2 * period) / half) * half;
  let line = `M${-period} ${base} Q ${-period + half / 2} ${base - depth} ${-period + half} ${base}`;
  for (let x = -period + 2 * half; x <= right; x += half) line += ` T ${x} ${base}`;
  const width = right + period;
  return `<svg class="stanza46__wave" data-wave="${layer}" viewBox="${-period} 0 ${width} ${SEA_HEIGHT}" width="${width}"
    height="${SEA_HEIGHT}" style="left: ${-period}px; --sway: ${half}px" aria-hidden="true">
    <path d="${line} L ${right} ${SEA_HEIGHT} L ${-period} ${SEA_HEIGHT} Z" fill="var(--swell-${layer})"/>
    ${crest ? `<path d="${line}" fill="none" stroke="var(--paper)" stroke-width="3" opacity="0.35"/>` : ''}
  </svg>`;
}

/** The three waves, back to front, as mockup 11 draws them; the middle one carries the crest line. */
export const WAVES = [wave(480, 88, 40, 'back'), wave(640, 152, 40, 'mid', true), wave(400, 216, 32, 'front')];

// The epilogue's red block: a field of red about as tall as it is wide, its top a ragged row of small tufts, like
// a hedge seen from far off, under the paper grain. Each tuft is [width, height of its tip, dip after it] in
// drawing units, from the line the row stands on: tufts with shallow dips gather into clumps, deep dips part them.
// Picked by hand so no two neighbours match; the row runs again with every round's heights scaled, so no stretch
// repeats.
const BLOCK_WIDTH = 720;
const BLOCK_HEIGHT = 680;
const HEDGE = 24; // the line the row of tufts stands on, from the top of the drawing
const TUFTS = [
  [6, 8, -2], [5, 12, -3], [6, 9, -1], [4, 5, 2], [7, 3, 3], [5, 7, -1], [6, 11, -3], [5, 14, -4],
  [6, 10, -2], [5, 6, 1], [8, 4, 3], [6, 2, 2], [5, 8, -2], [6, 13, -4], [4, 9, -3], [6, 11, -2],
  [5, 6, 1], [7, 3, 3], [5, 9, -1], [6, 7, 0], [5, 12, -3], [6, 8, -1], [4, 4, 2], [8, 3, 3],
  [5, 10, -2], [6, 15, -4], [5, 12, -3], [6, 9, -2], [5, 5, 2], [6, 2, 3], [5, 7, -1], [7, 10, -2],
];
const ROUNDS = [1, 0.8, 1.15, 0.9];

/** The block's outline: up the left side, along the tufts, each a spike with hollow sides, and down the right. */
function blockOutline(): string {
  let top = '';
  let base = HEDGE; // where the last tuft came down
  for (let x = 0, i = 0; x < BLOCK_WIDTH; i++) {
    const [w, h, dip] = TUFTS[i % TUFTS.length];
    const width = Math.min(w, BLOCK_WIDTH - x);
    const tip = HEDGE - Math.round(h * ROUNDS[Math.floor(i / TUFTS.length) % ROUNDS.length]);
    const next = x + width >= BLOCK_WIDTH ? HEDGE : HEDGE + dip;
    top += ` Q ${x + width * 0.35} ${base + (tip - base) * 0.25} ${x + width / 2} ${tip}`;
    top += ` Q ${x + width * 0.65} ${next + (tip - next) * 0.25} ${x + width} ${next}`;
    base = next;
    x += width;
  }
  return `M0 ${BLOCK_HEIGHT} V${HEDGE}${top} V${BLOCK_HEIGHT} Z`;
}
const OUTLINE = blockOutline();

export const BLOCK = `<svg class="epilogue__block" data-block viewBox="0 0 ${BLOCK_WIDTH} ${BLOCK_HEIGHT}" width="${BLOCK_WIDTH}"
  height="${BLOCK_HEIGHT}" aria-hidden="true">
  <defs><pattern id="epilogue-grain" width="8" height="8" patternUnits="userSpaceOnUse">
    <circle cx="4" cy="4" r="1" fill="var(--grain)"/></pattern></defs>
  <path d="${OUTLINE}" fill="var(--red)"/>
  <path d="${OUTLINE}" fill="url(#epilogue-grain)"/>
</svg>`;

// The walker, a small ink figure seen from behind on a 32x96 grid: a little head over a long coat that narrows to
// the hem, and two legs, apart in the stride and together as they pass. The two poses take turns on the block.
const WALKER_FIGURE = (legs: string, pose: 'stride' | 'pass') =>
  `<svg class="epilogue__pose" data-pose="${pose}" viewBox="0 0 32 96" width="32" height="96" fill="var(--ink)" aria-hidden="true">
    <ellipse cx="17" cy="8" rx="5" ry="6"/>
    <path d="M14 14 Q 17 13 20 14 C 25 18 26 25 24 32 L 20 66 Q 16 68 12 66 L 9 32 C 8 25 9 18 14 14 Z"/>
    <path d="${legs}" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/>
  </svg>`;

export const WALKER = [
  WALKER_FIGURE('M14 62 L 10 92 M18 62 L 23 92', 'stride'),
  WALKER_FIGURE('M14 62 L 14 92 M18 62 L 18 92', 'pass'),
];
