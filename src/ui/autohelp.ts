// Auto-help on screen (mockups 07, 10, 11 and 15), bottom right in every room: the hint card ("AIUTO 1
// DI 2"), the "Un indizio?" button and the skip button, which asks for confirmation before it solves
// the room. In Room 46 the skip has its own texts ("Mostrami il colpevole?").
import type { HelpStatus } from '../engine/autohelp';
import type { Content, RoomContent } from '../engine/types';
import { confirmDialog } from './confirm';
import { el } from './dom';

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

  const label = el('div', 'label');
  const line = el('p', 'help__text');
  const card = el('div', 'card help__card');
  card.dataset.hint = '';
  card.hidden = true;
  card.append(label, line);

  const hint = el('button', 'button button--quiet', content.ui.hint.button);
  hint.hidden = true;
  hint.addEventListener('click', onHint);

  const skip = el('button', 'button', skipText.button);
  skip.hidden = true;
  skip.addEventListener('click', () =>
    confirmDialog(dialogParent, { title: skipText.button, body: skipText.body, yes: skipText.yes, no: skipText.no }, onSkip),
  );

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
