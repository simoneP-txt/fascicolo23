// Content schema: content.json must validate, a broken copy must name the faulty field (a room's own fields
// and the item of a list included), the help thresholds and audience numbers must match the decisions,
// every witness sentence must end with "?", every sound the game plays by name must be listed, and every
// meme must have something to show, a sound that exists and, if any, an image shipped in assets/memes.
import { expect, test } from 'vitest';
import json from '../../content/content.json';
import { validateContent, type Schema } from '../../src/engine/content';
import { rooms } from '../../src/rooms';
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
  expect(() => validateContent(json, rooms)).not.toThrow();
});

test('a missing text names its field', () => {
  const broken = copy();
  delete broken.rooms.studio.name;
  expect(() => validateContent(broken, rooms)).toThrow(/rooms\.studio\.name/);
});

test('a negative threshold names its field', () => {
  const broken = copy();
  broken.rooms.scacchiera.help.hintAfterSec = -1;
  expect(() => validateContent(broken, rooms)).toThrow(/rooms\.scacchiera\.help\.hintAfterSec/);
});

// Checks the content as if this room declared these fields of its own.
const withFields = (raw: unknown, id: RoomId, schema: Record<string, Schema>) => () => validateContent(raw, [{ id, schema }]);

test('a room schema adds its own fields', () => {
  expect(withFields(json, 'scacchiera', { fen: 'text' })).toThrow(/rooms\.scacchiera\.fen/);
});

test('a room field replaces the common one of that name', () => {
  expect(withFields(json, 'studio', { witness: { intro: 'text', wrong: 'text' } })).toThrow(/rooms\.studio\.witness\.wrong/);
});

test('a list names the item that breaks', () => {
  const steps: Record<string, Schema> = { steps: [{ text: 'text' }] };
  const study = copy();
  study.rooms.studio.steps = [{ text: 'a' }, { text: 'b' }];
  expect(withFields(study, 'studio', steps)).not.toThrow();
  study.rooms.studio.steps = [{ text: 'a' }, {}];
  expect(withFields(study, 'studio', steps)).toThrow(/rooms\.studio\.steps\[1\]\.text/);
  study.rooms.studio.steps = [];
  expect(withFields(study, 'studio', steps)).toThrow(/rooms\.studio\.steps must be a non-empty list/);
});

test('the link lists every room exactly once', () => {
  const broken = copy();
  broken.link = broken.link.filter((fragment: { room: string }) => fragment.room !== 'rapture');
  expect(() => validateContent(broken, rooms)).toThrow(/link/);
});

test('a meme needs a text or an image', () => {
  const broken = copy();
  broken.memes.error = { sound: 'boom' };
  expect(() => validateContent(broken, rooms)).toThrow(/memes\.error/);
});

test('a meme sound must be listed in sounds', () => {
  const broken = copy();
  broken.memes.error.sound = 'nope';
  expect(() => validateContent(broken, rooms)).toThrow(/memes\.error\.sound/);
});

test('the consolation meme of the confirmed skip exists', () => {
  const broken = copy();
  delete broken.memes.consolation;
  expect(() => validateContent(broken, rooms)).toThrow(/memes\.consolation/);
});

test('the sounds the game plays by name are listed', () => {
  for (const id of ['click', 'wish', 'boom', 'stamp']) {
    const broken = copy();
    delete broken.sounds[id];
    expect(() => validateContent(broken, rooms), id).toThrow(new RegExp(`sounds\\.${id}`));
  }
});

test('a meme image is a file shipped in assets/memes', () => {
  // A URL would be a network request long before the finale.
  for (const image of ['https://example.com/meme.png', '//example.com/meme.png', '/assets/memes/meme.png', 'assets/memes/../meme.png', 'assets/sounds/boom.wav']) {
    const broken = copy();
    broken.memes.error.image = image;
    expect(() => validateContent(broken, rooms), image).toThrow(/memes\.error\.image/);
  }
  const local = copy();
  local.memes.error.image = 'assets/memes/meme.png';
  expect(() => validateContent(local, rooms)).not.toThrow();
});

test('thresholds follow decision 9', () => {
  const content = validateContent(json, rooms);
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
  const content = validateContent(json, rooms);
  expect(content.tokens).toBe(3);
  expect(content.audienceSeconds).toBe(30);
});

test('every witness sentence ends with "?"', () => {
  expect(badWitnessSentences(json)).toEqual([]);
});

test('the sentence check catches a period inside a line', () => {
  expect(badWitnessSentences({ witness: { x: 'Ciao. Come stai?' } })).toEqual(['Ciao.']);
});
