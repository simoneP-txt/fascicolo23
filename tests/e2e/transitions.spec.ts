// Transitions e2e, with the real durations: a screen change is an ink dip of 2 x --duration-dip on the
// shared curve, and only the opacity of the host's ink layer moves. Pointer clicks on the stage are ignored
// while the screen changes and for --duration-hush after it, after any overlay comes or goes, and after
// "Un indizio?" hides under the pointer. Where a test clicks inside those windows the page clock stands
// still, so every click lands at the moment it means to. Ctrl+Shift+N while a room comes in sends the board
// under the same dip, with one wish.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { parseDuration } from '../../src/ui/dom';
import { board, content, door, duration, enterRoom, fragment, roomScreen, seed, settled, wish } from './helpers';

/** The case open and nothing solved: the study and the chessboard offer "Entra?". */
const OPEN = { opened: true, solved: [], clues: [], tokens: content.tokens };

const enter = (page: Page, id: string) => door(page, id).getByRole('button', { name: content.ui.enter });

/** The center of a control, in window pixels. */
async function centerOf(control: Locator): Promise<{ x: number; y: number }> {
  const box = (await control.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Stops the page clock once the screen has settled, so from here on the test runs every timer itself. */
async function pauseClock(page: Page): Promise<void> {
  await settled(page);
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
}

test('a screen change lasts 400-600 ms with the shared curve', async ({ page }) => {
  await page.goto('/');
  const dip = await duration(page, '--duration-dip');
  expect(2 * dip).toBeGreaterThanOrEqual(400);
  expect(2 * dip).toBeLessThanOrEqual(600);
  const layer = await page.evaluate(() => {
    const probe = document.createElement('div'); // --ease as the browser computes a curve
    probe.style.transitionTimingFunction = 'var(--ease)';
    document.body.append(probe);
    const ease = getComputedStyle(probe).transitionTimingFunction;
    probe.remove();
    const { transitionDuration, transitionTimingFunction } = getComputedStyle(document.querySelector('#app')!, '::after');
    return { duration: transitionDuration, curve: transitionTimingFunction, ease };
  });
  expect(parseDuration(layer.duration)).toBeCloseTo(dip);
  expect(layer.curve).toBe(layer.ease);
});

test('the change moves only opacity', async ({ page }) => {
  await seed(page, OPEN);
  await page.goto('/');
  await settled(page);
  // The animations of the ink layer, listed as it starts to come in and again as it starts to go.
  const samples = await page.evaluate(
    () =>
      new Promise<string[][][]>((resolve) => {
        const app = document.querySelector('#app')!;
        const layer = () =>
          document
            .getAnimations()
            .map((animation) => animation.effect as KeyframeEffect)
            .filter((effect) => effect.target === app && effect.pseudoElement === '::after')
            .map((effect) => effect.getKeyframes().flatMap(Object.keys));
        const samples: string[][][] = [];
        const watch = new MutationObserver(() => {
          samples.push(layer());
          if (app.hasAttribute('data-dip')) return;
          watch.disconnect();
          resolve(samples);
        });
        watch.observe(app, { attributeFilter: ['data-dip'] });
        document.querySelector<HTMLElement>('[data-door="studio"] button')!.click();
        if (!app.hasAttribute('data-dip')) resolve(samples); // no dip at all
      }),
  );
  expect(samples).toHaveLength(2);
  const allowed = ['opacity', 'offset', 'computedOffset', 'easing', 'composite'];
  for (const animations of samples) {
    expect(animations.length).toBeGreaterThan(0);
    expect(animations.flat().filter((property) => !allowed.includes(property))).toEqual([]);
  }
});

test('clicks are ignored while the screen changes and just after', async ({ page }) => {
  await page.clock.install();
  await seed(page, OPEN);
  await page.goto('/');
  const spot = await centerOf(enter(page, 'studio'));
  await enterRoom(page, 'studio');
  const dip = await duration(page, '--duration-dip');
  await pauseClock(page);

  await page.getByRole('button', { name: content.ui.back }).click();
  await expect(board(page)).toBeAttached(); // at once, hidden under the ink
  await expect(board(page)).toBeHidden();
  // A click where the study's "Entra?" sits on the board: as the ink comes in, as it goes, and just after.
  await page.mouse.click(spot.x, spot.y);
  await page.clock.runFor(dip);
  await expect(board(page)).toBeVisible();
  await page.mouse.click(spot.x, spot.y);
  await page.clock.runFor(dip);
  await page.mouse.click(spot.x, spot.y);
  await page.clock.runFor(1000);
  await expect(board(page)).toBeVisible();
  await expect(roomScreen(page, 'studio')).toHaveCount(0);

  await page.mouse.click(spot.x, spot.y); // the guard is over: the same spot opens the study
  await page.clock.runFor(2 * dip);
  await expect(roomScreen(page, 'studio')).toBeVisible();
});

test('clicks are ignored just after a dialog closes', async ({ page }) => {
  await page.clock.install();
  await seed(page, OPEN);
  await page.goto('/');
  const spot = await centerOf(enter(page, 'studio'));
  const dip = await duration(page, '--duration-dip');
  await pauseClock(page);

  await page.keyboard.press('Control+Shift+KeyR');
  await page.clock.runFor(await duration(page, '--duration-hush')); // the guard of the dialog coming in
  await page.getByRole('button', { name: content.ui.reset.no }).click();
  await page.mouse.click(spot.x, spot.y);
  await page.clock.runFor(1000);
  await expect(board(page)).toBeVisible();
  await expect(roomScreen(page, 'studio')).toHaveCount(0);

  await page.mouse.click(spot.x, spot.y); // the guard is over: the same spot opens the study
  await page.clock.runFor(2 * dip);
  await expect(roomScreen(page, 'studio')).toBeVisible();
});

test('clicks are ignored just after a dialog opens', async ({ page }) => {
  await page.clock.install();
  await seed(page, OPEN);
  await page.goto('/');
  await pauseClock(page);

  await page.keyboard.press('Control+Shift+KeyR');
  const yes = await centerOf(page.getByRole('button', { name: content.ui.reset.yes }));
  await page.mouse.click(yes.x, yes.y); // a click meant for the board, as the dialog comes over it
  await page.clock.runFor(1000);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(board(page)).toBeVisible();
});

test('a double click on "Un indizio?" reaches nothing under it', async ({ page }) => {
  await page.clock.install();
  await seed(page, OPEN);
  await page.goto('/');
  await enterRoom(page, 'studio');
  await page.clock.runFor(content.rooms.studio.help.hintAfterSec * 1000);
  const hint = page.getByRole('button', { name: content.ui.hint.button });
  await expect(hint).toBeVisible();
  await pauseClock(page);
  // The room's area, where a phase 4 room lays out its puzzle, counts the clicks that reach it.
  const area = page.locator('.room__area');
  await area.evaluate((node) => {
    node.dataset.clicks = '0';
    node.addEventListener('click', () => (node.dataset.clicks = String(Number(node.dataset.clicks) + 1)));
  });

  await hint.dblclick(); // the first click shows the hint and hides the button, the second lands where it was
  await expect(page.locator('[data-hint]')).toBeVisible();
  await expect(hint).toBeHidden();
  await expect(area).toHaveAttribute('data-clicks', '0');
});

test('every overlay holds clicks back as it comes and as it goes', async ({ page }) => {
  await page.clock.install();
  await seed(page, OPEN);
  await page.goto('/');
  const dip = await duration(page, '--duration-dip');
  const hush = await duration(page, '--duration-hush');
  const meme = await duration(page, '--duration-meme');
  await pauseClock(page);
  const hushed = page.locator('#app[data-hush]');
  const press = (name: string) => () => page.getByRole('button', { name }).click();
  /** Takes the step, checks that clicks on the stage are ignored at once, and lets the guard run out. */
  const guarded = async (what: string, step: () => Promise<unknown>) => {
    await expect(hushed, `before ${what}`).toHaveCount(0);
    await step();
    await expect(hushed, what).toHaveCount(1);
    await page.clock.runFor(hush);
  };

  await guarded('the reset dialog comes', () => page.keyboard.press('Control+Shift+KeyR'));
  await guarded('the reset dialog goes', press(content.ui.reset.no));
  await guarded('the debug menu comes', () => page.keyboard.press('Control+Shift+KeyD'));
  await guarded('the debug menu goes', press(content.ui.debug.close));

  await enter(page, 'studio').click();
  await page.clock.runFor(2 * dip + hush);
  await guarded('the audience countdown comes', press(content.ui.audience.button));
  await guarded('the audience countdown goes', press(content.ui.audience.done));
  await guarded('a meme comes', press(content.rooms.studio.placeholder.error));
  await guarded('the meme goes', () => page.clock.runFor(meme - hush));

  // The wish comes inside the board's screen change, whose guard lasts until --duration-hush after it.
  await guarded('the wish comes', async () => {
    await page.getByRole('button', { name: content.rooms.studio.placeholder.solve }).click();
    await page.clock.runFor(dip);
    await expect(wish(page)).toBeAttached();
  });
  await page.clock.runFor(await duration(page, '--duration-wish'));
  await guarded('the wish goes', () => wish(page).getByRole('button', { name: content.ui.wish.continue }).click());
  await expect(hushed).toHaveCount(0);
});

test('Ctrl+Shift+N while a room comes in leaves one board and one wish', async ({ page }) => {
  await page.clock.install();
  await seed(page, OPEN);
  await page.goto('/');
  const dip = await duration(page, '--duration-dip');
  await pauseClock(page);

  await enter(page, 'studio').click();
  await page.keyboard.press('Control+Shift+KeyN');
  // Under the same dip the board won takes the study's place, and its wish comes with it at the swap.
  await expect(roomScreen(page, 'studio')).toHaveCount(0);
  await expect(wish(page)).toHaveCount(0);
  await page.clock.runFor(2 * dip);
  await expect(board(page)).toHaveCount(1);
  await expect(board(page)).toBeVisible();
  await expect(wish(page)).toHaveCount(1);
  await expect(wish(page)).toContainText(fragment('studio'));
});
