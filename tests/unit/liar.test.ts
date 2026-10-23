// Library: the hedge mystery behind the shelf has one consistent liar, the custode, and then a single cut
// time, the clue the room gives; the lattaio's time is what rules the vicina out. The texts of content.json
// name the witnesses of the model, the witness answers each wrong accusation, the secret book sits on the
// chessboard's square and the shelf is drawn the same on every visit.
import { expect, test } from 'vitest';
import json from '../../content/content.json';
import { validateContent } from '../../src/engine/content';
import { rooms } from '../../src/rooms';
import type { LibraryContent } from '../../src/rooms/biblioteca/content';
import { clock, consistentLiars, cutTimes, STATEMENTS, WITNESS_IDS } from '../../src/rooms/biblioteca/liar';
import { shelfSpines } from '../../src/rooms/biblioteca/shelf';
import { SQUARES } from '../../src/ui/grid8';

const content = validateContent(json, rooms);
const room = content.rooms.biblioteca as LibraryContent;

test('one witness alone can be the liar: the custode', () => expect(consistentLiars()).toEqual(['custode']));

test('then the hedge was cut at 04:51 and at no other minute', () =>
  expect(cutTimes('custode').map(clock)).toEqual([content.clues['time-0451'].label]));

test('without the lattaio two liars would fit: his time breaks the tie', () =>
  expect(consistentLiars({ ...STATEMENTS, lattaio: [] })).toEqual(['vicina', 'custode']));

test('the clock writes hours and minutes on two digits each', () => {
  expect(clock(0)).toBe('00:00');
  expect(clock(291)).toBe('04:51');
  expect(clock(1439)).toBe('23:59');
});

test('the texts and the model name the same witnesses', () =>
  expect(room.mystery.statements.map((statement) => statement.id).sort()).toEqual([...WITNESS_IDS].sort()));

test('the witness answers every wrong accusation', () =>
  expect(Object.keys(room.witness.wrong).sort()).toEqual(WITNESS_IDS.filter((id) => id !== 'custode').sort()));

test('the secret book sits where the chessboard sends you', () => expect(room.secret).toBe(content.clues.g4.label));

test('the solution names the time', () => expect(room.mystery.solution.text).toContain('{time}'));

test('the shelf is drawn the same every time', () => {
  const shelf = shelfSpines();
  expect(shelf).toEqual(shelfSpines());
  expect(Object.keys(shelf)).toEqual([...SQUARES]);
  for (const square of SQUARES) {
    expect(shelf[square].length, square).toBeGreaterThanOrEqual(3);
    expect(shelf[square].length, square).toBeLessThanOrEqual(4);
    for (const spine of shelf[square]) {
      expect(spine.book).toBeGreaterThanOrEqual(1);
      expect(spine.book).toBeLessThanOrEqual(10);
    }
  }
  expect(shelfSpines(7)).not.toEqual(shelf); // the seed matters
});
