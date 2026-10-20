// Link assembly: the fragments in content.json must join into the exact video URL.
import { expect, test } from 'vitest';
import content from '../../content/content.json';
import { assembleLink } from '../../src/engine/link';

test('fragments assemble into the final link', () => {
  expect(assembleLink(content.link.map((fragment) => fragment.text))).toBe('https://youtu.be/71Kg4_v7Qjs');
});
