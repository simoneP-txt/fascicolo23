// Audience help on screen: one "?" per token (filled while left, haloed while in use, dashed once used), the
// transparent header button with its text and tokens, which stays clickable once the jury has spoken and
// then only shakes, and the countdown dialog of mockup 14, redrawn from the status, its red arc stepping
// down once a second. Clicks on the stage wait a moment when the dialog comes and when it goes (hush).
import './dialog.css';
import type { AudienceStatus } from '../engine/audience';
import type { Content } from '../engine/types';
import { button, setEnabled } from './button';
import { paper } from './card';
import { el } from './dom';
import { hush } from './stage';
import { svg } from './svg';

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
  const node = button(content.ui.audience.button, 'link', onStart);
  node.classList.add('audience');
  node.dataset.audience = '';
  return {
    el: node,
    update(status) {
      if (status.mode === 'off') return;
      setEnabled(node, status.mode === 'ready');
      const label = status.mode === 'spent' ? content.ui.audience.spent : content.ui.audience.button;
      node.replaceChildren(label, tokenRow(status.tokens, status.max, status.mode === 'running'));
    },
  };
}

const RING_LENGTH = 2 * Math.PI * 128; // the arc's full length: a circle of radius 128

// A grey track and the red arc of the seconds left, starting at the top and running clockwise.
const RING = `<svg class="countdown__ring" viewBox="0 0 288 288" aria-hidden="true">
  <circle cx="144" cy="144" r="128" fill="none" stroke="var(--ink)" stroke-width="24" opacity="0.12"/>
  <circle class="countdown__arc" cx="144" cy="144" r="128" fill="none" stroke="var(--red)" stroke-width="24" stroke-linecap="round" transform="rotate(-90 144 144)"/>
</svg>`;

export function createAudienceOverlay(content: Content, onFinish: () => void): AudienceView {
  const texts = content.ui.audience;
  const overlay = el('div', 'overlay');
  overlay.dataset.audienceOverlay = '';
  overlay.hidden = true;

  const ring = svg(RING);
  const arc = ring.querySelector<SVGCircleElement>('.countdown__arc')!;
  arc.setAttribute('stroke-dasharray', `${RING_LENGTH} ${RING_LENGTH}`);
  const seconds = el('div', 'countdown__seconds');
  seconds.dataset.seconds = '';
  const face = el('div', 'countdown__face');
  face.append(seconds, el('div', 'label countdown__label', texts.seconds));
  const countdown = el('div', 'countdown');
  countdown.setAttribute('role', 'timer');
  countdown.append(ring, face);

  const tokens = el('div', 'countdown__tokens');
  const done = button(texts.done, 'outline', onFinish);
  done.classList.add('dialog__done');

  const dialog = paper('dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.append(el('div', 'label dialog__tag', texts.label), el('h2', 'dialog__title', texts.title), countdown, tokens, done);
  overlay.append(dialog);

  return {
    el: overlay,
    update(status) {
      const running = status.mode === 'running';
      if (running === overlay.hidden) hush(); // the dialog comes or goes
      overlay.hidden = !running;
      if (!running) return;
      seconds.textContent = String(status.secondsLeft);
      const left = status.secondsLeft / Math.max(1, content.audienceSeconds);
      arc.style.strokeDashoffset = String(RING_LENGTH * (1 - left));
      tokens.replaceChildren(el('span', 'label', texts.tokens), tokenRow(status.tokens, status.max, true));
    },
  };
}
