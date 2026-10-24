// Room 46 drawings (mockups 11 and 03): the four suspects as ink silhouettes on a 160x200 grid, each with the
// thing that tells it apart (the gardener's hat and shears, the professor's glasses and book, the fiancé at his
// laptop, the diva's hair, microphone and gold star), and the three waves of the sea along the bottom of the
// stage. A suspect's few colors are custom properties of its card (stanza46.css), so a cleared card can fade
// them as mockup 03 does. Each wave is its own drawing, a whole wavelength wider than the stage on either side,
// so it can sway by half a wavelength each way and never show its end.
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
