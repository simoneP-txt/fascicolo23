// Game state and save: transitions never duplicate an award or leave the token range, and the save
// falls back to a new game whenever the stored data cannot be trusted.
import { expect, test } from 'vitest';
import { SAVE_KEY, clear, load, save } from '../../src/engine/save';
import { addClues, complete, giveBackToken, newState, openCase, useToken } from '../../src/engine/state';
import type { Room } from '../../src/engine/types';
import { memoryStorage } from './fakes';

const studio: Pick<Room, 'id' | 'gives'> = { id: 'studio', gives: ['rule', 'profile'] };

test('a new game has every token and nothing solved', () => {
  expect(newState(3)).toEqual({ opened: false, solved: [], clues: [], tokens: 3 });
});

test('opening the case is remembered', () => {
  expect(openCase(newState(3)).opened).toBe(true);
});

test('completing a room twice awards it once', () => {
  const once = complete(newState(3), studio);
  expect(complete(once, studio)).toEqual(once);
  expect(once.solved).toEqual(['studio']);
  expect(once.clues).toEqual(['rule', 'profile']);
});

test('clues given twice are kept once', () => {
  const state = addClues(addClues(newState(3), ['g4', 'rule']), ['rule', 'g4', 'profile']);
  expect(state.clues).toEqual(['g4', 'rule', 'profile']);
});

test('tokens stay between 0 and the maximum', () => {
  expect(useToken({ ...newState(3), tokens: 0 }).tokens).toBe(0);
  expect(useToken(newState(3)).tokens).toBe(2);
  expect(giveBackToken(newState(3), 3).tokens).toBe(3);
  expect(giveBackToken(useToken(newState(3)), 3).tokens).toBe(3);
});

test('save and load give back the same state', () => {
  const storage = memoryStorage();
  const state = useToken(complete(openCase(newState(3)), studio));
  save(state, storage);
  expect(load(3, storage)).toEqual(state);
});

test('missing, corrupt or other-version saves start a new game', () => {
  const storage = memoryStorage();
  expect(load(3, storage)).toEqual(newState(3));
  for (const raw of [
    '{',
    'null',
    JSON.stringify({ version: 2, state: newState(1) }),
    JSON.stringify({ version: 1, state: { ...newState(1), solved: ['cantina'] } }),
    JSON.stringify({ version: 1, state: { ...newState(1), clues: ['rule', 'rule'] } }),
    JSON.stringify({ version: 1, state: { opened: 'yes', solved: [], clues: [], tokens: 1 } }),
  ]) {
    storage.setItem(SAVE_KEY, raw);
    expect(load(3, storage)).toEqual(newState(3));
  }
});

test('a save with more tokens than the maximum is clamped', () => {
  const storage = memoryStorage();
  save({ ...newState(3), tokens: 5 }, storage);
  expect(load(3, storage).tokens).toBe(3);
  save({ ...newState(3), tokens: 3 }, storage);
  expect(load(2, storage).tokens).toBe(2);
});

test('clear removes the save', () => {
  const storage = memoryStorage();
  save(openCase(newState(3)), storage);
  clear(storage);
  expect(storage.getItem(SAVE_KEY)).toBeNull();
});
