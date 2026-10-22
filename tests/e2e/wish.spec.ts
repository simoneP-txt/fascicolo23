// Wish e2e, with the real durations: every fragment won arrives with the wish of mockup 13 and its sound.
// The wish moves only transform and opacity and shows "Continua?" only at its end; its click gives the
// board back once, with the bar of the fragment lifted off. A reset during the wish leaves nothing of it
// behind, and a fragment still missing carries no text on the board, whatever the wish shows. The wish
// comes with the board, as the screens swap under full ink, so no frame shows the bare board; where the page
// clock stands still the test runs it to the swap.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { board, content, continueWish, duration, enterRoom, fragment, played, recordPlays, settled, wish } from './helpers';

const yes = (page: Page) => page.getByRole('button', { name: content.ui.intro.yes });
const next = (page: Page) => page.getByRole('button', { name: content.ui.wish.continue });
const label = (n: number) => content.ui.wish.label.replace('{n}', String(n));

interface Frame {
  ink: number; // opacity of the host's ink layer
  board: boolean; // the board is on screen, no longer waiting hidden for the swap
  wish: boolean;
}

/** Every frame, in real time, from a press on this button until the wish is there (3 s at most). */
async function framesUntilWish(page: Page, button: Locator): Promise<Frame[]> {
  await settled(page);
  const frames = page.evaluate(
    () =>
      new Promise<Frame[]>((resolve) => {
        const app = document.querySelector('#app')!;
        const frames: Frame[] = [];
        const end = performance.now() + 3000;
        const frame = (now: number) => {
          const board = document.querySelector('[data-screen="board"]');
          const wish = !!document.querySelector('[data-wish]');
          frames.push({ ink: Number(getComputedStyle(app, '::after').opacity), board: !!board && !board.hasAttribute('data-incoming'), wish });
          if (wish || now > end) resolve(frames);
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
  await button.click();
  return frames;
}

test('every fragment arrives with the wish', async ({ page }) => {
  await recordPlays(page);
  await page.goto('/');
  await yes(page).click();
  await expect.poll(() => played(page, 'wish')).toBe(true);
  for (const text of [label(1), fragment('fascicolo'), content.ui.wish.from]) await expect(wish(page)).toContainText(text);
  await continueWish(page);
  await expect(board(page)).toBeVisible();

  await enterRoom(page, 'studio');
  await page.getByRole('button', { name: content.rooms.studio.placeholder.solve }).click();
  for (const text of [label(2), fragment('studio'), content.rooms.studio.from, content.clues.rule.label, content.clues.profile.label]) {
    await expect(wish(page)).toContainText(text);
  }
  const won = page.locator('[data-fragment="studio"]');
  await expect(won).toHaveAttribute('data-hidden'); // under its bar until the wish is over
  await continueWish(page);
  await expect(won).toHaveText(fragment('studio'));
  await expect(won).not.toHaveAttribute('data-hidden');
});

test('the wish moves only transform and opacity', async ({ page }) => {
  await page.goto('/');
  await yes(page).click();
  await expect(wish(page)).toBeVisible();
  await page.waitForTimeout(1000); // a quarter of the way in: the shooting star lands
  const moved = await page.evaluate(() =>
    document.getAnimations().map((animation) => (animation.effect as KeyframeEffect).getKeyframes().flatMap(Object.keys)),
  );
  expect(moved.length).toBeGreaterThan(0);
  const allowed = ['transform', 'opacity', 'offset', 'computedOffset', 'easing', 'composite'];
  expect(moved.flat().filter((property) => !allowed.includes(property))).toEqual([]);
});

test('"Continua?" waits for the end of the wish', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  const length = await duration(page, '--duration-wish');
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
  await yes(page).click();
  await page.clock.runFor(await duration(page, '--duration-dip')); // the swap, under full ink
  await expect(wish(page)).toBeAttached();
  await page.clock.runFor(1000);
  await expect(next(page)).toBeHidden();
  await page.clock.runFor(length - 1001);
  await expect(next(page)).toBeHidden();
  await page.clock.runFor(1);
  await expect(next(page)).toBeVisible();
});

test('no frame shows the board between the ink and the wish', async ({ page }) => {
  await page.goto('/');
  const opening = await framesUntilWish(page, yes(page));
  await continueWish(page);
  await enterRoom(page, 'studio');
  const study = await framesUntilWish(page, page.getByRole('button', { name: content.rooms.studio.placeholder.solve }));
  for (const frames of [opening, study]) {
    expect(frames.at(-1)!.wish).toBe(true);
    expect(frames.filter((frame) => frame.board && !frame.wish && frame.ink < 1)).toEqual([]);
  }
});

test('a double click on "Continua?" reveals the board once', async ({ page }) => {
  await page.goto('/');
  await yes(page).click();
  await next(page).dblclick();
  await expect(wish(page)).toHaveCount(0);
  await expect(page.locator('[data-screen="board"]')).toHaveCount(1);
  await expect(page.locator('[data-fragment="fascicolo"]')).toHaveText(fragment('fascicolo'));
});

test('Ctrl+Shift+R during the wish leads to a clean opening', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await yes(page).click();
  await expect(wish(page)).toBeVisible();
  await page.keyboard.press('Control+Shift+KeyR');
  await page.getByRole('button', { name: content.ui.reset.yes }).click();
  await expect(page.getByRole('heading', { name: content.ui.intro.question })).toBeVisible();
  await expect(wish(page)).toHaveCount(0);
  // The timer of the wish that left fires into nothing.
  await page.clock.runFor(await duration(page, '--duration-wish'));
  await expect(wish(page)).toHaveCount(0);
  await expect(next(page)).toHaveCount(0);
  await expect(page.locator('[data-screen="intro"]')).toBeVisible();
});

test('missing fragments carry no text', async ({ page }) => {
  await page.goto('/');
  await yes(page).click();
  const bars = page.locator('[data-fragment][data-hidden]');
  await expect(bars).toHaveCount(content.link.length); // "youtu.be/" too, under its bar during the wish
  for (const bar of await bars.all()) await expect(bar).toHaveText('');
  await continueWish(page);
  await expect(bars).toHaveCount(content.link.length - 1);
  for (const bar of await bars.all()) await expect(bar).toHaveText('');
});
