// Token scan: colors, durations and the easing curve live only in src/ui/tokens.css; every other .css and
// .ts file under src/ uses var(--…), and a pixel length written in a stylesheet sits on the 8 px grid.
// The code reads a duration from its token at runtime, through parseDuration().
import { readdirSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { expect, test } from 'vitest';
import { parseDuration } from '../../src/ui/dom';

const TOKENS = 'src/ui/tokens.css';

const sources = readdirSync('src', { recursive: true, encoding: 'utf8' })
  .map((path) => `src/${path.replaceAll('\\', '/')}`)
  .filter((path) => ['.css', '.ts'].includes(extname(path)) && path !== TOKENS);

/** Every match of the pattern as "file: match", in all the sources or in those with one extension. */
function hits(pattern: RegExp, extension?: string): string[] {
  return sources
    .filter((path) => !extension || extname(path) === extension)
    .flatMap((path) => [...readFileSync(path, 'utf8').matchAll(pattern)].map((match) => `${path}: ${match[0]}`));
}

/** Every pixel length written in the sources with this extension. */
function pxLiterals(extension: string): number[] {
  return hits(/\d*\.?\d+px\b/g, extension).map((hit) => parseFloat(hit.slice(hit.lastIndexOf(' ') + 1)));
}

test('colors live only in tokens.css', () =>
  expect(hits(/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi)).toEqual([]));
test('no named colors in stylesheets or in SVG markup', () => {
  const named = 'white|black|red|green|blue|yellow|orange|purple|pink|brown|gr[ae]y|gold|silver|navy|teal|cyan|magenta';
  const property = '(?:color|background(?:-color)?|fill|stroke|stop-color|(?:border|outline)(?:-\\w+)?|(?:box|text)-shadow)';
  const inCss = hits(new RegExp(`\\b${property}\\s*:[^;{}]*(?<![\\w-])(?:${named})\\b`, 'gi'), '.css'); // not var(--red)
  const inSvg = hits(/\b(?:fill|stroke|stop-color)="(?!none"|currentColor"|transparent"|var\(|url\()[^"]*"/g, '.ts');
  expect([...inCss, ...inSvg]).toEqual([]);
});
test('durations and curves live only in tokens.css', () => expect(hits(/\b\d*\.?\d+m?s\b|cubic-bezier\(/g, '.css')).toEqual([]));
test('lengths sit on the 8 px grid', () => expect(pxLiterals('.css').filter((px) => px % 8 !== 0)).toEqual([]));
test('tokens.css has a single easing curve', () => {
  const tokensCss = readFileSync(TOKENS, 'utf8');
  expect(tokensCss.match(/cubic-bezier\(/g)).toHaveLength(1);
});
test('durations parse from their tokens', () => {
  expect(parseDuration('480ms')).toBe(480);
  expect(parseDuration(' 0.4s ')).toBe(400);
  expect(parseDuration('')).toBe(0);
});
