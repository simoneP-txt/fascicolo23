// Meme overlay: the meme's image and caption land over the stage with a sudden zoom while its sound plays,
// and after --duration-meme the overlay leaves by itself and calls done. done runs once, from a timer: a
// screen change can take the overlay away, and then no animation would report its end. A second meme
// replaces the first, whose done runs at that moment. While a meme shows, its overlay takes every click on
// the stage, so nothing under it can be pressed twice, and clicks wait a moment more when it comes and when
// it goes (hush), unless a screen change has taken it away already.
import './meme.css';
import type { Sfx } from '../engine/game';
import type { Meme } from '../engine/types';
import { durationOf, el } from './dom';
import { hush } from './stage';

let finishShown: (() => void) | null = null; // takes the meme on screen away at once and runs its done

export function showMeme(parent: HTMLElement, meme: Meme, audio: Sfx, done: () => void): void {
  const replaced = finishShown;
  const overlay = el('div', 'overlay meme');
  overlay.dataset.meme = '';
  const figure = el('figure', 'meme__figure');
  if (meme.image) {
    const image = el('img', 'meme__image');
    image.alt = '';
    image.addEventListener('error', () => image.remove()); // the caption stays on its own
    image.src = meme.image;
    figure.append(image);
  }
  if (meme.text) figure.append(el('figcaption', 'meme__caption', meme.text));
  const frame = el('div', 'meme__frame');
  frame.append(figure);
  overlay.append(frame);
  parent.append(overlay);

  const finish = () => {
    clearTimeout(timer);
    if (finishShown === finish) finishShown = null;
    if (overlay.isConnected) hush();
    overlay.remove();
    done();
  };
  const timer = setTimeout(finish, durationOf('--duration-meme'));
  finishShown = finish;
  // The timer comes first, so nothing after it can leave an overlay that blocks every click.
  hush();
  if (meme.sound) audio.play(meme.sound);
  // Last, so that whatever the old done does, the new meme already has its timer.
  replaced?.();
}
