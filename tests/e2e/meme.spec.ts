// Meme e2e, with the real durations: a meme comes over the room with its caption in Anton and leaves by
// itself after --duration-meme; the confirmed "Apri la porta?" consoles before the wish and the board. While
// a meme shows it takes every click on the stage, a second meme replaces it, and a screen change takes it
// away with the old screen. Where the page clock stands still, the test runs it through each screen change.
import { expect, test, type Page } from '@playwright/test';
import { board, consolation, content, continueWish, duration, enterRoom, roomScreen, seed, throughChange } from './helpers';

const meme = (page: Page) => page.locator('[data-meme]');
const skipButton = (page: Page) => page.getByRole('button', { name: content.ui.skip.button });

/** The study, with the case open and nothing solved. */
async function study(page: Page): Promise<void> {
  await seed(page, { opened: true, solved: [], clues: [], tokens: content.tokens });
  await page.goto('/');
  await enterRoom(page, 'studio');
}

test('a wrong answer shows a meme that leaves by itself', async ({ page }) => {
  await study(page);
  await page.getByRole('button', { name: content.rooms.studio.placeholder.error }).click();
  const caption = meme(page).getByText(content.memes.error.text);
  await expect(caption).toBeVisible();
  await expect(caption).toHaveCSS('font-family', /^Anton\b/);
  await expect(meme(page)).toHaveCount(0, { timeout: (await duration(page, '--duration-meme')) + 1000 });
  await expect(roomScreen(page, 'studio')).toBeVisible();
});

test('"Apri la porta?" consoles before it opens', async ({ page }) => {
  await consolation(page);
  await expect(meme(page)).toHaveText(content.memes.consolation.text);
  await expect(roomScreen(page, 'studio')).toBeVisible();
  await page.clock.runFor(await duration(page, '--duration-meme'));
  // The meme's own timer asked for the board, and the fake clock runs the zero-delay timer that starts the
  // dip's countdown one tick later, as it does with any such timer set from inside a timer.
  await page.clock.runFor(1);
  await throughChange(page);
  await expect(board(page)).toBeVisible();
  await page.clock.runFor(await duration(page, '--duration-wish'));
  await continueWish(page);
  await expect(page.locator('[data-fragment="studio"]')).toHaveText('71');
});

test('a meme takes every click, so the skip cannot be confirmed twice', async ({ page }) => {
  await consolation(page);
  // Past the click guard set as the meme came in, the meme itself takes the click.
  await page.clock.runFor(await duration(page, '--duration-hush'));
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
  await expect(meme(page)).toHaveCount(0, { timeout: (await duration(page, '--duration-meme')) + 1000 });
  await expect(roomScreen(page, 'studio')).toBeVisible();
});

test('a screen change during a meme leaves no overlay behind', async ({ page }) => {
  await consolation(page);
  await page.keyboard.press('Control+Shift+KeyN');
  await throughChange(page);
  await expect(board(page)).toBeVisible();
  await expect(meme(page)).toHaveCount(0);
  await page.clock.runFor(await duration(page, '--duration-meme'));
  await expect(meme(page)).toHaveCount(0);
  await page.clock.runFor(await duration(page, '--duration-wish'));
  await continueWish(page);
  await expect(page.locator('[data-fragment="studio"]')).toHaveText('71');
});
