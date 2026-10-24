// Rapture e2e: the study's rule comes back as a reminder; the keypad takes four digits at most and erases; wrong
// codes get the witness's nudges, then the code, and count nothing; 0451 opens the door on the orders game. A
// run that obeys the questions only wins the fragment, once, with every order in its card at 1366x768; an
// imperative obeyed and a question let go are errors, and the second click of a double click never marks the
// next order. Three lost runs, each slower, bring "Apri la porta?". Leaving mid-run, or Ctrl+Shift+R, stops the
// music and every timer of the run, and the next visit starts from the keypad; a dialog over Rapture speaks
// Poiret One. Durations are cut to 1 ms; the page clock is installed before the page opens and stands still
// while a run is played, window by window.
import { expect, test, type Page } from '@playwright/test';
import { SAVE_KEY } from '../../src/engine/save';
import { isQuestion } from '../../src/rooms/rapture/orders';
import { overflowingText } from './checks';
import { BEFORE_RAPTURE, board, content, continueWish, enterRoom, fragment, paused, played, quick, recordPlays, seed, wish } from './helpers';
import { loseRaptureRun, openRaptureDoor, ORDERS, startRaptureRun, throughOrder } from './play';

const room = content.rooms.rapture;

const witnessLine = (page: Page) => page.locator('[data-witness] .witness__line');
const skipButton = (page: Page) => page.getByRole('button', { name: content.ui.skip.button });
const slots = (page: Page) => page.locator('[data-slot]');
const errorsMade = (page: Page) => page.locator('[data-errors] [data-error="made"]');
const timeLeft = (page: Page) => page.locator('[data-time-left]');
const seconds = (s: number) => room.panel.seconds.replace('{s}', String(s));

/** Rapture on screen from a save with its door open on the board, the page clock installed. */
async function enterRapture(page: Page): Promise<void> {
  await page.clock.install();
  await seed(page, BEFORE_RAPTURE);
  await page.goto('/');
  await enterRoom(page, 'rapture');
}

async function typeCode(page: Page, code: string): Promise<void> {
  for (const digit of code) await page.locator(`[data-digit="${digit}"]`).click();
}

const solvedInSave = (page: Page): Promise<string[]> =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).state.solved, SAVE_KEY);

test.beforeEach(({ page }) => quick(page));

test('the rule comes back as a reminder', async ({ page }) => {
  await enterRapture(page);
  const reminder = page.locator('[data-reminder]:visible');
  await expect(reminder).toContainText(room.reminder);
  await expect(reminder).toContainText(content.clues.rule.label);
  await openRaptureDoor(page);
  await expect(reminder).toContainText(content.clues.rule.label);
});

test('the keypad takes four digits at most, and erases', async ({ page }) => {
  await enterRapture(page);
  const open = page.getByRole('button', { name: room.keypad.open });
  await typeCode(page, '045');
  await expect(open).toHaveAttribute('aria-disabled', 'true');
  await typeCode(page, '19');
  await expect(slots(page)).toHaveText(['0', '4', '5', '1']);
  await expect(open).not.toHaveAttribute('aria-disabled');
  await page.getByRole('button', { name: room.keypad.erase }).click();
  await expect(slots(page)).toHaveText(['0', '4', '5', '']);
  await expect(open).toHaveAttribute('aria-disabled', 'true');
});

test('wrong codes nudge, then tell, and never count', async ({ page }) => {
  await enterRapture(page);
  const [first, second, third] = room.witness.code;
  for (const line of [first, second, third, third]) {
    await typeCode(page, '1234');
    await page.getByRole('button', { name: room.keypad.open }).click();
    await expect(witnessLine(page)).toHaveText(line);
    await expect(slots(page)).toHaveText(['', '', '', '']);
  }
  expect(room.help.skipAfterErrors).toBe(3);
  await expect(skipButton(page)).toBeHidden();
  await expect(page.locator('[data-view="keypad"]')).toBeVisible();
});

