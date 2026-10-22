// Wish card: what the card of the wish says for the fragment just won (its number in the link, the
// fragment, where it comes from and the labels of the new clues), whether it comes from a room or from
// the case opening. Fragments are read from content.json, never written here.
import { expect, test } from 'vitest';
import { wishCard } from '../../src/ui/wish';
import { content } from './fakes';

const fragment = (source: string) => content.link.find((part) => part.room === source)!.text;

test('the wish card names the fragment, its number, its room and the new clues', () => {
  expect(wishCard(content, 'biblioteca', ['time-0451'])).toEqual({ n: 4, fragment: fragment('biblioteca'), from: 'dalla biblioteca', clues: ['04:51'] });
  expect(wishCard(content, 'studio', ['rule', 'profile']).clues).toEqual([content.clues.rule.label, content.clues.profile.label]);
});

test('opening the case is fragment number 1', () =>
  expect(wishCard(content, 'fascicolo', [])).toEqual({ n: 1, fragment: fragment('fascicolo'), from: 'dal fascicolo', clues: [] }));
