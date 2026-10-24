// Library: the hedge mystery behind the shelf has one consistent liar, the custode, and then a single cut
// time, the clue the room gives. Each witness matters: the vicina's first walk rules her out, the lattaio's
// time closes the minute. The texts of content.json name the witnesses of the model and say the minutes of
// its claims, the witness answers each wrong accusation, both hints help in the mystery, the schema checks
// the time and the questions of a quick guess, the secret book sits on the chessboard's square and the shelf
// is drawn the same on every visit.
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

// The minutes of the model as the statements say them, counted back from five o'clock.
const SPOKEN: Record<number, string> = {
  284: 'cinque meno sedici',
  287: 'cinque meno tredici',
  290: 'cinque meno dieci',
  292: 'cinque meno otto',
};

test('one witness alone can be the liar: the custode', () => expect(consistentLiars()).toEqual(['custode']));

test('then the hedge was cut at 04:51 and at no other minute', () =>
  expect(cutTimes('custode').map(clock)).toEqual([content.clues['time-0451'].label]));

test('without the lattaio the minute is lost', () =>
  expect(cutTimes('custode', { ...STATEMENTS, lattaio: [] }).length).toBeGreaterThan(1));

test("without the vicina's first walk she could be the liar too", () =>
  expect(consistentLiars({ ...STATEMENTS, vicina: [{ intactAt: 290 }] })).toEqual(['vicina', 'custode']));

test('every statement says the minutes of its claims', () => {
  for (const { id, says } of room.mystery.statements) {
    for (const claim of STATEMENTS[id]) {
      const minute = Object.values(claim)[0];
      expect(says, `${id}, ${clock(minute)}`).toContain(SPOKEN[minute]);
    }
  }
});

test('the clock writes hours and minutes on two digits each', () => {
  expect(clock(0)).toBe('00:00');
  expect(clock(291)).toBe('04:51');
  expect(clock(1439)).toBe('23:59');
});

test('the texts and the model name the same witnesses', () =>
  expect(room.mystery.statements.map((statement) => statement.id).sort()).toEqual([...WITNESS_IDS].sort()));

test('the witness answers every wrong accusation', () =>
  expect(Object.keys(room.witness.wrong).sort()).toEqual(WITNESS_IDS.filter((id) => id !== 'custode').sort()));

// The errors of the shelf and of the mystery add up, so either hint may come while the player is in the mystery.
test('both hints of the library speak to the mystery', () => {
  const witnesses = room.mystery.statements.map(({ name }) => name.split(' ').at(-1)!.toLowerCase()); // "La vicina"
  const lies = /^ment(?:e|i|o|ono|iva|isse|ire|irebbe)$/; // the liar's rule, "uno mente sempre"; not "mentre"
  for (const hint of room.hints) {
    const words = hint.toLowerCase().match(/\p{L}+/gu) ?? [];
    expect(words.some((word) => witnesses.includes(word) || lies.test(word)), hint).toBe(true);
  }
});

test('the secret book sits where the chessboard sends you', () => expect(room.secret).toBe(content.clues.g4.label));

test('the solution names the time', () => expect(room.mystery.solution.text).toContain('{time}'));

test('the library checks the time and the questions of a quick guess', () => {
  const noTime: any = structuredClone(json);
  delete noTime.rooms.biblioteca.quickGuessSec;
  expect(() => validateContent(noTime, rooms)).toThrow(/rooms\.biblioteca\.quickGuessSec/);
  const noQuestions: any = structuredClone(json);
  noQuestions.rooms.biblioteca.witness.sure = [];
  expect(() => validateContent(noQuestions, rooms)).toThrow(/rooms\.biblioteca\.witness\.sure/);
});

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
