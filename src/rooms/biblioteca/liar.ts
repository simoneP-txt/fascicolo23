// Hedge mystery (mockup 08): the three statements of content.json as claims about when the hedge was cut, and
// the search that proves the puzzle fair. Under the guess "L lies and the cut came at minute T", every claim
// of L is false and every claim of the others is true, as the title card says; a liar fits when some minute
// of the night makes that guess hold. The vicina and the custode cannot both tell the truth; if the vicina
// lied about both her walks, the hedge would be down before the custode's shears, so the custode lies, and
// the vicina's return and the lattaio's round close the cut on one minute. liar.test.ts proves the custode
// the only liar and 04:51 his only minute, so the texts and STATEMENTS change only together, with that test.
export const WITNESS_IDS = ['vicina', 'lattaio', 'custode'] as const;
export type WitnessId = (typeof WITNESS_IDS)[number];

/** What a statement claims, the times in minutes after midnight: the minute of the cut, a minute the hedge
 *  was already cut by, or a minute it was still whole at. */
export type Claim = { cutAt: number } | { cutBefore: number } | { intactAt: number };

/** What the texts of content.json claim, witness by witness. */
export const STATEMENTS: Record<WitnessId, Claim[]> = {
  vicina: [{ intactAt: 284 }, { intactAt: 290 }], // whole when she went out with the dog and when she came back
  lattaio: [{ cutBefore: 292 }], // already down at eight to five
  custode: [{ cutAt: 287 }], // the shears at thirteen to five
};

const MINUTES = Array.from({ length: 24 * 60 }, (_, minute) => minute);

function holds(claim: Claim, cut: number): boolean {
  if ('cutAt' in claim) return cut === claim.cutAt;
  if ('cutBefore' in claim) return cut < claim.cutBefore;
  return cut > claim.intactAt;
}

/** The minutes of the cut that fit if this witness is the liar. */
export function cutTimes(liar: WitnessId, statements = STATEMENTS): number[] {
  return MINUTES.filter((cut) =>
    WITNESS_IDS.every((id) => statements[id].every((claim) => holds(claim, cut) === (id !== liar))),
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
