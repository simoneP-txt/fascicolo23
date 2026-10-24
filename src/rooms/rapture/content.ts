// Rapture texts: the room's own fields in content.json, the door's code and keypad, the reminder, the four
// controls, the eight orders with the control each names, the rules of a run, the panel of the orders game, the
// witness's lines, and the schema that checks them at startup. rapture.test.ts checks the orders against the
// rule of the study and the code against the library's time.
import type { Schema } from '../../engine/content';
import type { RoomContent } from '../../engine/types';
import { CONTROL_IDS, type ControlId, type Order, type RunRules } from './orders';

export interface RaptureContent extends RoomContent {
  code: string; // "0451"
  keypad: { prompt: string; open: string; erase: string }; // Inserisci il codice?, Apri?, Cancella?
  reminder: string; // "PROMEMORIA", over the rule's label from ctx.common
  controls: Record<ControlId, string>; // Leva?, Bottone rosso?, Valvola?, Interruttore?
  orders: Order[];
  run: RunRules;
  // ORDINE {n} DI {total}, TEMPO, {s} s, ERRORI, {n} su {total}, TENTATIVO, N. {n}, Pronta?, Riprova?
  panel: { order: string; time: string; seconds: string; errors: string; count: string; attempt: string; number: string; start: string; again: string };
  witness: { intro: string; code: string[]; open: string; lost: string; solved: string }; // code: after the 1st, 2nd and 3rd wrong code
}

export const RAPTURE_SCHEMA: Record<string, Schema> = {
  code: 'text',
  keypad: { prompt: 'text', open: 'text', erase: 'text' },
  reminder: 'text',
  controls: Object.fromEntries(CONTROL_IDS.map((id) => [id, 'text'])),
  orders: [{ text: 'text', control: 'text' }],
  run: { seconds: 'seconds', slower: 'seconds', errors: 'count' },
  panel: {
    order: 'text',
    time: 'text',
    seconds: 'text',
    errors: 'text',
    count: 'text',
    attempt: 'text',
    number: 'text',
    start: 'text',
    again: 'text',
  },
  witness: { intro: 'text', code: 'texts', open: 'text', lost: 'text', solved: 'text' },
};
