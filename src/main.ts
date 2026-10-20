// Bootstrap: shows the placeholder screen until the engine and the board exist.
import '@fontsource/special-elite';
import './style.css';
import content from '../content/content.json';

document.querySelector('#app')!.append(
  Object.assign(document.createElement('h1'), { textContent: content.placeholder.title }),
  Object.assign(document.createElement('p'), { textContent: content.placeholder.line }),
);
