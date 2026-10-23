// Chessboard puzzle: the line in content.json is a legal mate in three where black never has a choice and
// whose last move is the fragment, a search over every move proves each white move the only one that mates
// in time, and the puzzle plays the line with black's forced answers while it refuses any other move.
import { Chess } from 'chess.js';
import { expect, test } from 'vitest';
import json from '../../content/content.json';
import { validateContent } from '../../src/engine/content';
import { rooms } from '../../src/rooms';
import type { ChessContent } from '../../src/rooms/scacchiera/content';
import { createPuzzle } from '../../src/rooms/scacchiera/puzzle';
import { mates } from './mate';

const content = validateContent(json, rooms);
const room = content.rooms.scacchiera as ChessContent;

test('the line is legal, black has no choice and Kg4 mates', () => {
  const chess = new Chess(room.fen);
  room.line.forEach((san, i) => {
    if (i % 2 === 1) expect(chess.moves()).toEqual([san]);
    expect(chess.move(san).san).toBe(san);
  });
  expect(chess.isCheckmate()).toBe(true);
  expect(room.line.at(-1)).toBe(`K${content.clues.g4.label}#`);
});

test('the mating move is the fragment', () =>
  expect(room.line.at(-1)!.replace('#', '')).toBe(content.link.find((part) => part.room === 'scacchiera')!.text));

test('each white move is the only one that mates in time, and no mate comes sooner', { timeout: 60_000 }, () => {
  const chess = new Chess(room.fen);
  for (let i = 0; i < room.line.length; i += 2) {
    const left = (room.line.length - i + 1) / 2; // 3, 2, 1
    expect(mates(chess.fen(), left)).toEqual([room.line[i]]);
    if (left > 1) expect(mates(chess.fen(), left - 1)).toEqual([]);
    chess.move(room.line[i]);
    if (i + 1 < room.line.length) chess.move(room.line[i + 1]);
  }
});

test('the puzzle plays the line with its forced answers', () => {
  const puzzle = createPuzzle(room.fen, room.line);
  expect(puzzle.inCheck()).toBeNull();
  expect(puzzle.answer()).toBeNull(); // white is due

  expect(puzzle.play('c4', 'f7')).toBe('right');
  expect(puzzle.found()).toEqual(['Bxf7+']);
  expect(puzzle.inCheck()).toBe('g8');
  expect(puzzle.targets('e5')).toEqual([]); // black is due
  expect(puzzle.answer()).toEqual({ from: 'g8', to: 'h8', san: 'Kh8' });
  expect(puzzle.inCheck()).toBeNull();

  expect(puzzle.play('e5', 'g6')).toBe('right');
  expect(puzzle.inCheck()).toBe('h8');
  expect(puzzle.answer()).toEqual({ from: 'h7', to: 'g6', san: 'hxg6' });
  expect(puzzle.solved()).toBe(false);

  expect(puzzle.play('h4', 'g4')).toBe('right');
  expect(puzzle.solved()).toBe(true);
  expect(puzzle.inCheck()).toBe('h8');
  expect(puzzle.found()).toEqual(['Bxf7+', 'Kh8', 'Ng6+', 'hxg6', 'Kg4#']);
  expect(puzzle.answer()).toBeNull();
  expect(puzzle.targets('g4')).toEqual([]);
});

test('a wrong move leaves the board as it was', () => {
  const puzzle = createPuzzle(room.fen, room.line);
  const before = puzzle.board();
  expect(puzzle.play('h1', 'h3')).toBe('wrong');
  expect(puzzle.board()).toEqual(before);
  expect(puzzle.found()).toEqual([]);
  expect(puzzle.play('c4', 'f7')).toBe('right'); // still white's first move
});

test('an impossible move is not a move', () => {
  const puzzle = createPuzzle(room.fen, room.line);
  const before = puzzle.board();
  expect(puzzle.play('c4', 'c8')).toBe('illegal');
  expect(puzzle.play('d4', 'd5')).toBe('illegal'); // an empty square
  expect(puzzle.board()).toEqual(before);
  expect(puzzle.found()).toEqual([]);
});

test('black pieces have no moves to offer', () => {
  const puzzle = createPuzzle(room.fen, room.line);
  expect(puzzle.targets('g8')).toEqual([]);
  expect(puzzle.targets('d4')).toEqual([]); // an empty square
});

test('a white piece offers its legal moves', () => {
  const puzzle = createPuzzle(room.fen, room.line);
  expect(puzzle.targets('c4').sort()).toEqual(['a6', 'b3', 'b5', 'd3', 'd5', 'e2', 'e6', 'f1', 'f7']);
  expect(puzzle.targets('h1').sort()).toEqual(['a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h2', 'h3']);
});

test('the board lists every piece in FEN letters', () => {
  const pieces = createPuzzle(room.fen, room.line).board();
  expect(pieces).toHaveLength(21);
  expect(pieces).toContainEqual({ square: 'h4', piece: 'K' });
  expect(pieces).toContainEqual({ square: 'h1', piece: 'R' });
  expect(pieces).toContainEqual({ square: 'g8', piece: 'k' });
  expect(pieces).toContainEqual({ square: 'a8', piece: 'r' });
});
