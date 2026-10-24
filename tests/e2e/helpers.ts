// E2E helpers: the content texts, a network cut that records every request outside the local server,
// the games of mockup 01 and of the end, a save written before the page loads, quick() for the tests that
// do not watch animations, settled() and throughChange() for those that wait out a screen change, a slow
// double click, and the steps most tests repeat (opening the case through the wish, entering a room, and the
// consolation that follows a confirmed "Apri la porta?"). Solving a room lives in play.ts.
import { readFileSync } from 'node:fs';
import { expect, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { save, SAVE_KEY } from '../../src/engine/save';
import type { GameState } from '../../src/engine/state';
import { CLUE_IDS, ROOM_IDS } from '../../src/engine/types';
import { parseDuration } from '../../src/ui/dom';

export const content = JSON.parse(readFileSync('content/content.json', 'utf8'));

/** The fragment of the link a room gives, or the case opening ('fascicolo'), as content.json holds it. */
export const fragment = (source: string): string => content.link.find((part: { room: string }) => part.room === source).text;

/** The game of mockup 01: study and chessboard solved, their three clues found, one token spent. */
export const MOCKUP_01: GameState = { opened: true, solved: ['studio', 'scacchiera'], clues: ['rule', 'profile', 'g4'], tokens: 2 };

/** Rapture's door open on the board: study, chessboard and library solved, their four clues found. */
export const BEFORE_RAPTURE: GameState = {
  opened: true,
  solved: ['studio', 'scacchiera', 'biblioteca'],
  clues: ['rule', 'profile', 'g4', 'time-0451'],
  tokens: 3,
};

/** The game over: every room solved in the order of the list, every clue found, one token spent. */
export const FINISHED: GameState = { opened: true, solved: [...ROOM_IDS], clues: [...CLUE_IDS], tokens: 2 };

/** Writes this state as the save before the first load of the page in this tab, so the game starts from
 *  it and a reload keeps whatever the test did since. */
export async function seed(page: Page, state: GameState): Promise<void> {
  let saved = '';
  save(state, { getItem: () => null, setItem: (_key, value) => (saved = value), removeItem: () => {} });
  await page.addInitScript(
    ([key, value]) => {
      if (sessionStorage.getItem('e2e-seeded')) return;
      sessionStorage.setItem('e2e-seeded', '1');
      localStorage.setItem(key, value);
    },
    [SAVE_KEY, saved],
  );
}

const DURATIONS = [...readFileSync('src/ui/tokens.css', 'utf8').matchAll(/^\s*(--duration-[\w-]+)\s*:/gm)].map((match) => match[1]);

/** Sets every --duration-* token of tokens.css to 1 ms on <html> before the page runs any script, so every
 *  animation, and every timer that reads its length from a token, ends at once. Tests of the animations
 *  themselves leave it out. */
export async function quick(page: Page): Promise<void> {
  await page.addInitScript((names) => {
    const apply = () => {
      for (const name of names) document.documentElement.style.setProperty(name, '1ms');
    };
    if (document.documentElement) return apply();
    // The parser has not made <html> yet: wait for it.
    new MutationObserver((_, observer) => {
      if (!document.documentElement) return;
      observer.disconnect();
      apply();
    }).observe(document, { childList: true });
  }, DURATIONS);
}

/** A duration token as the page reads it, in ms. */
export async function duration(page: Page, token: `--duration-${string}`): Promise<number> {
  return parseDuration(await page.evaluate((name) => getComputedStyle(document.documentElement).getPropertyValue(name), token));
}

/** Records the source of every <audio> that starts playing, and of every one paused, from before the page
 *  loads, for played() and paused(). The game loads every sound right after its first screen, so a request on
 *  the network no longer says one has played. */
export async function recordPlays(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const record = window as unknown as { e2ePlayed: string[]; e2ePaused: string[] };
    record.e2ePlayed = [];
    record.e2ePaused = [];
    const { play, pause } = HTMLMediaElement.prototype;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      record.e2ePlayed.push(this.currentSrc || this.src);
      return play.call(this);
    };
    HTMLMediaElement.prototype.pause = function (this: HTMLMediaElement) {
      record.e2ePaused.push(this.currentSrc || this.src);
      return pause.call(this);
    };
  });
}

