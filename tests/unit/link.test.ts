// Link assembly: the fragments in content.json must join into the exact video URL, and the board
// shows only the fragments the player has earned.
import { expect, test } from 'vitest';
import content from '../../content/content.json';
import { validateContent } from '../../src/engine/content';
import { rooms } from '../../src/rooms';
import { assembleLink, linkParts } from '../../src/engine/link';
import { complete, newState, openCase, type GameState } from '../../src/engine/state';

test('fragments assemble into the final link', () => {
  expect(assembleLink(content.link.map((fragment) => fragment.text))).toBe('https://youtu.be/71Kg4_v7Qjs');
});

test('only earned fragments are shown', () => {
  const link = validateContent(content, rooms).link;
  const shown = (state: GameState) => linkParts(link, state).filter((part) => part.shown).map((part) => part.text);
  expect(shown(newState(3))).toEqual([]);
  const opened = openCase(newState(3));
  expect(shown(opened)).toEqual(['youtu.be/']);
  expect(shown(complete(opened, { id: 'studio', gives: ['rule', 'profile'] }))).toEqual(['youtu.be/', '71']);
});
