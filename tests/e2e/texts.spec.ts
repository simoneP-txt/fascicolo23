// Texts e2e (the plan's decision 3), at 1920x1080 and 1366x768: every line the witness says on a screen, set into
// that screen's bubble, takes at most three lines, cuts no text and leaves nothing off the stage; and in every room,
// with the room's tallest line in the bubble, each hint fits its card and the card stays clear of the silhouette.
// Each screen opens from a prepared save with durations cut, and nothing is played: the lines go straight into
// the bubble's element. A room's lines are its witness.*, all of them, and witness.help, which the auto-help says
// there; the board says witness.board, the case opening's wish witness.wish, the finale and the epilogue theirs.
// Every title says "fits", so npm run texts runs them after a rewrite.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { CLUE_IDS, ROOM_IDS, type RoomId } from '../../src/engine/types';
import { figureUnderHint, outsideStage, overflowingText } from './checks';
import { board, content, enterRoom, epilogue, finale, FINISHED, MOCKUP_01, quick, roomScreen, seed, wish } from './helpers';

const SIZES = [
  [1920, 1080],
  [1366, 768],
] as const;

type Screen = 'board' | RoomId | 'wish' | 'finale' | 'epilogue';

/** Every string under this node. */
const flat = (node: unknown): string[] => {
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(flat);
  return node && typeof node === 'object' ? Object.values(node).flatMap(flat) : [];
};

// The lines each screen says. content.test.ts already holds every sentence to a closing "?", so each line goes
// into the bubble as the witness would say it.
const LINES: Record<Screen, string[]> = {
  board: [content.witness.board],
  ...(Object.fromEntries(ROOM_IDS.map((id) => [id, [...flat(content.rooms[id].witness), content.witness.help]])) as Record<RoomId, string[]>),
  wish: [content.witness.wish],
  finale: [content.witness.finale],
  epilogue: [content.witness.epilogue],
};

const bubbleLine = (scope: Locator) => scope.locator('[data-witness] .witness__line');

/** The case with every clue found and every room solved but this one and Room 46, so its door is open. */
const openFor = (id: RoomId) => ({
  opened: true,
  solved: ROOM_IDS.filter((room) => room !== id && room !== 'stanza-46'),
  clues: [...CLUE_IDS],
  tokens: content.tokens,
});

/** Opens the screen from a prepared save and returns the line of its bubble. */
async function reach(page: Page, screen: Screen): Promise<Locator> {
  if (screen === 'board') {
    await seed(page, MOCKUP_01);
    await page.goto('/');
    return bubbleLine(board(page));
  }
  if (screen === 'wish') {
    await page.goto('/'); // no save: the case opening, then its wish over the board
    await page.getByRole('button', { name: content.ui.intro.yes }).click();
    await expect(wish(page).getByRole('button', { name: content.ui.wish.continue })).toBeVisible();
    return bubbleLine(wish(page));
  }
  if (screen === 'finale' || screen === 'epilogue') {
    await seed(page, { ...FINISHED, watched: screen === 'epilogue' });
    await page.goto('/');
    return bubbleLine(screen === 'finale' ? finale(page) : epilogue(page));
  }
  await seed(page, openFor(screen));
  await page.goto('/');
  await enterRoom(page, screen);
  return bubbleLine(roomScreen(page, screen));
}

/** Waits until every animation that ends has ended, so a 1 ms entrance (the wish's comet) is not caught at its
 *  first frame, off the stage. */
const animationsEnded = (page: Page) =>
  page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => {})),
    ),
  );

/** Sets this text as the bubble's line and returns its height in stage px and its number of lines. */
async function say(line: Locator, text: string): Promise<{ height: number; lines: number }> {
  return line.evaluate((node: HTMLElement, text) => {
    node.textContent = text;
    const height = node.offsetHeight;
    return { height, lines: Math.round(height / parseFloat(getComputedStyle(node).lineHeight)) };
  }, text);
}

test.beforeEach(({ page }) => quick(page));

for (const [width, height] of SIZES) {
  test.describe(`at ${width}x${height}`, () => {
    test.use({ viewport: { width, height } });

    for (const screen of ['board', ...ROOM_IDS, 'wish', 'finale', 'epilogue'] as const) {
      test(`every witness line fits three lines of the bubble on ${screen}`, async ({ page }) => {
        const line = await reach(page, screen);
        await expect(line).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await animationsEnded(page);
        for (const text of LINES[screen]) {
          expect((await say(line, text)).lines, text).toBeLessThanOrEqual(3);
          expect(await overflowingText(page), text).toEqual([]);
          expect(await outsideStage(page), text).toEqual([]);
        }
      });
    }

    for (const id of ROOM_IDS) {
      test(`every hint fits its card in ${id}, clear of the witness`, async ({ page }) => {
        const line = await reach(page, id);
        await page.evaluate(() => document.fonts.ready);
        await animationsEnded(page);
        let tallest = LINES[id][0];
        let most = 0;
        for (const text of LINES[id]) {
          const { height } = await say(line, text);
          if (height > most) [tallest, most] = [text, height];
        }
        for (const hint of content.rooms[id].hints) {
          await page.keyboard.press('Control+Shift+KeyH');
          await expect(page.locator('[data-hint]')).toContainText(hint);
          await say(line, tallest); // the help's own line may have taken the bubble as the hint came
          expect(await figureUnderHint(page), `${hint} under "${tallest}"`).toBe(0);
          expect(await overflowingText(page), hint).toEqual([]);
        }
      });
    }
  });
}
