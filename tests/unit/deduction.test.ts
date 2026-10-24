// Room 46's deduction (decisions 18 and 20 and the plan's decisions 2 and 17): the suspects' lines in content.json
// make a puzzle that needs all three clues. The profile rules out whoever does not speak only in questions, though
// everyone asks one; the time rules out an alibi at the minute of the crime that stays on record; the filmed
// confession takes away the alibi of a live broadcast. Each clue fits the suspects it describes, only the culprit
// fits all three, an accusation counts only with the three clues pinned, and every third blind one plays the video.
import { expect, test } from 'vitest';
import json from '../../content/content.json';
import { validateContent } from '../../src/engine/content';
import { rooms } from '../../src/rooms';
import type { Stanza46Content } from '../../src/rooms/stanza-46/content';
import {
  accuse,
  ALIBIS,
  culprits,
  EVIDENCE,
  fits,
  getsHelp,
  minuteOf,
  speaksInQuestions,
  SUSPECT_IDS,
  type Evidence,
  type SuspectId,
} from '../../src/rooms/stanza-46/deduction';

const content = validateContent(json, rooms);
const room = content.rooms['stanza-46'] as Stanza46Content;
const quotes = Object.fromEntries(room.suspects.map(({ id, quote }) => [id, quote])) as Record<SuspectId, string>;
const crime = minuteOf(content.clues['time-0451'].label);

/** The quote without its guillemets. */
const bare = (quote: string) => quote.replace(/^«|»$/g, '');

test('the gardener and the professor close with a period, the fiancé and the diva with a question', () => {
  expect(bare(quotes.giardiniere).endsWith('.')).toBe(true);
  expect(bare(quotes.professore).endsWith('.')).toBe(true);
  expect(bare(quotes.fidanzato).endsWith('?')).toBe(true);
  expect(bare(quotes.diva).endsWith('?')).toBe(true);
});

test('only the fiancé and the diva speak in questions, though the other two ask one too', () => {
  expect(SUSPECT_IDS.filter((id) => speaksInQuestions(quotes[id]))).toEqual(['fidanzato', 'diva']);
  expect(quotes.giardiniere).toContain('?');
  expect(quotes.professore).toContain('?');
});

test('the fiancé and the diva claim the minute of the crime, in words', () => {
  expect(minuteOf(content.clues['time-0451'].label)).toBe(291);
  expect(ALIBIS.fidanzato).toEqual({ minute: 291, kind: 'record' });
  expect(ALIBIS.diva).toEqual({ minute: 291, kind: 'live' });
  expect(ALIBIS.giardiniere).toBeNull();
  expect(ALIBIS.professore).toBeNull();
  expect(quotes.fidanzato).toContain('cinque meno nove');
  expect(quotes.diva).toContain('cinque meno nove');
});

test('the three clues leave the diva alone', () => {
  expect(culprits(quotes, crime, new Set(EVIDENCE))).toEqual(['diva']);
});

test('every clue is needed', () => {
  for (const missing of EVIDENCE) {
    const known = new Set<Evidence>(EVIDENCE.filter((clue) => clue !== missing));
    expect(culprits(quotes, crime, known), `without ${missing}`).not.toEqual(['diva']);
  }
});

test('each clue fits the suspects of the table', () => {
  const fitting = (clue: Evidence, minute = crime) => SUSPECT_IDS.filter((id) => fits(clue, id, quotes, minute));
  expect(fitting('profile')).toEqual(['fidanzato', 'diva']);
  expect(fitting('time-0451')).toEqual(['fidanzato', 'diva']);
  expect(fitting('confession')).toEqual(['diva']);
  expect(fitting('time-0451', crime + 1)).toEqual([]); // an alibi for another minute
});

test('only the culprit fits all three clues', () => {
  const all = SUSPECT_IDS.filter((id) => EVIDENCE.every((clue) => fits(clue, id, quotes, crime)));
  expect(all).toEqual(['diva']);
  expect(all).toEqual(culprits(quotes, crime, new Set(EVIDENCE)));
});

test('an accusation counts only with the three clues pinned', () => {
  expect(accuse(new Set<Evidence>(['profile', 'time-0451']), 'diva', 'diva')).toBe('blind');
  expect(accuse(new Set<Evidence>(), 'diva', 'diva')).toBe('blind');
  const all = new Set(EVIDENCE);
  expect(accuse(all, 'diva', 'diva')).toBe('guilty');
  expect(accuse(all, 'fidanzato', 'diva')).toBe('objection');
  expect(accuse(all, 'giardiniere', 'diva')).toBe('innocent');
  expect(accuse(all, 'professore', 'diva')).toBe('innocent');
});

test('the video comes with every third blind accusation', () => {
  expect(room.blindTries).toBe(3);
  const helped = [1, 2, 3, 4, 5, 6].filter((blind) => getsHelp(blind, room.blindTries));
  expect(helped).toEqual([3, 6]);
});

test('the suspects are the four, in board order, with distinct blind lines', () => {
  expect(room.suspects.map((suspect) => suspect.id)).toEqual([...SUSPECT_IDS]);
  expect(new Set(room.witness.blind).size).toBe(room.witness.blind.length);
  expect(room.witness.blind.length).toBeGreaterThanOrEqual(room.blindTries);
  expect(Object.keys(room.witness.pinned).sort()).toEqual([...EVIDENCE].sort());
  expect(Object.keys(room.witness.bounce).sort()).toEqual([...EVIDENCE].sort());
});
