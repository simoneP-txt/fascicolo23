// Closed doors: a closed door names the first clue it misses, in the order of the room's requires,
// unless the room has a line of its own.
import { expect, test } from 'vitest';
import { doorText } from '../../src/engine/board';
import type { RoomId } from '../../src/engine/types';
import { GRAPH } from '../../src/rooms/graph';
import { content } from './fakes';

const door = (id: RoomId) => ({ id, ...GRAPH[id] });

test('a closed door names what it misses', () => {
  expect(doorText(door('biblioteca'), [], content)).toBe('Servono delle coordinate?');
  expect(doorText(door('rapture'), [], content)).toBe('Serve un codice?');
  expect(doorText(door('rapture'), ['time-0451'], content)).toBe('Serve una regola?');
  expect(doorText(door('stanza-46'), [], content)).toBe('Servono tutti gli indizi?');
  expect(doorText(door('stanza-46'), ['profile', 'time-0451'], content)).toBe('Servono tutti gli indizi?');
});
