// Clue graph: every required clue is given somewhere, every door (Room 46 included) opens from zero
// clues, a broken graph is reported, and the valid play orders are the three the e2e plays.
import { expect, test } from 'vitest';
import { checkGraph, isOpen, validOrders } from '../../src/engine/clues';
import { GRAPH, graphRooms } from '../../src/rooms/graph';

test('every required clue is given by some room', () => {
  const given = new Set(graphRooms().flatMap((room) => room.gives));
  for (const room of graphRooms()) {
    for (const clue of room.requires) expect(given.has(clue), `${room.id} needs ${clue}`).toBe(true);
  }
});

test('from zero clues every door opens, Room 46 included', () => {
  expect(checkGraph(graphRooms())).toEqual([]);
});

test('a cycle is reported', () => {
  const problems = checkGraph([
    { id: 'studio', requires: ['g4'], gives: ['rule'] },
    { id: 'scacchiera', requires: ['rule'], gives: ['g4'] },
  ]).join('\n');
  expect(problems).toMatch(/studio/);
  expect(problems).toMatch(/scacchiera/);
});

test('a clue nobody gives is reported', () => {
  expect(checkGraph([{ id: 'studio', requires: ['confession'], gives: [] }]).join('\n')).toMatch(/confession/);
});

test('there are three valid orders', () => {
  expect(validOrders(graphRooms())).toEqual([
    ['studio', 'scacchiera', 'biblioteca', 'rapture', 'stanza-46'],
    ['scacchiera', 'studio', 'biblioteca', 'rapture', 'stanza-46'],
    ['scacchiera', 'biblioteca', 'studio', 'rapture', 'stanza-46'],
  ]);
});

test('Room 46 opens only after the other four rooms', () => {
  for (const order of validOrders(graphRooms())) expect(order.at(-1)).toBe('stanza-46');
});

test('the library needs the chessboard coordinates', () => {
  expect(isOpen(GRAPH.biblioteca, [])).toBe(false);
  expect(isOpen(GRAPH.biblioteca, ['g4'])).toBe(true);
});

test('Rapture needs both the time and the rule', () => {
  expect(isOpen(GRAPH.rapture, ['time-0451'])).toBe(false);
  expect(isOpen(GRAPH.rapture, ['rule'])).toBe(false);
  expect(isOpen(GRAPH.rapture, ['time-0451', 'rule'])).toBe(true);
});
