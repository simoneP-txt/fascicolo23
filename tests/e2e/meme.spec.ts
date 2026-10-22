// Meme e2e, with the real durations: a meme comes over the room with its caption in Anton and leaves by
// itself after --duration-meme; the confirmed "Apri la porta?" consoles before the board comes back. While
// a meme shows it takes every click on the stage, a second meme replaces it, and a screen change takes it
// away with the old screen.
import { expect, test, type Page } from '@playwright/test';
import { parseDuration } from '../../src/ui/dom';
import { board, content, enterRoom, roomScreen, seed } from './helpers';

const meme = (page: Page) => page.locator('[data-meme]');
const skipButton = (page: Page) => page.getByRole('button', { name: content.ui.skip.button });

/** --duration-meme as the page reads it, in ms. */
async function memeDuration(page: Page): Promise<number> {
  return parseDuration(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--duration-meme')));
}

/** The study, with the case open and nothing solved. */
async function study(page: Page): Promise<void> {
  await seed(page, { opened: true, solved: [], clues: [], tokens: content.tokens });
  await page.goto('/');
  await enterRoom(page, 'studio');
}

/** "Apri la porta?" offered in the study and confirmed. The page clock stands still from the confirmation
 *  on, so the consolation meme stays on screen until the test runs the clock. */
async function consolation(page: Page): Promise<void> {
  await page.clock.install();
  await study(page);
  await page.clock.runFor(content.rooms.studio.help.skipAfterSec * 1000);
  await skipButton(page).click();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
  await page.getByRole('button', { name: content.ui.skip.yes }).click();
  await expect(meme(page)).toBeVisible();
}

test('a wrong answer shows a meme that leaves by itself', async ({ page }) => {
  await study(page);
  await page.getByRole('button', { name: content.rooms.studio.placeholder.error }).click();
  const caption = meme(page).getByText(content.memes.error.text);
  await expect(caption).toBeVisible();
  await expect(caption).toHaveCSS('font-family', /^Anton\b/);
  await expect(meme(page)).toHaveCount(0, { timeout: (await memeDuration(page)) + 1000 });
  await expect(roomScreen(page, 'studio')).toBeVisible();
});

test('"Apri la porta?" consoles before it opens', async ({ page }) => {
  await consolation(page);
  await expect(meme(page)).toHaveText(content.memes.consolation.text);
  await expect(roomScreen(page, 'studio')).toBeVisible();
  await page.clock.runFor(await memeDuration(page));
  await expect(board(page)).toBeVisible();
  await expect(page.locator('[data-fragment="studio"]')).toHaveText('71');
});

test('a meme takes every click, so the skip cannot be confirmed twice', async ({ page }) => {
  await consolation(page);
  const box = (await skipButton(page).boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('a second meme replaces the first, and then it leaves too', async ({ page }) => {
  await study(page);
  const wrong = page.getByRole('button', { name: content.rooms.studio.placeholder.error });
  await wrong.click();
  await expect(meme(page)).toBeVisible();
  await wrong.press('Space'); // the overlay takes the clicks, but the focused button still answers the keyboard
  await expect(meme(page)).toHaveCount(1);
  await expect(meme(page)).toHaveCount(0, { timeout: (await memeDuration(page)) + 1000 });
  await expect(roomScreen(page, 'studio')).toBeVisible();
});

test('a screen change during a meme leaves no overlay behind', async ({ page }) => {
  await consolation(page);
  await page.keyboard.press('Control+Shift+KeyN');
  await expect(board(page)).toBeVisible();
  await expect(meme(page)).toHaveCount(0);
  await page.clock.runFor(await memeDuration(page));
  await expect(meme(page)).toHaveCount(0);
  await expect(page.locator('[data-fragment="studio"]')).toHaveText('71');
});
