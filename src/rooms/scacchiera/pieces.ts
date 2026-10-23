// Chess pieces (mockup 07), drawn on a 96 unit square like the rest of the game: flat fills, an ink outline 3
// units wide, rounded joins. A white piece is paper outlined in ink; a black piece is all ink, so its inner
// lines (the band across the king, rook and pawn, the bishop's cut, the knight's eye) are paper, where a white
// piece shows the cut and the eye in ink. drawPiece() gives the <g> of a piece, which the board places and
// slides with a transform.

const BASE = '<rect x="26" y="72" width="44" height="10" rx="3"/>';
const KING =
  `${BASE}<path d="M34 72 Q 30 52 40 40 H56 Q 66 52 62 72 Z"/><rect x="36" y="32" width="24" height="7" rx="2"/>` +
  '<path d="M48 8 V30 M40 16 H56" fill="none" stroke-width="6" stroke-linecap="round"/>';
const ROOK = `${BASE}<rect x="32" y="38" width="32" height="34"/><path d="M28 18 H37 V26 H44 V18 H52 V26 H59 V18 H68 V38 H28 Z"/>`;
const BISHOP = '<rect x="28" y="72" width="40" height="10" rx="3"/><path d="M36 72 Q 32 50 48 24 Q 64 50 60 72 Z"/><circle cx="48" cy="18" r="6"/>';
const KNIGHT = `${BASE}<path d="M38 72 Q 40 58 46 50 Q 34 54 26 50 Q 22 44 30 36 L 44 22 L 46 12 L 54 20 Q 70 28 68 52 Q 66 64 64 72 Z"/>`;
const PAWN = `<circle cx="48" cy="30" r="12"/><path d="M34 74 Q 34 54 48 44 Q 62 54 62 74 Z"/>${BASE}`;

type Tone = '--paper' | '--ink';
const line = (d: string, tone: Tone) => `<path d="${d}" fill="none" stroke="var(${tone})" stroke-width="2.5" stroke-linecap="round"/>`;
const eye = (tone: Tone) => `<circle cx="40" cy="34" r="2.5" fill="var(${tone})" stroke="none"/>`;

// Each piece by its FEN letter, white upper case.
const DRAWINGS: Record<string, string> = {
  K: KING,
  k: KING + line('M40 56 H56', '--paper'),
  R: ROOK,
  r: ROOK + line('M38 56 H58', '--paper'),
  B: BISHOP + line('M44 48 L54 36', '--ink'),
  b: BISHOP + line('M44 48 L54 36', '--paper'),
  N: KNIGHT + eye('--ink'),
  n: KNIGHT + eye('--paper'),
  P: PAWN,
  p: PAWN + line('M42 62 H54', '--paper'),
};

/** The <g> of the piece with this FEN letter, at the top left square of its layer, marked with data-piece. */
export function drawPiece(letter: string): string {
  const tone: Tone = letter === letter.toUpperCase() ? '--paper' : '--ink';
  return (
    `<g class="scacchiera__piece" data-piece="${letter}" fill="var(${tone})" stroke="var(--ink)" stroke-width="3" ` +
    `stroke-linejoin="round">${DRAWINGS[letter]}</g>`
  );
}
