// Feedback e2e: every press answers with the click sound; a switched-off button keeps taking clicks, so it
// sounds and shakes and does nothing else; a double click selects no text; Rapture's frame speaks Poiret
// One. An init script counts the calls to HTMLMediaElement.prototype.play that play the click sound
// (howler also calls play() once on an empty element, to probe the autoplay lock).
import { expect, test, type Page } from '@playwright/test';
import { content, door, enterRoom, MOCKUP_01, roomScreen, seed } from './helpers';

/** How many times the page has started the click sound. */
const clicks = (page: Page) => page.evaluate(() => (window as unknown as { clicks: number }).clicks);

test.beforeEach(async ({ page }) => {
  await page.addInitScript((sound) => {
    const counter = window as unknown as { clicks: number };
    const play = HTMLMediaElement.prototype.play;
    counter.clicks = 0;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      if (this.src.endsWith(sound)) counter.clicks++;
      return play.call(this);
    };
  }, content.sounds.click);
});

test('every press plays the click sound', async ({ page }) => {
  await seed(page, { opened: true, solved: [], clues: [], tokens: content.tokens });
  await page.goto('/');
  await door(page, 'studio').getByRole('button', { name: content.ui.enter }).click();
  await expect.poll(() => clicks(page)).toBe(1);
  await page.getByRole('button', { name: content.ui.back }).click();
  await expect.poll(() => clicks(page)).toBe(2);
});

test('the spent audience button answers with a sound and a shake', async ({ page }) => {
  await seed(page, { opened: true, solved: [], clues: [], tokens: 0 });
  await page.goto('/');
  await enterRoom(page, 'studio');
  await expect.poll(() => clicks(page)).toBe(1); // "Entra?"
  const spent = page.getByRole('button', { name: content.ui.audience.spent });
  await spent.click({ force: true }); // a switched-off button fails Playwright's actionability check
  await expect.poll(() => clicks(page)).toBe(2);
  await expect(spent).toHaveAttribute('data-nope', '');
  await expect(spent).toBeDisabled();
  await expect(roomScreen(page, 'studio')).toBeVisible();
  await expect(page.locator('[data-audience-overlay]')).toBeHidden();
});

test('a double click selects no text', async ({ page }) => {
  await seed(page, MOCKUP_01);
  await page.goto('/');
  await page.getByRole('heading', { name: content.ui.case }).dblclick();
  expect(await page.evaluate(() => getSelection()?.toString())).toBe('');
});

test('Rapture speaks Poiret One', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+Shift+KeyD');
  await page.getByRole('button', { name: content.rooms.rapture.name }).click();
  const room = roomScreen(page, 'rapture');
  await expect(room).toBeVisible();
  await expect(room.getByText(content.rooms.rapture.header)).toHaveCSS('font-family', /^"?Poiret One/);
  await expect(room.getByRole('button', { name: content.ui.back })).toHaveCSS('font-family', /^"?Poiret One/);
  await expect(page.locator('[data-audience]')).toHaveCount(0);
});
