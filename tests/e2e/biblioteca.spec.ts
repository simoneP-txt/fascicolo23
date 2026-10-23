// Library e2e: the shelf is the chessboard's grid, a chosen square shows its title or none, every title fits
// its card at 1366x768, wrong books show the shelf meme and count once each even under a double click, and
// the secret square turns the shelf into the hedge mystery. There a truthful witness accused counts an error
// and gets an answer, while the liar gives up the time, the clue and the room, once. Curtains, leaves and
// pages move by transform and opacity only, and each visit starts from the shelf. The game starts with the
// chessboard solved; durations are cut to 1 ms, and the tests that watch a meme or the beat stop the page
// clock once the room is on screen.
import { expect, test, type Page } from '@playwright/test';
import { SAVE_KEY } from '../../src/engine/save';
import { consistentLiars } from '../../src/rooms/biblioteca/liar';
import { SQUARES } from '../../src/ui/grid8';
import { overflowingText } from './checks';
import { board, content, continueWish, enterRoom, fragment, quick, seed, wish } from './helpers';

const room = content.rooms.biblioteca;
const LIAR = consistentLiars()[0];

const square = (page: Page, at: string) => page.locator(`[data-square="${at}"]`);
const shelfCard = (page: Page) => page.locator('[data-shelf-card]');
const statement = (page: Page, id: string) => page.locator(`[data-statement="${id}"]`);
const witness = (page: Page) => page.locator('[data-witness]');
const hintButton = (page: Page) => page.getByRole('button', { name: content.ui.hint.button });
const accuse = (page: Page, id: string) =>
  statement(page, id).getByRole('button', { name: room.mystery.statements.find((item: { id: string }) => item.id === id).accuse });

/** The case open with the chessboard solved and its g4 found, the library on screen and taking clicks; with
 *  clock, the page clock is installed first and stands still once the room is on screen. */
async function enterLibrary(page: Page, clock = false): Promise<void> {
  if (clock) await page.clock.install();
  await seed(page, { opened: true, solved: ['scacchiera'], clues: ['g4'], tokens: content.tokens });
  await page.goto('/');
  await enterRoom(page, 'biblioteca');
  if (clock) await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
}

async function pull(page: Page, at: string): Promise<void> {
  await square(page, at).click();
  await page.getByRole('button', { name: room.shelf.pull }).click();
}

/** The secret book pulled and the mystery on screen. */
async function openPassage(page: Page): Promise<void> {
  await pull(page, room.secret);
  await expect(page.locator('[data-view="mystery"]')).toBeVisible();
}

/** The rooms solved in the save. */
const solvedInSave = (page: Page): Promise<string[]> =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).state.solved, SAVE_KEY);

/** The keyframe properties of every animation under this element. */
const animated = (page: Page, selector: string): Promise<string[][]> =>
  page.locator(selector).evaluate((node) =>
    node.getAnimations({ subtree: true }).map((animation) => (animation.effect as KeyframeEffect).getKeyframes().flatMap(Object.keys)),
  );

test.beforeEach(({ page }) => quick(page));

test('the shelf is the chessboard grid, g4 included', async ({ page }) => {
  await enterLibrary(page);
  const squares = page.locator('[data-square]');
  expect(await squares.evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.square))).toEqual(SQUARES);
  const [a8, h1, g4] = await Promise.all(['a8', 'h1', 'g4'].map(async (at) => (await square(page, at).boundingBox())!));
  const width = (h1.x - a8.x) / 7;
  const height = (h1.y - a8.y) / 7;
  expect(Math.round((g4.x - a8.x) / width)).toBe(6); // the 7th column
  expect(Math.round((g4.y - a8.y) / height)).toBe(4); // the 5th row
  await expect(page.locator('[data-axis="files"] > *')).toHaveText(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  await expect(page.locator('[data-axis="ranks"] > *')).toHaveText(['8', '7', '6', '5', '4', '3', '2', '1']);
});

test('a book shows its title, or none', async ({ page }) => {
  await enterLibrary(page);
  await expect(shelfCard(page)).toBeHidden();
  await square(page, 'd5').click();
  await expect(square(page, 'd5')).toHaveAttribute('data-chosen');
  await expect(shelfCard(page)).toContainText('SCAFFALE D5');
  await expect(shelfCard(page)).toContainText(room.shelf.titles.d5);
  const untitled = SQUARES.find((at) => !(at in room.shelf.titles))!;
  await square(page, untitled).click();
  await expect(page.locator('[data-chosen]')).toHaveCount(1);
  await expect(shelfCard(page)).toContainText(`SCAFFALE ${untitled.toUpperCase()}`);
  await expect(shelfCard(page)).toContainText(room.shelf.untitled);
});

test.describe('at 1366x768', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test('every title fits its card', async ({ page }) => {
    await enterLibrary(page);
    for (const [at, title] of Object.entries(room.shelf.titles)) {
      await square(page, at).click();
      await expect(shelfCard(page)).toContainText(title as string);
      expect(await overflowingText(page), at).toEqual([]);
    }
  });

  test('every statement fits its card', async ({ page }) => {
    await enterLibrary(page);
    await openPassage(page);
    expect(await overflowingText(page)).toEqual([]);
  });
});

