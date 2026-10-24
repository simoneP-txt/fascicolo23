// Epilogue e2e (mockup 12, the plan's decisions 10, 12 and 13): once "Guarda la confessione?" has opened the video,
// the first focus of the window that follows a blur brings the epilogue, and a focus with no blur before it does not
// (Review Focus 1). At its real durations the scene opens on the finale's strings where the finale drew them; they
// fade while the red block grows, the walker comes in and the witness says the last line, in a bubble with no
// label. The app reopens on the epilogue once the video was opened, during the video as after the scene (Review
// Focus 5); only Ctrl+Shift+R starts again. The scene moves transform and opacity only. The button is pressed only
// with the network blocked: it opens the real video.
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

/** The opacity of each part of the scene, and the block's transform. */
const scene = (page: Page) =>
  epilogue(page).evaluate((screen) => {
    const style = (selector: string) => getComputedStyle(screen.querySelector(selector)!);
    return {
      strings: style('[data-strings]').opacity,
      block: style('[data-block]').opacity,
      grown: style('[data-block]').transform,
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

  // It opens on the finale's strings, where the finale drew them, with block, walker and bubble still away: read in
  // the task of the focus itself, before the ink of the screen change has even come in.
  const opening = await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new Event('focus'));
    const screen = document.querySelector('[data-screen="epilogue"]');
    if (!screen) return null;
    const opacity = (selector: string) => getComputedStyle(screen.querySelector(selector)!).opacity;
    return {
      strings: [...screen.querySelectorAll('[data-string]')].map((path) => path.getAttribute('d')),
      opacity: { strings: opacity('[data-strings]'), block: opacity('[data-block]'), walker: opacity('[data-walker]'), bubble: opacity('.witness__bubble') },
    };
  });
  expect(opening).toEqual({ strings: drawn, opacity: { strings: '1', block: '0', walker: '0', bubble: '0' } });

  await expect(epilogue(page)).toHaveAttribute('data-done', '', { timeout: 10_000 });
  await expect(finale(page)).toHaveCount(0);
  expect(await scene(page)).toEqual({ strings: '0', block: '1', grown: 'none', walker: '1', bubble: '1' });
  await expect(line(page)).toHaveText(content.witness.epilogue);
  await expect(epilogue(page).getByText(content.ui.witnessLabel)).toBeHidden();
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
  const parts = ['[data-strings]', '[data-block]', '[data-walker]', '.witness__bubble'];
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
