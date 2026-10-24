// E2E play: how a test solves each room, and solveRoom(), which enters a room from the board, solves it and
// closes the wish, landing on the board, or on the finale after Room 46. A room is solved by playing it, with the
// answers taken from content.json, or by the host's Ctrl+Shift+N for the tests that prove the engine. The study
// picks the right phenomenon of each report, the chessboard plays its line, the library pulls its secret book and
// accuses the liar of liar.ts until the room takes the answer, Rapture opens its door with the code and plays one
// run that obeys the questions only; Room 46 pins each clue on a suspect it settles and accuses the culprit, two
// clicks each. Playing Rapture needs the page clock installed before the page opened (decision 12): a run stands
// the clock still and runs it one window at a time, and the steps of a run, and those of Room 46, are exported for
// the tests of the rooms.
import { expect, type Page } from '@playwright/test';
import { Chess } from 'chess.js';
import { FINALE } from '../../src/engine/game';
import type { RoomId } from '../../src/engine/types';
import { consistentLiars } from '../../src/rooms/biblioteca/liar';
import { CONTROL_IDS, isQuestion, type Order } from '../../src/rooms/rapture/orders';
import { culprits, EVIDENCE, minuteOf, settles, SUSPECT_IDS, type Evidence, type SuspectId } from '../../src/rooms/stanza-46/deduction';
import { board, content, continueWish, enterRoom, finale, wish } from './helpers';

const rapture = content.rooms.rapture;
export const ORDERS: Order[] = rapture.orders;

/** Rapture's code typed on the keypad and "Apri?" pressed, until the first run waits for "Pronta?". */
export async function openRaptureDoor(page: Page): Promise<void> {
  for (const digit of rapture.code as string) await page.locator(`[data-digit="${digit}"]`).click();
  await page.getByRole('button', { name: rapture.keypad.open }).click();
  await expect(page.getByRole('button', { name: rapture.panel.start })).toBeVisible();
}

/** Stands the page clock still and starts the n-th run of the visit with "Pronta?" or "Riprova?". Returns the
 *  window of each order in ms, longer by the run's slowdown. */
export async function startRaptureRun(page: Page, n: number): Promise<number> {
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
  await page.getByRole('button', { name: n === 1 ? rapture.panel.start : rapture.panel.again }).click();
  return ((rapture.run.seconds + rapture.run.slower * (n - 1)) * 1000) / ORDERS.length;
}

/** The control that breaks this order: its own for an imperative, another one for a question. */
export const wrongControl = (order: Order) => (isQuestion(order) ? CONTROL_IDS.find((id) => id !== order.control)! : order.control);

/** Runs the stopped clock through one order's window, pressing at its middle the control this order gets, if
 *  any. */
export async function throughOrder(page: Page, slot: number, control: string | null): Promise<void> {
  const half = Math.floor(slot / 2);
  await page.clock.runFor(half);
  if (control) await page.locator(`[data-control="${control}"]`).click();
  await page.clock.runFor(slot - half);
}

/** A run lost on the spot: the first three orders broken, then the clock run past the run meme. */
export async function loseRaptureRun(page: Page, slot: number): Promise<void> {
  for (const order of ORDERS.slice(0, 3)) await throughOrder(page, slot, wrongControl(order));
  await page.clock.runFor(1000);
  await expect(page.getByRole('button', { name: rapture.panel.again })).toBeVisible();
}

/** The door, then one run that presses the control of each question in its window and leaves every imperative
 *  alone; the clock goes on by itself for the beat and the wish. */
async function playRapture(page: Page): Promise<void> {
  await openRaptureDoor(page);
  const slot = await startRaptureRun(page, 1);
  for (const order of ORDERS) await throughOrder(page, slot, isQuestion(order) ? order.control : null);
  await page.clock.resume();
}

/** The right phenomenon of each report of content.json, each report opening once the one above is solved. */
async function playStudy(page: Page): Promise<void> {
  const testimonies: { answer: number }[] = content.rooms.studio.testimonies;
  for (const [i, { answer }] of testimonies.entries()) {
    await page.locator(`[data-report="${i + 1}"] [data-option="${answer}"]`).click();
  }
}

