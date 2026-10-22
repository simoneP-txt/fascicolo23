// E2E play: how a test solves each room, and solveRoom(), which enters a room from the board, solves it and
// closes the wish. A room is solved by playing it, or by the host's Ctrl+Shift+N for the tests that prove
// the engine. Every room is still a placeholder, so playing it presses its solve button; each room of
// phase 4 replaces its entry with the real game.
import { expect, type Page } from '@playwright/test';
import type { RoomId } from '../../src/engine/types';
import { board, content, continueWish, enterRoom } from './helpers';

const pressSolve = (id: RoomId) => (page: Page) => page.getByRole('button', { name: content.rooms[id].placeholder.solve }).click();

export const play: Record<RoomId, (page: Page) => Promise<void>> = {
  studio: pressSolve('studio'),
  scacchiera: pressSolve('scacchiera'),
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
