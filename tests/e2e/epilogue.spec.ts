// Epilogue e2e (mockup 12, the plan's decisions 10, 12, 13 and 22 of phase 5, 20 and 21 of phase 6): once "Guarda
// la confessione?" has opened the video, the first focus of the window that follows a blur brings the epilogue,
// --duration-return later, and a focus with no blur before it does not (Review Focus 1). At its real durations the
// scene opens on the finale's strings where the finale drew them; they fade while the red hedge grows, the walker
// comes in and the witness says the last line, in a bubble with no label. Once it is over the hedge's foot lies
// behind the waves, and the walker stands in front of the hedge, above the waves' crest. --duration-epilogue-exit
// after the scene "Torna alla lavagna?" and "Azzera partita?" come up bottom right, clear of the scene, at the three
// sizes: the first leads to the board, whose Room 46 door plays the epilogue again, the second asks before it wipes
// the case. The app reopens on the epilogue once the video was opened, during the video as after the scene and
// after the board (Review Focus 5). The scene moves transform and opacity only. The button is pressed only with the
// network blocked: it opens the real video.
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { load, SAVE_KEY } from '../../src/engine/save';
import { ROOM_IDS } from '../../src/engine/types';
import {
  awayAndBack,
  board,
  content,
  door,
  duration,
  epilogue,
  finale,
  FINISHED,
  offline,
  quick,
  seed,
  settled,
  watchButton,
} from './helpers';

const line = (page: Page) => page.locator('[data-witness] .witness__line');

/** The finale reopened from a save, its button pressed with the network blocked: the video is open. */
async function watchVideo(page: Page, context: BrowserContext, baseURL: string): Promise<void> {
  await offline(context, baseURL);
  await seed(page, FINISHED);
  await page.goto('/');
  await settled(page);
  await watchButton(page).click();
  await expect(watchButton(page)).toHaveAttribute('aria-disabled', 'true');
}

/** The opacity of each part of the scene, and the hedge's transform. */
const scene = (page: Page) =>
  epilogue(page).evaluate((screen) => {
    const style = (selector: string) => getComputedStyle(screen.querySelector(selector)!);
    return {
      strings: style('[data-strings]').opacity,
      hedge: style('[data-hedge]').opacity,
      grown: style('[data-hedge]').transform,
      walker: style('[data-walker]').opacity,
      bubble: style('.witness__bubble').opacity,
    };
  });

test('back from the browser, the strings spread into the red block and the witness says the last line', async ({
  context,
  page,
  baseURL,
}) => {
  await watchVideo(page, context, baseURL!);
  const drawn = await finale(page)
    .locator('[data-string]')
    .evaluateAll((paths) => paths.map((path) => path.getAttribute('d')));

  // It opens on the finale's strings, where the finale drew them, with hedge, walker and bubble still away: read as
  // the epilogue joins the stage, once the finale's hold is over, before the ink of the screen change has come in.
  const opening = await page.evaluate(
    () =>
      new Promise((resolve) => {
        new MutationObserver((_, observer) => {
          const screen = document.querySelector('[data-screen="epilogue"]');
          if (!screen) return;
          observer.disconnect();
          const opacity = (selector: string) => getComputedStyle(screen.querySelector(selector)!).opacity;
          resolve({
            strings: [...screen.querySelectorAll('[data-string]')].map((path) => path.getAttribute('d')),
            opacity: { strings: opacity('[data-strings]'), hedge: opacity('[data-hedge]'), walker: opacity('[data-walker]'), bubble: opacity('.witness__bubble') },
          });
        }).observe(document.body, { childList: true, subtree: true });
        window.dispatchEvent(new Event('blur'));
        window.dispatchEvent(new Event('focus'));
      }),
  );
  expect(opening).toEqual({ strings: drawn, opacity: { strings: '1', hedge: '0', walker: '0', bubble: '0' } });

  await expect(epilogue(page)).toHaveAttribute('data-done', '', { timeout: 10_000 });
  await expect(finale(page)).toHaveCount(0);
  expect(await scene(page)).toEqual({ strings: '0', hedge: '1', grown: 'none', walker: '1', bubble: '1' });
  await expect(line(page)).toHaveText(content.witness.epilogue);
  await expect(epilogue(page).getByText(content.ui.witnessLabel)).toBeHidden();
});

