// DOM helpers: el() creates an element with an optional class and text, the one way the UI builds nodes;
// replay() starts a CSS animation again; durationOf() reads a duration token at runtime, so the timers of
// the code follow tokens.css.
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Sets data-<flag>, whose CSS rule runs an animation, and starts that animation over if it already ran:
 *  the flag comes off, a style flush lets the browser forget the old run, and the flag goes back on. */
export function replay(node: HTMLElement, flag: string): void {
  delete node.dataset[flag];
  void node.offsetWidth;
  node.dataset[flag] = '';
}

/** A plain CSS time in ms: '480ms' → 480, '0.4s' → 400, '1600MS' → 1600; anything else ('', a calc()) → 0. */
export function parseDuration(value: string): number {
  const match = /^(\d*\.?\d+)(ms|s)$/i.exec(value.trim());
  if (!match) return 0;
  const amount = parseFloat(match[1]);
  return match[2].toLowerCase() === 'ms' ? amount : amount * 1000;
}

/** The duration a token holds on :root, in ms. A missing token or one that is not a plain time warns and
 *  gives 0, so a misspelled name shows up in the console instead of as a timer that fires at once. */
export function durationOf(token: `--duration-${string}`): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token);
  const ms = parseDuration(value);
  if (ms === 0 && !/^\s*0m?s\s*$/i.test(value)) console.warn(`${token} is not a plain time: "${value.trim()}"`);
  return ms;
}
