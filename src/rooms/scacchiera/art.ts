// Chessboard backdrop (mockup 07): the night over the whole stage with a few stars, and two rows of round
// hedges along the bottom, the far one in --hedge-far and the near one in --hedge-near, set half a bush apart.
// The near row ends in a flat foot across the bottom edge, which the bottom band continues in the same tone.

// [x, y, radius, opacity] of each star in mockup 07.
const STARS = [
  [160, 624, 1.6, 0.6], [312, 704, 2, 0.7], [440, 584, 1.4, 0.5],
  [1504, 576, 1.6, 0.5], [1792, 664, 2, 0.7], [1864, 120, 1.4, 0.5],
];

// A bush is 96 wide and 40 high. The near row starts and ends with half a bush at the stage edges, so no
// drawing reaches past the stage.
const BUSH = 'a48 40 0 0 1 96 0 ';
const FAR = `M0 1080 V944 ${BUSH.repeat(20)}V1080 Z`;
const NEAR = `M0 1080 V960 a48 40 0 0 1 48 40 ${BUSH.repeat(19)}a48 40 0 0 1 48 -40 V1080 Z`;

export const NIGHT = `<svg class="scacchiera__night" viewBox="0 0 1920 1080" aria-hidden="true">
  <rect width="1920" height="1080" fill="var(--night)"/>
  ${STARS.map(([x, y, r, opacity]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--paper)" opacity="${opacity}"/>`).join('')}
  <path d="${FAR}" fill="var(--hedge-far)"/>
  <path d="${NEAR}" fill="var(--hedge-near)"/>
</svg>`;
