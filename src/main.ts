// Bootstrap: validates content.json and the clue graph, then starts the game on the stage. Invalid
// content or a door that can never open stops here, with the problem on screen.
import '@fontsource/special-elite';
import './style.css';
import json from '../content/content.json';
import { checkGraph } from './engine/clues';
import { validateContent } from './engine/content';
import { createGame, type Sfx } from './engine/game';
import { rooms } from './rooms';
import { el } from './ui/dom';
import { createScreens } from './ui/screens';
import { createStage } from './ui/stage';

const host = document.querySelector<HTMLElement>('#app')!;
const silent: Sfx = { play() {}, stopAll() {} };

try {
  const content = validateContent(json);
  const problems = checkGraph(rooms);
  if (problems.length) throw new Error(`Clue graph: ${problems.join('; ')}`);
  const stage = createStage(host);
  const game = createGame({ content, rooms, audio: silent, ui: (g) => createScreens(stage, content, rooms, g) });
  game.start();
} catch (error) {
  host.replaceChildren(el('pre', 'fatal', error instanceof Error ? error.message : String(error)));
}
