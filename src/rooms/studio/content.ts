// Study texts: the room's own fields in content.json, three testimonies with four phenomena each and the
// index of the right one, the plate, the stake card, and the schema that checks them at startup.
// studio.test.ts checks that every report has four options, one answer among them, and no option that comes
// back in another report.
import type { Schema } from '../../engine/content';
import type { RoomContent } from '../../engine/types';

export interface StudioContent extends RoomContent {
  reports: { tag: string; question: string }; // "VERBALE {n} DI {total}", "Quale fenomeno lo spiega?"
  testimonies: { quote: string; options: string[]; answer: number }[]; // answer: index in options
  plate: string; // "TAVOLA I"
  stake: { tag: string; fragment: string; clues: string }; // IN PALIO, un frammento, e due indizi
  witness: {
    intro: string;
    plate: string; // "Interessante?", whatever the plate shows (decision 8)
    wrong: string[]; // a wrong phenomenon, one line per testimony
    solved: string;
  };
}

export const STUDIO_SCHEMA: Record<string, Schema> = {
  reports: { tag: 'text', question: 'text' },
  testimonies: [{ quote: 'text', options: 'texts', answer: 'count' }],
  plate: 'text',
  stake: { tag: 'text', fragment: 'text', clues: 'text' },
  witness: { intro: 'text', plate: 'text', wrong: 'texts', solved: 'text' },
};
