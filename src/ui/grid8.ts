// 8x8 grid: the squares of the chessboard and of the library shelf, read like a chessboard, files a-h from
// the left and rank 1 at the bottom, so g4 sits in the same cell of both grids. grid8() lays the 64 cells out
// in screen order, a8 first and h1 last, and axis() writes the letters under them or the numbers beside them.
import { el } from './dom';

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export type Square = `${(typeof FILES)[number]}${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;

const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const; // top to bottom

/** Screen order: a8 … h8, a7 … h1. */
export const SQUARES: readonly Square[] = RANKS.flatMap((rank) => FILES.map((file): Square => `${file}${rank}`));

export function isSquare(text: string): text is Square {
  return /^[a-h][1-8]$/.test(text);
}

/** The cell of a square, 0-based from the top left: g4 → { col: 6, row: 4 }. */
export function cell(square: Square): { col: number; row: number } {
  return { col: (FILES as readonly string[]).indexOf(square[0]), row: 8 - Number(square[1]) };
}

/** The 64 cells in SQUARES order, each made by make() and marked with its data-square. */
export function grid8(className: string, make: (square: Square) => HTMLElement): HTMLElement {
  const grid = el('div', className);
  for (const square of SQUARES) {
    const node = make(square);
    node.dataset.square = square;
    grid.append(node);
  }
  return grid;
}

/** The eight labels of one side, in screen order: a … h left to right, or 8 … 1 top to bottom. */
export function axis(kind: 'files' | 'ranks', className: string): HTMLElement {
  const labels = kind === 'files' ? FILES : RANKS;
  const line = el('div', className);
  line.append(...labels.map((label) => el('span', undefined, String(label))));
  return line;
}
