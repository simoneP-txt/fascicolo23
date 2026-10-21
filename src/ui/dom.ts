// DOM helpers: el() creates an element with an optional class and text, the one way the UI builds nodes;
// durationOf() reads a duration token at runtime, so the timers of the code follow tokens.css.
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** A CSS time in ms: '480ms' → 480, '0.4s' → 400; an empty or unreadable value → 0. */
export function parseDuration(value: string): number {
  const text = value.trim();
  const amount = parseFloat(text) || 0;
  return text.endsWith('ms') ? amount : amount * 1000;
}

/** The duration a token holds on :root, in ms. */
export function durationOf(token: `--duration-${string}`): number {
  return parseDuration(getComputedStyle(document.documentElement).getPropertyValue(token));
}
