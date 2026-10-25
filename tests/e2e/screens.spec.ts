// Screens e2e: the game in the state of each mockup at the three test resolutions, with durations cut to
// 1 ms. Every pair saves screenshots/<state>-<width>x<height>.png for review against docs/mockups and
// checks the stage rules: nothing leaves the stage, no text is too small or overflows its box, at most
// three font families; each row's title says "fits", so npm run texts runs them after a rewrite. Later tasks add
// rows to the table. The overflow check passes a text cut by an ellipsis
// only in a box that opts in with data-ellipsis. On the board rows, "Azzera partita?" covers none of the board's
// pieces.
import { expect, test, type Page } from '@playwright/test';
import { bandsMatchTokens, edgeJumps, fontFamilies, hasBands, outsideStage, overflowingText, smallText } from './checks';
import type { RoomId } from '../../src/engine/types';
import { consistentLiars } from '../../src/rooms/biblioteca/liar';
import { isQuestion } from '../../src/rooms/rapture/orders';
import { EVIDENCE } from '../../src/rooms/stanza-46/deduction';
import {
  BEFORE_46,
  BEFORE_RAPTURE,
  board,
  consolation,
  content,
  enterRoom,
  epilogue,
  FINISHED,
  MOCKUP_01,
  openCase,
  quick,
  seed,
  watchButton,
  wish,
} from './helpers';
import { accuseSuspect, CULPRIT, loseRaptureRun, openRaptureDoor, ORDERS, pinClue, play, startRaptureRun, throughOrder } from './play';

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

/** Solves this room from the board as play.ts does, up to the end of the wish. */
async function solvedToWish(page: Page, id: RoomId): Promise<void> {
  await enterRoom(page, id);
  await play[id](page);
  await wishEnded(page);
}

/** The library in the game of mockup 01, with the page clock installed. */
async function enterLibrary(page: Page): Promise<void> {
  await page.clock.install();
  await seed(page, MOCKUP_01);
  await page.goto('/');
  await enterRoom(page, 'biblioteca');
}

// Every piece of the board "Azzera partita?" must leave uncovered.
const BOARD_PIECES = [
  '[data-door]',
  '[data-clue]',
  '[data-string]',
  '.board__title',
  '.board__link',
  '.board__window',
  '.board__tokens',
  '[data-witness] .witness__bubble',
  '[data-witness] .witness__figure',
].join(', ');

/** "Azzera partita?" is on the board and its box meets none of the board's pieces. */
async function resetClear(page: Page): Promise<void> {
  const reset = page.getByRole('button', { name: content.ui.reset.button });
  await expect(reset).toBeVisible();
  const box = (await reset.boundingBox())!;
  const covered: string[] = [];
  for (const piece of await page.locator(BOARD_PIECES).all()) {
    const other = await piece.boundingBox();
    const meets =
      other && other.x < box.x + box.width && box.x < other.x + other.width && other.y < box.y + box.height && box.y < other.y + other.height;
    if (meets) covered.push(await piece.evaluate((node) => node.getAttribute('class') ?? node.tagName));
  }
  expect(covered).toEqual([]);
}

/** Rapture with its door open on the board, with the page clock installed. */
async function enterRapture(page: Page): Promise<void> {
  await page.clock.install();
  await seed(page, BEFORE_RAPTURE);
  await page.goto('/');
  await enterRoom(page, 'rapture');
}

