// Host hotkeys e2e: Ctrl+Shift+N solves the open room, H shows a hint even in Rapture, G gives a token
// back, D leads to any room (Room 46 included) and R wipes progress only after the confirmation, on the
// finale too, where N and H find no room to act on. Durations are cut to 1 ms.
import { expect, test } from '@playwright/test';
import { board, content, continueWish, enterRoom, finale, FINISHED, openCase, quick, roomScreen, seed, watchButton } from './helpers';

test.beforeEach(({ page }) => quick(page));

test('Ctrl+Shift+N completes the open room', async ({ page }) => {
  await openCase(page);
  await enterRoom(page, 'studio');
  await page.keyboard.press('Control+Shift+KeyN');
  await continueWish(page);
  await expect(board(page)).toBeVisible();
  await expect(page.locator('[data-fragment="studio"]')).toHaveText('71');
});

test('Ctrl+Shift+D leads to Room 46', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+Shift+KeyD');
  await page.getByRole('button', { name: content.rooms['stanza-46'].name }).click();
  await expect(roomScreen(page, 'stanza-46')).toContainText(content.rooms['stanza-46'].header);
});

test('Ctrl+Shift+H shows a hint in Rapture, where there is no hint button', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+Shift+KeyD');
  await page.getByRole('button', { name: content.rooms.rapture.name }).click();
  await expect(roomScreen(page, 'rapture')).toBeVisible();
  await page.keyboard.press('Control+Shift+KeyH');
  await expect(page.locator('[data-hint]')).toContainText(content.rooms.rapture.hints[0]);
  await expect(page.getByRole('button', { name: content.ui.hint.button })).toHaveCount(0);
});

test('Ctrl+Shift+G gives back a spent token', async ({ page }) => {
  await page.clock.install();
  await openCase(page);
  await enterRoom(page, 'studio');
  const left = page.locator('[data-audience] [data-token="left"]');
  await page.getByRole('button', { name: content.ui.audience.button }).click();
  await page.getByRole('button', { name: content.ui.audience.done }).click();
  await expect(left).toHaveCount(2);
  await page.keyboard.press('Control+Shift+KeyG');
  await expect(left).toHaveCount(3);
});

test('Ctrl+Shift+R asks before wiping progress', async ({ page }) => {
  await openCase(page);
  await page.keyboard.press('Control+Shift+KeyR');
  await page.getByRole('button', { name: content.ui.reset.no }).click();
  await expect(board(page)).toBeVisible();
  await page.keyboard.press('Control+Shift+KeyR');
  await page.getByRole('button', { name: content.ui.reset.yes }).click();
  await expect(page.getByRole('heading', { name: content.ui.intro.question })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: content.ui.intro.question })).toBeVisible();
});

test('on the finale only the host reset acts, and it wipes the case', async ({ page }) => {
  await seed(page, FINISHED);
  await page.goto('/');
  await expect(watchButton(page)).toBeVisible();
  await page.keyboard.press('Control+Shift+KeyN');
  await page.keyboard.press('Control+Shift+KeyH');
  await expect(finale(page)).toBeVisible();
  await expect(page.locator('[data-wish], [data-hint]')).toHaveCount(0);
  await page.keyboard.press('Control+Shift+KeyR');
  await page.getByRole('button', { name: content.ui.reset.yes }).click();
  await expect(page.getByRole('heading', { name: content.ui.intro.question })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: content.ui.intro.question })).toBeVisible();
});
