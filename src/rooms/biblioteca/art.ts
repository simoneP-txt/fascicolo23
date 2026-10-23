// Library drawings: the open window of mockup 02, made lower for the left column (decision 8): the night with
// its moon, a hill and gusts of wind, leaves that cross it and two curtains that sway, the leaves and curtains
// moved by biblioteca.css. Then the hedge of mockup 08, cut through the middle with the shears over the gap,
// and the loose pages that flutter beside the mystery, each in its own small box, so the wind moves boxes
// instead of repainting the stage. The walnut wall is the host's (tokens.css).

/** The glass of the window, 328x352: what shows inside a 360x384 frame. */
export const WINDOW = `<svg class="biblioteca__glass" viewBox="0 0 328 352" aria-hidden="true">
  <rect width="328" height="352" fill="var(--night)"/>
  <circle cx="214" cy="84" r="22" fill="var(--paper)"/>
  <circle cx="223" cy="78" r="20" fill="var(--night)"/>
  <circle cx="150" cy="44" r="1.8" fill="var(--paper)" opacity="0.8"/>
  <circle cx="262" cy="160" r="1.5" fill="var(--paper)" opacity="0.7"/>
  <circle cx="180" cy="212" r="1.3" fill="var(--paper)" opacity="0.6"/>
  <path d="M120 280 Q 210 248 328 280 L 328 352 L 120 352 Z" fill="var(--window-hill-near)"/>
  <path d="M140 132 Q 190 114 240 134 M170 204 Q 220 186 280 206 M150 256 Q 200 240 250 258" fill="none"
    stroke="var(--paper)" stroke-width="2.5" stroke-linecap="round" opacity="0.35"/>
  <g class="biblioteca__leaf" style="--flutter: 0"><ellipse cx="0" cy="150" rx="12" ry="5" fill="var(--sage)" transform="rotate(-30 0 150)"/></g>
  <g class="biblioteca__leaf" style="--flutter: 1"><ellipse cx="0" cy="236" rx="10" ry="4" fill="var(--sage)" transform="rotate(25 0 236)"/></g>
  <g class="biblioteca__leaf" style="--flutter: 2"><ellipse cx="0" cy="100" rx="9" ry="4" fill="var(--leaf)" transform="rotate(-50 0 100)"/></g>
  <g class="biblioteca__curtain" data-side="left">
    <path d="M-40 0 L 130 0 Q 96 88 170 170 Q 116 248 146 352 L -40 352 Z" fill="var(--curtain-dark)"/>
    <path d="M60 0 Q 50 96 110 176 Q 70 262 92 352" fill="none" stroke="var(--curtain-dark-fold)" stroke-width="6"/>
  </g>
  <g class="biblioteca__curtain" data-side="right">
    <path d="M368 0 L 262 0 Q 290 100 244 188 Q 284 266 262 352 L 368 352 Z" fill="var(--sage)"/>
    <path d="M300 0 Q 310 104 284 188 Q 306 268 296 352" fill="none" stroke="var(--curtain-fold)" stroke-width="5"/>
  </g>
</svg>`;

/** The hedge cut through the middle, the clippings in the gap and the shears over it (mockup 08). */
export const HEDGE = `<svg class="biblioteca__hedge" viewBox="0 0 240 176" width="240" height="176" aria-hidden="true">
  <rect x="0" y="160" width="240" height="8" fill="var(--frame)"/>
  <path d="M0 160 V96 Q 16 64 40 80 Q 56 48 80 72 Q 96 56 104 80 V160 Z" fill="var(--sage)"/>
  <path d="M144 160 V88 Q 160 56 184 76 Q 208 48 224 80 Q 240 72 240 96 V160 Z" fill="var(--sage)"/>
  <ellipse cx="116" cy="152" rx="6" ry="3" fill="var(--sage)"/>
  <ellipse cx="132" cy="156" rx="5" ry="3" fill="var(--sage)"/>
  <ellipse cx="124" cy="146" rx="4" ry="2" fill="var(--sage)"/>
  <path d="M104 24 L136 72 M136 24 L104 72" fill="none" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/>
  <circle cx="98" cy="84" r="10" fill="none" stroke="var(--ink)" stroke-width="4"/>
  <circle cx="142" cy="84" r="10" fill="none" stroke="var(--ink)" stroke-width="4"/>
</svg>`;

// [left, top, width, height, tilt, lines, opacity] of each page, in stage pixels: three in the left column
// under the window, three on the right under the witness.
const PAGES = [
  [152, 600, 40, 56, -18, 3, 1],
  [320, 752, 32, 48, 24, 0, 0.85],
  [200, 880, 40, 56, -34, 3, 0.9],
  [1600, 576, 48, 64, 22, 4, 1],
  [1736, 704, 40, 56, -12, 3, 0.9],
  [1512, 832, 32, 44, 40, 0, 0.8],
] as const;

const BOX = 80; // each page turns in the middle of an 80x80 box

function page([left, top, width, height, tilt, lines, opacity]: (typeof PAGES)[number], i: number): string {
  const x = (BOX - width) / 2;
  const y = (BOX - height) / 2;
  const rows = Array.from({ length: lines }, (_, n) => {
    const last = n === lines - 1;
    return `M${x + 8} ${y + 12 + n * 10} H${x + width - (last ? 16 : 8)}`;
  }).join(' ');
  return `<svg class="biblioteca__page" viewBox="0 0 ${BOX} ${BOX}" width="${BOX}" height="${BOX}" aria-hidden="true"
    style="left: ${left}px; top: ${top}px; --flutter: ${i % 3}">
    <g transform="rotate(${tilt} ${BOX / 2} ${BOX / 2})" opacity="${opacity}">
      <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="var(--paper)"/>
      ${rows ? `<path d="${rows}" fill="none" stroke="var(--ink-soft)" stroke-width="2"/>` : ''}
    </g>
  </svg>`;
}

/** The loose pages beside the mystery, one small <svg> each. */
export const LOOSE_PAGES: string[] = PAGES.map(page);

/** Gusts of wind across the two sides of the mystery, as in mockup 08. */
export const GUSTS = `<svg class="biblioteca__gusts" viewBox="0 0 1920 1080" aria-hidden="true">
  <path d="M120 720 Q 200 696 280 724 M1560 560 Q 1640 528 1720 560 M1600 680 Q 1700 648 1800 688 M1488 784 Q 1560 760 1640 792"
    fill="none" stroke="var(--paper)" stroke-width="2.5" stroke-linecap="round" opacity="0.3"/>
</svg>`;