// Each state is named after its screen; the comment gives the mockup it is compared with.
const STATES: Record<string, (page: Page) => Promise<void>> = {
  // 05
  intro: async (page) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: content.ui.intro.question })).toBeVisible();
  },
  // 01, with "Azzera partita?" under the tokens
  board: async (page) => {
    await seed(page, MOCKUP_01);
    await page.goto('/');
    await expect(board(page)).toBeVisible();
    await resetClear(page);
  },
  // 01 with the case just opened: two doors open, three locked, no clue yet
  'board-start': async (page) => {
    await openCase(page);
    await resetClear(page);
  },
  // 01 at its last: every door stamped but Room 46's, open, five clues and six strings, the tokens under the window
  'board-end': async (page) => {
    await seed(page, BEFORE_46);
    await page.goto('/');
    await expect(board(page)).toBeVisible();
    await resetClear(page);
  },
  // 06: one token spent, the first report solved and the second open, the clock run to hintAfterSec, so
  // "Un indizio?" is on screen
  'room-studio': async (page) => {
    const { help, testimonies } = content.rooms.studio;
    await page.clock.install();
    await seed(page, { opened: true, solved: [], clues: [], tokens: content.tokens - 1 });
    await page.goto('/');
    await enterRoom(page, 'studio');
    await page.locator(`[data-report="1"] [data-option="${testimonies[0].answer}"]`).click();
    await expect(page.locator('[data-report="2"]')).toHaveAttribute('data-state', 'open');
    await page.clock.runFor(help.hintAfterSec * 1000);
    await expect(page.getByRole('button', { name: content.ui.hint.button })).toBeVisible();
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
  // 02: d5 chosen, the clock run to skipAfterSec, so "Un indizio?" and "Apri la porta?" are on screen
  'room-biblioteca': async (page) => {
    await enterLibrary(page);
    await page.locator('[data-square="d5"]').click();
    await page.clock.runFor(content.rooms.biblioteca.help.skipAfterSec * 1000);
    await expect(page.getByRole('button', { name: content.ui.skip.button })).toBeVisible();
  },
  // 08: the liar accused once the time of a quick guess is over, the clock standing still during the beat
  'room-biblioteca-giallo': async (page) => {
    const { secret, shelf, mystery, quickGuessSec } = content.rooms.biblioteca;
    await enterLibrary(page);
    await page.locator(`[data-square="${secret}"]`).click();
    await page.getByRole('button', { name: shelf.pull }).click();
    await expect(page.locator('[data-view="mystery"]')).toBeVisible();
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + quickGuessSec * 1000);
    const liar = mystery.statements.find((statement: { id: string }) => statement.id === consistentLiars()[0]);
    await page.locator(`[data-statement="${liar.id}"]`).getByRole('button', { name: liar.accuse }).click();
    await expect(page.locator('[data-statement] [data-stamp]')).toBeVisible();
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
  // 09: two digits on the keypad, the third slot waiting
  'room-rapture': async (page) => {
    await enterRapture(page);
    for (const digit of '04') await page.locator(`[data-digit="${digit}"]`).click();
    await expect(page.locator('[data-slot]')).toHaveText(['0', '4', '', '']);
  },
  // 10: three runs lost, so "Apri la porta?" is on screen, and the fourth at order 5 with one error, a press on
  // its red button; the clock stands still
  'room-rapture-ordini': async (page) => {
    await enterRapture(page);
    await openRaptureDoor(page);
    for (const n of [1, 2, 3]) await loseRaptureRun(page, await startRaptureRun(page, n));
    const slot = await startRaptureRun(page, 4);
    for (const order of ORDERS.slice(0, 4)) await throughOrder(page, slot, isQuestion(order) ? order.control : null);
    await page.clock.runFor(Math.floor(slot / 2));
    await page.locator(`[data-control="${ORDERS[4].control}"]`).click();
    await expect(page.locator('[data-errors] [data-error="made"]')).toHaveCount(1);
    await expect(page.getByRole('button', { name: content.ui.skip.button })).toBeVisible();
  },
  // 11: two tokens, the 04:51 pinned on the fiancé, the clock run to skipAfterSec, so "Un indizio?" and
  // "Mostrami il colpevole?" are on screen
  'room-46': async (page) => {
    await page.clock.install();
    await seed(page, { ...BEFORE_46, tokens: content.tokens - 1 });
    await page.goto('/');
    await enterRoom(page, 'stanza-46');
    await pinClue(page, 'time-0451');
    await page.clock.runFor(content.rooms['stanza-46'].help.skipAfterSec * 1000);
    await expect(page.getByRole('button', { name: content.rooms['stanza-46'].skip.button })).toBeVisible();
  },
  // 11 at the invitation: the profile and the confession on the diva, the 04:51 on the fiancé, the witness asking
  // for the accusation and the thread's end pulsing, which the shot stops
  'room-46-ready': async (page) => {
    await seed(page, BEFORE_46);
    await page.goto('/');
    await enterRoom(page, 'stanza-46');
    for (const clue of EVIDENCE) await pinClue(page, clue);
    await expect(page.locator('[data-witness] .witness__line')).toHaveText(content.rooms['stanza-46'].witness.ready);
  },
  // 03 for the cards: the case closed on the culprit, the clock standing still during the beat
  'room-46-solved': async (page) => {
    await page.clock.install();
    await seed(page, BEFORE_46);
    await page.goto('/');
    await enterRoom(page, 'stanza-46');
    for (const clue of EVIDENCE) await pinClue(page, clue);
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
    await accuseSuspect(page, CULPRIT);
    await expect(page.locator('[data-solved]')).toHaveCount(1);
  },
  // 03: the case closed, the whole link with its stamp and the video button, the game reopened on it
  finale: async (page) => {
    await seed(page, FINISHED);
    await page.goto('/');
    await expect(watchButton(page)).toBeVisible();
  },
  // 12: the scene over, the red hedge with the walker and the witness's last line, the game reopened on it once
  // the video was opened
  epilogue: async (page) => {
    await seed(page, { ...FINISHED, watched: true });
    await page.goto('/');
    await expect(epilogue(page)).toHaveAttribute('data-done', '');
  },
  // 15 over Rapture: the way out, offered after skipAfterSec, its dialog in Poiret One
  'skip-rapture': async (page) => {
    await enterRapture(page);
    await page.clock.runFor(content.rooms.rapture.help.skipAfterSec * 1000);
    await page.getByRole('button', { name: content.ui.skip.button }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
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

test('the overflow check passes a text cut by an ellipsis only where its box opts in', async ({ page }) => {
  await openCase(page);
  await page.locator('#stage').evaluate((stage) => {
    const box = document.createElement('p');
    box.className = 'e2e-cut';
    box.textContent = 'x'.repeat(200);
    Object.assign(box.style, { width: '200px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' });
    stage.append(box);
  });
  const box = page.locator('.e2e-cut');
  const cut = async () => (await overflowingText(page)).filter((line) => line.startsWith('p.e2e-cut'));
  expect(await cut()).toHaveLength(1);
  await box.evaluate((node) => (node.dataset.ellipsis = ''));
  expect(await cut()).toEqual([]);
  await box.evaluate((node) => (node.style.textOverflow = 'clip')); // opted in, but cut with no ellipsis
  expect(await cut()).toHaveLength(1);
});

for (const [width, height, deviceScaleFactor] of SIZES) {
  test.describe(`${width}x${height}`, () => {
    test.use({ viewport: { width, height }, deviceScaleFactor });

    for (const [state, reach] of Object.entries(STATES)) {
      test(`${state}, every text fits`, async ({ page }) => {
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
