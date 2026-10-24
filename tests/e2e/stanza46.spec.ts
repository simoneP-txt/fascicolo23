// Room 46 e2e (mockup 11, the plan's decisions 2-6 and 15): four suspects with their lines, the three clues in
// a column and the link with its last bar. A clue lands on a suspect by a drag or by two clicks; on a suspect it
// settles it stays, with the stamp and the witness's line, and anywhere else it goes back, counting one error on a
// wrong suspect, a double click included, and none when let go off every suspect or cancelled (Review Focus 3).
// An accusation before the three clues are pinned is blind, with a new line each time and the video every fourth
// time; with the three, the fiancé objects, the other two are innocent and the diva closes the case once. Every
// visit starts over, and every line fits its card at 1366x768. Durations are cut to 1 ms, but for the tests that
// watch the video meme.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { SAVE_KEY } from '../../src/engine/save';
import { EVIDENCE, SUSPECT_IDS } from '../../src/rooms/stanza-46/deduction';
import { overflowingText } from './checks';
import { BEFORE_46, board, content, continueWish, duration, enterRoom, fragment, played, quick, recordPlays, seed, wish } from './helpers';
import { accuseSuspect, CULPRIT, evidence, pinClue, suspect } from './play';

const room = content.rooms['stanza-46'];

const witnessLine = (page: Page) => page.locator('[data-witness] .witness__line');
const hintButton = (page: Page) => page.getByRole('button', { name: content.ui.hint.button });
const column = (page: Page) => page.locator('[data-column]');
const inHand = (page: Page) => page.locator('[data-dragging], [data-picked]');
const meme = (page: Page) => page.locator('[data-meme]');

const solvedInSave = (page: Page): Promise<string[]> =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).state.solved, SAVE_KEY);

/** Room 46 on screen from a save with its door open; with clock, the page clock is installed first. */
async function enter46(page: Page, clock = false): Promise<void> {
  if (clock) await page.clock.install();
  await seed(page, BEFORE_46);
  await page.goto('/');
  await enterRoom(page, 'stanza-46');
}

/** From now on the page clock stands still: memes, flights and the beat end only when the test runs it. */
async function stopClock(page: Page): Promise<void> {
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
}

