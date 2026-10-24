// Finale e2e (mockup 03, the plan's decisions 9-11, 14 and 17): the accusation of the culprit ends on the finale,
// after the wish of the last fragment, with the whole link, the stamp on its card, the strings of mockup 03 and
// "Guarda la confessione?", and no way back, audience or help. Nothing leaves the page before the button, which
// opens exactly the video, in one tab even under a double click (Review Focus 4). The app reopens on the finale
// until the button is pressed, whether it was closed during the beat, during the wish or on the finale (Review
// Focus 5), and the host's debug menu reaches the video with the other rooms unsolved. Durations are cut to 1 ms.
// The button is pressed only with the network blocked: it opens the real video.
import { expect, test, type Page } from '@playwright/test';
import { EVIDENCE } from '../../src/rooms/stanza-46/deduction';
import {
  BEFORE_46,
  content,
  continueWish,
  enterRoom,
  finale,
  FINISHED,
  fragment,
  offline,
  quick,
  roomScreen,
  seed,
  VIDEO,
  watchButton,
  wish,
} from './helpers';
import { accuseSuspect, CULPRIT, pinClue } from './play';

test.beforeEach(({ page }) => quick(page));

const room = content.rooms['stanza-46'];

/** Room 46 from a save with its door open, the three clues pinned where they settle. */
async function readyToAccuse(page: Page): Promise<void> {
  await seed(page, BEFORE_46);
  await page.goto('/');
  await enterRoom(page, 'stanza-46');
  for (const clue of EVIDENCE) await pinClue(page, clue);
}

/** The finale on screen and done: the link whole, the stamp on it, the button up and live. */
async function finaleWithButton(page: Page): Promise<void> {
  await expect(finale(page)).toBeVisible();
  await expect(wish(page)).toHaveCount(0);
  await expect(page.locator('[data-fragment][data-hidden]')).toHaveCount(0);
  await expect(finale(page).locator('[data-stamp]').getByText(content.ui.finale.stamp)).toBeVisible();
  await expect(watchButton(page)).toBeVisible();
  await expect(watchButton(page)).not.toHaveAttribute('aria-disabled');
}

test('the accusation of the diva ends on the finale: complete link, stamp and button', async ({ context, page, baseURL }) => {
  await offline(context, baseURL!);
  await readyToAccuse(page);
  await accuseSuspect(page, CULPRIT);
  await expect(wish(page)).toContainText(fragment('stanza-46'));
  await continueWish(page);

  await finaleWithButton(page);
  await expect(page.locator('[data-fragment]')).toHaveText(content.link.map((part: { text: string }) => part.text));
  await expect(finale(page)).toContainText(content.ui.link.done);
  for (const { id, verdict } of room.suspects) await expect(page.locator(`[data-suspect="${id}"] [data-verdict]`)).toHaveText(verdict);
  await expect(page.locator(`[data-suspect="${CULPRIT}"]`)).toHaveAttribute('data-outcome', 'guilty');
  await expect(finale(page).locator('[data-clue]')).toHaveCount(EVIDENCE.length);
  // The strings of mockup 03 (decision 17): the profile and the confession to the diva, the time to the fiancé.
  const strings = await finale(page)
    .locator('[data-string]')
    .evaluateAll((paths) => paths.map((path) => path.getAttribute('data-string')));
  expect(strings).toEqual(['profile diva', 'time-0451 fidanzato', 'confession diva']);
  await expect(page.locator('[data-witness] .witness__line')).toHaveText(content.witness.finale);
  for (const name of [content.ui.back, content.ui.audience.button, content.ui.hint.button, room.skip.button]) {
    await expect(page.getByRole('button', { name })).toHaveCount(0);
  }
  await expect(page.locator('[data-audience], .help')).toHaveCount(0);
});

test('nothing leaves the page before the button, which opens exactly the video', async ({ context, page, baseURL }) => {
  const outside = await offline(context, baseURL!);
  await seed(page, FINISHED);
  await page.goto('/');
  await finaleWithButton(page);
  await page.evaluate(() => document.fonts.ready);
  expect(outside).toEqual([]);

  const popup = page.waitForEvent('popup');
  const leaving = context.waitForEvent('request', (request) => !request.url().startsWith(baseURL!));
  await watchButton(page).click();
  const [tab, request] = await Promise.all([popup, leaving]);
  // The tab ends on the browser's error page, since the network is blocked: what it asked for is the video.
  expect(request.url()).toBe(VIDEO);
  expect(request.isNavigationRequest()).toBe(true);
  expect(request.frame().page()).toBe(tab);
  await expect.poll(() => outside).toEqual([VIDEO]);
  await expect(watchButton(page)).toHaveAttribute('aria-disabled', 'true');
});

test('a double click on the button opens one tab', async ({ context, page, baseURL }) => {
  const outside = await offline(context, baseURL!);
  await seed(page, FINISHED);
  await page.goto('/');
  const popups: Page[] = [];
  page.on('popup', (opened) => popups.push(opened));
  await watchButton(page).dblclick();
  await expect.poll(() => outside).toEqual([VIDEO]);
  await expect.poll(() => popups.length).toBe(1);
  await watchButton(page).click({ force: true }); // switched off: it only shakes
  await expect(watchButton(page)).toHaveAttribute('data-nope');
  expect(popups).toHaveLength(1);
  expect(outside).toEqual([VIDEO]);
});

test('the app reopens on the finale until the button is pressed', async ({ page }) => {
  // Closed during the beat: the culprit is accused and the clock stands still before the wish.
  await page.clock.install();
  await readyToAccuse(page);
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
  await accuseSuspect(page, CULPRIT);
  await expect(page.locator('[data-solved]')).toHaveCount(1);
  await page.reload();
  await page.clock.resume();
  await finaleWithButton(page);

  // Closed during the wish, which the host's Ctrl+Shift+N in Room 46 brings again.
  await page.keyboard.press('Control+Shift+KeyD');
  await page.getByRole('button', { name: room.name }).click();
  await expect(roomScreen(page, 'stanza-46')).toBeVisible();
  await page.keyboard.press('Control+Shift+KeyN');
  await expect(wish(page)).toContainText(fragment('stanza-46'));
  await page.reload();
  await finaleWithButton(page);

  // Closed on the finale.
  await page.reload();
  await finaleWithButton(page);
});

test('the debug menu reaches the video with the other rooms unsolved', async ({ context, page, baseURL }) => {
  const outside = await offline(context, baseURL!);
  await page.goto('/');
  await page.keyboard.press('Control+Shift+KeyD');
  await page.getByRole('button', { name: room.name }).click();
  await expect(roomScreen(page, 'stanza-46')).toBeVisible();
  await page.keyboard.press('Control+Shift+KeyN');
  await continueWish(page);

  await expect(finale(page)).toBeVisible();
  const bars = page.locator('[data-fragment][data-hidden]');
  await expect(bars).toHaveCount(4);
  for (const id of ['studio', 'scacchiera', 'biblioteca', 'rapture']) await expect(page.locator(`[data-fragment="${id}"]`)).toHaveAttribute('data-hidden');
  await expect(page.locator('[data-fragment="stanza-46"]')).toHaveText(fragment('stanza-46'));
  await expect(watchButton(page)).toBeVisible();
  expect(outside).toEqual([]);

  await watchButton(page).click();
  await expect.poll(() => outside).toEqual([VIDEO]);
});
