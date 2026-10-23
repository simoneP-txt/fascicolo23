// E2E play: how a test solves each room, and solveRoom(), which enters a room from the board, solves it and
// closes the wish. A room is solved by playing it, with the answers taken from content.json, or by the host's
// Ctrl+Shift+N for the tests that prove the engine. The study picks the right phenomenon of each report, the
// chessboard plays its line, the library pulls its secret book and accuses the liar of liar.ts until the room
// takes the answer; the rooms still waiting for phase 4 press their placeholder's solve button, until each
// one replaces its entry with the real game.
import { expect, type Page } from '@playwright/test';
import { Chess } from 'chess.js';
import type { RoomId } from '../../src/engine/types';
import { consistentLiars } from '../../src/rooms/biblioteca/liar';
import { board, content, continueWish, enterRoom, wish } from './helpers';

const pressSolve = (id: RoomId) => (page: Page) => page.getByRole('button', { name: content.rooms[id].placeholder.solve }).click();

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

export const play: Record<RoomId, (page: Page) => Promise<void>> = {
  studio: playStudy,
  scacchiera: playChess,
  biblioteca: playLibrary,
  rapture: pressSolve('rapture'),
  'stanza-46': pressSolve('stanza-46'),
};

export async function solveRoom(page: Page, id: RoomId, how: 'play' | 'host' = 'play'): Promise<void> {
  await enterRoom(page, id);
  if (how === 'play') await play[id](page);
  else await page.keyboard.press('Control+Shift+KeyN');
  await continueWish(page);
  await expect(board(page)).toBeVisible();
}
