// SVG: the hand-written drawings of the game, parsed from markup, in one style: clean lines and a few flat
// colors, each a token (var(--…)) or currentColor, so the screen around a drawing can recolor it. Icons
// sit in a 24 px box that CSS may scale; the witness is the silhouette of mockup 01, filled with --figure.
export type Icon = 'back' | 'dot' | 'door' | 'lock' | 'magnifier' | 'restart';

/** The <svg> element of this markup, which holds exactly one. */
export function svg(markup: string): SVGSVGElement {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  const node = template.content.firstElementChild;
  if (!(node instanceof SVGSVGElement) || template.content.childElementCount !== 1) {
    throw new Error('svg() takes the markup of one <svg>');
  }
  return node;
}

// Drawn on a 24 unit grid. The door is the open door of mockup 15 (lit doorway, dark leaf, frame and
// floor), the restart arrow turning back on itself is Room 46's "Ricomincia?", the others come from mockups 06, 07
// and 11.
const ICONS: Record<Icon, string> = {
  back: '<path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  dot: '<circle cx="12" cy="12" r="8" fill="var(--help-accent)"/>',
  door:
    '<rect x="7" y="2" width="12" height="20" fill="var(--gold)"/>' +
    '<path d="M7 2 L15 4 V23.5 L7 22 Z" fill="currentColor"/>' +
    '<circle cx="13.5" cy="13" r="0.75" fill="var(--paper)"/>' +
    '<path d="M7 2 H19 V22" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>' +
    '<path d="M2 22.5 H22" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>',
  lock:
    '<rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/>' +
    '<path d="M8 11 V8 a4 4 0 0 1 8 0 V11" fill="none" stroke="currentColor" stroke-width="2"/>',
  magnifier:
    '<circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
    '<path d="M15 15 L21 21" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  restart:
    '<path d="M3 4 V9.5 H8.5 M4.2 14.9 A8.5 8.5 0 1 0 6.2 6 L3 9.5" fill="none" stroke="currentColor" stroke-width="2.5" ' +
    'stroke-linecap="round" stroke-linejoin="round"/>',
};

export function icon(name: Icon): SVGSVGElement {
  const node = svg(`<svg class="icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">${ICONS[name]}</svg>`);
  node.dataset.icon = name;
  return node;
}

const FIGURE = `<svg class="figure" viewBox="0 0 64 184" width="64" height="184" fill="var(--figure)" aria-hidden="true">
  <ellipse cx="32" cy="18" rx="11" ry="13"/>
  <path d="M20 34 Q 32 28 44 34 L 50 150 Q 32 158 14 150 Z"/>
  <rect x="24" y="148" width="6" height="28"/>
  <rect x="34" y="148" width="6" height="28"/>
</svg>`;

export function figure(): SVGSVGElement {
  return svg(FIGURE);
}
