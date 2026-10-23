// Mate search for the chessboard tests: every white move that forces mate within a number of moves, found by
// trying every move with chess.js. A move whose SAN ends in "#" mates at once; any other move wins only if
// black has a move and every black answer leaves white a winning move with one move less. Stalemate is no
// mate, since black then has no move.
import { Chess } from 'chess.js';

/** Plays a move, asks a question about the position after it and takes the move back. */
function after<T>(chess: Chess, san: string, ask: () => T): T {
  chess.move(san);
  try {
    return ask();
  } finally {
    chess.undo();
  }
}

/** Whether this white move, white to move, mates within n moves whatever black answers. */
function wins(chess: Chess, san: string, n: number): boolean {
  if (san.endsWith('#')) return true;
  if (n === 1) return false;
  return after(chess, san, () => {
    const answers = chess.moves();
    return answers.length > 0 && answers.every((answer) => after(chess, answer, () => chess.moves().some((next) => wins(chess, next, n - 1))));
  });
}

/** The SAN of every white move that forces mate within this many moves. */
export function mates(fen: string, moves: number): string[] {
  const chess = new Chess(fen);
  return chess.moves().filter((san) => wins(chess, san, moves));
}
