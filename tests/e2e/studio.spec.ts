// Study e2e: the three reports open one at a time, each with its testimony and four phenomena. A wrong one
// shakes, counts one error and gets the witness's answer, even under a double click; the right one stamps
// the report and opens the next, and a double click on it answers one report only. The plate only ever gets
// "Interessante?", with no error. Three right answers win the fragment and both clues, once. The stake card
// steps aside for the hint card, the column of reports keeps between 128 and 984 at every step with every
// text in its box at 1366x768 (decision 9), and each visit starts from the first report. Durations are cut
// to 1 ms.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { SAVE_KEY } from '../../src/engine/save';
import { overflowingText } from './checks';
import { board, content, continueWish, enterRoom, fragment, quick, seed, wish } from './helpers';
import { play } from './play';

const room = content.rooms.studio;
const testimonies: { quote: string; options: string[]; answer: number }[] = room.testimonies;

const report = (page: Page, n: number) => page.locator(`[data-report="${n}"]`);
const option = (page: Page, n: number, i: number) => report(page, n).locator(`[data-option="${i}"]`);
const right = (page: Page, n: number) => option(page, n, testimonies[n - 1].answer);
/** The k-th wrong phenomenon of report n, in the order on screen. */
const wrong = (page: Page, n: number, k: number) =>
  option(page, n, [0, 1, 2, 3].filter((i) => i !== testimonies[n - 1].answer)[k]);
const witnessLine = (page: Page) => page.locator('[data-witness] .witness__line');
const hintButton = (page: Page) => page.getByRole('button', { name: content.ui.hint.button });
const tag = (n: number) => room.reports.tag.replace('{n}', String(n)).replace('{total}', String(testimonies.length));

/** The case open with nothing solved, the study on screen and taking clicks. */
async function enterStudy(page: Page): Promise<void> {
  await seed(page, { opened: true, solved: [], clues: [], tokens: content.tokens });
  await page.goto('/');
  await enterRoom(page, 'studio');
}

/** The rooms solved in the save. */
const solvedInSave = (page: Page): Promise<string[]> =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).state.solved, SAVE_KEY);

test.beforeEach(({ page }) => quick(page));

test('the reports open one at a time', async ({ page }) => {
  await enterStudy(page);
  await expect(report(page, 1)).toHaveAttribute('data-state', 'open');
  await expect(report(page, 1)).toContainText(tag(1));
  await expect(report(page, 1)).toContainText(room.reports.question);
  await expect(report(page, 1)).toContainText(testimonies[0].quote);
  await expect(report(page, 1).getByRole('button')).toHaveText(testimonies[0].options);
  for (const n of [2, 3]) {
    await expect(report(page, n)).toHaveAttribute('data-state', 'locked');
    await expect(report(page, n)).toContainText(tag(n));
    await expect(report(page, n)).not.toContainText(testimonies[n - 1].quote);
    await expect(report(page, n).getByRole('button')).toHaveCount(0);
  }

  await right(page, 1).click();
  await expect(report(page, 1)).toHaveAttribute('data-state', 'solved');
  await expect(report(page, 1)).toContainText(testimonies[0].options[testimonies[0].answer]);
  await expect(report(page, 1).locator('[data-stamp]')).toHaveText(content.ui.solved);
  await expect(report(page, 1).getByRole('button')).toHaveCount(0);
  await expect(report(page, 2)).toHaveAttribute('data-state', 'open');
  await expect(report(page, 2).getByRole('button')).toHaveText(testimonies[1].options);
  await expect(report(page, 3)).toHaveAttribute('data-state', 'locked');
});

test('a wrong phenomenon counts an error and the witness answers', async ({ page }) => {
  await enterStudy(page);
  await wrong(page, 1, 0).click();
  await expect(witnessLine(page)).toHaveText(room.witness.wrong[0]);
  await expect(wrong(page, 1, 0)).toHaveAttribute('aria-disabled', 'true');
  await expect(report(page, 1)).toHaveAttribute('data-state', 'open');
  await wrong(page, 1, 1).click();
  await expect(hintButton(page)).toBeHidden();
  await wrong(page, 1, 2).click();
  await expect(hintButton(page)).toBeVisible();
});

test('a double click on a wrong option counts one error', async ({ page }) => {
  await enterStudy(page);
  await wrong(page, 1, 0).dblclick();
  await wrong(page, 1, 0).click({ force: true }); // switched off (aria-disabled): it shakes and counts nothing
  await wrong(page, 1, 1).click();
  await expect(hintButton(page)).toBeHidden();
  await wrong(page, 1, 2).click();
  await expect(hintButton(page)).toBeVisible();
});

