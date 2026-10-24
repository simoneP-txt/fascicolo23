// Rapture drawings (mockups 09 and 10), in the palette's tokens: the two gold lines over the floor, the deco
// sunburst behind the door, whose rays fade out before the top edge so the band above carries on the bare
// wall, the porthole with its rivets and two fish, the door's crown of arcs, the speaker of the order card,
// the four controls with the part of each that moves under a press (the lever's arm, the button's cap, the
// valve's wheel, the switch's knob), the erase key and the X of an error. The bubbles are a list of circles
// for each view, drawn by the room as rings that rise.
import type { ControlId } from './orders';

export const FLOOR = `<svg class="rapture__art" viewBox="0 0 1920 1080" aria-hidden="true">
  <path d="M0 912 H1920 M0 928 H1920" fill="none" stroke="var(--gold)" stroke-width="2" opacity="0.5"/>
</svg>`;

// Mockup 09: seventeen rays from the middle of the door out past the stage edges.
const RAY_ENDS = [
  [-123, 249], [-74, 64], [7, -110], [117, -267], [253, -403], [410, -513], [584, -594], [769, -643], [960, -660],
  [1151, -643], [1336, -594], [1510, -513], [1667, -403], [1803, -267], [1913, -110], [1994, 64], [2043, 249],
];

export const RAYS = `<svg class="rapture__rays" viewBox="0 0 1920 1080" aria-hidden="true" data-bleed>
  <defs>
    <linearGradient id="rapture-ray" gradientUnits="userSpaceOnUse" x1="0" y1="440" x2="0" y2="0">
      <stop offset="0" stop-color="var(--gold)" stop-opacity="0.22"/>
      <stop offset="0.7" stop-color="var(--gold)" stop-opacity="0.22"/>
      <stop offset="1" stop-color="var(--gold)" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <path d="${RAY_ENDS.map(([x, y]) => `M960 440 L${x} ${y}`).join(' ')}" fill="none" stroke="url(#rapture-ray)" stroke-width="2"/>
</svg>`;

/** [x, y, r] of each bubble of mockup 09 (the keypad) and of mockup 10 (the orders), in stage pixels. */
export const BUBBLES: Record<'keypad' | 'orders', readonly (readonly [number, number, number])[]> = {
  keypad: [
    [584, 872, 10], [600, 800, 6], [576, 720, 14], [592, 624, 8], [584, 520, 12], [600, 408, 6], [576, 312, 10],
    [592, 200, 7], [584, 96, 12], [1336, 880, 8], [1352, 776, 12], [1328, 664, 6], [1344, 560, 14], [1336, 448, 8],
    [1352, 320, 10], [1328, 192, 6], [1344, 72, 12], [1760, 880, 12], [1776, 760, 8], [1752, 680, 10],
  ],
  orders: [
    [424, 864, 10], [408, 768, 6], [432, 640, 12], [416, 520, 7], [1440, 872, 8], [1448, 752, 12], [1432, 616, 6],
    [1736, 840, 10], [1760, 560, 8], [1744, 672, 14], [168, 808, 12], [192, 880, 6],
  ],
};

const RIVETS = [
  [320, 168], [275, 275], [168, 320], [61, 275], [16, 168], [61, 61], [168, 16], [275, 61],
];

// Each fish swims ahead by --swim, turns and swims back; the first faces left, the second right.
export const PORTHOLE = `<svg class="rapture__porthole" viewBox="0 0 336 336" width="336" height="336" aria-hidden="true">
  <circle cx="168" cy="168" r="152" fill="var(--sea)" stroke="var(--gold)" stroke-width="16"/>
  <circle cx="168" cy="168" r="132" fill="none" stroke="var(--teal)" stroke-width="4"/>
  ${RIVETS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="var(--sea)"/>`).join('')}
  <g class="rapture__fish" style="--swim: -40px">
    <path d="M112 152 Q 144 128 176 152 Q 144 176 112 152 Z M176 152 L200 136 L200 168 Z" fill="var(--teal)"/>
  </g>
  <g class="rapture__fish" style="--swim: 40px; --lag: 0.5">
    <path d="M216 224 Q 192 208 168 224 Q 192 240 216 224 Z M168 224 L152 214 L152 234 Z" fill="var(--paper)" opacity="0.35"/>
  </g>
  <g fill="none" stroke="var(--paper)" stroke-width="2" opacity="0.5">
    <circle cx="104" cy="208" r="5"/>
    <circle cx="96" cy="176" r="3"/>
    <circle cx="232" cy="112" r="4"/>
  </g>
