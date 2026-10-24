// Epilogue e2e (mockup 12, the plan's decisions 10, 12, 13 and 22): once "Guarda la confessione?" has opened the
// video, the first focus of the window that follows a blur brings the epilogue, and a focus with no blur before it
// does not (Review Focus 1). At its real durations the scene opens on the finale's strings where the finale drew
// them; they fade while the red hedge grows, the walker comes in and the witness says the last line, in a bubble
// with no label. Once it is over the hedge's foot lies behind the waves, and the walker stands in front of the
// hedge, above the waves' crest. The app reopens on the epilogue once the video was opened, during the video as
// after the scene (Review Focus 5); only Ctrl+Shift+R starts again. The scene moves transform and opacity only.
// The button is pressed only with the network blocked: it opens the real video.
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { awayAndBack, content, epilogue, finale, FINISHED, offline, quick, seed, settled, watchButton } from './helpers';

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

  // It opens on the finale's strings, where the finale drew them, with hedge, walker and bubble still away: read in
  // the task of the focus itself, before the ink of the screen change has even come in.
  const opening = await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new Event('focus'));
    const screen = document.querySelector('[data-screen="epilogue"]');
    if (!screen) return null;
    const opacity = (selector: string) => getComputedStyle(screen.querySelector(selector)!).opacity;
    return {
      strings: [...screen.querySelectorAll('[data-string]')].map((path) => path.getAttribute('d')),
      opacity: { strings: opacity('[data-strings]'), hedge: opacity('[data-hedge]'), walker: opacity('[data-walker]'), bubble: opacity('.witness__bubble') },
    };
  });
  expect(opening).toEqual({ strings: drawn, opacity: { strings: '1', hedge: '0', walker: '0', bubble: '0' } });

  await expect(epilogue(page)).toHaveAttribute('data-done', '', { timeout: 10_000 });
  await expect(finale(page)).toHaveCount(0);
  expect(await scene(page)).toEqual({ strings: '0', hedge: '1', grown: 'none', walker: '1', bubble: '1' });
  await expect(line(page)).toHaveText(content.witness.epilogue);
  await expect(epilogue(page).getByText(content.ui.witnessLabel)).toBeHidden();
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
