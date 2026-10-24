// Room 46 texts: the room's own fields in content.json, the label of the link with one bar left, the four
// suspects with their lines and verdicts, the slot and the thread of the accusation, the two stamps, how many blind
// accusations bring the video, the witness's lines, and the schema that checks them at startup. The suspects'
// lines are the puzzle: deduction.test.ts proves them one with the model in deduction.ts, so they change only
// together with that test.
import type { Schema } from '../../engine/content';
import type { RoomContent } from '../../engine/types';
import { EVIDENCE, type Evidence, type SuspectId } from './deduction';

export interface Stanza46Content extends RoomContent {
  link: { oneLeft: string }; // PROVA N. 1 · MANCA UN PEZZO
  suspects: { id: SuspectId; name: string; quote: string; verdict: string }[]; // in SUSPECT_IDS order; quote in «»
  slot: string; // "Trascina qui?"
  thread: { label: string; prompt: string }; // IL FILO DELL'ACCUSA, "Trascina sul colpevole?"
  stamps: { out: string; guilty: string }; // ESCLUSO, COLPEVOLE?
  blindTries: number; // every blind-th blind accusation plays the getHelp meme
  witness: {
    intro: string;
    pinned: Record<Evidence, string>; // a clue pinned where it settles
    bounce: Record<Evidence, string>; // a clue on a suspect it does not settle: why not there
    blind: string[]; // an accusation before the three clues are pinned, one line each time, in turn
    accused: Record<Exclude<SuspectId, 'diva'>, string>; // with the three clues pinned, why not them
    solved: string;
  };
}

const texts = (keys: readonly string[]): Schema => Object.fromEntries(keys.map((key) => [key, 'text']));

export const STANZA46_SCHEMA: Record<string, Schema> = {
  link: { oneLeft: 'text' },
  suspects: [{ id: 'text', name: 'text', quote: 'text', verdict: 'text' }],
  slot: 'text',
  thread: { label: 'text', prompt: 'text' },
  stamps: { out: 'text', guilty: 'text' },
  blindTries: 'count',
  witness: {
    intro: 'text',
    pinned: texts(EVIDENCE),
    bounce: texts(EVIDENCE),
    blind: 'texts',
    accused: texts(['giardiniere', 'professore', 'fidanzato']),
    solved: 'text',
  },
};