test('0451 opens the door to the orders', async ({ page }) => {
  await enterRapture(page);
  await typeCode(page, room.code);
  await page.getByRole('button', { name: room.keypad.open }).click();
  await expect(page.locator('[data-order]').getByRole('button', { name: room.panel.start })).toBeVisible();
  await expect(page.locator('[data-view="keypad"]')).toBeHidden();
  await expect(witnessLine(page)).toHaveText(room.witness.open);
  await expect(page.locator('[data-attempt]')).toContainText(room.panel.number.replace('{n}', '1'));
  await expect(timeLeft(page)).toHaveText(seconds(room.run.seconds));
});

test.describe('at 1366x768', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test('a clean run obeys only the questions and wins Qj', async ({ page }) => {
    await recordPlays(page);
    await enterRapture(page);
    await openRaptureDoor(page);
    const slot = await startRaptureRun(page, 1);
    const half = Math.floor(slot / 2);
    for (const [i, order] of ORDERS.entries()) {
      await page.clock.runFor(half);
      const tag = room.panel.order.replace('{n}', String(i + 1)).replace('{total}', String(ORDERS.length));
      await expect(page.locator('[data-order]')).toContainText(tag);
      await expect(page.locator('[data-order-text]')).toHaveText(order.text);
      expect(await overflowingText(page), order.text).toEqual([]);
      if (isQuestion(order)) {
        await page.locator(`[data-control="${order.control}"]`).click();
        await expect(page.locator(`[data-control="${order.control}"]`)).toHaveAttribute('data-mark', 'right');
      }
      await page.clock.runFor(slot - half);
    }
    await expect(errorsMade(page)).toHaveCount(0);
    expect(await played(page, 'chime')).toBe(true);
    expect(await played(page, 'buzz')).toBe(false);
    await page.clock.resume();
    await expect(wish(page)).toContainText(fragment('rapture'));
    await expect(wish(page)).toContainText(content.clues.confession.label);
  });
});

test('an imperative obeyed or a question let go is an error', async ({ page }) => {
  await recordPlays(page);
  await enterRapture(page);
  await openRaptureDoor(page);
  const slot = await startRaptureRun(page, 1);
  await throughOrder(page, slot, ORDERS[0].control); // a question, obeyed
  const half = Math.floor(slot / 2);
  await page.clock.runFor(half);
  expect(isQuestion(ORDERS[1])).toBe(false);
  await page.locator(`[data-control="${ORDERS[1].control}"]`).click();
  await expect(errorsMade(page)).toHaveCount(1);
  await expect(page.locator(`[data-control="${ORDERS[1].control}"]`)).toHaveAttribute('data-mark', 'wrong');
  expect(await played(page, 'buzz')).toBe(true);
  await page.clock.runFor(slot - half);
  expect(isQuestion(ORDERS[2])).toBe(true);
  await throughOrder(page, slot, null); // a question, let go
  await expect(errorsMade(page)).toHaveCount(2);
  await expect(page.locator('[data-errors]')).toContainText(room.panel.count.replace('{n}', '2').replace('{total}', '2'));
});

