// E2E play: how a test solves each room, and solveRoom(), which enters a room from the board, solves it and
// closes the wish. A room is solved by playing it, with the answers taken from content.json, or by the host's
// Ctrl+Shift+N for the tests that prove the engine. The chessboard plays its line; the rooms still waiting
// for phase 4 press their placeholder's solve button, until each one replaces its entry with the real game.
import { expect, type Page } from '@playwright/test';
import { Chess } from 'chess.js';
import type { RoomId } from '../../src/engine/types';
import { board, content, continueWish, enterRoom } from './helpers';

const pressSolve = (id: RoomId) => (page: Page) => page.getByRole('button', { name: content.rooms[id].placeholder.solve }).click();

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

export const play: Record<RoomId, (page: Page) => Promise<void>> = {
  studio: pressSolve('studio'),
  scacchiera: playChess,
  biblioteca: pressSolve('biblioteca'),
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
