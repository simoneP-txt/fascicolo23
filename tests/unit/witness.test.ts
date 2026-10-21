// Witness: whatever a room asks it to say, the line ends with exactly one question mark.
import { expect, test } from 'vitest';
import { question } from '../../src/ui/witness';

test('narrate adds the question mark', () => {
  expect(question('Ciao')).toBe('Ciao?');
  expect(question('Ciao?')).toBe('Ciao?');
  expect(question('Ciao.')).toBe('Ciao?');
  expect(question('  Ciao!  ')).toBe('Ciao?');
  expect(question('Ciao...')).toBe('Ciao?');
  expect(question('Ciao?!')).toBe('Ciao?');
});
