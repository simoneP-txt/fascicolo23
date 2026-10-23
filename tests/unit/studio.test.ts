// Study: three testimonies, each with four phenomena and one right answer. No phenomenon comes back in
// another report, so the last report never falls by elimination, and the witness has an answer for a wrong
// phenomenon in every report.
import { expect, test } from 'vitest';
import json from '../../content/content.json';
import { validateContent } from '../../src/engine/content';
import { rooms } from '../../src/rooms';
import type { StudioContent } from '../../src/rooms/studio/content';

const content = validateContent(json, rooms);
const room = content.rooms.studio as StudioContent;

test('three testimonies, four options each, one right answer', () => {
  expect(room.testimonies).toHaveLength(3);
  for (const { options, answer } of room.testimonies) {
    expect(options).toHaveLength(4);
    expect(Number.isInteger(answer) && answer >= 0 && answer < options.length).toBe(true);
  }
});

test('no option comes back in another testimony, so none falls by elimination', () => {
  const all = room.testimonies.flatMap((testimony) => testimony.options);
  expect(new Set(all).size).toBe(all.length);
});

test('the witness answers every wrong testimony', () => expect(room.witness.wrong).toHaveLength(room.testimonies.length));
