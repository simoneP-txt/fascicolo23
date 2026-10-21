// Bootstrap: validates content.json, then shows the placeholder screen until the engine and the
// board exist. Invalid content stops here, with the faulty field on screen.
import '@fontsource/special-elite';
import './style.css';
import json from '../content/content.json';
import { validateContent } from './engine/content';

const app = document.querySelector('#app')!;

try {
  validateContent(json);
  app.append(
    Object.assign(document.createElement('h1'), { textContent: json.placeholder.title }),
    Object.assign(document.createElement('p'), { textContent: json.placeholder.line }),
  );
} catch (error) {
  app.append(Object.assign(document.createElement('pre'), { textContent: error instanceof Error ? error.message : String(error) }));
}
