// Board: a closed door names the first clue it misses, in the order of the room's requires, unless the room
// has a line of its own; a red string joins each clue found to each door that needs it; the cards of the
// layout sit on the 8 px grid, with a place for every clue.
import { expect, test } from 'vitest';
import { boardStrings, CLUE_SPOTS, DOOR_SPOTS, doorText } from '../../src/engine/board';
import { CLUE_IDS, type RoomId } from '../../src/engine/types';
import { GRAPH, graphRooms } from '../../src/rooms/graph';
import { content } from './fakes';

const door = (id: RoomId) => ({ id, ...GRAPH[id] });

test('a closed door names what it misses', () => {
  expect(doorText(door('biblioteca'), [], content)).toBe('Servono delle coordinate?');
  expect(doorText(door('rapture'), [], content)).toBe('Serve un codice?');
  expect(doorText(door('rapture'), ['time-0451'], content)).toBe('Serve una regola?');
  expect(doorText(door('stanza-46'), [], content)).toBe('Servono tutti gli indizi?');
  expect(doorText(door('stanza-46'), ['profile', 'time-0451'], content)).toBe('Servono tutti gli indizi?');
});

test('a string joins each found clue to each door that needs it', () => {
  expect(boardStrings(['rule', 'profile', 'g4'], graphRooms())).toEqual([
    { clue: 'rule', room: 'rapture' },
    { clue: 'profile', room: 'stanza-46' },
    { clue: 'g4', room: 'biblioteca' },
  ]);
  expect(boardStrings([...CLUE_IDS], graphRooms())).toHaveLength(6);
});

test('the board layout sits on the 8 px grid', () => {
  const spots = [...Object.values(DOOR_SPOTS), ...CLUE_SPOTS];
  expect(spots.flatMap(({ x, y }) => [x, y]).filter((value) => value % 8 !== 0)).toEqual([]);
  expect(CLUE_SPOTS).toHaveLength(CLUE_IDS.length);
});
