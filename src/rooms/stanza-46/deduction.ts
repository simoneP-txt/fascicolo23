// Room 46's deduction, without the DOM (the plan's decision 20): the four suspects, the alibi each one claims,
// and the rules that turn their lines and the clues found into a culprit. The profile rules out whoever does not
// speak only in questions; the time rules out an alibi at the minute of the crime that holds, and a live
// broadcast holds only until the filmed confession shows it was recorded, while a commit stays on record. A clue
// settles the suspects it rules on, and an accusation counts only with the three clues pinned.
import type { ClueId } from '../../engine/types';

export const SUSPECT_IDS = ['giardiniere', 'professore', 'fidanzato', 'diva'] as const; // board order
export type SuspectId = (typeof SUSPECT_IDS)[number];

export const EVIDENCE = ['profile', 'time-0451', 'confession'] as const satisfies readonly ClueId[];
export type Evidence = (typeof EVIDENCE)[number];

/** An alibi claimed for a minute of the night: a commit stays on record, a live broadcast can be recorded. */
export interface Alibi {
  minute: number; // minutes after midnight: 04:51 → 291
  kind: 'record' | 'live';
}

// What the fiancé's and the diva's lines claim, "alle cinque meno nove", in words; the other two claim none.
export const ALIBIS: Record<SuspectId, Alibi | null> = {
  giardiniere: null,
  professore: null,
  fidanzato: { minute: 291, kind: 'record' },
  diva: { minute: 291, kind: 'live' },
};

/** "04:51" → 291. */
export function minuteOf(clock: string): number {
  const [hours, minutes] = clock.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Whether every sentence of the quote, guillemets aside, ends with "?". */
export function speaksInQuestions(quote: string): boolean {
  return quote
    .replace(/[«»]/g, '')
    .trim()
    .split(/(?<=[.!?…])\s+/)
    .every((sentence) => sentence.endsWith('?'));
}

// An alibi at the minute of the crime that holds once these clues are known.
function cleared(suspect: SuspectId, crime: number, known: ReadonlySet<Evidence>): boolean {
  const alibi = ALIBIS[suspect];
  return !!alibi && alibi.minute === crime && (alibi.kind === 'record' || !known.has('confession'));
}

/** The suspects these clues leave standing, in board order. Without the time no alibi counts. */
export function culprits(quotes: Record<SuspectId, string>, crime: number, known: ReadonlySet<Evidence>): SuspectId[] {
  return SUSPECT_IDS.filter(
    (id) =>
      !(known.has('profile') && !speaksInQuestions(quotes[id])) && !(known.has('time-0451') && cleared(id, crime, known)),
  );
}

/** Whether this clue rules on this suspect, so it may be pinned there: the profile on whoever it rules out, the
 *  time on an alibi on record at the minute of the crime, the confession on a live one. */
export function settles(clue: Evidence, suspect: SuspectId, quotes: Record<SuspectId, string>, crime: number): boolean {
  const alibi = ALIBIS[suspect];
  if (clue === 'profile') return !speaksInQuestions(quotes[suspect]);
  if (alibi?.minute !== crime) return false;
  return alibi.kind === (clue === 'time-0451' ? 'record' : 'live');
}

/** blind: the three clues are not all pinned; objection: an alibi that holds; innocent: no alibi, ruled out. */
export type Accusation = 'blind' | 'innocent' | 'objection' | 'guilty';

export function accuse(pinned: ReadonlySet<Evidence>, suspect: SuspectId, culprit: SuspectId): Accusation {
  if (!EVIDENCE.every((clue) => pinned.has(clue))) return 'blind';
  if (suspect === culprit) return 'guilty';
  return ALIBIS[suspect] ? 'objection' : 'innocent';
}

/** Whether this blind accusation, counted from 1, plays the video: the every-th, the 2·every-th and so on. */
export function getsHelp(blind: number, every: number): boolean {
  return every > 0 && blind > 0 && blind % every === 0;
}
