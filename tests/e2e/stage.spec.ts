// Stage e2e: the 16:9 stage fits the three test resolutions; on the 16:10 party screen the bands above
// and below it take the colors of the screen and darken with it under a dialog; the four fonts load
// from the build with the network cut.
import { expect, test, type Page } from '@playwright/test';
import { bandColor, colorDistance, edgeColors, luminance, tokenColor } from './checks';
import { board, content, enterRoom, offline, openCase } from './helpers';

const BANDS = ['top', 'bottom'] as const;

test('the 16:9 stage fits 1707x1067 at 150%, 1920x1080 and 1366x768', async ({ browser, baseURL }) => {
  for (const [width, height, deviceScaleFactor] of [
    [1707, 1067, 1.5],
    [1920, 1080, 1],
    [1366, 768, 1],
  ]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height }, deviceScaleFactor });
    const page = await context.newPage();
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

test.describe('on the 16:10 party screen', () => {
  test.use({ viewport: { width: 1707, height: 1067 }, deviceScaleFactor: 1.5 });

  // Each band within 48 (sum of the three channels) of the screen's --backdrop-top or --backdrop-bottom.
  async function bandsMatchTokens(page: Page, screen: string): Promise<void> {
    for (const band of BANDS) {
      const token = await tokenColor(page, `--backdrop-${band}`);
      expect(colorDistance(await bandColor(page, band), token), `${band} band of the ${screen}`).toBeLessThanOrEqual(48);
    }
  }

  test('the bands take the colors of the screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: content.ui.intro.question })).toBeVisible();
    await bandsMatchTokens(page, 'case opening');

    await page.getByRole('button', { name: content.ui.intro.yes }).click();
    await expect(board(page)).toBeVisible();
    // The board's frame and vignette sit at the window edge, so its bands only have to continue the stage.
    for (const edge of BANDS) {
      const { outside, inside } = await edgeColors(page, edge);
      expect(colorDistance(outside, inside), `board at the ${edge} edge of the stage`).toBeLessThanOrEqual(48);
    }

    await enterRoom(page, 'studio');
    await bandsMatchTokens(page, 'study');
  });

  test('an open dialog darkens the bands too', async ({ page }) => {
    await openCase(page);
    const cork = { top: await bandColor(page, 'top'), bottom: await bandColor(page, 'bottom') };
    await page.keyboard.press('Control+Shift+KeyR');
    await expect(page.getByRole('dialog')).toBeVisible();
    for (const band of BANDS) {
      expect(luminance(await bandColor(page, band)), `${band} band under the dialog`).toBeLessThan(luminance(cork[band]) / 2);
    }

    await page.getByRole('button', { name: content.ui.reset.no }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    for (const band of BANDS) {
      expect(colorDistance(await bandColor(page, band), cork[band]), `${band} band after the dialog`).toBeLessThanOrEqual(48);
    }
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
