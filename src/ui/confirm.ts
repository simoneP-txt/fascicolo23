// Confirmation drawn by the game (mockup 15) instead of window.confirm: the paper dialog with an icon drawn
// large when there is one, the question, what it means, a dark "yes" and an outlined "no". One at a time;
// the answer runs inside the click, so the action happens before the click sound and a screen change
// cannot cut it. Clicks on the stage wait a moment after it opens and after it closes (hush), so a click
// meant for what lay under it never answers it.
import './dialog.css';
import type { ConfirmText } from '../engine/types';
import { button } from './button';
import { paper } from './card';
import { el } from './dom';
import { hush } from './stage';
import { icon as drawIcon, type Icon } from './svg';

export function confirmDialog(parent: HTMLElement, text: ConfirmText, onYes: () => void, icon?: Icon): void {
  if (parent.querySelector('[data-dialog]')) return;
  const overlay = el('div', 'overlay');
  overlay.dataset.dialog = '';
  const close = () => {
    overlay.remove();
    hush();
  };
  const yes = button(text.yes, 'dark', () => {
    close();
    onYes();
  });
  const no = button(text.no, 'outline', close);

  const actions = el('div', 'dialog__actions');
  actions.append(yes, no);
  const dialog = paper('dialog dialog--confirm');
  dialog.setAttribute('role', 'dialog');
  if (icon) {
    const art = drawIcon(icon);
    art.classList.add('dialog__icon');
    dialog.append(art);
  }
  dialog.append(el('h2', 'dialog__title', text.title), el('p', 'dialog__body', text.body), actions);
  overlay.append(dialog);
  parent.append(overlay);
  hush();
}
