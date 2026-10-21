// Screens e2e: the game in the state of each mockup at the three test resolutions. Every pair saves
// screenshots/<state>-<width>x<height>.png for review against docs/mockups and checks the stage rules:
// nothing leaves the stage, no text is too small or overflows its box, at most three font families.
// Later tasks add rows to the table.
import { expect, test, type Page } from '@playwright/test';
import { fontFamilies, outsideStage, overflowingText, smallText } from './checks';
import { board, content, enterRoom, MOCKUP_01, openCase, seed } from './helpers';

const SIZES = [
  [1707, 1067, 1.5],
  [1920, 1080, 1],
  [1366, 768, 1],
] as const;

// Each state is named after its screen; the comment gives the mockup it is compared with.
const STATES: Record<string, (page: Page) => Promise<void>> = {
  // 05
  intro: async (page) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: content.ui.intro.question })).toBeVisible();
  },
  // 01
  board: async (page) => {
    await seed(page, MOCKUP_01);
    await page.goto('/');
    await expect(board(page)).toBeVisible();
  },
  // 06
  'room-studio': async (page) => {
    await openCase(page);
    await enterRoom(page, 'studio');
  },
  // 07, with the first hint shown by Ctrl+Shift+H
  'room-scacchiera': async (page) => {
    await openCase(page);
    await enterRoom(page, 'scacchiera');
    await page.keyboard.press('Control+Shift+KeyH');
    await expect(page.locator('[data-hint]')).toBeVisible();
  },
  // 14: over the library, one token spent before, 14 seconds left
  audience: async (page) => {
    await page.clock.install();
    await seed(page, MOCKUP_01);
    await page.goto('/');
    await enterRoom(page, 'biblioteca');
    await page.getByRole('button', { name: content.ui.audience.button }).click();
    await page.clock.runFor(16_500);
    await expect(page.locator('[data-seconds]')).toHaveText('14');
  },
  // 15: the way out of the library, offered after skipAfterSec
  skip: async (page) => {
    await page.clock.install();
    await seed(page, MOCKUP_01);
    await page.goto('/');
    await enterRoom(page, 'biblioteca');
    await page.clock.runFor(content.rooms.biblioteca.help.skipAfterSec * 1000);
    await page.getByRole('button', { name: content.ui.skip.button }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  },
};

for (const [width, height, deviceScaleFactor] of SIZES) {
  test.describe(`${width}x${height}`, () => {
    test.use({ viewport: { width, height }, deviceScaleFactor });

    for (const [state, reach] of Object.entries(STATES)) {
      test(state, async ({ page }) => {
        await reach(page);
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: `screenshots/${state}-${width}x${height}.png` });
        expect(await outsideStage(page)).toEqual([]);
        expect(await smallText(page)).toEqual([]);
        expect(await overflowingText(page)).toEqual([]);
        expect((await fontFamilies(page)).length).toBeLessThanOrEqual(3);
      });
    }
  });
}
