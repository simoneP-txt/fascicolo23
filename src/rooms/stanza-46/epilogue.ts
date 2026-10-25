// Epilogue (mockup 12, the plan's decisions 13 and 22, and 21 of phase 6): the closing scene, once the window is back
// from the video. It opens on Room 46's sea with the red strings of the finale where the finale drew them. When the
// screen gets data-play, which screens.ts sets once it is on screen, the strings fade while the red hedge grows out
// of the blue hills, the waves, from a thin band at its foot behind them (--duration-spread); then the walker comes
// in near the hedge's foot, in front of it and above the waves, and walks on, its two poses taking turns
// (--duration-walk); last the witness's bubble pops with the line the engine handed it, with no label. The screen
// gets data-done when that bubble has landed. --duration-epilogue-exit later, unless the epilogue has left the stage,
// two ways out rise at the bottom right, clear of the hedge: "Torna alla lavagna?" (onBoard) and "Azzera partita?"
// (onReset, which screens.ts leaves null when content.json has no ui.reset.button); the screen gets data-exits once
// they are up. Hedge and walker come from art.ts; motion is transform and opacity only (epilogue.css).
import './stanza46.css';
import './epilogue.css';
import type { Content } from '../../engine/types';
import { button } from '../../ui/button';
import { durationOf, el } from '../../ui/dom';
import { svg } from '../../ui/svg';
import { HEDGE, SEA_TOP, WALKER, WAVES } from './art';
import { finaleStrings } from './finale';

export function renderEpilogue(content: Content, onBoard: () => void, onReset: (() => void) | null): HTMLElement {
  const screen = el('section', 'screen epilogue');
  screen.dataset.screen = 'epilogue';

  const sea = el('div', 'stanza46__sea');
  sea.dataset.bleed = ''; // each wave runs a wavelength past the stage, which the screen cuts
  sea.style.top = `${SEA_TOP}px`;
  sea.append(...WAVES.map((markup) => svg(markup)));

  const strings = finaleStrings();
  strings.dataset.strings = '';

  const walker = el('div', 'epilogue__walker');
  walker.dataset.walker = '';
  walker.append(...WALKER.map((markup) => svg(markup)));

  const exits = el('div', 'epilogue__exits');
  exits.append(button(content.ui.back, 'link', onBoard, 'back'));
  const reset = content.ui.reset.button;
  if (onReset && reset) exits.append(button(reset, 'link', onReset, 'restart'));

  screen.append(svg(HEDGE), sea, strings, walker); // the hedge behind the waves, the walker in front of all
  screen.addEventListener('animationend', (event) => {
    if (event.animationName === 'epilogue-rise') screen.dataset.exits = '';
    if (event.animationName !== 'epilogue-say') return;
    screen.dataset.done = '';
    setTimeout(() => screen.isConnected && screen.append(exits), durationOf('--duration-epilogue-exit'));
  });
  return screen;
}
