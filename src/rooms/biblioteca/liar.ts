// Hedge mystery (mockup 08): the three statements of content.json as claims about who lies and when the hedge
// was cut, and the search that proves the puzzle fair. Under the guess "L lies and the cut came at minute T",
// every claim of L is false and every claim of the others is true; a liar fits when some minute of the night
// makes that guess hold. liar.test.ts proves the custode the only one and 04:51 his only minute, so the texts
// and STATEMENTS change only together, with that test.
export const WITNESS_IDS = ['vicina', 'lattaio', 'custode'] as const;
export type WitnessId = (typeof WITNESS_IDS)[number];

/** What a statement claims, the times in minutes after midnight: who lies, the minute of the cut, a minute
 *  the hedge was already cut by, or a minute it was still whole at. */
export type Claim = { liar: WitnessId } | { cutAt: number } | { cutBefore: number } | { intactAt: number };

/** What the texts of content.json claim, witness by witness. */
export const STATEMENTS: Record<WitnessId, Claim[]> = {
  vicina: [{ liar: 'custode' }, { cutAt: 291 }], // "Il custode mente", nine minutes to five
  lattaio: [{ cutBefore: 295 }], // already cut at five to five
  custode: [{ liar: 'vicina' }, { intactAt: 295 }], // "La vicina mente", still whole at five to five
};

const MINUTES = Array.from({ length: 24 * 60 }, (_, minute) => minute);

function holds(claim: Claim, liar: WitnessId, cut: number): boolean {
  if ('liar' in claim) return claim.liar === liar;
  if ('cutAt' in claim) return cut === claim.cutAt;
  if ('cutBefore' in claim) return cut < claim.cutBefore;
  return cut > claim.intactAt;
}

/** The minutes of the cut that fit if this witness is the liar. */
export function cutTimes(liar: WitnessId, statements = STATEMENTS): number[] {
  return MINUTES.filter((cut) =>
    WITNESS_IDS.every((id) => statements[id].every((claim) => holds(claim, liar, cut) === (id !== liar))),
  );
}

/** The witnesses who can be the liar, in WITNESS_IDS order. */
export function consistentLiars(statements = STATEMENTS): WitnessId[] {
  return WITNESS_IDS.filter((id) => cutTimes(id, statements).length > 0);
}

/** Minutes after midnight on a 24-hour clock: 291 → "04:51". */
export function clock(minutes: number): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(Math.floor(minutes / 60))}:${two(minutes % 60)}`;
}
