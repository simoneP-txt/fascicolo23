// Chessboard e2e: the position of content.json on the 8x8 grid, the legal moves of a white piece, a black
// piece pressed without an error, wrong moves that count once each and leave the piece where it was, the
// second click of a slow double click on a wrong capture never pressing the black piece left there, and the
// line played to the mate, black answering by itself while clicks wait. Solved, the room keeps the mate on
// screen for the beat without its way back, audience button or help, and it is solved once whatever the
// player or the host presses. Each visit starts over. Durations are cut to 1 ms; the tests that watch black
// answer stop the page clock once the room is on screen.
import { expect, test, type Page } from '@playwright/test';
import { SAVE_KEY } from '../../src/engine/save';
import { board, content, continueWish, door, duration, enterRoom, openCase, quick, settled, slowDoubleClick, wish } from './helpers';

const room = content.rooms.scacchiera;

const square = (page: Page, at: string) => page.locator(`[data-square="${at}"]`);
const piece = (page: Page, letter: string, at: string) => page.locator(`[data-piece="${letter}"][data-at="${at}"]`);
const row = (page: Page, n: number) => page.locator(`[data-move="${n}"]`);
const witness = (page: Page) => page.locator('[data-witness]');
const hintButton = (page: Page) => page.getByRole('button', { name: content.ui.hint.button });

async function move(page: Page, from: string, to: string): Promise<void> {
  await square(page, from).click();
  await square(page, to).click();
}

/** The case opened and the chessboard on screen, taking clicks; with clock, the page clock is installed first. */
async function enterChess(page: Page, clock = false): Promise<void> {
  if (clock) await page.clock.install();
  await openCase(page);
  await enterRoom(page, 'scacchiera');
}

/** From now on the page clock stands still: black answers, and the beat ends, only when the test runs it. */
async function stopClock(page: Page): Promise<void> {
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
}

/** Runs the stopped clock until black has answered and its piece has landed. */
async function blackAnswers(page: Page): Promise<void> {
  await page.clock.runFor((await duration(page, '--duration-reply')) + (await duration(page, '--duration-slide')));
}

/** The rooms solved in the save. */
const solvedInSave = (page: Page): Promise<string[]> =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).state.solved, SAVE_KEY);

test.beforeEach(({ page }) => quick(page));

