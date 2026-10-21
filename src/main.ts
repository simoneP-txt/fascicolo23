// Bootstrap: validates content.json and the clue graph, then shows the placeholder screen until the
// engine and the board exist. Invalid content or a door that can never open stops here, on screen.
import '@fontsource/special-elite';
import './style.css';
import json from '../content/content.json';
import { checkGraph } from './engine/clues';
import { validateContent } from './engine/content';
import { graphRooms } from './rooms/graph';

const app = document.querySelector('#app')!;

try {
  validateContent(json);
  const problems = checkGraph(graphRooms());
  if (problems.length) throw new Error(`Clue graph: ${problems.join('; ')}`);
  app.append(
    Object.assign(document.createElement('h1'), { textContent: json.placeholder.title }),
    Object.assign(document.createElement('p'), { textContent: json.placeholder.line }),
  );
} catch (error) {
  app.append(Object.assign(document.createElement('pre'), { textContent: error instanceof Error ? error.message : String(error) }));
}
