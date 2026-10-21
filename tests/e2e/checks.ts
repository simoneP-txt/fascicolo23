// E2E checks: the average color of a patch of the window, read by decoding a screenshot in a canvas of
// the page, the color a token holds, and the stage rules of CLAUDE.md, measured at the 1920x1080 design
// size: nothing leaves the stage, no text under 28 px (20 px for a .label), no text overflowing its box,
// at most three font families on screen.
import type { Page } from '@playwright/test';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const PATCH = 16; // side of a sampled patch, in window pixels

/** Sum of the differences of the three channels. */
export const colorDistance = (a: Rgb, b: Rgb) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);

export const luminance = ({ r, g, b }: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Average color of the PATCH x PATCH square whose top left corner is (x, y), in window pixels. */
export async function patchColor(page: Page, x: number, y: number): Promise<Rgb> {
  const png = await page.screenshot({ clip: { x, y, width: PATCH, height: PATCH }, scale: 'css' });
  return page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const context = new OffscreenCanvas(image.width, image.height).getContext('2d')!;
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, image.width, image.height);
    const sum = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) sum[c] += data[i + c];
    const count = data.length / 4;
    return { r: sum[0] / count, g: sum[1] / count, b: sum[2] / count };
  }, png.toString('base64'));
}

async function stageBox(page: Page) {
  const box = await page.locator('#stage').boundingBox();
  if (!box) throw new Error('no stage on screen');
  return box;
}

/** Average color at the center of the band above or below the stage. */
export async function bandColor(page: Page, band: 'top' | 'bottom'): Promise<Rgb> {
  const stage = await stageBox(page);
  const { width, height } = page.viewportSize()!;
  const thickness = band === 'top' ? stage.y : height - stage.y - stage.height;
  if (thickness < PATCH) throw new Error(`no ${band} band at ${width}x${height}`);
  const middle = band === 'top' ? stage.y / 2 : (stage.y + stage.height + height) / 2;
  return patchColor(page, Math.round((width - PATCH) / 2), Math.round(middle - PATCH / 2));
}

/** The patches just outside and just inside the top or bottom edge of the stage, mid-window. */
export async function edgeColors(page: Page, edge: 'top' | 'bottom'): Promise<{ outside: Rgb; inside: Rgb }> {
  const stage = await stageBox(page);
  const x = Math.round((page.viewportSize()!.width - PATCH) / 2);
  const bottom = stage.y + stage.height;
  const [outside, inside] =
    edge === 'top' ? [Math.floor(stage.y) - PATCH, Math.ceil(stage.y)] : [Math.ceil(bottom), Math.floor(bottom) - PATCH];
  return { outside: await patchColor(page, x, outside), inside: await patchColor(page, x, inside) };
}

/** The color a token holds on the host, which carries the screen's backdrop. */
export function tokenColor(page: Page, name: string): Promise<Rgb> {
  return page.evaluate((name) => {
    const host = document.querySelector('#app')!;
    if (!getComputedStyle(host).getPropertyValue(name)) throw new Error(`${name} is not defined`);
    const probe = document.createElement('i');
    probe.style.color = `var(${name})`;
    host.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    const context = new OffscreenCanvas(1, 1).getContext('2d')!;
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
    return { r, g, b };
  }, name);
}

interface StageScan {
  outside: string[];
  small: string[];
  overflowing: string[];
  families: string[];
}

// One pass over the visible elements of the stage. Sizes come from the computed style, so they are
// design pixels whatever the scale of the stage.
function scanStage(page: Page): Promise<StageScan> {
  return page.evaluate(() => {
    const stage = document.querySelector('#stage')!;
    const frame = stage.getBoundingClientRect();
    const describe = (node: Element) => {
      const text = node.textContent?.trim().replace(/\s+/g, ' ').slice(0, 40);
      return `${node.tagName.toLowerCase()}${[...node.classList].map((name) => `.${name}`).join('')}${text ? ` "${text}"` : ''}`;
    };
    const visible = [...stage.querySelectorAll('*')].filter((node) =>
      node.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
    );
    const outside = visible.filter((node) => {
      const box = node.getBoundingClientRect();
      const out = box.left < frame.left - 1 || box.top < frame.top - 1 || box.right > frame.right + 1 || box.bottom > frame.bottom + 1;
      return box.width > 0 && box.height > 0 && out && !node.closest('[data-bleed]');
    });
    const texts = visible.filter((node) => [...node.childNodes].some((child) => child.nodeType === Node.TEXT_NODE && child.textContent!.trim()));
    const small = texts.filter((node) => parseFloat(getComputedStyle(node).fontSize) < (node.closest('.label') ? 20 : 28));
    // An inline box has no client size, so its text is measured in the nearest box around it.
    const holder = (node: Element) => {
      let box: Element = node;
      while (box.clientWidth === 0 && box.clientHeight === 0 && box.parentElement && box !== stage) box = box.parentElement;
      return box;
    };
    const overflowing = [...new Set(texts.map(holder))].filter(
      (node) => node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1,
    );
    const families = texts.map((node) => getComputedStyle(node).fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, ''));
    return {
      outside: outside.map(describe),
      small: small.map((node) => `${describe(node)} ${getComputedStyle(node).fontSize}`),
      overflowing: overflowing.map((node) => `${describe(node)} ${node.scrollWidth}x${node.scrollHeight} in ${node.clientWidth}x${node.clientHeight}`),
      families: [...new Set(families)].sort(),
    };
  });
}

/** Visible elements that leave the stage, except what sits inside [data-bleed]. */
export const outsideStage = async (page: Page) => (await scanStage(page)).outside;

/** Visible text under 28 px, or under 20 px inside a .label. */
export const smallText = async (page: Page) => (await scanStage(page)).small;

/** Visible text whose scroll size exceeds its box. */
export const overflowingText = async (page: Page) => (await scanStage(page)).overflowing;

/** The font families of the visible text. */
export const fontFamilies = async (page: Page) => (await scanStage(page)).families;