test('the board holds the position of content.json', async ({ page }) => {
  await enterChess(page);
  await expect(page.locator('[data-piece]')).toHaveCount(21);
  await expect(piece(page, 'K', 'h4')).toHaveCount(1);
  await expect(piece(page, 'R', 'h1')).toHaveCount(1);
  await expect(piece(page, 'k', 'g8')).toHaveCount(1);

  // The 8x8 grid reads like a chessboard: a8 top left, h1 bottom right, the axes in screen order.
  const squares = page.locator('[data-square]');
  await expect(squares).toHaveCount(64);
  await expect(squares.first()).toHaveAttribute('data-square', 'a8');
  await expect(squares.last()).toHaveAttribute('data-square', 'h1');
  const [a8, h8, a1] = await Promise.all(['a8', 'h8', 'a1'].map(async (at) => (await square(page, at).boundingBox())!));
  expect(h8.x).toBeGreaterThan(a8.x);
  expect(h8.y).toBe(a8.y);
  expect(a1.y).toBeGreaterThan(a8.y);
  expect(a1.x).toBe(a8.x);
  await expect(page.locator('[data-axis="files"] > *')).toHaveText(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  await expect(page.locator('[data-axis="ranks"] > *')).toHaveText(['8', '7', '6', '5', '4', '3', '2', '1']);
});

test('a white piece shows its legal moves', async ({ page }) => {
  await enterChess(page);
  await square(page, 'c4').click();
  await expect(square(page, 'c4')).toHaveAttribute('data-selected');
  await expect(page.locator('[data-target]')).toHaveCount(9);
  await expect(square(page, 'f7')).toHaveAttribute('data-target', 'take');
  await expect(square(page, 'd5')).toHaveAttribute('data-target', 'move');

  await square(page, 'e5').click();
  await expect(page.locator('[data-selected]')).toHaveCount(1);
  await expect(square(page, 'e5')).toHaveAttribute('data-selected');
  await expect(page.locator('[data-target]')).toHaveCount(7);

  await square(page, 'a4').click(); // a square the knight cannot reach drops the selection
  await expect(page.locator('[data-selected], [data-target]')).toHaveCount(0);
});

test('a black piece asks for a white one', async ({ page }) => {
  await enterChess(page);
  await square(page, 'g8').click();
  await expect(witness(page)).toContainText(room.witness.black);
  await expect(page.locator('[data-selected]')).toHaveCount(0);
  await move(page, 'c4', 'd5');
  await move(page, 'h1', 'h3');
  await expect(hintButton(page)).toBeHidden(); // two errors: the press on g8 was none
});

test('a wrong move counts an error and the piece stays', async ({ page }) => {
  await enterChess(page);
  await move(page, 'c4', 'd5');
  await expect(square(page, 'd5')).toHaveAttribute('data-nope');
  await expect(piece(page, 'B', 'c4')).toHaveCount(1);
  await expect(page.locator('[data-at="d5"]')).toHaveCount(0);
  await expect(witness(page)).toContainText(room.witness.wrong[0]);
  await expect(row(page, 1).locator('[data-san]')).toHaveText('');

  await move(page, 'h1', 'h3');
  await expect(hintButton(page)).toBeHidden();
  await move(page, 'h1', 'g1');
  await expect(hintButton(page)).toBeVisible();
  await expect(piece(page, 'R', 'h1')).toHaveCount(1);
});

test('a double click on a wrong move counts one error', async ({ page }) => {
  await enterChess(page);
  await square(page, 'c4').click();
  await square(page, 'd5').dblclick();
  await move(page, 'h1', 'h3');
  await expect(hintButton(page)).toBeHidden();
  await move(page, 'h1', 'g1');
  await expect(hintButton(page)).toBeVisible();
});

test('a slow double click on a wrong capture keeps the answer to the wrong move', async ({ page }) => {
  await enterChess(page, true);
  await stopClock(page);
  await square(page, 'e5').click(); // Nxf7 is legal, and off the line
  await slowDoubleClick(page, square(page, 'f7'));
  await expect(witness(page)).toContainText(room.witness.wrong[0]);
});

test('the line plays out, black answers by itself, and Kg4 mates', async ({ page }) => {
  await enterChess(page, true);
  await stopClock(page);

  await move(page, 'c4', 'f7');
  await expect(piece(page, 'B', 'f7')).toHaveCount(1);
  await expect(piece(page, 'p', 'f7')).toHaveCount(0); // taken
  await expect(row(page, 1)).toHaveText('1. Bxf7+');
  await expect(square(page, 'g8')).toHaveAttribute('data-check');
  await expect(piece(page, 'k', 'g8')).toHaveCount(1); // black waits for --duration-reply
  await blackAnswers(page);
  await expect(piece(page, 'k', 'h8')).toHaveCount(1);
  await expect(row(page, 1)).toHaveText('1. Bxf7+ Kh8');
  await expect(witness(page)).toContainText(room.witness.replies[0]);
  await expect(page.locator('[data-check]')).toHaveCount(0);

  await move(page, 'e5', 'g6');
  await expect(square(page, 'h8')).toHaveAttribute('data-check');
  await blackAnswers(page);
  await expect(piece(page, 'p', 'g6')).toHaveCount(1);
  await expect(page.locator('[data-piece="N"]')).toHaveCount(0);
  await expect(row(page, 2)).toHaveText('2. Ng6+ hxg6');
  await expect(witness(page)).toContainText(room.witness.replies[1]);

  await page.keyboard.press('Control+Shift+KeyH');
  await expect(page.locator('[data-hint]')).toBeVisible();
  await move(page, 'h4', 'g4');
  await expect(piece(page, 'K', 'g4')).toHaveCount(1);
  await expect(row(page, 3)).toHaveText('3. Kg4#');
  await expect(witness(page)).toContainText(room.witness.solved);
  await expect(square(page, 'h8')).toHaveAttribute('data-check');
  await expect(page.getByRole('button', { name: content.ui.back })).toBeHidden();
  await expect(page.getByRole('button', { name: content.ui.audience.button })).toBeHidden();
  await expect(page.locator('[data-hint]')).toBeHidden();

  await page.clock.resume();
  await expect(wish(page)).toContainText(content.link.find((part: { room: string }) => part.room === 'scacchiera').text);
  await continueWish(page);
  await expect(door(page, 'scacchiera').locator('[data-stamp]')).toHaveText(content.ui.solved);
});

test('clicks wait while black answers', async ({ page }) => {
  await enterChess(page, true);
  await stopClock(page);
  await move(page, 'c4', 'f7');
  await square(page, 'e5').click();
  await expect(page.locator('[data-selected]')).toHaveCount(0);
  await blackAnswers(page);
  await square(page, 'e5').click();
  await expect(square(page, 'e5')).toHaveAttribute('data-selected');
});

test('a double click on the mating move solves the room once', async ({ page }) => {
  await enterChess(page);
  await move(page, 'c4', 'f7');
  await expect(piece(page, 'k', 'h8')).toHaveCount(1);
  await move(page, 'e5', 'g6');
  await expect(piece(page, 'p', 'g6')).toHaveCount(1);
  await square(page, 'h4').click();
  await square(page, 'g4').dblclick();
  await expect(wish(page)).toHaveCount(1);
  await continueWish(page);
  await expect(board(page)).toBeVisible();
  expect(await solvedInSave(page)).toEqual(['scacchiera']);
});

for (const moment of ['answer', 'beat'] as const) {
  test(`Ctrl+Shift+N during the ${moment} solves the room once`, async ({ page }) => {
    await enterChess(page, true);
    await stopClock(page);
    await move(page, 'c4', 'f7');
    if (moment === 'beat') {
      await blackAnswers(page);
      await move(page, 'e5', 'g6');
      await blackAnswers(page);
      await move(page, 'h4', 'g4');
      await expect(row(page, 3)).toHaveText('3. Kg4#');
    }
    await page.keyboard.press('Control+Shift+KeyN');
    await page.clock.runFor(10_000);
    await expect(wish(page)).toHaveCount(1);
    await expect(wish(page)).toContainText('Kg4');
    await page.clock.runFor(10_000);
    await expect(wish(page)).toHaveCount(1);
    expect(await solvedInSave(page)).toEqual(['scacchiera']);
  });
}

test('the moves found survive the audience help', async ({ page }) => {
  await enterChess(page);
  await move(page, 'c4', 'f7');
  await expect(row(page, 1)).toHaveText('1. Bxf7+ Kh8');
  await page.getByRole('button', { name: content.ui.audience.button }).click();
  await page.getByRole('button', { name: content.ui.audience.done }).click();
  await expect(page.locator('[data-audience-overlay]')).toBeHidden();
  await settled(page);
  await move(page, 'e5', 'g6');
  await expect(row(page, 2)).toHaveText('2. Ng6+ hxg6');
});

test('the room starts over after leaving', async ({ page }) => {
  await enterChess(page);
  await move(page, 'c4', 'f7');
  await expect(piece(page, 'k', 'h8')).toHaveCount(1);
  await page.getByRole('button', { name: content.ui.back }).click();
  await expect(board(page)).toBeVisible();
  await enterRoom(page, 'scacchiera');
  await expect(page.locator('[data-piece]')).toHaveCount(21);
  await expect(piece(page, 'B', 'c4')).toHaveCount(1);
  await expect(piece(page, 'k', 'g8')).toHaveCount(1);
  for (const n of [1, 2, 3]) await expect(row(page, n).locator('[data-san]')).toHaveText('');
});