const middle = async (target: Locator) => {
  const box = (await target.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

/** Presses the pointer on the card and moves it, in steps, to this point, still pressed. */
async function dragTo(page: Page, card: Locator, to: { x: number; y: number }): Promise<void> {
  const from = await middle(card);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
}

/** A whole drag of the card, released at this point. */
async function drag(page: Page, card: Locator, to: { x: number; y: number }): Promise<void> {
  await dragTo(page, card, to);
  await page.mouse.up();
}

/** The three clues pinned where they settle, those still in the column, then the clock stopped, so the
 *  accusation's beat waits for the test. */
async function pinAllThenStop(page: Page): Promise<void> {
  for (const clue of EVIDENCE) {
    if ((await page.locator(`[data-slot] [data-evidence="${clue}"]`).count()) === 0) await pinClue(page, clue);
  }
  await stopClock(page);
}

test.describe('with durations cut', () => {
  test.beforeEach(({ page }) => quick(page));

  test('the room shows four suspects, three clues and the link with one bar', async ({ page }) => {
    await enter46(page);
    await expect(page.locator('[data-suspect]')).toHaveCount(4);
    for (const [i, id] of SUSPECT_IDS.entries()) {
      const card = page.locator('[data-suspect]').nth(i);
      await expect(card).toHaveAttribute('data-suspect', id);
      await expect(card).toContainText(room.suspects[i].name);
      await expect(card).toContainText(room.suspects[i].quote);
      await expect(card.locator('[data-slot]')).toHaveText(room.slot);
    }
    await expect(column(page).locator('[data-evidence]')).toHaveCount(3);
    for (const clue of EVIDENCE) await expect(evidence(page, clue)).toContainText(content.clues[clue].label);
    await expect(page.getByText(room.link.oneLeft)).toBeVisible();
    await expect(page.locator('[data-fragment][data-hidden]')).toHaveCount(1);
    await expect(page.locator('[data-fragment="stanza-46"]')).toHaveAttribute('data-hidden');
    await expect(page.locator('[data-fragment="rapture"]')).toHaveText(fragment('rapture'));
    await expect(page.getByText(room.thread.label)).toBeVisible();
    await expect(page.getByText(room.thread.prompt)).toBeVisible();
    await expect(page.locator('[data-thread]')).toBeVisible();
  });

  test('a clue dragged onto the suspect it settles stays there', async ({ page }) => {
    await recordPlays(page);
    await enter46(page);
    await drag(page, evidence(page, 'time-0451'), await middle(suspect(page, 'fidanzato')));
    await expect(suspect(page, 'fidanzato').locator('[data-evidence="time-0451"]')).toBeVisible();
    await expect(column(page).locator('[data-evidence="time-0451"]')).toHaveCount(0);
    expect(await played(page, 'stamp')).toBe(true);
    await expect(witnessLine(page)).toHaveText(room.witness.pinned['time-0451']);
    await expect(inHand(page)).toHaveCount(0);
  });

  test('two clicks pin a clue as a drag does', async ({ page }) => {
    await enter46(page);
    await evidence(page, 'profile').click();
    await expect(evidence(page, 'profile')).toHaveAttribute('data-picked');
    await suspect(page, 'professore').click();
    await expect(suspect(page, 'professore').locator('[data-evidence="profile"]')).toBeVisible();
    await expect(witnessLine(page)).toHaveText(room.witness.pinned.profile);
    await expect(inHand(page)).toHaveCount(0);
  });

  test('a clue on the wrong suspect flies back, counts once and gets the witness line', async ({ page }) => {
    await enter46(page);
    await evidence(page, 'time-0451').click();
    await suspect(page, 'diva').dblclick();
    await expect(column(page).locator('[data-evidence="time-0451"]')).toBeVisible();
    await expect(witnessLine(page)).toHaveText(room.witness.bounce['time-0451']);
    await expect(inHand(page)).toHaveCount(0);

    await pinClue(page, 'time-0451', 'giardiniere');
    await expect(witnessLine(page)).toHaveText(room.witness.bounce['time-0451']);
    await expect(hintButton(page)).toBeHidden();
    await pinClue(page, 'profile', 'fidanzato');
    await expect(hintButton(page)).toBeVisible();
    await expect(column(page).locator('[data-evidence]')).toHaveCount(3);
  });

  test('a drag released off any suspect, or cancelled, puts the card back with no error', async ({ page }) => {
    await enter46(page);
    const card = evidence(page, 'profile');
    const { width, height } = page.viewportSize()!;

    await drag(page, card, await middle(evidence(page, 'confession'))); // over the column
    await expect(column(page).locator('[data-evidence="profile"]')).toBeVisible();
    await expect(inHand(page)).toHaveCount(0);

    await dragTo(page, card, await middle(suspect(page, 'giardiniere')));
    await page.mouse.move(width + 40, height / 2); // out of the window
    await page.mouse.up();
    await expect(column(page).locator('[data-evidence="profile"]')).toBeVisible();
    await expect(inHand(page)).toHaveCount(0);

    await dragTo(page, card, await middle(suspect(page, 'giardiniere')));
    await expect(card).toHaveAttribute('data-dragging');
    await card.dispatchEvent('pointercancel');
    await page.mouse.up();
    await expect(column(page).locator('[data-evidence="profile"]')).toBeVisible();
    await expect(inHand(page)).toHaveCount(0);
    await expect(witnessLine(page)).toHaveText(room.witness.intro);

    // No error so far: the hint still waits for three wrong pins.
    await pinClue(page, 'profile', 'diva');
    await pinClue(page, 'profile', 'fidanzato');
    await expect(hintButton(page)).toBeHidden();
    await pinClue(page, 'confession', 'giardiniere');
    await expect(hintButton(page)).toBeVisible();
  });

  test('a drag released over the help buttons presses none of them', async ({ page }) => {
    await enter46(page, true);
    await page.clock.runFor(room.help.skipAfterSec * 1000);
    const skip = page.getByRole('button', { name: room.skip.button });
    await expect(skip).toBeVisible();
    for (const target of [hintButton(page), skip]) {
      await drag(page, evidence(page, 'confession'), await middle(target));
      await expect(column(page).locator('[data-evidence="confession"]')).toBeVisible();
      await expect(inHand(page)).toHaveCount(0);
    }
    await expect(page.locator('[data-hint]')).toBeHidden();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('with the three clues the fiancé objects and the others are innocent', async ({ page }) => {
    await enter46(page, true);
    await pinAllThenStop(page);
    const accused = [
      ['fidanzato', content.memes.objection.text],
      ['giardiniere', content.memes.innocent.text],
      ['professore', content.memes.innocent.text],
    ] as const;
    for (const [i, [id, text]] of accused.entries()) {
      await accuseSuspect(page, id);
      await expect(meme(page)).toHaveText(text);
      await expect(witnessLine(page)).toHaveText(room.witness.accused[id]);
      await expect(hintButton(page)).toBeVisible({ visible: i === 2 });
      await page.clock.runFor(100); // the meme leaves and the thread is back on its pin
      await expect(meme(page)).toHaveCount(0);
    }
    await expect(page.locator('[data-solved]')).toHaveCount(0);
  });

  test('the diva closes the case: verdicts, stamp, then the wish of s', async ({ page }) => {
    await recordPlays(page);
    await enter46(page, true);
    await pinAllThenStop(page);
    await accuseSuspect(page, CULPRIT);
    await expect(page.locator('[data-solved]')).toHaveCount(1);
    await expect(page.locator('[data-suspect] [data-stamp]')).toHaveText([room.stamps.out, room.stamps.out, room.stamps.out, room.stamps.guilty]);
    for (const { id, verdict } of room.suspects) await expect(suspect(page, id).locator('[data-verdict]')).toHaveText(verdict);
    await expect(suspect(page, CULPRIT)).toHaveAttribute('data-outcome', 'guilty');
    await expect(witnessLine(page)).toHaveText(room.witness.solved);
    expect(await played(page, 'stamp')).toBe(true);
    await expect(page.getByRole('button', { name: content.ui.back })).toBeHidden();

    await page.clock.resume();
    await expect(wish(page)).toContainText(fragment('stanza-46'));
    await continueWish(page);
    await expect(board(page)).toBeVisible();
    expect(await solvedInSave(page)).toContain('stanza-46');
  });

  test('a double accusation of the diva solves the room once', async ({ page }) => {
    await enter46(page);
    for (const clue of EVIDENCE) await pinClue(page, clue);
    await page.locator('[data-thread]').click();
    await suspect(page, CULPRIT).dblclick();
    await expect(wish(page)).toHaveCount(1);
    await continueWish(page);
    await expect(board(page)).toBeVisible();
    expect((await solvedInSave(page)).filter((id) => id === 'stanza-46')).toHaveLength(1);
  });

  test('Ctrl+Shift+N during the beat solves the room once', async ({ page }) => {
    await enter46(page, true);
    await pinAllThenStop(page);
    await accuseSuspect(page, CULPRIT);
    await expect(page.locator('[data-solved]')).toHaveCount(1);
    await page.keyboard.press('Control+Shift+KeyN');
    await page.clock.runFor(10_000);
    await expect(wish(page)).toHaveCount(1);
    await page.clock.runFor(10_000);
    await expect(wish(page)).toHaveCount(1);
    expect((await solvedInSave(page)).filter((id) => id === 'stanza-46')).toHaveLength(1);
  });

  test('the room starts over after leaving', async ({ page }) => {
    await enter46(page);
    await pinClue(page, 'profile');
    await pinClue(page, 'time-0451');
    await accuseSuspect(page, 'diva');
    await expect(witnessLine(page)).toHaveText(room.witness.blind[0]);
    await page.getByRole('button', { name: content.ui.back }).click();
    await expect(board(page)).toBeVisible();
    await enterRoom(page, 'stanza-46');
    await expect(column(page).locator('[data-evidence]')).toHaveCount(3);
    await expect(page.locator('[data-slot] [data-evidence]')).toHaveCount(0);
    await accuseSuspect(page, 'diva');
    await expect(witnessLine(page)).toHaveText(room.witness.blind[0]);
  });

  test.describe('at 1366x768', () => {
    test.use({ viewport: { width: 1366, height: 768 } });

    test('every quote and verdict fits its card', async ({ page }) => {
      await enter46(page, true);
      await page.evaluate(() => document.fonts.ready);
      expect(await overflowingText(page)).toEqual([]);
      await pinClue(page, 'profile', 'professore'); // the longest name over the tallest pinned card
      await pinAllThenStop(page);
      expect(await overflowingText(page)).toEqual([]);
      await accuseSuspect(page, CULPRIT);
      await expect(page.locator('[data-solved]')).toHaveCount(1);
      expect(await overflowingText(page)).toEqual([]);
    });
  });
});

test('an accusation before the three clues is blind: a new line each time, and the fourth plays the video', async ({ page }) => {
  await enter46(page);
  await pinClue(page, 'confession');
  for (const [i, line] of room.witness.blind.slice(0, room.blindTries).entries()) {
    await accuseSuspect(page, SUSPECT_IDS[i % SUSPECT_IDS.length]);
    await expect(witnessLine(page)).toHaveText(line);
    if (i < room.blindTries - 1) {
      await expect(meme(page)).toHaveCount(0);
      await expect(page.locator('[data-thread][data-flying]')).toHaveCount(0); // back on its pin
    }
  }
  const video = meme(page).locator('video');
  await expect(video).toHaveCount(1);
  expect(await video.getAttribute('src')).toMatch(new RegExp(`${content.memes.getHelp.video}$`));
  await expect(meme(page)).toHaveCount(0, { timeout: (await duration(page, '--duration-clip')) + 1000 });
  await expect(page.locator('[data-solved]')).toHaveCount(0);
});
