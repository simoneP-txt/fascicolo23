// Save: one localStorage key holding { version, state }. Data that is missing, corrupt, from another
// version or naming unknown rooms or clues starts a new game; tokens are clamped to the maximum. A save
// from before the video button has no watched and loads as not watched, with the same version.
import { newState, type GameState } from './state';
import { CLUE_IDS, ROOM_IDS } from './types';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const SAVE_KEY = 'fascicolo23.save';
const VERSION = 1;

export function save(state: GameState, storage: StorageLike = localStorage): void {
  storage.setItem(SAVE_KEY, JSON.stringify({ version: VERSION, state }));
}

export function load(maxTokens: number, storage: StorageLike = localStorage): GameState {
  try {
    const saved = JSON.parse(storage.getItem(SAVE_KEY) ?? 'null');
    if (saved?.version !== VERSION) return newState(maxTokens);
    const { opened, solved, clues, tokens, watched = false } = saved.state ?? {};
    if (
      typeof opened !== 'boolean' ||
      !isSetOf(solved, ROOM_IDS) ||
      !isSetOf(clues, CLUE_IDS) ||
      !Number.isInteger(tokens) ||
      typeof watched !== 'boolean'
    ) {
      return newState(maxTokens);
    }
    return { opened, solved, clues, tokens: Math.min(maxTokens, Math.max(0, tokens)), watched };
  } catch {
    return newState(maxTokens);
  }
}

export function clear(storage: StorageLike = localStorage): void {
  storage.removeItem(SAVE_KEY);
}

// A list of known ids without repeats.
function isSetOf<T extends string>(value: unknown, known: readonly T[]): value is T[] {
  return Array.isArray(value) && value.every((item) => known.includes(item)) && new Set(value).size === value.length;
}