test('a double click on the right option answers one report', async ({ page }) => {
  await enterStudy(page);
  await right(page, 1).dblclick();
  await expect(report(page, 1)).toHaveAttribute('data-state', 'solved');
  await expect(report(page, 2)).toHaveAttribute('data-state', 'open');
  await expect(report(page, 3)).toHaveAttribute('data-state', 'locked');
  await wrong(page, 2, 0).click();
  await wrong(page, 2, 1).click();
  await expect(hintButton(page)).toBeHidden();
  await wrong(page, 2, 2).click();
  await expect(hintButton(page)).toBeVisible();
});

test('the second click of a double click never reaches an option', async ({ page }) => {
  await enterStudy(page);
  const center = async (target: Locator) => {
    const box = (await target.boundingBox())!;
    return [box.x + box.width / 2, box.y + box.height / 2] as const;
  };
  await page.mouse.click(...(await center(right(page, 1))));
  await expect(report(page, 2)).toHaveAttribute('data-state', 'open');
  // A double click whose second click lands on an option of the report that has just opened.
  await page.mouse.move(...(await center(wrong(page, 2, 0))));
  await page.mouse.down({ clickCount: 2 });
  await page.mouse.up({ clickCount: 2 });
  await expect(wrong(page, 2, 0)).not.toHaveAttribute('aria-disabled');
  await expect(witnessLine(page)).not.toHaveText(room.witness.wrong[1]);
});

test('the plate is interesting, whatever it shows', async ({ page }) => {
  await enterStudy(page);
  const plate = page.getByRole('button', { name: room.plate });
  for (let i = 0; i < 3; i++) {
    await witnessLine(page).evaluate((line) => (line.textContent = ''));
    await plate.click();
    await expect(witnessLine(page)).toHaveText(room.witness.plate);
    await expect(plate).toHaveAttribute('data-swing');
  }
  await expect(hintButton(page)).toBeHidden();
});

test('three right answers win the fragment and both clues', async ({ page }) => {
  await enterStudy(page);
  await play.studio(page);
  for (const text of [fragment('studio'), content.clues.rule.label, content.clues.profile.label]) {
    await expect(wish(page)).toContainText(text);
  }
});

test('a double click on the last answer solves the room once', async ({ page }) => {
  await enterStudy(page);
  await right(page, 1).click();
  await right(page, 2).click();
  await right(page, 3).dblclick();
  await expect(wish(page)).toHaveCount(1);
  await continueWish(page);
  await expect(board(page)).toBeVisible();
  expect(await solvedInSave(page)).toEqual(['studio']);
});

test('the stake steps aside for the hint card', async ({ page }) => {
  await enterStudy(page);
  const stake = page.locator('[data-stake]');
  await expect(stake).toBeVisible();
  await expect(stake).toContainText(room.stake.tag);
  await page.keyboard.press('Control+Shift+KeyH');
  await expect(page.locator('[data-hint]')).toBeVisible();
  await expect(stake).toBeHidden();
});

test('the room starts over after leaving', async ({ page }) => {
  await enterStudy(page);
  await right(page, 1).click();
  await wrong(page, 2, 0).click();
  await page.getByRole('button', { name: content.ui.back }).click();
  await expect(board(page)).toBeVisible();
  await enterRoom(page, 'studio');
  await expect(report(page, 1)).toHaveAttribute('data-state', 'open');
  await expect(report(page, 2)).toHaveAttribute('data-state', 'locked');
  await expect(page.locator('[data-option][aria-disabled]')).toHaveCount(0);
});

test.describe('at 1366x768', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test('every report fits the column, at every step', async ({ page }) => {
    await enterStudy(page);
    const column = page.locator('[data-reports]');
    for (let n = 1; n <= testimonies.length; n++) {
      await expect(report(page, n)).toHaveAttribute('data-state', 'open');
      // Layout boxes in stage pixels, before the tilt of the sheets: decision 9 keeps them in 128-984.
      const [top, bottom] = await column.evaluate((node: HTMLElement) => [node.offsetTop, node.offsetTop + node.offsetHeight]);
      expect(top, `report ${n} open`).toBeGreaterThanOrEqual(128);
      expect(bottom, `report ${n} open`).toBeLessThanOrEqual(984);
      expect(await overflowingText(page), `report ${n} open`).toEqual([]);
      if (n < testimonies.length) await right(page, n).click();
    }
  });
});
