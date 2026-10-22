// Auto-help on screen (mockups 07, 10, 11 and 15), bottom right in every room: the hint card ("AIUTO 1 DI
// 2") edged in the room's accent, "Un indizio?" with its dot, and the way out with its door, which asks for
// confirmation before it solves the room. Room 46 has its own texts ("Mostrami il colpevole?") and shows
// a magnifier instead of the door. A press on "Un indizio?" usually hides it under the pointer, so clicks on
// the stage wait a moment after it (hush), or the second click of a double click would reach the room.
import type { HelpStatus } from '../engine/autohelp';
import type { Content, RoomContent } from '../engine/types';
import { button } from './button';
import { paper } from './card';
import { confirmDialog } from './confirm';
import { el } from './dom';
import { hush } from './stage';
import type { Icon } from './svg';

export interface HelpPanel {
  el: HTMLElement;
  setHelp(help: HelpStatus): void;
  showHint(text: string, n: number, total: number): void;
}

export function createHelpPanel(
  content: Content,
  room: RoomContent,
  dialogParent: HTMLElement,
  onHint: () => void,
  onSkip: () => void,
): HelpPanel {
  const skipText = room.skip ?? content.ui.skip;
  const skipIcon: Icon = room.skip ? 'magnifier' : 'door';

  const label = el('div', 'label');
  const line = el('p', 'help__text');
  const card = paper('help__card');
  card.dataset.hint = '';
  card.hidden = true;
  card.append(label, line);

  const hint = button(
    content.ui.hint.button,
    'help',
    () => {
      hush();
      onHint();
    },
    'dot',
  );
  hint.classList.add('help__hint');
  hint.hidden = true;

  const confirmText = { title: skipText.button, body: skipText.body, yes: skipText.yes, no: skipText.no };
  const skip = button(skipText.button, 'help', () => confirmDialog(dialogParent, confirmText, onSkip, skipIcon), skipIcon);
  skip.classList.add('help__skip');
  skip.hidden = true;

  const panel = el('div', 'help');
  panel.append(card, hint, skip);
  return {
    el: panel,
    setHelp(help) {
      hint.hidden = !help.hint;
      skip.hidden = !help.skip;
    },
    showHint(text, n, total) {
      label.textContent = content.ui.hint.label.replace('{n}', String(n)).replace('{total}', String(total));
      line.textContent = text;
      card.hidden = false;
    },
  };
}
