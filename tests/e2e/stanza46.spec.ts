// Room 46 e2e (mockup 11, the plan's decisions 2, 4-6, 15 and 17-19): four suspects with their lines, the three
// clues in a column and the link with its last bar. A clue lands on a suspect by a drag or by two clicks; on a
// suspect it fits it stays as its short label, with the stamp and the witness's line, up to three on one card, and
// anywhere else it goes back, counting one error on a wrong suspect, a double click included, and none when let go
// off every suspect or cancelled (Review Focus 3). A pinned clue comes back to the column by a drag or two clicks
// with no error, and moved onto another suspect it is judged again; "Ricomincia?" puts every clue back and counts
// nothing. The third clue pinned makes the thread's end pulse and the witness invite the accusation. An accusation
// before the three clues are pinned is blind, with a new line each time and the video every third time; with the
// three, the fiancé objects, the other two are innocent and the diva closes the case once, saved at the
// accusation, the wish of s leading to the finale. Every visit starts over, and every line fits its card at
// 1366x768. Durations are cut to 1 ms, but for the test that watches the video meme.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { SAVE_KEY } from '../../src/engine/save';
import { EVIDENCE, SUSPECT_IDS, type Evidence } from '../../src/rooms/stanza-46/deduction';
import { overflowingText } from './checks';
import { BEFORE_46, board, content, continueWish, duration, enterRoom, finale, fragment, played, quick, recordPlays, seed, wish } from './helpers';
import { accuseSuspect, CULPRIT, evidence, fitsOn, pinClue, suspect } from './play';

const room = content.rooms['stanza-46'];

const witnessLine = (page: Page) => page.locator('[data-witness] .witness__line');
const hintButton = (page: Page) => page.getByRole('button', { name: content.ui.hint.button });
const restart = (page: Page) => page.getByRole('button', { name: room.restart });
const column = (page: Page) => page.locator('[data-column]');
const inHand = (page: Page) => page.locator('[data-dragging], [data-picked]');
const meme = (page: Page) => page.locator('[data-meme]');
const pinnedOn = (page: Page, id: string, clue: Evidence) => suspect(page, id).locator(`[data-evidence="${clue}"]`);

const solvedInSave = (page: Page): Promise<string[]> =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).state.solved, SAVE_KEY);

/** Whether the thread's end runs an animation of its own, the pulse; a flight is a transition, not counted. */
const pulsing = (page: Page): Promise<boolean> =>
  page.locator('[data-thread]').evaluate((knob) => knob.getAnimations({ subtree: true }).some((animation) => animation instanceof CSSAnimation));

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

/** Presses the pointer on the card, once it stands still (a flight to its place may outlast its 1 ms by a
 *  frame), and moves it, in steps, to this point, still pressed. */
