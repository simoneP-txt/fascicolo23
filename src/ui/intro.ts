// Case opening (mockup 05): "Vuoi aprire il caso?" with a "Sì?" that opens it and a "No?" that jumps
// somewhere else on the stage as soon as the mouse reaches it.
import type { Content } from '../engine/types';
import { el } from './dom';
import { STAGE_HEIGHT, STAGE_WIDTH, type Stage } from './stage';

const MARGIN = 96; // keeps the button inside the stage
const MIN_JUMP = 480; // stage pixels between the pointer and the new spot

export function renderIntro(content: Content, stage: Stage, onOpen: () => void): HTMLElement {
  const texts = content.ui.intro;
  const screen = el('section', 'screen intro');
  screen.dataset.screen = 'intro';

  const folder = el('div', 'card intro__folder');
  const yes = el('button', 'button', texts.yes);
  yes.addEventListener('click', onOpen);
  const actions = el('div', 'intro__actions');
  actions.append(yes, el('div', 'intro__slot'));
  folder.append(
    el('div', 'label', texts.label),
    el('p', 'intro__case', content.ui.case),
    el('h1', 'intro__question', texts.question),
    actions,
  );

  const no = el('button', 'button button--quiet intro__no', texts.no);
  no.addEventListener('pointerenter', (event) => runAway(no, stage.toStage(event.clientX, event.clientY)));

  screen.append(folder, no);
  return screen;
}

function runAway(button: HTMLElement, pointer: { x: number; y: number }): void {
  const { offsetWidth: width, offsetHeight: height } = button;
  for (;;) {
    const x = MARGIN + Math.random() * (STAGE_WIDTH - 2 * MARGIN - width);
    const y = MARGIN + Math.random() * (STAGE_HEIGHT - 2 * MARGIN - height);
    if (Math.hypot(x + width / 2 - pointer.x, y + height / 2 - pointer.y) < MIN_JUMP) continue;
    button.style.left = `${x}px`;
    button.style.top = `${y}px`;
    return;
  }
}