test('back from the browser, the finale holds before the epilogue starts', async ({ context, page, baseURL }) => {
  await watchVideo(page, context, baseURL!);
  const hold = await duration(page, '--duration-return');
  // Timed in the page from the focus: what stands on the stage 300 ms before the hold ends, and when the scene starts.
  const timing = await page.evaluate(
    (early) =>
      new Promise<{ before: string[]; play: number }>((resolve) => {
        const screens = () => [...document.querySelectorAll('[data-screen]')].map((screen) => screen.getAttribute('data-screen')!);
        let before: string[] = [];
        const start = performance.now();
        new MutationObserver((_, observer) => {
          if (!document.querySelector('[data-screen="epilogue"][data-play]')) return;
          observer.disconnect();
          resolve({ before, play: performance.now() - start });
        }).observe(document.body, { attributes: true, attributeFilter: ['data-play'], subtree: true });
        window.dispatchEvent(new Event('blur'));
        window.dispatchEvent(new Event('focus'));
        setTimeout(() => (before = screens()), early);
      }),
    hold - 300,
  );
  expect(timing.before).toEqual(['finale']);
  expect(timing.play).toBeGreaterThanOrEqual(hold);
});

test('a finale wiped during its hold brings no epilogue', async ({ context, page, baseURL }) => {
  await watchVideo(page, context, baseURL!);
  const hold = await duration(page, '--duration-return');
  await awayAndBack(page);
  await page.keyboard.press('Control+Shift+KeyR');
  await settled(page);
  await page.getByRole('button', { name: content.ui.reset.yes }).click();
  await expect(page.getByRole('heading', { name: content.ui.intro.question })).toBeVisible();
  await page.waitForTimeout(hold); // past the end of the hold, wherever the wipe fell in it
  await expect(epilogue(page)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: content.ui.intro.question })).toBeVisible();
});

/** The scene once it is over, in window pixels: the boxes of hedge and walker, the waves' crest (the highest line
 *  any wave reaches as it sways, the top of its outline whatever its phase) and, at a few points, which drawing of
 *  the scene lies on top there. */
async function standing(page: Page) {
  await quick(page);
  await seed(page, { ...FINISHED, watched: true });
  await page.goto('/');
  await expect(epilogue(page)).toHaveAttribute('data-done', '');
  await settled(page);
  return epilogue(page).evaluate((screen) => {
    const box = (selector: string) => {
      const { left, top, right, bottom } = screen.querySelector(selector)!.getBoundingClientRect();
      return { left, top, right, bottom };
    };
    const hedge = box('[data-hedge]');
    const walker = box('[data-walker]');
    const waves = [...screen.querySelectorAll('[data-wave] path')];
    const crest = Math.min(...waves.map((path) => path.getBoundingClientRect().top));
    // The topmost shape drawn at a point. An inline svg's box takes the pointer over its empty corners too, so
    // elementFromPoint names a wave's box well above the wave; a shape takes it only where it paints.
    const part = (x: number, y: number) => {
      const shape = document.elementsFromPoint(x, y).find((node) => node instanceof SVGGeometryElement);
      if (shape?.closest('[data-wave]')) return 'wave';
      if (shape?.closest('[data-walker]')) return 'walker';
      if (shape?.closest('[data-hedge]')) return 'hedge';
      return shape?.parentElement?.getAttribute('class') ?? 'nothing';
    };
    const middle = (hedge.left + hedge.right) / 2;
    return {
      hedge,
      walker,
      crest,
      on: {
        base: part(middle, hedge.bottom - 1),
        aboveCrest: part(middle, crest - 2),
        walker: part((walker.left + walker.right) / 2, (walker.top + walker.bottom) / 2),
      },
    };
  });
}

test('the hedge grows out of the blue hills', async ({ page }) => {
  const { on } = await standing(page);
  // Its base lies behind the waves, and just over their crest the hedge stands in plain view.
  expect(on.base).toBe('wave');
  expect(on.aboveCrest).toBe('hedge');
});

test('the walker stands in front of the hedge, above the hills', async ({ page }) => {
  const { hedge, walker, crest, on } = await standing(page);
  expect(walker.left).toBeGreaterThanOrEqual(hedge.left);
  expect(walker.right).toBeLessThanOrEqual(hedge.right);
  expect(walker.top).toBeGreaterThanOrEqual(hedge.top);
  expect(walker.bottom).toBeLessThanOrEqual(hedge.bottom);
  expect(walker.bottom).toBeLessThan(crest);
  expect(on.walker).toBe('walker');
});

