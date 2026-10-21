// Audience help on screen: one "?" per token (filled while left, highlighted while in use, dashed once
// used), the room header button, and the countdown overlay of mockup 14, redrawn from the status.
import type { AudienceStatus } from '../engine/audience';
import type { Content } from '../engine/types';
import { el } from './dom';

export interface AudienceView {
  el: HTMLElement;
  update(status: AudienceStatus): void;
}

export function tokenRow(tokens: number, max: number, inUse = false): HTMLElement {
  const row = el('span', 'tokens');
  row.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < max; i++) {
    const kind = inUse && i === tokens - 1 ? 'in-use' : i < tokens ? 'left' : 'used';
    const token = el('span', `token token--${kind}`, '?');
    token.dataset.token = kind;
    row.append(token);
  }
  return row;
}

export function createAudienceButton(content: Content, onStart: () => void): AudienceView {
  const button = el('button', 'button button--quiet audience');
  button.dataset.audience = '';
  button.addEventListener('click', onStart);
  return {
    el: button,
    update(status) {
      if (status.mode === 'off') return;
      button.disabled = status.mode !== 'ready';
      const label = status.mode === 'spent' ? content.ui.audience.spent : content.ui.audience.button;
      button.replaceChildren(el('span', '', label), tokenRow(status.tokens, status.max, status.mode === 'running'));
    },
  };
}

export function createAudienceOverlay(content: Content, onFinish: () => void): AudienceView {
  const texts = content.ui.audience;
  const overlay = el('div', 'overlay');
  overlay.dataset.audienceOverlay = '';
  overlay.hidden = true;

  const seconds = el('div', 'countdown__seconds');
  seconds.dataset.seconds = '';
  const ring = el('div', 'countdown__ring');
  ring.append(seconds, el('div', 'label', texts.seconds));
  const tokens = el('div', 'countdown__tokens');
  const done = el('button', 'button button--quiet', texts.done);
  done.addEventListener('click', onFinish);

  const dialog = el('div', 'card dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.append(el('div', 'label', texts.label), el('h2', 'dialog__title', texts.title), ring, tokens, done);
  overlay.append(dialog);

  return {
    el: overlay,
    update(status) {
      overlay.hidden = status.mode !== 'running';
      if (status.mode !== 'running') return;
      seconds.textContent = String(status.secondsLeft);
      tokens.replaceChildren(el('span', 'label', texts.tokens), tokenRow(status.tokens, status.max, true));
    },
  };
}