</svg>`;

export const CROWN = `<svg class="rapture__crown" viewBox="0 0 400 160" width="400" height="160" aria-hidden="true">
  <g fill="none" stroke="var(--gold)" stroke-width="3" opacity="0.7">
    <path d="M16 160 A184 184 0 0 1 384 160 M48 160 A152 152 0 0 1 352 160 M80 160 A120 120 0 0 1 320 160 M112 160 A88 88 0 0 1 288 160"/>
    <path d="M200 160 L200 72 M200 160 L138 98 M200 160 L262 98"/>
  </g>
</svg>`;

// The waves light up at each new order.
export const SPEAKER = `<svg class="rapture__speaker" viewBox="0 0 96 96" width="96" height="96" aria-hidden="true">
  <path d="M16 36 H32 L64 12 V84 L32 60 H16 Z" fill="var(--gold)"/>
  <path class="rapture__waves" d="M74 32 Q 84 48 74 64 M80 20 Q 96 48 80 76" fill="none" stroke="var(--gold)" stroke-width="4" stroke-linecap="round"/>
</svg>`;

const control = (body: string) => `<svg class="rapture__drawing" viewBox="0 0 168 200" width="168" height="200" aria-hidden="true">${body}</svg>`;

export const CONTROLS: Record<ControlId, string> = {
  lever: control(`
    <rect x="44" y="160" width="80" height="24" rx="4" fill="var(--gold)"/>
    <rect x="76" y="148" width="16" height="16" fill="var(--sea)"/>
    <g class="rapture__arm" style="transform-origin: 84px 156px">
      <path d="M84 156 L124 64" fill="none" stroke="var(--paper)" stroke-width="10" stroke-linecap="round"/>
      <circle cx="128" cy="56" r="18" fill="var(--paper)"/>
    </g>`),
  button: control(`
    <circle cx="84" cy="112" r="64" fill="var(--gold)"/>
    <circle cx="84" cy="112" r="52" fill="var(--sea)"/>
    <g class="rapture__cap" style="transform-origin: 84px 112px">
      <circle cx="84" cy="112" r="44" fill="var(--red)"/>
      <path d="M60 96 Q 72 80 92 78" fill="none" stroke="var(--paper)" stroke-width="4" stroke-linecap="round" opacity="0.45"/>
    </g>`),
  valve: control(`
    <rect x="72" y="160" width="24" height="40" fill="var(--gold)"/>
    <g class="rapture__wheel" style="transform-origin: 84px 104px">
      <circle cx="84" cy="104" r="60" fill="none" stroke="var(--gold)" stroke-width="12"/>
      <path d="M84 44 V164 M24 104 H144 M42 62 L126 146 M126 62 L42 146" fill="none" stroke="var(--gold)" stroke-width="6"/>
      <circle cx="84" cy="104" r="16" fill="var(--gold)"/>
    </g>`),
  switch: control(`
    <rect x="44" y="40" width="80" height="144" rx="12" fill="var(--sea)" stroke="var(--gold)" stroke-width="4"/>
    <rect x="72" y="68" width="24" height="88" rx="12" fill="var(--ink)"/>
    <circle class="rapture__knob" cx="84" cy="88" r="16" fill="var(--paper)"/>
    <path d="M64 56 H104 M64 168 H104" fill="none" stroke="var(--gold)" stroke-width="3"/>`),
};

export const ERASE = `<svg class="rapture__erase" viewBox="0 0 40 32" width="40" height="32" aria-hidden="true">
  <path d="M14 4 H36 V28 H14 L4 16 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
  <path d="M20 11 L30 21 M30 11 L20 21" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
</svg>`;

export const CROSS = `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
  <path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="var(--paper)" stroke-width="3" stroke-linecap="round"/>
</svg>`;