test('a focus with no blur leaves the finale on screen', async ({ context, page, baseURL }) => {
  await quick(page);
  await watchVideo(page, context, baseURL!);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(epilogue(page)).toHaveCount(0);
  await expect(finale(page)).toBeVisible();

  // The wait goes on, and a second round of blur and focus brings no second scene.
  await awayAndBack(page);
  await expect(epilogue(page)).toHaveAttribute('data-done', '');
  await epilogue(page).evaluate((screen) => (screen.dataset.e2eFirst = ''));
  await awayAndBack(page);
  await expect(page.locator('[data-screen="epilogue"][data-e2e-first]')).toHaveCount(1);
  await expect(epilogue(page)).toHaveCount(1);
});

test('the app reopens on the epilogue', async ({ context, page, baseURL }) => {
  await quick(page);
  await watchVideo(page, context, baseURL!);
  await page.reload(); // closed while the video plays
  await expect(epilogue(page)).toHaveAttribute('data-done', '');
  await expect(line(page)).toHaveText(content.witness.epilogue);
  await page.reload(); // closed once the scene is over
  await expect(epilogue(page)).toHaveAttribute('data-done', '');
  await expect(finale(page)).toHaveCount(0);
});

test('Ctrl+Shift+R on the epilogue leads to a clean opening', async ({ page }) => {
  await quick(page);
  await seed(page, { ...FINISHED, watched: true });
  await page.goto('/');
  await expect(epilogue(page)).toHaveAttribute('data-done', '');
  await page.keyboard.press('Control+Shift+KeyN');
  await page.keyboard.press('Control+Shift+KeyH');
  await expect(epilogue(page)).toBeVisible();
  await expect(page.locator('[data-wish], [data-hint]')).toHaveCount(0);
  await page.keyboard.press('Control+Shift+KeyR');
  await page.getByRole('button', { name: content.ui.reset.yes }).click();
  await expect(page.getByRole('heading', { name: content.ui.intro.question })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: content.ui.intro.question })).toBeVisible();
});

test('the scene moves only transform and opacity', async ({ page }) => {
  await seed(page, { ...FINISHED, watched: true });
  await page.goto('/');
  await expect(epilogue(page)).toHaveAttribute('data-play', '');
  // Every animation of the scene, those still waiting for their turn included, with the parts they move.
  const parts = ['[data-strings]', '[data-hedge]', '[data-walker]', '.witness__bubble'];
  const animations = await epilogue(page).evaluate(
    (screen, parts) =>
      screen.getAnimations({ subtree: true }).map((animation) => {
        const effect = animation.effect as KeyframeEffect;
        const target = effect.target as Element;
        return {
          part: parts.find((selector) => target.closest(selector)) ?? target.className.toString(),
          keys: [...new Set(effect.getKeyframes().flatMap((frame) => Object.keys(frame)))],
        };
      }),
    parts,
  );
  for (const part of parts) expect(animations.map((animation) => animation.part)).toContain(part);
  // A keyframe also lists its offsets, easing and composite operation, which move nothing.
  const moved = new Set(animations.flatMap((animation) => animation.keys));
  for (const key of ['offset', 'computedOffset', 'easing', 'composite']) moved.delete(key);
  expect([...moved].sort()).toEqual(['opacity', 'transform']);
});

// The ways out of the epilogue (decision 21): "Torna alla lavagna?" and "Azzera partita?", once the scene has rested.

const backButton = (page: Page) => page.getByRole('button', { name: content.ui.back });
const resetButton = (page: Page) => page.getByRole('button', { name: content.ui.reset.button });

/** The epilogue the app reopens on once the video was opened, its two buttons up and the stage taking clicks. */
async function exits(page: Page): Promise<void> {
  await quick(page);
  await seed(page, { ...FINISHED, watched: true });
  await page.goto('/');
  await expect(epilogue(page)).toHaveAttribute('data-exits', '');
  await settled(page);
}

type Box = { x: number; y: number; width: number; height: number };
const meets = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const SIZES = [
  [1707, 1067, 1.5],
  [1920, 1080, 1],
  [1366, 768, 1],
] as const;

