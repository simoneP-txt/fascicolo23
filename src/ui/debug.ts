// Debug menu for the host: one button per room, by its name, that enters it with the clues it needs
// (Room 46 included), and a way to close it. One menu at a time; nothing on it names a hotkey.
import { ROOM_IDS, type Content, type RoomId } from '../engine/types';
import { el } from './dom';

export function openDebugMenu(parent: HTMLElement, content: Content, onPick: (id: RoomId) => void): void {
  if (parent.querySelector('[data-debug]')) return;
  const overlay = el('div', 'overlay');
  overlay.dataset.debug = '';

  const list = el('div', 'debug__rooms');
  for (const id of ROOM_IDS) {
    const button = el('button', 'button button--quiet', content.rooms[id].name);
    button.addEventListener('click', () => {
      overlay.remove();
      onPick(id);
    });
    list.append(button);
  }
  const close = el('button', 'button', content.ui.debug.close);
  close.addEventListener('click', () => overlay.remove());

  const dialog = el('div', 'card dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.append(el('h2', 'dialog__title', content.ui.debug.title), list, close);
  overlay.append(dialog);
  parent.append(overlay);
}
