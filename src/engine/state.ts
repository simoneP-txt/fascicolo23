// Game state: what the player has opened, solved and found, and the audience tokens left. Pure
// functions that return a new state, so the engine and the tests share one set of rules.
import type { ClueId, Room, RoomId } from './types';

export interface GameState {
  opened: boolean; // the case is open, so the youtu.be/ fragment is earned
  solved: RoomId[]; // in the order the player solved them
  clues: ClueId[]; // in the order she found them
  tokens: number; // audience tokens left
}

export function newState(tokens: number): GameState {
  return { opened: false, solved: [], clues: [], tokens };
}

export function openCase(state: GameState): GameState {
  return { ...state, opened: true };
}

export function addClues(state: GameState, clues: readonly ClueId[]): GameState {
  const found = [...state.clues];
  for (const clue of clues) if (!found.includes(clue)) found.push(clue);
  return { ...state, clues: found };
}

/** Awards a room and its clues; a room already solved leaves the state as it is. */
export function complete(state: GameState, room: Pick<Room, 'id' | 'gives'>): GameState {
  if (state.solved.includes(room.id)) return state;
  return addClues({ ...state, solved: [...state.solved, room.id] }, room.gives);
}

export function useToken(state: GameState): GameState {
  return { ...state, tokens: Math.max(0, state.tokens - 1) };
}

export function giveBackToken(state: GameState, max: number): GameState {
  return { ...state, tokens: Math.min(max, state.tokens + 1) };
}
