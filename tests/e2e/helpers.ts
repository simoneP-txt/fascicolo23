// E2E helpers: the content texts, a network cut that records every request outside the local server,
// a save written before the page loads, and the steps most tests repeat (opening the case, solving a
// placeholder room).
import { readFileSync } from 'node:fs';
import { expect, type BrowserContext, type Page } from '@playwright/test';
import { save, SAVE_KEY } from '../../src/engine/save';
import type { GameState } from '../../src/engine/state';

export const content = JSON.parse(readFileSync('content/content.json', 'utf8'));

/** The game of mockup 01: study and chessboard solved, their three clues found, one token spent. */
export const MOCKUP_01: GameState = { opened: true, solved: ['studio', 'scacchiera'], clues: ['rule', 'profile', 'g4'], tokens: 2 };

/** Writes this state as the save before the first load of the page in this tab, so the game starts from
 *  it and a reload keeps whatever the test did since. */
export async function seed(page: Page, state: GameState): Promise<void> {
  let saved = '';
  save(state, { getItem: () => null, setItem: (_key, value) => (saved = value), removeItem: () => {} });
  await page.addInitScript(
    ([key, value]) => {
      if (sessionStorage.getItem('e2e-seeded')) return;
      sessionStorage.setItem('e2e-seeded', '1');
      localStorage.setItem(key, value);
    },
    [SAVE_KEY, saved],
  );
}

/** Blocks every request outside the local server and returns the list of the blocked URLs. */
export async function offline(context: BrowserContext, baseURL: string): Promise<string[]> {
  const outside: string[] = [];
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(baseURL)) return route.continue();
    outside.push(url);
    return route.abort('internetdisconnected');
  });
  return outside;
}

/** A room's card on the board. */
export const door = (page: Page, id: string) => page.locator(`[data-door="${id}"]`);

export const board = (page: Page) => page.locator('[data-screen="board"]');

export const roomScreen = (page: Page, id: string) => page.locator(`[data-screen="room"][data-room="${id}"]`);

export async function openCase(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: content.ui.intro.yes }).click();
  await expect(board(page)).toBeVisible();
}

export async function enterRoom(page: Page, id: string): Promise<void> {
  await door(page, id).getByRole('button', { name: content.ui.enter }).click();
  await expect(roomScreen(page, id)).toBeVisible();
}

export async function solveRoom(page: Page, id: string): Promise<void> {
  await enterRoom(page, id);
  await page.getByRole('button', { name: content.rooms[id].placeholder.solve }).click();
  await expect(board(page)).toBeVisible();
}
