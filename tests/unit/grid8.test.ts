// 8x8 grid: the squares of the chessboard and of the library shelf in screen order, rank 8 on top and
// rank 1 at the bottom as on a real board, so g4 sits in the same cell of both grids.
import { expect, test } from 'vitest';
import { cell, isSquare, SQUARES } from '../../src/ui/grid8';

test('the grid reads like a chessboard, rank 1 at the bottom', () => {
  expect(SQUARES).toHaveLength(64);
  expect([SQUARES[0], SQUARES[7], SQUARES[56], SQUARES[63]]).toEqual(['a8', 'h8', 'a1', 'h1']);
  expect(cell('g4')).toEqual({ col: 6, row: 4 });
  expect(SQUARES[4 * 8 + 6]).toBe('g4');
  SQUARES.forEach((square, i) => expect(cell(square), square).toEqual({ col: i % 8, row: Math.floor(i / 8) }));
});

test('only real squares pass', () => {
  expect(['a8', 'g4', 'h1'].every(isSquare)).toBe(true);
  expect(['i1', 'a9', 'a0', 'G4', 'g', 'g44'].some(isSquare)).toBe(false);
});