async function dragTo(page: Page, card: Locator, to: { x: number; y: number }): Promise<void> {
  await card.hover();
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

/** A pinned clue taken back by two clicks: its label on the suspect, then its empty place in the column. */
async function takeBack(page: Page, clue: Evidence): Promise<void> {
  await page.locator(`[data-slot] [data-evidence="${clue}"]`).click();
  await page.locator(`[data-spot="${clue}"]`).click();
  await expect(column(page).locator(`[data-evidence="${clue}"]`)).toBeVisible();
}

/** The three clues pinned as play.ts pins them, those still in the column, then the clock stopped, so the
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
    await expect(restart(page)).toBeHidden(); // nothing to put back yet
  });

  test('a clue dragged onto a suspect it fits stays there, as its short label', async ({ page }) => {
    await recordPlays(page);
    await enter46(page);
    await drag(page, evidence(page, 'time-0451'), await middle(suspect(page, 'fidanzato')));
    await expect(pinnedOn(page, 'fidanzato', 'time-0451')).toHaveText(room.short['time-0451'], { useInnerText: true });
    await expect(column(page).locator('[data-evidence="time-0451"]')).toHaveCount(0);
    expect(await played(page, 'stamp')).toBe(true);
    await expect(witnessLine(page)).toHaveText(room.witness.pinned['time-0451']);
    await expect(inHand(page)).toHaveCount(0);
  });

  test('two clicks pin a clue as a drag does', async ({ page }) => {
    await enter46(page);
    await evidence(page, 'profile').click();
    await expect(evidence(page, 'profile')).toHaveAttribute('data-picked');
    await suspect(page, 'fidanzato').click();
    await expect(pinnedOn(page, 'fidanzato', 'profile')).toHaveText(room.short.profile, { useInnerText: true });
    await expect(witnessLine(page)).toHaveText(room.witness.pinned.profile);
    await expect(inHand(page)).toHaveCount(0);
  });

  test('every clue stays where it fits and flies back elsewhere', async ({ page }) => {
    await enter46(page);
    for (const clue of EVIDENCE) {
      for (const id of SUSPECT_IDS) {
        await pinClue(page, clue, id);
        if (fitsOn(clue, id)) {
          await expect(pinnedOn(page, id, clue)).toHaveText(room.short[clue], { useInnerText: true });
          await expect(witnessLine(page)).toHaveText(room.witness.pinned[clue]);
          await takeBack(page, clue);
        } else {
          await expect(column(page).locator(`[data-evidence="${clue}"]`)).toBeVisible();
          await expect(witnessLine(page)).toHaveText(room.witness.bounce[clue]);
        }
        await expect(inHand(page)).toHaveCount(0);
      }
    }
  });

  test('a clue on the wrong suspect flies back, counts once and gets the witness line', async ({ page }) => {
    await enter46(page);
    await evidence(page, 'time-0451').click();
    await suspect(page, 'giardiniere').dblclick();
    await expect(column(page).locator('[data-evidence="time-0451"]')).toBeVisible();
    await expect(witnessLine(page)).toHaveText(room.witness.bounce['time-0451']);
    await expect(inHand(page)).toHaveCount(0);

    await pinClue(page, 'time-0451', 'professore');
    await expect(witnessLine(page)).toHaveText(room.witness.bounce['time-0451']);
    await expect(hintButton(page)).toBeHidden();
    await pinClue(page, 'confession', 'fidanzato');
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
    await pinClue(page, 'profile', 'giardiniere');
    await pinClue(page, 'profile', 'professore');
    await expect(hintButton(page)).toBeHidden();
    await pinClue(page, 'confession', 'fidanzato');
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

  test('a pinned clue comes back to the column by drag or by two clicks, with no error', async ({ page }) => {
    await enter46(page);
    await pinClue(page, 'profile', 'diva');
    await drag(page, pinnedOn(page, 'diva', 'profile'), await middle(column(page)));
    await expect(column(page).locator('[data-evidence="profile"]')).toBeVisible();
    await expect(inHand(page)).toHaveCount(0);

    await pinClue(page, 'profile', 'diva');
    await pinnedOn(page, 'diva', 'profile').click();
    await column(page).click(); // on the 04:51 card, which stays where it is
    await expect(column(page).locator('[data-evidence="profile"]')).toBeVisible();
    await expect(inHand(page)).toHaveCount(0);

    await pinClue(page, 'profile', 'diva');
    await takeBack(page, 'profile');
    await expect(page.locator('[data-slot] [data-evidence]')).toHaveCount(0);
    await expect(inHand(page)).toHaveCount(0);
    await expect(hintButton(page)).toBeHidden();
  });

  test('a pinned clue moved onto another suspect is judged again', async ({ page }) => {
    await enter46(page);
    await pinClue(page, 'profile', 'fidanzato');
    await pinClue(page, 'profile', 'diva'); // it fits there too: it moves
    await expect(suspect(page, 'fidanzato').locator('[data-evidence]')).toHaveCount(0);
    await expect(witnessLine(page)).toHaveText(room.witness.pinned.profile);

    await pinClue(page, 'confession', 'diva');
    await drag(page, pinnedOn(page, 'diva', 'confession'), await middle(suspect(page, 'fidanzato')));
    await expect(column(page).locator('[data-evidence="confession"]')).toBeVisible();
    await expect(witnessLine(page)).toHaveText(room.witness.bounce.confession);
    await expect(inHand(page)).toHaveCount(0);

    // One error: the hint comes with the third, two wrong pins later.
    await pinClue(page, 'time-0451', 'giardiniere');
    await expect(hintButton(page)).toBeHidden();
    await pinClue(page, 'time-0451', 'professore');
    await expect(hintButton(page)).toBeVisible();
  });

  test('Ricomincia? puts every clue back in the column and counts nothing', async ({ page }) => {
    await enter46(page);
    await pinClue(page, 'profile');
    await accuseSuspect(page, CULPRIT);
    await expect(witnessLine(page)).toHaveText(room.witness.blind[0]); // the first error
    await restart(page).click();
    await expect(column(page).locator('[data-evidence]')).toHaveCount(3);
    await expect(restart(page)).toBeHidden();

    for (const clue of EVIDENCE) await pinClue(page, clue);
    await restart(page).click();
    await expect(column(page).locator('[data-evidence]')).toHaveCount(3);
    await expect(page.locator('[data-slot] [data-evidence]')).toHaveCount(0);
    for (const id of SUSPECT_IDS) await expect(suspect(page, id).locator('[data-slot]')).toHaveText(room.slot);
    await expect(witnessLine(page)).toHaveText(room.witness.intro);
    await expect(inHand(page)).toHaveCount(0);

    await accuseSuspect(page, CULPRIT);
    await expect(witnessLine(page)).toHaveText(room.witness.blind[1]); // the blind count goes on: the second error
    await expect(hintButton(page)).toBeHidden(); // the two restarts counted none
    await pinClue(page, 'confession', 'giardiniere');
    await expect(hintButton(page)).toBeVisible();
  });

  test('the third clue makes the thread pulse and the witness invite the accusation', async ({ page }) => {
    await enter46(page);
    await pinClue(page, 'profile');
    await pinClue(page, 'time-0451');
    await expect(witnessLine(page)).toHaveText(room.witness.pinned['time-0451']);
    expect(await pulsing(page)).toBe(false);

    await pinClue(page, 'confession');
    await expect(witnessLine(page)).toHaveText(room.witness.ready);
    await expect.poll(() => pulsing(page)).toBe(true);

    await takeBack(page, 'time-0451');
    await expect.poll(() => pulsing(page)).toBe(false);
  });

  test('profile and confession on the diva, 04:51 on the fiancé: the thread on the diva solves the room', async ({ page }) => {
    await enter46(page, true);
    for (const [clue, on] of [['profile', 'diva'], ['time-0451', 'fidanzato'], ['confession', 'diva']] as const) {
      await drag(page, evidence(page, clue), await middle(suspect(page, on)));
      await expect(pinnedOn(page, on, clue)).toBeVisible();
    }
    await expect(suspect(page, 'diva').locator('[data-evidence]')).toHaveCount(2);
    await stopClock(page);
    await drag(page, page.locator('[data-thread]'), await middle(suspect(page, 'diva')));
    await expect(page.locator('[data-solved]')).toHaveCount(1);
    await expect(suspect(page, 'diva')).toHaveAttribute('data-outcome', 'guilty');
    await expect(witnessLine(page)).toHaveText(room.witness.solved);
  });

  test('with profile and 04:51 on the fiancé, accusing him objects', async ({ page }) => {
    await enter46(page, true);
    await pinClue(page, 'profile', 'fidanzato');
    await pinClue(page, 'time-0451', 'fidanzato');
    await pinClue(page, 'confession', 'diva');
    await expect(suspect(page, 'fidanzato').locator('[data-evidence]')).toHaveCount(2);
    await stopClock(page);
    await accuseSuspect(page, 'fidanzato');
    await expect(meme(page)).toHaveText(content.memes.objection.text);
    await expect(witnessLine(page)).toHaveText(room.witness.accused.fidanzato);
    await page.clock.runFor(100); // the meme leaves and the thread is back on its pin
    await expect(meme(page)).toHaveCount(0);
    await expect(page.locator('[data-solved]')).toHaveCount(0);
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
    await expect(restart(page)).toBeHidden();
    expect(await solvedInSave(page)).toContain('stanza-46'); // saved at once, though the beat still runs

    await page.clock.resume();
    await expect(wish(page)).toContainText(fragment('stanza-46'));
    await continueWish(page);
    await expect(finale(page)).toBeVisible();
  });

  test('a double accusation of the diva solves the room once', async ({ page }) => {
    await enter46(page);
    for (const clue of EVIDENCE) await pinClue(page, clue);
    await page.locator('[data-thread]').click();
    await suspect(page, CULPRIT).dblclick();
    await expect(wish(page)).toHaveCount(1);
    await continueWish(page);
    await expect(finale(page)).toBeVisible();
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

    test('the diva holds all three clues, and every text fits at 1366x768', async ({ page }) => {
      await enter46(page, true);
      await page.evaluate(() => document.fonts.ready);
      expect(await overflowingText(page)).toEqual([]);
      await pinClue(page, 'profile', 'fidanzato');
      await pinClue(page, 'time-0451', 'fidanzato');
      expect(await overflowingText(page)).toEqual([]);

      await pinClue(page, 'profile', 'diva');
      await pinClue(page, 'time-0451', 'diva');
      await evidence(page, 'confession').click();
      await pinnedOn(page, 'diva', 'profile').click(); // the diva takes it, and the label clicked stays put
      await expect(suspect(page, 'diva').locator('[data-evidence]')).toHaveCount(3);
      await expect(inHand(page)).toHaveCount(0);
      expect(await overflowingText(page)).toEqual([]);

      await stopClock(page);
      await accuseSuspect(page, CULPRIT);
      await expect(page.locator('[data-solved]')).toHaveCount(1);
      expect(await overflowingText(page)).toEqual([]);
    });
  });
});

test('an accusation before the three clues is blind: a new line each time, and the third plays the video', async ({ page }) => {
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
  // The third blind accusation is the third error too: the hint comes with the video, which still leaves by itself.
  await expect(meme(page)).toHaveCount(0, { timeout: (await duration(page, '--duration-clip')) + 1000 });
  await expect(hintButton(page)).toBeVisible();
  await expect(page.locator('[data-solved]')).toHaveCount(0);

  // The fourth line still comes in turn, with no video.
  await accuseSuspect(page, 'diva');
  await expect(witnessLine(page)).toHaveText(room.witness.blind[3]);
  await expect(meme(page)).toHaveCount(0);
});
