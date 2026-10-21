// Help e2e: the audience countdown spends one token at a time until the jury has spoken, and Rapture
// shows no audience button. The page clock is faked, so 30 seconds pass at once.
import { expect, test } from '@playwright/test';
import { content, enterRoom, openCase, solveRoom } from './helpers';

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
  for (const id of ['studio', 'scacchiera', 'biblioteca']) await solveRoom(page, id);
  await enterRoom(page, 'rapture');
  await expect(page.getByRole('button', { name: content.ui.audience.button })).toHaveCount(0);
  await expect(page.locator('[data-audience]')).toHaveCount(0);
});
