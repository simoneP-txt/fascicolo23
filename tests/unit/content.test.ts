// Content schema: content.json must validate, a broken copy must name the faulty field, the help
// thresholds and audience numbers must match the decisions, and every witness sentence must end with "?".
import { expect, test } from 'vitest';
import json from '../../content/content.json';
import { validateContent } from '../../src/engine/content';
import { ROOM_IDS, type RoomId } from '../../src/engine/types';

// A deep copy that a test may break on purpose.
const copy = (): any => structuredClone(json);

// Strings under any "witness" key, split after . ! ? or … followed by a space: the sentences that do
// not end with "?". narrate() only fixes the end of a line, so a period inside a line would show.
function badWitnessSentences(node: unknown, inWitness = false): string[] {
  if (typeof node === 'string') {
    return inWitness ? node.split(/(?<=[.!?…])\s+/).map((s) => s.trim()).filter((s) => !s.endsWith('?')) : [];
  }
  if (Array.isArray(node)) return node.flatMap((item) => badWitnessSentences(item, inWitness));
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([key, value]) => badWitnessSentences(value, inWitness || key === 'witness'));
  }
  return [];
}

test('content.json is valid', () => {
  expect(() => validateContent(json)).not.toThrow();
});

test('a missing text names its field', () => {
  const broken = copy();
  delete broken.rooms.studio.name;
  expect(() => validateContent(broken)).toThrow(/rooms\.studio\.name/);
});

test('a negative threshold names its field', () => {
  const broken = copy();
  broken.rooms.scacchiera.help.hintAfterSec = -1;
  expect(() => validateContent(broken)).toThrow(/rooms\.scacchiera\.help\.hintAfterSec/);
});

test('the link lists every room exactly once', () => {
  const broken = copy();
  broken.link = broken.link.filter((fragment: { room: string }) => fragment.room !== 'rapture');
  expect(() => validateContent(broken)).toThrow(/link/);
});

test('thresholds follow decision 9', () => {
  const content = validateContent(json);
  const seconds = (id: RoomId) => {
    const help = content.rooms[id].help;
    return [help.hintAfterSec, help.secondHintAfterSec, help.skipAfterSec];
  };
  expect(seconds('studio')).toEqual([180, 300, 360]);
  expect(seconds('scacchiera')).toEqual([120, 240, 300]);
  expect(seconds('biblioteca')).toEqual([240, 360, 420]);
  expect(seconds('rapture')).toEqual([null, null, 300]);
  expect(seconds('stanza-46')).toEqual([180, 300, 360]);
  expect(content.rooms.rapture.help.skipAfterErrors).toBe(3);
  for (const id of ROOM_IDS) {
    expect(content.rooms[id].help.hintAfterErrors).toBe(id === 'rapture' ? null : 3);
  }
});

test('the audience has 3 tokens and 30 seconds', () => {
  const content = validateContent(json);
  expect(content.tokens).toBe(3);
  expect(content.audienceSeconds).toBe(30);
});

test('every witness sentence ends with "?"', () => {
  expect(badWitnessSentences(json)).toEqual([]);
});

test('the sentence check catches a period inside a line', () => {
  expect(badWitnessSentences({ witness: { x: 'Ciao. Come stai?' } })).toEqual(['Ciao.']);
});