for (const [width, height, deviceScaleFactor] of SIZES) {
  test.describe(`${width}x${height}`, () => {
    test.use({ viewport: { width, height }, deviceScaleFactor });

    test('the epilogue offers the board and the reset once its scene has rested', async ({ page }) => {
      await seed(page, { ...FINISHED, watched: true });
      await page.goto('/');
      await expect(epilogue(page)).toHaveAttribute('data-play', '');
      const rest = await duration(page, '--duration-epilogue-exit');
      // Timed in the page from data-done: the buttons on the screen at that moment, and when the first one comes.
      const timing = await epilogue(page).evaluate(
        (screen) =>
          new Promise<{ atDone: number; came: number } | null>((resolve) => {
            if (screen.hasAttribute('data-done')) return resolve(null); // too late to time it
            let done = 0;
            let atDone = 0;
            new MutationObserver((_, observer) => {
              if (!done && screen.hasAttribute('data-done')) {
                done = performance.now();
                atDone = screen.querySelectorAll('button').length;
              }
              if (!done || !screen.querySelector('button')) return;
              observer.disconnect();
              resolve({ atDone, came: performance.now() - done });
            }).observe(screen, { attributes: true, childList: true, subtree: true });
          }),
      );
      expect(timing).not.toBeNull();
      expect(timing!.atDone).toBe(0);
      expect(timing!.came).toBeGreaterThanOrEqual(rest - 1); // the timer starts as data-done is set, a hair earlier
      expect(timing!.came).toBeLessThan(rest + 1000);

      await expect(epilogue(page)).toHaveAttribute('data-exits', '');
      const stage = (await page.locator('#stage').boundingBox())!;
      const parts = ['[data-hedge]', '[data-walker]', '[data-witness] .witness__bubble', '[data-witness] .witness__figure'];
      for (const button of [backButton(page), resetButton(page)]) {
        await expect(button).toBeVisible();
        const box = (await button.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(stage.x);
        expect(box.y).toBeGreaterThanOrEqual(stage.y);
        expect(box.x + box.width).toBeLessThanOrEqual(stage.x + stage.width);
        expect(box.y + box.height).toBeLessThanOrEqual(stage.y + stage.height);
        for (const part of parts) {
          const other = (await epilogue(page).locator(part).boundingBox())!;
          expect(meets(box, other), `${await button.textContent()} meets ${part}`).toBe(false);
        }
      }
    });
  });
}

test('"Torna alla lavagna?" leads to the board, whose Room 46 door plays the epilogue again', async ({ page }) => {
  await exits(page);
  await backButton(page).click();
  await expect(board(page)).toBeVisible();
  await expect(epilogue(page)).toHaveCount(0);
  // Every door solved and the link whole; only Room 46's door offers "Entra?", beside its stamp.
  await expect(board(page).locator('[data-door]')).toHaveCount(ROOM_IDS.length);
  await expect(board(page).locator('[data-door].door--solved')).toHaveCount(ROOM_IDS.length);
  await expect(board(page).locator('.board__link .label')).toHaveText(content.ui.link.done);
  await expect(board(page).locator('.board__link [data-hidden]')).toHaveCount(0);
  const enter = board(page).getByRole('button', { name: content.ui.enter });
  await expect(enter).toHaveCount(1);
  await expect(door(page, 'stanza-46').getByRole('button', { name: content.ui.enter })).toBeVisible();
  await expect(door(page, 'stanza-46').getByText(content.ui.solved)).toBeVisible();

  await settled(page);
  await enter.click();
  await expect(epilogue(page)).toHaveAttribute('data-play', '');
  await expect(epilogue(page)).toHaveAttribute('data-done', '');
  await expect(line(page)).toHaveText(content.witness.epilogue);
  await expect(epilogue(page)).toHaveAttribute('data-exits', '');
  await expect(backButton(page)).toBeVisible();
  await expect(resetButton(page)).toBeVisible();
  await expect(board(page)).toHaveCount(0);
});

test('"Azzera partita?" on the epilogue asks first, and "Sì, azzera?" wipes the case', async ({ page }) => {
  await exits(page);
  const saved = () => page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  const before = await saved();

  await resetButton(page).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: content.ui.reset.no }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(epilogue(page)).toBeVisible();
  expect(await saved()).toBe(before);
  expect(load(content.tokens, { getItem: () => before, setItem: () => {}, removeItem: () => {} }).watched).toBe(true);

  await settled(page);
  await resetButton(page).click();
  await page.getByRole('button', { name: content.ui.reset.yes }).click();
  await expect(page.getByRole('heading', { name: content.ui.intro.question })).toBeVisible();
  expect(await saved()).toBeNull();
});

test('the app reopened on the epilogue offers the same buttons', async ({ page }) => {
  await exits(page);
  await page.reload(); // closed on the epilogue
  await expect(epilogue(page)).toHaveAttribute('data-done', '');
  await expect(epilogue(page)).toHaveAttribute('data-exits', '');
  await expect(backButton(page)).toBeVisible();
  await expect(resetButton(page)).toBeVisible();

  await settled(page);
  await backButton(page).click();
  await expect(board(page)).toBeVisible();
  await page.reload(); // closed on the board it led to
  await expect(epilogue(page)).toHaveAttribute('data-exits', '');
  await expect(backButton(page)).toBeVisible();
  await expect(resetButton(page)).toBeVisible();
});
