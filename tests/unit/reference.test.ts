// Reference guard (CLAUDE.md): assets/reference/ is design reference only. No file the game ships from (src/,
// public/) or is built into (dist/, dist-electron/) carries the bytes of a reference file, whole or as the
// base64 an inlined data URL would hold, and no build input names the reference folder.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { expect, test } from 'vitest';

/** Every file under these folders, skipping a folder that does not exist (dist/ before the first build). */
const filesUnder = (...folders: string[]): string[] =>
  folders
    .filter((folder) => existsSync(folder))
    .flatMap((folder) => readdirSync(folder, { recursive: true, encoding: 'utf8' }).map((name) => `${folder}/${name.replaceAll('\\', '/')}`))
    .filter((path) => statSync(path).isFile());

// The public repo leaves assets/reference/ out, so a fresh clone has nothing to guard.
test.skipIf(!existsSync('assets/reference'))('the reference photo never reaches the game', () => {
  const references = filesUnder('assets/reference').map((path) => readFileSync(path));
  expect(references.length).toBeGreaterThan(0);
  const marks = references.flatMap((bytes) => [bytes, Buffer.from(bytes.subarray(0, 300).toString('base64'))]);
  const carriers = filesUnder('src', 'public', 'dist', 'dist-electron').filter((path) => {
    const bytes = readFileSync(path);
    return marks.some((mark) => bytes.includes(mark));
  });
  expect(carriers).toEqual([]);

  const inputs = [...filesUnder('src', 'electron'), 'index.html', 'vite.config.ts', 'package.json'];
  expect(inputs.filter((path) => /assets[\\/]+reference/.test(readFileSync(path, 'utf8')))).toEqual([]);
});
