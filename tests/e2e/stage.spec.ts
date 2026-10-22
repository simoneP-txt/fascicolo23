// Stage e2e: the 16:9 stage fits the three test resolutions and paints nothing, so the host's art shows
// through it; on the 16:10 party screen the bands above and below it take the colors of the screen and
// darken with it, in one layer, under a dialog; the four fonts load from the build with the network cut.
// Durations are cut to 1 ms.
import { expect, test, type Page } from '@playwright/test';
import { bandColor, bandsMatchTokens, colorDistance, edgeColors, luminance, type Rgb } from './checks';
import { board, content, continueWish, enterRoom, offline, openCase, quick } from './helpers';

const BANDS = ['top', 'bottom'] as const;

test.beforeEach(({ page }) => quick(page));

test('the 16:9 stage fits 1707x1067 at 150%, 1920x1080 and 1366x768', async ({ browser, baseURL }) => {
  for (const [width, height, deviceScaleFactor] of [
    [1707, 1067, 1.5],
    [1920, 1080, 1],
    [1366, 768, 1],
  ]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height }, deviceScaleFactor });
    const page = await context.newPage();
    await quick(page);
    await openCase(page);
    const stage = (await page.locator('#stage').boundingBox())!;
    expect(stage.width / stage.height).toBeCloseTo(16 / 9, 2);
    expect(Math.abs(stage.width - width) < 1 || Math.abs(stage.height - height) < 1).toBe(true);
    expect(Math.abs(stage.x - (width - stage.width) / 2)).toBeLessThan(1);
    expect(Math.abs(stage.y - (height - stage.height) / 2)).toBeLessThan(1);
    const backdrop = (await page.locator('#app').boundingBox())!;
    expect([backdrop.x, backdrop.y, backdrop.width, backdrop.height]).toEqual([0, 0, width, height]);
    await context.close();
  }
});

test('the stage paints nothing, so the art of the host shows through it', async ({ page }) => {
  await openCase(page);
  const paint = await page.locator('#stage').evaluate((stage) => {
    const { backgroundColor, backgroundImage } = getComputedStyle(stage);
    return { backgroundColor, backgroundImage };
  });
  expect(paint).toEqual({ backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: 'none' });
});

test('nothing can scroll the host, even when an overlay veil runs past the window', async ({ page }) => {
  await openCase(page);
  const before = await page.locator('#stage').boundingBox();
  await page.keyboard.press('Control+Shift+KeyR');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('#app').evaluate((host) => host.scrollTo(600, 600)); // as a click's scrollIntoView would
  expect(await page.locator('#stage').boundingBox()).toEqual(before);
});

test.describe('on the 16:10 party screen', () => {
  test.use({ viewport: { width: 1707, height: 1067 }, deviceScaleFactor: 1.5 });

  // Under an overlay each band falls under half its luminance and still continues the stage edge, which a
  // veil kept inside the stage, or a second one there, would break.
  async function bandsDarkenInOneLayer(page: Page, before: Record<(typeof BANDS)[number], Rgb>, what: string): Promise<void> {
    for (const band of BANDS) {
      expect(luminance(await bandColor(page, band)), `${band} band under the ${what}`).toBeLessThan(luminance(before[band]) / 2);
      const { outside, inside } = await edgeColors(page, band);
      expect(colorDistance(outside, inside), `${band} edge of the stage under the ${what}`).toBeLessThanOrEqual(48);
    }
  }

  test('the bands take the colors of the screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: content.ui.intro.question })).toBeVisible();
    await bandsMatchTokens(page, 'case opening');

    await page.getByRole('button', { name: content.ui.intro.yes }).click();
    await continueWish(page);
    await expect(board(page)).toBeVisible();
    // The board's frame and vignette sit at the window edge, so its bands only have to continue the stage.
    for (const edge of BANDS) {
      const { outside, inside } = await edgeColors(page, edge);
      expect(colorDistance(outside, inside), `board at the ${edge} edge of the stage`).toBeLessThanOrEqual(48);
    }

    await enterRoom(page, 'studio');
    await bandsMatchTokens(page, 'study');
  });

  test('an open dialog darkens the bands too, on the board and in a room', async ({ page }) => {
    await openCase(page);
    const cork = { top: await bandColor(page, 'top'), bottom: await bandColor(page, 'bottom') };
    await page.keyboard.press('Control+Shift+KeyR');
    await expect(page.getByRole('dialog')).toBeVisible();
    await bandsDarkenInOneLayer(page, cork, 'reset dialog');

    await page.getByRole('button', { name: content.ui.reset.no }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    for (const band of BANDS) {
      expect(colorDistance(await bandColor(page, band), cork[band]), `${band} band after the dialog`).toBeLessThanOrEqual(48);
    }

    await enterRoom(page, 'studio');
    const study = { top: await bandColor(page, 'top'), bottom: await bandColor(page, 'bottom') };
    await page.getByRole('button', { name: content.ui.audience.button }).click();
    await expect(page.locator('[data-audience-overlay]')).toBeVisible();
    await bandsDarkenInOneLayer(page, study, 'audience countdown');
  });
});

test('the four fonts load offline', async ({ context, page, baseURL }) => {
  const outside = await offline(context, baseURL!);
  await page.goto('/');
  const fonts = [
    ['Special Elite', 'normal', '400'],
    ['Cormorant Garamond', 'normal', '500'],
    ['Cormorant Garamond', 'normal', '600'],
    ['Cormorant Garamond', 'italic', '500'],
    ['Anton', 'normal', '400'],
    ['Poiret One', 'normal', '400'],
  ];
  const missing = await page.evaluate(async (fonts) => {
    const loaded = await Promise.all(
      fonts.map(async ([family, style, weight]) => {
        const faces = await document.fonts.load(`${style} ${weight} 32px "${family}"`);
        return faces.some((face) => face.style === style && face.weight === weight && face.status === 'loaded');
      }),
    );
    return fonts.filter((_, i) => !loaded[i]).map((font) => font.join(' '));
  }, fonts);
  expect(missing).toEqual([]);
  expect(outside).toEqual([]);
});