test('the second click of a double click never marks the next order', async ({ page }) => {
  await enterRapture(page);
  await openRaptureDoor(page);
  const slot = await startRaptureRun(page, 1);
  expect([ORDERS[0].control, isQuestion(ORDERS[1])]).toEqual([ORDERS[1].control, false]);
  const lever = page.locator(`[data-control="${ORDERS[0].control}"]`);
  const box = (await lever.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.clock.runFor(slot - 1);
  await page.mouse.down();
  await page.mouse.up(); // the question of order 1, obeyed in its last ms
  await page.clock.runFor(2); // order 2, which breaks on the same control
  await page.mouse.down({ clickCount: 2 });
  await page.mouse.up({ clickCount: 2 });
  await page.clock.runFor(Math.floor(slot / 2));
  await expect(page.locator('[data-order-text]')).toHaveText(ORDERS[1].text);
  await expect(errorsMade(page)).toHaveCount(0);
});

test('three lost runs bring the way out, each run slower', async ({ page }) => {
  await enterRapture(page);
  await openRaptureDoor(page);
  for (const n of [1, 2, 3]) {
    const slot = await startRaptureRun(page, n);
    await expect(page.locator('[data-attempt]')).toContainText(room.panel.number.replace('{n}', String(n)));
    await expect(timeLeft(page)).toHaveText(seconds(room.run.seconds + room.run.slower * (n - 1)));
    await expect(skipButton(page)).toBeHidden();
    await loseRaptureRun(page, slot);
    await expect(witnessLine(page)).toHaveText(room.witness.lost);
  }
  await expect(skipButton(page)).toBeVisible();
  await startRaptureRun(page, 4);
  await expect(page.locator('[data-attempt]')).toContainText(room.panel.number.replace('{n}', '4'));
  await expect(timeLeft(page)).toHaveText(seconds(75));
});

test('a won run solves the room once, even under Ctrl+Shift+N during the beat', async ({ page }) => {
  await enterRapture(page);
  await openRaptureDoor(page);
  const slot = await startRaptureRun(page, 1);
  for (const order of ORDERS) await throughOrder(page, slot, isQuestion(order) ? order.control : null);
  // The run ends with its last window, and the beat, 1 ms long here, waits for the stopped clock.
  await expect(page.locator('[data-room="rapture"] .room__area')).toHaveAttribute('data-solved', '');
  await expect(witnessLine(page)).toHaveText(room.witness.solved);
  await page.keyboard.press('Control+Shift+KeyN');
  await page.clock.resume();
  await expect(wish(page)).toHaveCount(1);
  await continueWish(page);
  await expect(board(page)).toBeVisible();
  expect(await solvedInSave(page)).toEqual([...BEFORE_RAPTURE.solved, 'rapture']);
});

test('leaving mid-run silences the music and stops the timers', async ({ page }) => {
  await recordPlays(page);
  await enterRapture(page);
  await expect.poll(() => played(page, 'deep')).toBe(true);
  await openRaptureDoor(page);
  await page.getByRole('button', { name: room.panel.start }).click();
  await page.getByRole('button', { name: content.ui.back }).click();
  await page.clock.runFor(120_000);
  await expect(board(page)).toBeVisible();
  await expect(page.locator('[data-meme]')).toHaveCount(0);
  await expect(witnessLine(page)).toHaveText(content.witness.board);
  expect(await paused(page, 'deep')).toBe(true);
  // The next visit starts from the keypad, and the lost run that never came counted nothing.
  await enterRoom(page, 'rapture');
  await expect(page.locator('[data-view="keypad"]')).toBeVisible();
  await expect(skipButton(page)).toBeHidden();
});

test('Ctrl+Shift+R mid-run leads to a clean opening', async ({ page }) => {
  await recordPlays(page);
  await enterRapture(page);
  await openRaptureDoor(page);
  await page.getByRole('button', { name: room.panel.start }).click();
  await page.keyboard.press('Control+Shift+KeyR');
  await page.getByRole('button', { name: content.ui.reset.yes }).click();
  const intro = page.getByRole('heading', { name: content.ui.intro.question });
  await expect(intro).toBeVisible();
  await page.clock.runFor(120_000);
  await expect(intro).toBeVisible();
  await expect(page.locator('[data-meme]')).toHaveCount(0);
  expect(await paused(page, 'deep')).toBe(true);
});

test('the dialog over Rapture speaks Poiret One', async ({ page }) => {
  await enterRapture(page);
  await page.clock.runFor(room.help.skipAfterSec * 1000);
  await skipButton(page).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: content.ui.skip.button })).toHaveCSS('font-family', /^"?Poiret One/);
  await expect(dialog.getByText(content.ui.skip.body)).toHaveCSS('font-family', /^"?Poiret One/);
  for (const name of [content.ui.skip.yes, content.ui.skip.no]) {
    await expect(dialog.getByRole('button', { name })).toHaveCSS('font-family', /^"?Poiret One/);
  }
});
