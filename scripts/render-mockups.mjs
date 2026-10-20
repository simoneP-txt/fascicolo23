// Mockup renderer: saves every docs/mockups/*.html as a PNG next to it, at the size the mockup
// declares ($preview, default 1920x1080). The design tool's runtime (support.js) is not exported,
// so its templates ({{x}}, <sc-for>, <sc-if>) are expanded here from the page's own renderVals().
// Needs internet: the mockups load their fonts from Google Fonts. Usage: node scripts/render-mockups.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const DIR = 'docs/mockups';

function expandTemplates() {
  const src = document.querySelector('script[data-dc-script]')?.textContent;
  if (!src || !document.querySelector('sc-for, sc-if')) return;
  const Component = new Function('DCLogic', `${src}; return Component;`)(class {});
  const get = (scope, path) => path.split('.').reduce((o, k) => o?.[k], scope);
  const value = (expr, scope) => {
    const m = expr.match(/^\{\{\s*([\w.]+)\s*\}\}$/);
    if (!m) return expr;
    return m[1] === 'true' ? true : m[1] === 'false' ? false : get(scope, m[1]);
  };
  const interp = (str, scope) => str.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, p) => get(scope, p) ?? '');
  const walk = (node, scope) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3 && child.textContent.includes('{{')) child.textContent = interp(child.textContent, scope);
      if (child.nodeType !== 1) continue;
      const tag = child.tagName.toLowerCase();
      if (tag === 'sc-for') {
        const out = [];
        for (const item of value(child.getAttribute('list'), scope) ?? []) {
          const wrap = document.createElement('div');
          wrap.innerHTML = child.innerHTML;
          walk(wrap, { ...scope, [child.getAttribute('as')]: item });
          out.push(...wrap.childNodes);
        }
        child.replaceWith(...out);
      } else if (tag === 'sc-if') {
        if (value(child.getAttribute('value'), scope)) {
          walk(child, scope);
          child.replaceWith(...child.childNodes);
        } else child.remove();
      } else {
        for (const attr of [...child.attributes]) if (attr.value.includes('{{')) attr.value = interp(attr.value, scope);
        walk(child, scope);
      }
    }
  };
  walk(document.body, new Component().renderVals());
}

const browser = await chromium.launch();
for (const name of readdirSync(DIR).filter((file) => file.endsWith('.html'))) {
  const path = `${DIR}/${name}`;
  const size = readFileSync(path, 'utf8').match(/"\$preview":\{"width":(\d+),"height":(\d+)\}/);
  const page = await browser.newPage({ viewport: { width: Number(size?.[1] ?? 1920), height: Number(size?.[2] ?? 1080) } });
  await page.goto(pathToFileURL(path).href);
  await page.waitForLoadState('networkidle');
  await page.evaluate(expandTemplates);
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(() => [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family))]);
  await page.screenshot({ path: path.replace(/\.html$/, '.png') });
  console.log(`${name}: fonts ${fonts.join(', ') || 'NONE (offline?)'}`);
  await page.close();
}
await browser.close();
