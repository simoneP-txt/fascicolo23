// Debug menu for the host, on the paper of the dialogs: one button per room, by its name, that enters it
// with the clues it needs (Room 46 included), and a way to close it. One menu at a time; nothing on it
// names a hotkey.
import './dialog.css';
import { ROOM_IDS, type Content, type RoomId } from '../engine/types';
import { button } from './button';
import { paper } from './card';
import { el } from './dom';

export function openDebugMenu(parent: HTMLElement, content: Content, onPick: (id: RoomId) => void): void {
  if (parent.querySelector('[data-debug]')) return;
  const overlay = el('div', 'overlay');
  overlay.dataset.debug = '';

  const list = el('div', 'debug__rooms');
  for (const id of ROOM_IDS) {
    list.append(
      button(content.rooms[id].name, 'outline', () => {
        overlay.remove();
        onPick(id);
      }),
    );
  }
  const close = button(content.ui.debug.close, 'dark', () => overlay.remove());

  const dialog = paper('dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.append(el('h2', 'dialog__title', content.ui.debug.title), list, close);
  overlay.append(dialog);
  parent.append(overlay);
}