/** The line of content.json: each white move square by square, then black's answer awaited on the board. */
async function playChess(page: Page): Promise<void> {
  const { fen, line } = content.rooms.scacchiera;
  const chess = new Chess(fen);
  for (const san of line as string[]) {
    const { color, piece, from, to } = chess.move(san);
    if (color === 'w') {
      await page.locator(`[data-square="${from}"]`).click();
      await page.locator(`[data-square="${to}"]`).click();
    } else {
      await expect(page.locator(`[data-piece="${piece}"][data-at="${to}"]`)).toHaveCount(1);
    }
  }
}

/** The secret book of content.json pulled from the shelf, then the one liar of the mystery accused again and
 *  again until the room takes it: a guess quicker than quickGuessSec is asked "Sicura?" first. Taken means his
 *  card marked or the wish up, because under quick() the beat lasts 1 ms and the card can be gone before a check
 *  sees its mark. */
async function playLibrary(page: Page): Promise<void> {
  const { secret, shelf, mystery } = content.rooms.biblioteca;
  await page.locator(`[data-square="${secret}"]`).click();
  await page.getByRole('button', { name: shelf.pull }).click();
  const liar = mystery.statements.find((statement: { id: string }) => statement.id === consistentLiars()[0]);
  const sheet = page.locator(`[data-statement="${liar.id}"]`);
  const taken = page.locator(`[data-statement="${liar.id}"][data-liar]`).or(wish(page));
  await expect(async () => {
    if ((await taken.count()) > 0) return;
    await sheet.getByRole('button', { name: liar.accuse }).click({ timeout: 1000 });
    await expect(taken.first()).toBeVisible({ timeout: 100 });
  }).toPass();
}

const quotes = Object.fromEntries(
  content.rooms['stanza-46'].suspects.map(({ id, quote }: { id: SuspectId; quote: string }) => [id, quote]),
) as Record<SuspectId, string>;
const crime = minuteOf(content.clues['time-0451'].label);

/** The first suspect, in board order, on whom this clue may be pinned. */
export const settledBy = (clue: Evidence): SuspectId => SUSPECT_IDS.find((id) => settles(clue, id, quotes, crime))!;

/** The suspect the three clues leave. */
export const CULPRIT: SuspectId = culprits(quotes, crime, new Set(EVIDENCE))[0];

export const evidence = (page: Page, clue: string) => page.locator(`[data-evidence="${clue}"]`);
export const suspect = (page: Page, id: string) => page.locator(`[data-suspect="${id}"]`);

/** A clue card pressed, then a suspect: the two clicks of decision 4. Returns once the card has landed in the
 *  suspect's slot when the suspect takes it. */
export async function pinClue(page: Page, clue: Evidence, on: SuspectId = settledBy(clue)): Promise<void> {
  await evidence(page, clue).click();
  await suspect(page, on).click();
  if (settles(clue, on, quotes, crime)) await expect(suspect(page, on).locator(`[data-evidence="${clue}"]`)).toBeVisible();
}

/** The end of the accusation thread pressed, then a suspect. */
export async function accuseSuspect(page: Page, on: SuspectId): Promise<void> {
  await page.locator('[data-thread]').click();
  await suspect(page, on).click();
}

/** Room 46: each clue pinned where it settles, then the culprit accused. */
async function playDeduction(page: Page): Promise<void> {
  for (const clue of EVIDENCE) await pinClue(page, clue);
  await accuseSuspect(page, CULPRIT);
}

export const play: Record<RoomId, (page: Page) => Promise<void>> = {
  studio: playStudy,
  scacchiera: playChess,
  biblioteca: playLibrary,
  rapture: playRapture,
  'stanza-46': playDeduction,
};

export async function solveRoom(page: Page, id: RoomId, how: 'play' | 'host' = 'play'): Promise<void> {
  await enterRoom(page, id);
  if (how === 'play') await play[id](page);
  else await page.keyboard.press('Control+Shift+KeyN');
  await continueWish(page);
  await expect(id === FINALE ? finale(page) : board(page)).toBeVisible();
}
