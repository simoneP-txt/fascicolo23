// Meme e2e, with the real durations: a meme comes over the room with its caption in Anton and leaves by
// itself after --duration-meme; the confirmed "Apri la porta?" consoles before the wish and the board. While
// a meme shows it takes every click on the stage, a second meme replaces it, and a screen change takes it
// away with the old screen. The memes of a wrong answer come from wrong books of the library, in the game of
// mockup 01; a video meme comes from Room 46's blind accusations, and leaves by itself even when its clip cannot
// play. Where the page clock stands still, the test runs it through each screen change.
import { expect, test, type Page } from '@playwright/test';
import { BEFORE_46, board, consolation, content, continueWish, duration, enterRoom, MOCKUP_01, roomScreen, seed, throughChange } from './helpers';
import { accuseSuspect } from './play';

const meme = (page: Page) => page.locator('[data-meme]');
const skipButton = (page: Page) => page.getByRole('button', { name: content.ui.skip.button });
const square = (page: Page, at: string) => page.locator(`[data-square="${at}"]`);
const pull = (page: Page) => page.getByRole('button', { name: content.rooms.biblioteca.shelf.pull });

/** The library in the game of mockup 01; with clock, the page clock is installed first and stands still once
 *  the room is on screen. */
async function library(page: Page, clock = false): Promise<void> {
  if (clock) await page.clock.install();
  await seed(page, MOCKUP_01);
  await page.goto('/');
  await enterRoom(page, 'biblioteca');
  if (clock) await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
}

/** A wrong book chosen and pulled: it shows the shelf meme. */
async function wrongBook(page: Page, at: string): Promise<void> {
  await square(page, at).click();
  await pull(page).click();
}

test('a wrong answer shows a meme that leaves by itself', async ({ page }) => {
  await library(page);
  await wrongBook(page, 'a8');
  const caption = meme(page).getByText(content.memes.shelf.text);
  await expect(caption).toBeVisible();
  await expect(caption).toHaveCSS('font-family', /^Anton\b/);
  await expect(meme(page)).toHaveCount(0, { timeout: (await duration(page, '--duration-meme')) + 1000 });
  await expect(roomScreen(page, 'biblioteca')).toBeVisible();
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
  await library(page, true);
  const [back, shown] = [await duration(page, '--duration-pull'), await duration(page, '--duration-meme')];
  await wrongBook(page, 'a8');
  await expect(meme(page)).toBeVisible();
  await page.clock.runFor(back); // the book is back on its shelf
  // The overlay takes the clicks, but the focused buttons still answer the keyboard: another wrong book.
  await square(page, 'b8').press('Space');
  await pull(page).press('Space');
  await expect(meme(page)).toHaveCount(1);
  await page.clock.runFor(shown - back); // the first meme would leave now; the second one stays
  await expect(meme(page)).toHaveCount(1);
  await page.clock.runFor(back);
  await expect(meme(page)).toHaveCount(0);
  await expect(roomScreen(page, 'biblioteca')).toBeVisible();
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

test(`the caption's outline lies under its letters`, async ({ page }) => {
  await library(page, true); // the meme stays until the test is done
  await wrongBook(page, 'a8');
  await expect(meme(page).locator('figure')).toHaveCSS('transform', 'none'); // the zoom has landed
  const outlined = await page.screenshot();
  await meme(page).locator('figcaption').evaluate((node) => node.style.setProperty('-webkit-text-stroke-width', '0px'));
  const bare = await page.screenshot();
  // The pixels the bare letters cover in full, white (nothing else is, under the veil), and those of them that
  // the outline turns dark. Stroked text is drawn as paths and bare text from the glyph cache, so a few edge
  // pixels lose a little white either way, but none turns dark.
  const [letters, darkened] = await page.evaluate(
    async (shots) => {
      const [withOutline, without] = await Promise.all(
        shots.map(async (base64) => {
          const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
          const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
          const context = new OffscreenCanvas(image.width, image.height).getContext('2d')!;
          context.drawImage(image, 0, 0);
          return context.getImageData(0, 0, image.width, image.height).data;
        }),
      );
      const all = (data: Uint8ClampedArray, i: number, test: (value: number) => boolean) => [0, 1, 2].every((c) => test(data[i + c]));
      let [letters, darkened] = [0, 0];
      for (let i = 0; i < without.length; i += 4) {
        if (!all(without, i, (value) => value >= 250)) continue;
        letters++;
        if (all(withOutline, i, (value) => value < 128)) darkened++;
      }
      return [letters, darkened];
    },
    [outlined.toString('base64'), bare.toString('base64')],
  );
  expect(letters).toBeGreaterThan(0);
  expect(darkened).toBe(0);
});

test('a video meme whose clip cannot play still leaves by itself', async ({ page }) => {
  await page.route(`**/${content.memes.getHelp.video}`, (route) => route.fulfill({ status: 404 }));
  await page.clock.install();
  await seed(page, BEFORE_46);
  await page.goto('/');
  await enterRoom(page, 'stanza-46');
  const room = content.rooms['stanza-46'];
  const [fly, shown] = [await duration(page, '--duration-fly'), await duration(page, '--duration-meme')];
  for (let n = 1; n <= room.blindTries; n++) {
    await accuseSuspect(page, 'diva');
    if (n === room.blindTries) await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
    else await expect(page.locator('[data-thread][data-flying]')).toHaveCount(0);
  }
  await expect(meme(page).locator('video')).toHaveCount(1);
  await page.clock.runFor(fly); // the thread is back on its pin
  await expect(meme(page)).toHaveCount(1);
  await page.clock.runFor(shown);
  await expect(meme(page)).toHaveCount(0);
  // The help clock runs again: the way out comes after skipAfterSec, the time spent so far included.
  await page.clock.runFor(room.help.skipAfterSec * 1000);
  await expect(page.getByRole('button', { name: room.skip.button })).toBeVisible();
});
