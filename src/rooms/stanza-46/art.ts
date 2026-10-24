// Room 46 drawings (mockups 11, 03 and 12): the four suspects as ink silhouettes on a 160x200 grid, each with the
// thing that tells it apart (the gardener's hat and shears, the professor's glasses and book, the fiancé at his
// laptop, the diva's hair, microphone and gold star), the three waves of the sea along the bottom of the
// stage, and for the epilogue the red hedge with its leafy outline and the walker in two poses. A suspect's few
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

// The epilogue's hedge: a red hedge about as tall as it is wide, its sides and top a run of flat leaves gathered
// in clumps, a few darker leaves of the same red giving it depth, under the paper grain. Its foot is the bottom
// of the drawing, which the epilogue sets behind the waves, so the hedge rises out of them. The outline follows a
// spine (up the left side, round a corner, across the top, round the other corner, down the right side), each
// leaf a pointed bulge off it, the clumps a slow swell of the spine. Sizes come from a fixed seed, so the hedge
// is the same on every run.
const HEDGE_WIDTH = 768;
const HEDGE_HEIGHT = 800;
const INSET = 40; // from the drawing's sides and top to the spine, room for the leaves
const CORNER = 56;
const SIDE = HEDGE_HEIGHT - INSET - CORNER; // each side's straight run
const ARC = (Math.PI / 2) * CORNER;
const TOP = HEDGE_WIDTH - 2 * INSET - 2 * CORNER; // the top's straight run
const SPINE = 2 * SIDE + 2 * ARC + TOP;
const CREST = 724; // the back wave's crests (stage line 852) in drawing units: under them no dark leaf shows
const WALKER_SPOT = { x: 384, y: 664, r: 120 }; // around the walker, in drawing units: no dark leaf there

/** A generator of numbers in [0, 1) from a seed (mulberry32). */
function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Spot = { x: number; y: number; nx: number; ny: number };

/** The point at s along the spine, from the foot of the left side, and the outward normal there. */
function spine(s: number): Spot {
  const turn = (cx: number, from: number, along: number): Spot => {
    const angle = from + along / CORNER;
    const [nx, ny] = [Math.cos(angle), Math.sin(angle)];
    return { x: cx + CORNER * nx, y: INSET + CORNER + CORNER * ny, nx, ny };
  };
  if (s < SIDE) return { x: INSET, y: HEDGE_HEIGHT - s, nx: -1, ny: 0 };
  if ((s -= SIDE) < ARC) return turn(INSET + CORNER, Math.PI, s);
  if ((s -= ARC) < TOP) return { x: INSET + CORNER + s, y: INSET, nx: 0, ny: -1 };
  if ((s -= TOP) < ARC) return turn(HEDGE_WIDTH - INSET - CORNER, 1.5 * Math.PI, s);
  return { x: HEDGE_WIDTH - INSET, y: INSET + CORNER + s - ARC, nx: 1, ny: 0 };
}

/** How far the spine swells out at s: two slow waves, the clumps and the bumps on them. */
const swell = (s: number) => 7 * Math.sin(s / 29 + 1.3) + 4 * Math.sin(s / 11.3 + 0.4);

/** The spot s along the spine pushed out by lift (in when it is negative), then on along the spine by slide. */
function off(s: number, lift: number, slide = 0): [number, number] {
  const p = spine(s);
  return [p.x + p.nx * lift - p.ny * slide, p.y + p.ny * lift + p.nx * slide];
}

const n = (value: number) => Math.round(value * 10) / 10;
const pt = ([x, y]: [number, number]) => `${n(x)} ${n(y)}`;

/** The outline: leaf after leaf along the spine, each from its start to its tip and down to the next one's start,
 *  with sides that rise steeply and meet in a point; then straight across the foot. */
function hedgeOutline(random: () => number): string {
  let path = `M${pt(off(0, swell(0)))}`;
  for (let s = 0; s < SPINE; ) {
    let width = 16 + 16 * random();
    if (SPINE - s - width < 12) width = SPINE - s;
    const height = 7 + 11 * random();
    const tip = s + width * (0.4 + 0.2 * random());
    const end = s + width;
    const [rise, lean] = [height * 0.65, width * 0.08];
    path += ` Q ${pt(off(s, swell(s) + rise, lean))} ${pt(off(tip, swell(tip) + height))}`;
    path += ` Q ${pt(off(end, swell(end) + rise, -lean))} ${pt(off(end, swell(end)))}`;
    s = end;
  }
  return `${path} Z`;
}

/** A leaf as a closed shape: an almond of this length and width centred on x, y, pointing along angle. Each side
 *  bends round a control point a whole width off the middle, which puts the side half a width off it. */
function leaf(x: number, y: number, angle: number, length: number, width: number): string {
  const [ux, uy] = [(Math.cos(angle) * length) / 2, (Math.sin(angle) * length) / 2];
  const [vx, vy] = [-Math.sin(angle) * width, Math.cos(angle) * width];
  const [back, front] = [pt([x - ux, y - uy]), pt([x + ux, y + uy])];
  return `M${back} Q ${pt([x + vx, y + vy])} ${front} Q ${pt([x - vx, y - vy])} ${back}Z`;
}

/** The darker leaves, the shade under the clumps of the edge: rows inside the outline, each sparser and deeper
 *  than the last, every leaf pointing out like those of the edge; none round the walker or under the waves. */
function hedgeShade(random: () => number): string {
  const leaves: string[] = [];
  const row = (first: number, gap: number, depth: number) => {
    for (let s = first; s < SPINE; s += gap * (0.7 + 0.6 * random())) {
      const p = spine(s);
      const [x, y] = off(s, swell(s) - depth * (0.6 + 0.8 * random()));
      const angle = Math.atan2(p.ny, p.nx) + (random() - 0.5) * 1.2;
      const [length, width] = [20 + 8 * random(), 9 + 3 * random()];
      if (y < CREST && Math.hypot(x - WALKER_SPOT.x, y - WALKER_SPOT.y) > WALKER_SPOT.r)
        leaves.push(leaf(x, y, angle, length, width));
    }
  };
  row(8, 34, 22);
  row(24, 84, 60);
  row(56, 168, 112);
  return leaves.join(' ');
}

const random = seeded(23);
const OUTLINE = hedgeOutline(random);

export const HEDGE = `<svg class="epilogue__hedge" data-hedge viewBox="0 0 ${HEDGE_WIDTH} ${HEDGE_HEIGHT}"
  width="${HEDGE_WIDTH}" height="${HEDGE_HEIGHT}" aria-hidden="true">
  <defs><pattern id="epilogue-grain" width="8" height="8" patternUnits="userSpaceOnUse">
    <circle cx="4" cy="4" r="1" fill="var(--grain)"/></pattern></defs>
  <path d="${OUTLINE}" fill="var(--red)"/>
  <path d="${hedgeShade(random)}" fill="var(--red-leaf)"/>
  <path d="${OUTLINE}" fill="url(#epilogue-grain)"/>
</svg>`;

// The walker, a small ink figure seen from behind on a 32x96 grid: a little head over a long coat that narrows to
// the hem, and two legs, apart in the stride and together as they pass. The two poses take turns on the hedge.
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
