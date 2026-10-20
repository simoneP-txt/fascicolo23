// Spoiler scan: fails when a forbidden word or phrase from tests/forbidden.b64 appears as a whole
// word in shipped content, sources, build output or file names. The list file is one base64 blob
// of UTF-8 text with one entry per line.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';
import { expect, test } from 'vitest';

const LIST = 'tests/forbidden.b64';
const ROOTS = ['content', 'src', 'electron', 'public', 'tests', 'dist', 'dist-electron', 'index.html', 'package.json'];
// Other files (fonts, images, sounds) are checked by name only.
const TEXT = new Set(['.ts', '.js', '.mjs', '.cjs', '.json', '.html', '.css', '.svg', '.map', '.md', '.txt']);

// Escape sequences in JS strings, also doubled as in JSON.parse("...") bundles: "\nword" must read as " word".
const ESCAPE = /\\+(?:u([0-9a-f]{4})|x([0-9a-f]{2})|.)/gi;

function unescape(_: string, u?: string, x?: string): string {
  const hex = u ?? x;
  return hex ? String.fromCharCode(parseInt(hex, 16)) : ' ';
}

// Same treatment for text and entries: escapes decoded, camelCase split, accents dropped, lowercase,
// anything but letters and digits turned into spaces. The padding makes includes() match whole words.
function padded(s: string): string {
  const words = s
    .replace(ESCAPE, unescape)
    .replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  return ` ${words} `;
}

function files(): string[] {
  return ROOTS.filter((root) => existsSync(root))
    .flatMap((root) =>
      statSync(root).isDirectory()
        ? readdirSync(root, { recursive: true, encoding: 'utf8' }).map((path) => `${root}/${path.replaceAll('\\', '/')}`)
        : [root],
    )
    .filter((path) => path !== LIST && statSync(path).isFile());
}

const decoded = Buffer.from(readFileSync(LIST, 'utf8'), 'base64').toString('utf8');
const entries = decoded.split('\n').map(padded).filter((entry) => entry.trim());

test('the forbidden list decodes to UTF-8 entries', () => {
  expect(decoded).not.toContain('�');
  expect(entries.length).toBeGreaterThan(0);
});

test('the matcher finds whole words and phrases only', () => {
  const has = (text: string, entry: string) => padded(text).includes(padded(entry));
  expect(has('«MÉLA, rossa!»', 'mela rossa')).toBe(true);
  expect(has("sull'Àncora", 'ancora')).toBe(true);
  expect(has('"riga\\nmela rossa"', 'mela rossa')).toBe(true);
  expect(has('JSON.parse("riga\\\\nmela rossa")', 'mela rossa')).toBe(true);
  expect(has('"m\\u00e9la rossa"', 'méla rossa')).toBe(true);
  expect(has('const melaRossa = 1', 'mela rossa')).toBe(true);
  expect(has('caramela rossa', 'mela rossa')).toBe(false);
  expect(has('melarossa', 'mela rossa')).toBe(false);
});

test('no forbidden word in content, sources, build output or file names', () => {
  const hits = files().flatMap((file) => {
    const name = padded(file);
    const text = TEXT.has(extname(file)) ? padded(readFileSync(file, 'utf8')) : '';
    return entries
      .filter((entry) => name.includes(entry) || text.includes(entry))
      .map((entry) => ({ file, entry: entry.trim() }));
  });
  expect(hits).toEqual([]);
});
