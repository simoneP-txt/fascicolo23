// Board e2e: the case opens offline with local fonts, every sound loads before the first click and a click
// plays the click sound, "No?" runs away, the doors follow the clue
// graph, earned fragments survive a reload and rooms lead back to the board. The board of mockup 01 has
// its clue cards, strings, locks, stamps and tokens; a room won stamps its door and stretches its strings
// only once the wish is over, moving nothing but transform, opacity and the strings' dash; the finished
// board offers the confession in place of the tokens. Durations are cut to 1 ms.
import { expect, test } from '@playwright/test';
import {
  board,
  content,
  continueWish,
  door,
  enterRoom,
  FINISHED,
  MOCKUP_01,
  offline,
  openCase,
  played,
  quick,
  recordPlays,
  roomScreen,
  seed,
  wish,
} from './helpers';
import { solveRoom } from './play';

test.beforeEach(({ page }) => quick(page));

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

test('every sound loads while the first screen waits for its first click', async ({ page }) => {
  const loaded: string[] = [];
  page.on('response', (response) => {
    if (response.ok()) loaded.push(response.url());
  });
  await page.goto('/');
  for (const path of Object.values(content.sounds) as string[]) {
    await expect.poll(() => loaded.some((url) => url.endsWith(path)), { message: path }).toBe(true);
  }
});

test('a click plays the click sound', async ({ page }) => {
  await recordPlays(page);
  await page.goto('/');
  await page.getByRole('button', { name: content.ui.intro.yes }).click();
  await expect.poll(() => played(page, 'click')).toBe(true);
});

test('"No?" waits beside "Sì?" until the mouse reaches it', async ({ page }) => {
  await page.goto('/');
  const yes = (await page.getByRole('button', { name: content.ui.intro.yes }).boundingBox())!;
  const no = (await page.getByRole('button', { name: content.ui.intro.no }).boundingBox())!;
  expect(Math.abs(no.y - yes.y)).toBeLessThan(8);
  expect(no.x).toBeGreaterThan(yes.x + yes.width);
  expect(no.x - (yes.x + yes.width)).toBeLessThan(48);
  await expect(page.locator('.intro__slot')).toHaveCount(0);
});

test('"No?" runs away from the mouse and leaves its slot empty', async ({ page }) => {
  await page.goto('/');
  const no = page.getByRole('button', { name: content.ui.intro.no });
  const where = async () => {
    const box = (await no.boundingBox())!;
    return `${Math.round(box.x)},${Math.round(box.y)}`;
  };
  const before = await where();
  await no.hover();
  await expect.poll(where).not.toBe(before);
  await expect(page.locator('.intro__slot')).toBeVisible();
  const jumped = await where();
  await page.mouse.move(0, 0); // a real mouse leaves the card on its way back to it
  await no.hover();
  await expect.poll(where).not.toBe(jumped);

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

test('the board shows the mockup 01 state', async ({ page }) => {
  await seed(page, MOCKUP_01);
  await page.goto('/');
  await expect(page.locator('[data-clue]')).toHaveCount(3);
  await expect(page.locator('[data-string]')).toHaveCount(3);
  await expect(page.locator('[data-lock]')).toHaveCount(2);
  for (const id of ['rapture', 'stanza-46']) await expect(door(page, id).locator('[data-lock]')).toHaveCount(1);
  for (const id of ['studio', 'scacchiera']) await expect(door(page, id).locator('[data-stamp]')).toHaveText(content.ui.solved);
  await expect(door(page, 'biblioteca').getByRole('button', { name: content.ui.enter })).toBeVisible();
  await expect(page.locator('[data-token="left"]')).toHaveCount(2);
});

test('a solved room gets its stamp and its strings after the wish', async ({ page }) => {
  await recordPlays(page);
  await openCase(page);
  await enterRoom(page, 'studio');
  await page.getByRole('button', { name: content.rooms.studio.placeholder.solve }).click();
  await expect(wish(page)).toBeVisible();
  const stamp = door(page, 'studio').locator('[data-stamp]');
  const strings = page.locator('[data-string]');
  const clues = page.locator('[data-clue]');
  // Under the wish the new pieces wait out of sight.
  await expect(stamp).toHaveCSS('opacity', '0');
  for (const clue of await clues.all()) await expect(clue).toHaveCSS('opacity', '0');
  for (const string of await strings.all()) await expect(string).not.toHaveCSS('stroke-dashoffset', '0px');

  await continueWish(page);
  await expect(stamp).toHaveCSS('opacity', '1');
  await expect(clues).toHaveCount(2);
  for (const clue of await clues.all()) await expect(clue).toHaveCSS('opacity', '1');
  await expect(strings).toHaveCount(2);
  for (const string of await strings.all()) await expect(string).toHaveCSS('stroke-dashoffset', '0px');
  await expect.poll(() => played(page, 'stamp')).toBe(true);
});

test('the reveal moves only transform, opacity and the dash of the strings', async ({ page }) => {
  await openCase(page);
  await solveRoom(page, 'studio');
  // Each step of the reveal fills both ways, so it stays listed once played.
  const moved = await page.evaluate(() =>
    document.getAnimations().flatMap((animation) => (animation.effect as KeyframeEffect).getKeyframes().flatMap(Object.keys)),
  );
  expect(moved).toContain('strokeDashoffset');
  const allowed = ['transform', 'opacity', 'strokeDashoffset', 'offset', 'computedOffset', 'easing', 'composite'];
  expect(moved.filter((property) => !allowed.includes(property))).toEqual([]);
});

test('the finished board offers the confession', async ({ page }) => {
  await seed(page, FINISHED);
  await page.goto('/');
  await expect(board(page)).toContainText(content.ui.finale.stamp);
  // Never pressed here: it opens the real video.
  await expect(page.getByRole('button', { name: content.ui.finale.watch })).toBeVisible();
  await expect(page.locator('[data-token]')).toHaveCount(0); // the finale takes the place of the tokens
  await expect(page.locator('[data-string]')).toHaveCount(6);
});
