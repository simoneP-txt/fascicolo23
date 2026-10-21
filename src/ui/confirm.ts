// Confirmation drawn by the game (mockup 15) instead of window.confirm. One at a time; the answer runs
// inside the click, so the action happens before the click sound and a screen change cannot cut it.
import type { ConfirmText } from '../engine/types';
import { el } from './dom';

export function confirmDialog(parent: HTMLElement, text: ConfirmText, onYes: () => void): void {
  if (parent.querySelector('[data-dialog]')) return;
  const overlay = el('div', 'overlay');
  overlay.dataset.dialog = '';
  const yes = el('button', 'button', text.yes);
  const no = el('button', 'button button--quiet', text.no);
  yes.addEventListener('click', () => {
    overlay.remove();
    onYes();
  });
  no.addEventListener('click', () => overlay.remove());

  const actions = el('div', 'dialog__actions');
  actions.append(yes, no);
  const dialog = el('div', 'card dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.append(el('h2', 'dialog__title', text.title), el('p', 'dialog__body', text.body), actions);
  overlay.append(dialog);
  parent.append(overlay);
}
