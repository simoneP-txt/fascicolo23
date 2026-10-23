// Screens e2e: the game in the state of each mockup at the three test resolutions, with durations cut to
// 1 ms. Every pair saves screenshots/<state>-<width>x<height>.png for review against docs/mockups and
// checks the stage rules: nothing leaves the stage, no text is too small or overflows its box, at most
// three font families. Later tasks add rows to the table.
import { expect, test, type Page } from '@playwright/test';
import { bandsMatchTokens, edgeJumps, fontFamilies, hasBands, outsideStage, overflowingText, smallText } from './checks';
import { board, consolation, content, enterRoom, FINISHED, MOCKUP_01, openCase, quick, roomScreen, seed, wish } from './helpers';

const SIZES = [
  [1707, 1067, 1.5],
  [1920, 1080, 1],
  [1366, 768, 1],
] as const;

/** The wish at its end, with "Continua?" on screen. On the party screen its bands hold the wish's backdrop
 *  tokens and continue the sky and the hill all along the stage edges, not the cork of the board under it,
 *  and no ray ends cut straight at an edge. */
async function wishEnded(page: Page): Promise<void> {
  await expect(wish(page).getByRole('button', { name: content.ui.wish.continue })).toBeVisible();
  if (!(await hasBands(page))) return;
  await bandsMatchTokens(page, 'wish');
  for (const edge of ['top', 'bottom'] as const) {
    expect(Math.max(...(await edgeJumps(page, edge))), `wish at the ${edge} edge of the stage`).toBeLessThanOrEqual(12);
  }
}

/** Solves this room from the board with its placeholder button, up to the end of the wish. */
async function solvedToWish(page: Page, id: string): Promise<void> {
  await enterRoom(page, id);
  await page.getByRole('button', { name: content.rooms[id].placeholder.solve }).click();
  await wishEnded(page);
}

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
  // 01 with the case just opened: two doors open, three locked, no clue yet
  'board-start': async (page) => {
    await openCase(page);
  },
  // 01 at the end: every door stamped, five clues and six strings, the provisional finale in place of the tokens
  'board-end': async (page) => {
    await seed(page, FINISHED);
    await page.goto('/');
    await expect(board(page)).toBeVisible();
  },
  // 06
  'room-studio': async (page) => {
    await openCase(page);
    await enterRoom(page, 'studio');
  },
  // 07 after 1.Bxf7+ Kh8: the knight selected with the squares it reaches, the first hint shown by Ctrl+Shift+H
  'room-scacchiera': async (page) => {
    await openCase(page);
    await enterRoom(page, 'scacchiera');
    await page.locator('[data-square="c4"]').click();
    await page.locator('[data-square="f7"]').click();
    await expect(page.locator('[data-piece="k"][data-at="h8"]')).toHaveCount(1);
    await page.locator('[data-square="e5"]').click();
    await expect(page.locator('[data-target]')).not.toHaveCount(0);
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
  // 06 with every token spent: the audience button, switched off, says the jury has spoken
  'audience-spent': async (page) => {
    await seed(page, { opened: true, solved: [], clues: [], tokens: 0 });
    await page.goto('/');
    await enterRoom(page, 'studio');
    await expect(page.getByRole('button', { name: content.ui.audience.spent })).toBeDisabled();
  },
  // 10, the frame: Rapture with the way out, offered after skipAfterSec
  'room-rapture': async (page) => {
    await page.clock.install();
    await page.goto('/');
    await page.keyboard.press('Control+Shift+KeyD');
    await page.getByRole('button', { name: content.rooms.rapture.name }).click();
    await expect(roomScreen(page, 'rapture')).toBeVisible();
    await page.clock.runFor(content.rooms.rapture.help.skipAfterSec * 1000);
    await expect(page.getByRole('button', { name: content.ui.skip.button })).toBeVisible();
  },
  // the host's debug menu over the board, in the style of 14 and 15
  debug: async (page) => {
    await seed(page, MOCKUP_01);
    await page.goto('/');
    await page.keyboard.press('Control+Shift+KeyD');
    await expect(page.getByRole('dialog')).toBeVisible();
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
  // 04, the Anton sample: the consolation meme over the study once its zoom has landed, held on screen by
  // the page clock standing still
  meme: async (page) => {
    await consolation(page);
    await expect(page.locator('[data-meme] figure')).toHaveCSS('transform', 'none');
  },
  // 13: the library solved in the game of mockup 01, at the end of the wish
  wish: async (page) => {
    await seed(page, MOCKUP_01);
    await page.goto('/');
    await solvedToWish(page, 'biblioteca');
  },
  // 13 with the two long clues of the study: the card grows and "Continua?" moves down
  'wish-studio': async (page) => {
    await seed(page, { opened: true, solved: [], clues: [], tokens: content.tokens });
    await page.goto('/');
    await solvedToWish(page, 'studio');
  },
  // 13 for the case opening, whose fragment is too long for the card at full size
  'wish-case': async (page) => {
    await page.goto('/');
    await page.getByRole('button', { name: content.ui.intro.yes }).click();
    await wishEnded(page);
  },
};

test.beforeEach(({ page }) => quick(page));

for (const [width, height, deviceScaleFactor] of SIZES) {
  test.describe(`${width}x${height}`, () => {
    test.use({ viewport: { width, height }, deviceScaleFactor });

    for (const [state, reach] of Object.entries(STATES)) {
      test(state, async ({ page }) => {
        await reach(page);
        await page.evaluate(() => document.fonts.ready);
        // Entrances (a dialog, the witness bubble) finish first, so every shot is the settled screen.
        await page.screenshot({ path: `screenshots/${state}-${width}x${height}.png`, animations: 'disabled' });
        expect(await outsideStage(page)).toEqual([]);
        expect(await smallText(page)).toEqual([]);
        expect(await overflowingText(page)).toEqual([]);
        expect((await fontFamilies(page)).length).toBeLessThanOrEqual(3);
      });
    }
  });
}
