// Texts of content.json, read string by string with the path of each: none is a placeholder (the plan's decision
// 2: a marker Simone may leave while he writes, or a fake button of phase 2), and every time the library and Room
// 46 say, "cinque meno <n>" or "hh:mm", is a minute of the case: one the statements claim, the minute of the cut
// or an alibi's (decision 4). A rewrite that moves a time in a puzzle text without the lines that repeat it fails
// here, naming the field.
import { expect, test } from 'vitest';
import json from '../../content/content.json';
import { consistentLiars, cutTimes, STATEMENTS } from '../../src/rooms/biblioteca/liar';
import { ALIBIS, minuteOf } from '../../src/rooms/stanza-46/deduction';

// A deep copy that a test may break on purpose.
const copy = (): any => structuredClone(json);

/** Every string under this node with its path, as validateContent names a field: rooms.studio.hints[0]. */
function texts(node: unknown, path = ''): [path: string, text: string][] {
  if (typeof node === 'string') return [[path, node]];
  if (Array.isArray(node)) return node.flatMap((item, i) => texts(item, `${path}[${i}]`));
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([key, value]) => texts(value, path ? `${path}.${key}` : key));
  }
  return [];
}

const MARKERS = /\b(?:TODO|TBD|FIXME|XXX)\b|lorem ipsum|segnaposto|placeholder|\bbozz[ae]\b/i;
const PHASE_2_BUTTONS = ['Risolvi la stanza?', 'Sbaglia apposta?'];

/** The paths of the texts that are still placeholders. */
function placeholders(content: unknown): string[] {
  return texts(content)
    .filter(([, text]) => MARKERS.test(text) || PHASE_2_BUTTONS.includes(text.trim()))
    .map(([path]) => path);
}

// Italian numbers from 1 to 59, as a time "cinque meno <n>" says them, and the quarter.
const UNITS = ['uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove'];
const TEENS = ['dieci', 'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove'];
const NUMBERS = new Map<string, number>([['un', 1], ['un quarto', 15]]);
UNITS.forEach((unit, u) => NUMBERS.set(unit, u + 1));
TEENS.forEach((teen, t) => NUMBERS.set(teen, t + 10));
['venti', 'trenta', 'quaranta', 'cinquanta'].forEach((ten, t) => {
  NUMBERS.set(ten, (t + 2) * 10);
  UNITS.forEach((unit, u) => {
    const stem = unit === 'uno' || unit === 'otto' ? ten.slice(0, -1) : ten; // ventuno, ventotto
    NUMBERS.set(stem + (unit === 'tre' ? 'tré' : unit), (t + 2) * 10 + u + 1);
  });
});

/** The times a text says, each with its minute after midnight; a number the map does not know gives NaN. */
function times(text: string): { said: string; minute: number }[] {
  const spoken = [...text.matchAll(/cinque meno (un quarto|\d+|[a-zàéè]+)/gi)].map(([said, n]) => {
    const minus = /^\d+$/.test(n) ? Number(n) : (NUMBERS.get(n.toLowerCase()) ?? NaN);
    return { said, minute: 5 * 60 - minus };
  });
  const written = [...text.matchAll(/\b\d{1,2}:\d{2}\b/g)].map(([said]) => ({ said, minute: minuteOf(said) }));
  return [...spoken, ...written];
}

// The minutes of the case: those the statements claim, the minute of the cut, and the alibis'.
const CLAIMED = new Set([
  ...Object.values(STATEMENTS).flatMap((claims) => claims.map((claim) => Object.values(claim)[0])),
  ...consistentLiars().flatMap((liar) => cutTimes(liar)),
  ...Object.values(ALIBIS).flatMap((alibi) => (alibi ? [alibi.minute] : [])),
]);

/** "<path>: <time>" for every time the library, Room 46 and the clue of the time say that the case does not know. */
function unclaimedTimes(content: any): string[] {
  const said = [
    ...texts(content.rooms.biblioteca, 'rooms.biblioteca'),
    ...texts(content.rooms['stanza-46'], 'rooms.stanza-46'),
    ...texts(content.clues['time-0451'].label, 'clues.time-0451.label'),
  ];
  return said.flatMap(([path, text]) =>
    times(text)
      .filter(({ minute }) => !CLAIMED.has(minute))
      .map(({ said }) => `${path}: ${said}`),
  );
}

test('no text is a placeholder', () => {
  expect(placeholders(json)).toEqual([]);
});

test('the placeholder check names the field', () => {
  const marked = copy();
  marked.rooms.studio.hints[0] = 'TODO';
  expect(placeholders(marked)).toEqual(['rooms.studio.hints[0]']);
  const button = copy();
  button.rooms.scacchiera.witness.intro = 'Sbaglia apposta?';
  expect(placeholders(button)).toEqual(['rooms.scacchiera.witness.intro']);
});

test('every time the library and Room 46 say is a minute of the case', () => {
  expect(CLAIMED).toEqual(new Set([284, 287, 290, 291, 292]));
  expect(unclaimedTimes(json)).toEqual([]);
});

test('the time check catches a minute nobody claims', () => {
  const spoken = copy();
  spoken.rooms.biblioteca.hints[0] = 'Alle cinque meno venti la siepe era intera.';
  expect(unclaimedTimes(spoken)).toEqual(['rooms.biblioteca.hints[0]: cinque meno venti']);
  const written = copy();
  written.rooms['stanza-46'].suspects[2].verdict = 'Alle 04:53 faceva un commit';
  expect(unclaimedTimes(written)).toEqual(['rooms.stanza-46.suspects[2].verdict: 04:53']);
});
