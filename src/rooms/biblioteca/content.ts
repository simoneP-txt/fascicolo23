// Library texts: the room's own fields in content.json, the shelf with its secret square and its titles, the
// hedge mystery behind it, the time and the questions of a quick guess, and the schema that checks them at
// startup. liar.test.ts proves the statements of the mystery a puzzle with one liar, so they change only
// together with STATEMENTS in liar.ts.
import type { Schema } from '../../engine/content';
import type { RoomContent } from '../../engine/types';
import type { Square } from '../../ui/grid8';
import type { WitnessId } from './liar';

export interface LibraryContent extends RoomContent {
  secret: Square; // the book that opens the passage: "g4", the chessboard's clue
  shelf: {
    tag: string; // "SCAFFALE {square}"
    pull: string; // "Sfila il libro?"
    untitled: string; // a square with no title of its own
    titles: Partial<Record<Square, string>>;
  };
  mystery: {
    tag: string; // DIETRO LO SCAFFALE
    title: string; // Il delitto della siepe
    intro: string;
    statements: { id: WitnessId; name: string; says: string; accuse: string }[]; // in the order on screen
    stamp: string; // "MENTE?"
    solution: { tag: string; text: string }; // the text holds {time}
  };
  quickGuessSec: number; // the liar accused sooner than this after the mystery comes in is asked witness.sure
  witness: {
    intro: string;
    passage: string; // the shelf turns
    wrong: Partial<Record<WitnessId, string>>; // an accusation of someone who tells the truth
    solved: string;
    sure: string[]; // "Sicura?", "Sicura sicura?": one question per click on a quick right guess, then it counts
  };
}

export const LIBRARY_SCHEMA: Record<string, Schema> = {
  quickGuessSec: 'seconds',
  secret: 'text',
  shelf: { tag: 'text', pull: 'text', untitled: 'text', titles: 'map' },
  mystery: {
    tag: 'text',
    title: 'text',
    intro: 'text',
    statements: [{ id: 'text', name: 'text', says: 'text', accuse: 'text' }],
    stamp: 'text',
    solution: { tag: 'text', text: 'text' },
  },
  witness: { intro: 'text', passage: 'text', wrong: 'map', solved: 'text', sure: 'texts' },
};
