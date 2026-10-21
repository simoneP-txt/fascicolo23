// Bootstrap: validates content.json and the clue graph, then starts the game on the stage and installs
// the hidden host hotkeys. Invalid content or a door that can never open stops here, on screen.
import '@fontsource/special-elite';
import './style.css';
import json from '../content/content.json';
import { createAudio } from './engine/audio';
import { checkGraph } from './engine/clues';
import { validateContent } from './engine/content';
import { createGame } from './engine/game';
import { installHotkeys } from './engine/hotkeys';
import { rooms } from './rooms';
import { confirmDialog } from './ui/confirm';
import { openDebugMenu } from './ui/debug';
import { el } from './ui/dom';
import { createScreens } from './ui/screens';
import { createStage } from './ui/stage';

const host = document.querySelector<HTMLElement>('#app')!;

try {
  const content = validateContent(json);
  const problems = checkGraph(rooms);
  if (problems.length) throw new Error(`Clue graph: ${problems.join('; ')}`);
  const audio = createAudio(content.sounds);
  const stage = createStage(host);
  // Every button answers with a sound. The listener runs after the button's own handler, so the
  // stopAll() of a screen change cannot cut the click short.
  stage.root.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('button')) audio.play('click');
  });
  const game = createGame({
    content,
    rooms,
    audio,
    ui: (g, screenGone) => createScreens(stage, content, rooms, g, audio, screenGone),
  });
  installHotkeys(window, {
    solve: () => game.solve(),
    hint: () => game.hint(true),
    giveBack: () => game.giveBackToken(),
    debug: () => openDebugMenu(stage.root, content, (id) => game.debugEnter(id)),
    reset: () => confirmDialog(stage.root, content.ui.reset, () => game.reset()),
  });
  game.start();
} catch (error) {
  host.replaceChildren(el('pre', 'fatal', error instanceof Error ? error.message : String(error)));
}
