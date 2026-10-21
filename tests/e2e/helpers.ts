// E2E helpers: the content texts, a network cut that records every request outside the local server,
// and the steps most tests repeat (opening the case, solving a placeholder room).
import { readFileSync } from 'node:fs';
import { expect, type BrowserContext, type Page } from '@playwright/test';

export const content = JSON.parse(readFileSync('content/content.json', 'utf8'));

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