test('a wrong book shows a meme and counts an error', async ({ page }) => {
  await enterLibrary(page, true);
  await pull(page, 'a8');
  await expect(page.locator('[data-meme]')).toContainText(content.memes.shelf.text);
  await expect(page.locator('[data-view="mystery"]')).toBeHidden();
  await page.clock.runFor(1000);
  await expect(page.locator('[data-meme]')).toHaveCount(0);
  await pull(page, 'b8');
  await page.clock.runFor(1000);
  await expect(hintButton(page)).toBeHidden();
  await pull(page, 'c8');
  await page.clock.runFor(1000);
  await expect(hintButton(page)).toBeVisible();
});

test('a double click on "Sfila il libro?" counts one error', async ({ page }) => {
  await enterLibrary(page, true);
  await square(page, 'a8').click();
  await page.getByRole('button', { name: room.shelf.pull }).dblclick();
  await page.clock.runFor(1000);
  await pull(page, 'b8');
  await page.clock.runFor(1000);
  await expect(hintButton(page)).toBeHidden();
  await pull(page, 'c8');
  await page.clock.runFor(1000);
  await expect(hintButton(page)).toBeVisible();
});

test('the book in g4 opens the passage', async ({ page }) => {
  await enterLibrary(page);
  await openPassage(page);
  await expect(page.locator('[data-view="shelf"]')).toBeHidden();
  await expect(page.getByRole('heading', { name: room.mystery.title })).toBeVisible();
  await expect(page.locator('[data-statement]')).toHaveCount(3);
  for (const { id, name } of room.mystery.statements) await expect(statement(page, id)).toContainText(name);
  await expect(witness(page)).toContainText(room.witness.passage);
});

test('a wrong accusation counts an error and the witness answers', async ({ page }) => {
  await enterLibrary(page);
  await pull(page, 'a8'); // one error on the shelf
  await expect(page.locator('[data-meme]')).toHaveCount(0);
  await openPassage(page);
  await accuse(page, 'vicina').dblclick(); // one more, not two
  await expect(witness(page)).toContainText(room.witness.wrong.vicina);
  await expect(page.getByText(room.mystery.solution.tag)).toBeHidden();
  await expect(hintButton(page)).toBeHidden();
  await accuse(page, 'lattaio').click();
  await expect(witness(page)).toContainText(room.witness.wrong.lattaio);
  await expect(hintButton(page)).toBeVisible();
  await expect(page.getByText(room.mystery.solution.tag)).toBeHidden();
});

test('the liar gives up the time and the room', async ({ page }) => {
  await enterLibrary(page, true);
  await pull(page, room.secret);
  await page.clock.runFor(1000);
  await accuse(page, LIAR).click();
  await expect(statement(page, LIAR).locator('[data-stamp]')).toHaveText(room.mystery.stamp);
  const time = content.clues['time-0451'].label;
  await expect(page.getByText(room.mystery.solution.tag)).toBeVisible();
  await expect(page.locator('.biblioteca__time')).toHaveText(time);
  await expect(page.locator('[data-clue="time-0451"]')).toContainText(time);
  await expect(witness(page)).toContainText(room.witness.solved);
  await expect(page.getByRole('button', { name: content.ui.back })).toBeHidden();

  await page.clock.resume();
  await expect(wish(page)).toContainText(fragment('biblioteca'));
  await continueWish(page);
  await expect(board(page).locator('[data-clue="time-0451"]')).toBeVisible();
});

test('a double click on the liar solves the room once', async ({ page }) => {
  await enterLibrary(page);
  await openPassage(page);
  await accuse(page, LIAR).dblclick();
  await expect(wish(page)).toHaveCount(1);
  await continueWish(page);
  await expect(board(page)).toBeVisible();
  expect(await solvedInSave(page)).toEqual(['scacchiera', 'biblioteca']);
});

test('curtains and leaves move with the wind, by transform and opacity', async ({ page }) => {
  await enterLibrary(page);
  const allowed = ['transform', 'opacity', 'offset', 'computedOffset', 'easing', 'composite'];
  const wind = await animated(page, '[data-window]');
  expect(wind.length).toBeGreaterThan(0);
  expect(wind.flat().filter((property) => !allowed.includes(property))).toEqual([]);

  await openPassage(page);
  const pages = await animated(page, '[data-view="mystery"]');
  expect(pages.length).toBeGreaterThan(0);
  expect(pages.flat().filter((property) => !allowed.includes(property))).toEqual([]);
});

test('the room starts over after leaving', async ({ page }) => {
  await enterLibrary(page);
  await openPassage(page);
  await page.getByRole('button', { name: content.ui.back }).click();
  await expect(board(page)).toBeVisible();
  await enterRoom(page, 'biblioteca');
  await expect(page.locator('[data-view="shelf"]')).toBeVisible();
  await expect(page.locator('[data-view="mystery"]')).toBeHidden();
  await expect(page.locator('[data-square]')).toHaveCount(64);
  await expect(page.locator('[data-chosen]')).toHaveCount(0);
});
