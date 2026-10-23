// Chess puzzle: the line to find, on top of chess.js. White plays the moves of the line; a legal move off the
// line is wrong and is not played, and a move the piece cannot make is no move at all. After each right move
// answer() plays black's forced reply from the line. The room asks the puzzle what to draw and never reaches
// chess.js itself.
import { Chess } from 'chess.js';
import type { Square } from '../../ui/grid8';

export type Verdict = 'right' | 'wrong' | 'illegal';

export interface Puzzle {
  board(): { square: Square; piece: string }[]; // FEN letters, white upper case
  targets(from: Square): Square[]; // the legal moves of a white piece while white is due; [] otherwise
  play(from: Square, to: Square): Verdict; // only 'right' changes the board
  answer(): { from: Square; to: Square; san: string } | null; // plays black's move of the line when black is due
  inCheck(): Square | null; // the square of the king in check
  found(): string[]; // SAN of the moves played so far
  solved(): boolean;
}

export function createPuzzle(fen: string, line: readonly string[]): Puzzle {
  const chess = new Chess(fen);
  const next = (): string | undefined => line[chess.history().length]; // undefined once the line is played
  const due = (color: 'w' | 'b') => next() !== undefined && chess.turn() === color;
  // The legal moves from this square while white is due: none for a black piece or an empty square.
  const legal = (from: Square) => (due('w') ? chess.moves({ square: from, verbose: true }) : []);

  return {
    board() {
      return chess
        .board()
        .flat()
        .flatMap((piece) => (piece ? [{ square: piece.square, piece: piece.color === 'w' ? piece.type.toUpperCase() : piece.type }] : []));
    },
    targets(from) {
      return [...new Set(legal(from).map((move) => move.to))];
    },
    play(from, to) {
      const moves = legal(from).filter((move) => move.to === to);
      if (moves.length === 0) return 'illegal';
      const move = moves.find((candidate) => candidate.san === next());
      if (!move) return 'wrong';
      chess.move(move.san);
      return 'right';
    },
    answer() {
      if (!due('b')) return null;
      const { from, to, san } = chess.move(next()!);
      return { from, to, san };
    },
    inCheck() {
      return chess.inCheck() ? (chess.findPiece({ type: 'k', color: chess.turn() })[0] ?? null) : null;
    },
    found() {
      return chess.history();
    },
    solved() {
      return chess.history().length === line.length;
    },
  };
}
