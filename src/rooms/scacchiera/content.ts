// Chessboard texts: the room's own fields in content.json, with the position and its solution, and the schema
// that checks them at startup. chess.test.ts proves the line a mate in three that ends with the fragment, so
// the position and the line change only together, with that test.
import type { Schema } from '../../engine/content';
import type { RoomContent } from '../../engine/types';

export interface ChessContent extends RoomContent {
  fen: string; // white to move
  line: string[]; // the solution in SAN, white and black in turn: Bxf7+, Kh8, Ng6+, hxg6, Kg4#
  card: { tag: string; title: string; task: string; moves: string }; // LA POSIZIONE, Matto in tre?, the task, LE TUE MOSSE
  witness: {
    intro: string;
    black: string; // a black piece pressed: "Muove il bianco?"
    wrong: string[]; // a legal move off the line, one line per white move
    replies: string[]; // after each black answer
    solved: string; // "Il Re parla inglese?" (decision 4)
  };
}

export const CHESS_SCHEMA: Record<string, Schema> = {
  fen: 'text',
  line: 'texts',
  card: { tag: 'text', title: 'text', task: 'text', moves: 'text' },
  witness: { intro: 'text', black: 'text', wrong: 'texts', replies: 'texts', solved: 'text' },
};