/** Whether the sound of this name in content.json has started playing, as recordPlays() saw it. */
export function played(page: Page, sound: string): Promise<boolean> {
  return page.evaluate(
    (path) => (window as unknown as { e2ePlayed: string[] }).e2ePlayed.some((src) => src.endsWith(path)),
    content.sounds[sound] as string,
  );
}

/** Whether the sound of this name in content.json has been paused, as recordPlays() saw it. */
export function paused(page: Page, sound: string): Promise<boolean> {
  return page.evaluate(
    (path) => (window as unknown as { e2ePaused: string[] }).e2ePaused.some((src) => src.endsWith(path)),
    content.sounds[sound] as string,
  );
}

/** Waits until no screen change is under way and the click guard after the last change, or after the last
 *  overlay that came or went, is over, so a raw or forced click reaches the stage again. */
export async function settled(page: Page): Promise<void> {
  await expect(page.locator('#app[data-hush]')).toHaveCount(0);
}

/** A double click on the target as Windows may send it, the second click 400 ms after the first: past the
 *  wait a room keeps after a wrong answer (--duration-nope), within the system's 500 ms. The page clock runs
 *  between the two, so it must be installed. */
export async function slowDoubleClick(page: Page, target: Locator): Promise<void> {
  await target.hover(); // once the target stands still, as an entrance may still be turning it in
  await page.mouse.down({ clickCount: 1 });
  await page.mouse.up({ clickCount: 1 });
  await page.clock.runFor(400);
  await page.mouse.down({ clickCount: 2 });
  await page.mouse.up({ clickCount: 2 });
}

/** Runs a paused page clock through one screen change: the ink comes in, the screens swap under it, the
 *  ink goes. */
export async function throughChange(page: Page): Promise<void> {
  await page.clock.runFor(2 * (await duration(page, '--duration-dip')));
}

/** Blocks every request outside the local server and returns the list of the blocked URLs. */
export async function offline(context: BrowserContext, baseURL: string): Promise<string[]> {
  const outside: string[] = [];
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(baseURL)) return route.continue();
    outside.push(url);
    return route.abort('internetdisconnected');
  });
  return outside;
}

/** A room's card on the board. */
export const door = (page: Page, id: string) => page.locator(`[data-door="${id}"]`);

export const board = (page: Page) => page.locator('[data-screen="board"]');

export const roomScreen = (page: Page, id: string) => page.locator(`[data-screen="room"][data-room="${id}"]`);

export const wish = (page: Page) => page.locator('[data-wish]');

/** Waits for "Continua?" at the end of the wish, presses it and checks that the wish has gone. */
export async function continueWish(page: Page): Promise<void> {
  await wish(page).getByRole('button', { name: content.ui.wish.continue }).click();
  await expect(wish(page)).toHaveCount(0);
}

export async function openCase(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: content.ui.intro.yes }).click();
  await continueWish(page);
  await expect(board(page)).toBeVisible();
}

/** Enters the room from the board and waits until it is on screen and takes clicks. */
export async function enterRoom(page: Page, id: string): Promise<void> {
  await door(page, id).getByRole('button', { name: content.ui.enter }).click();
  await expect(roomScreen(page, id)).toBeVisible();
  await settled(page);
}

/** "Apri la porta?" offered in the study and confirmed, with the case open and nothing solved. The page
 *  clock stands still from the confirmation on, so the consolation meme, and the wish after it, wait
 *  until the test runs the clock. */
export async function consolation(page: Page): Promise<void> {
  await page.clock.install();
  await seed(page, { opened: true, solved: [], clues: [], tokens: content.tokens });
  await page.goto('/');
  await enterRoom(page, 'studio');
  await page.clock.runFor(content.rooms.studio.help.skipAfterSec * 1000);
  await page.getByRole('button', { name: content.ui.skip.button }).click();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
  await page.getByRole('button', { name: content.ui.skip.yes }).click();
  await expect(page.locator('[data-meme]')).toBeVisible();
}
