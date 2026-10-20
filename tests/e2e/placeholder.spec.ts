// Placeholder e2e: the production build loads while every request outside the local server is blocked.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const content = JSON.parse(readFileSync('content/content.json', 'utf8'));

test('placeholder screen loads with the network disconnected', async ({ context, page, baseURL }) => {
  const outside: string[] = [];
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(baseURL!)) return route.continue();
    outside.push(url);
    return route.abort('internetdisconnected');
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: content.placeholder.title })).toBeVisible();
  await expect(page.getByText(content.placeholder.line)).toBeVisible();

  const fontLoaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some((font) => font.family.includes('Special Elite') && font.status === 'loaded');
  });
  expect(fontLoaded).toBe(true);
  expect(outside).toEqual([]);
});
