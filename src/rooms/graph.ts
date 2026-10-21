// Clue graph data: the clues each room needs to open and the clues it gives. Every room copies its
// entry from here, so tests and the e2e can read the graph without loading any room's DOM code.
import type { GraphRoom } from '../engine/clues';
import { ROOM_IDS, type ClueId, type RoomId } from '../engine/types';

export const GRAPH: Record<RoomId, { requires: ClueId[]; gives: ClueId[] }> = {
  studio: { requires: [], gives: ['rule', 'profile'] },
  scacchiera: { requires: [], gives: ['g4'] },
  biblioteca: { requires: ['g4'], gives: ['time-0451'] },
  rapture: { requires: ['time-0451', 'rule'], gives: ['confession'] }, // decision 1: the rule as well
  'stanza-46': { requires: ['profile', 'time-0451', 'confession'], gives: [] },
};

/** The graph as a list, in ROOM_IDS order. */
export function graphRooms(): GraphRoom[] {
  return ROOM_IDS.map((id) => ({ id, ...GRAPH[id] }));
}
