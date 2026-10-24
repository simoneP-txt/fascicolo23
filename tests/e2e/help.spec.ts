// Help e2e: the audience countdown spends one token at a time until the jury has spoken, Rapture shows
// no audience button, and the auto-help ladder offers a hint and then the way out by itself, with its
// own texts in Room 46, where it leads to the finale. The page clock is faked, so minutes pass at once,
// and durations are cut to 1 ms.
import { expect, test } from '@playwright/test';
import { board, content, continueWish, enterRoom, finale, openCase, quick } from './helpers';
import { solveRoom } from './play';

test.beforeEach(({ page }) => quick(page));

test('the audience countdown spends one token at a time', async ({ page }) => {
  await page.clock.install();
  await openCase(page);
  await enterRoom(page, 'studio');
  const button = page.getByRole('button', { name: content.ui.audience.button });
  const overlay = page.locator('[data-audience-overlay]');
  const left = page.locator('[data-audience] [data-token="left"]');

  await button.click();
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText(content.ui.audience.title);
  await expect(overlay.locator('[data-seconds]')).toHaveText(String(content.audienceSeconds));
  await page.clock.runFor(content.audienceSeconds * 1000);
  await expect(overlay).toBeHidden();
  await expect(left).toHaveCount(2);

  await button.click();
  await overlay.getByRole('button', { name: content.ui.audience.done }).click();
  await expect(overlay).toBeHidden();
  await expect(left).toHaveCount(1);

  await button.click();
  await page.clock.runFor(content.audienceSeconds * 1000);
  await expect(left).toHaveCount(0);
  await expect(page.getByRole('button', { name: content.ui.audience.spent })).toBeDisabled();
});

test('Rapture has no audience button', async ({ page }) => {
  await openCase(page);
  for (const id of ['studio', 'scacchiera', 'biblioteca'] as const) await solveRoom(page, id);
  await enterRoom(page, 'rapture');
  await expect(page.getByRole('button', { name: content.ui.audience.button })).toHaveCount(0);
  await expect(page.locator('[data-audience]')).toHaveCount(0);
});

test('help appears by itself in the chessboard', async ({ page }) => {
  const { hintAfterSec, skipAfterSec } = content.rooms.scacchiera.help;
  await page.clock.install();
  await openCase(page);
  await enterRoom(page, 'scacchiera');
  const hint = page.getByRole('button', { name: content.ui.hint.button });
  const skip = page.getByRole('button', { name: content.ui.skip.button });
  await expect(hint).toBeHidden();
  await expect(skip).toBeHidden();

  await page.clock.runFor(hintAfterSec * 1000);
  await expect(hint).toBeVisible();
  await expect(page.locator('[data-witness]')).toContainText(content.witness.help);
  await hint.click();
  await expect(page.locator('[data-hint]')).toContainText('AIUTO 1 DI 2');
  await expect(page.locator('[data-hint]')).toContainText(content.rooms.scacchiera.hints[0]);
  await expect(hint).toBeHidden();

  await page.clock.runFor((skipAfterSec - hintAfterSec) * 1000);
  await skip.click();
  await expect(page.getByRole('dialog')).toContainText(content.ui.skip.body);
  await page.getByRole('button', { name: content.ui.skip.yes }).click();
  await continueWish(page);
  await expect(board(page)).toBeVisible();
  await expect(page.locator('[data-fragment="scacchiera"]')).toHaveText('Kg4');
});

test('Room 46 offers to show the culprit', async ({ page }) => {
  const room = content.rooms['stanza-46'];
  await page.clock.install();
  await openCase(page);
  for (const id of ['studio', 'scacchiera', 'biblioteca', 'rapture'] as const) await solveRoom(page, id);
  await enterRoom(page, 'stanza-46');
  await page.clock.runFor(room.help.skipAfterSec * 1000);
  await page.getByRole('button', { name: room.skip.button }).click();
  await page.getByRole('button', { name: room.skip.no }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: room.skip.button }).click();
  await page.getByRole('button', { name: room.skip.yes }).click();
  await continueWish(page);
  await expect(finale(page)).toBeVisible();
  await expect(page.locator('[data-fragment="stanza-46"]')).toHaveText('s');
});
