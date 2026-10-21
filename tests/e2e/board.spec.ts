// Board e2e: the case opens offline with local fonts, "No?" runs away, the doors follow the clue
// graph, earned fragments survive a reload, rooms lead back to the board, and the 16:9 stage fits the
// three test resolutions with the background filling the window.
import { expect, test } from '@playwright/test';
import { board, content, door, enterRoom, offline, openCase, roomScreen, solveRoom } from './helpers';

test('the case opens offline with local fonts', async ({ context, page, baseURL }) => {
  const outside = await offline(context, baseURL!);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: content.ui.intro.question })).toBeVisible();
  const fontLoaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some((font) => font.family.includes('Special Elite') && font.status === 'loaded');
  });
  expect(fontLoaded).toBe(true);
  expect(outside).toEqual([]);
});

test('"No?" runs away from the mouse', async ({ page }) => {
  await page.goto('/');
  const no = page.getByRole('button', { name: content.ui.intro.no });
  const where = async () => {
    const box = (await no.boundingBox())!;
    return `${Math.round(box.x)},${Math.round(box.y)}`;
  };
  const before = await where();
  await no.hover();
  await expect.poll(where).not.toBe(before);

  const stage = (await page.locator('#stage').boundingBox())!;
  const after = (await no.boundingBox())!;
  expect(after.x).toBeGreaterThanOrEqual(stage.x);
  expect(after.y).toBeGreaterThanOrEqual(stage.y);
  expect(after.x + after.width).toBeLessThanOrEqual(stage.x + stage.width);
  expect(after.y + after.height).toBeLessThanOrEqual(stage.y + stage.height);
  await expect(page.locator('[data-screen="intro"]')).toBeVisible();
});

test('at the start only the study and the chessboard are open', async ({ page }) => {
  await openCase(page);
  for (const id of ['studio', 'scacchiera']) {
    await expect(door(page, id).getByRole('button', { name: content.ui.enter })).toBeVisible();
  }
  for (const id of ['biblioteca', 'rapture', 'stanza-46']) {
    await expect(door(page, id).getByRole('button')).toHaveCount(0);
  }
  await expect(door(page, 'biblioteca')).toContainText('Servono delle coordinate?');
  await expect(door(page, 'rapture')).toContainText('Serve un codice?');
  await expect(door(page, 'stanza-46')).toContainText('Servono tutti gli indizi?');
  await expect(page.locator('[data-fragment="fascicolo"]')).toHaveText('youtu.be/');
  await expect(page.locator('[data-fragment][data-hidden]')).toHaveCount(5);
  await expect(page.locator('[data-witness]')).toContainText(content.witness.board);
});

test('a room leads back to the board without solving it', async ({ page }) => {
  await openCase(page);
  await enterRoom(page, 'studio');
  await expect(roomScreen(page, 'studio')).toContainText(content.rooms.studio.header);
  await expect(page.locator('[data-witness]')).toContainText(content.rooms.studio.witness.intro);
  await page.getByRole('button', { name: content.ui.back }).click();
  await expect(board(page)).toBeVisible();
  await expect(door(page, 'studio').getByRole('button', { name: content.ui.enter })).toBeVisible();
});

test('a solved room shows its fragment and survives a reload', async ({ page }) => {
  await openCase(page);
  await solveRoom(page, 'studio');
  await expect(page.locator('[data-fragment="studio"]')).toHaveText('71');
  await expect(door(page, 'studio')).toContainText(content.ui.solved);
  await expect(page.locator('[data-clue="rule"]')).toContainText(content.clues.rule.label);
  await expect(page.locator('[data-clue="profile"]')).toContainText(content.clues.profile.label);

  await page.reload();
  await expect(board(page)).toBeVisible();
  await expect(page.locator('[data-fragment="studio"]')).toHaveText('71');
  await expect(door(page, 'studio')).toContainText(content.ui.solved);
});

test('the 16:9 stage fits 1707x1067 at 150%, 1920x1080 and 1366x768', async ({ browser, baseURL }) => {
  for (const [width, height, deviceScaleFactor] of [
    [1707, 1067, 1.5],
    [1920, 1080, 1],
    [1366, 768, 1],
  ]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height }, deviceScaleFactor });
    const page = await context.newPage();
    await openCase(page);
    const stage = (await page.locator('#stage').boundingBox())!;
    expect(stage.width / stage.height).toBeCloseTo(16 / 9, 2);
    expect(Math.abs(stage.width - width) < 1 || Math.abs(stage.height - height) < 1).toBe(true);
    expect(Math.abs(stage.x - (width - stage.width) / 2)).toBeLessThan(1);
    expect(Math.abs(stage.y - (height - stage.height) / 2)).toBeLessThan(1);
    const backdrop = (await page.locator('#app').boundingBox())!;
    expect([backdrop.x, backdrop.y, backdrop.width, backdrop.height]).toEqual([0, 0, width, height]);
    await context.close();
  }
});
