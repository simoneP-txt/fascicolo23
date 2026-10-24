// Meme overlay: the meme's image and caption land over the stage with a sudden zoom while its sound plays,
// and after --duration-meme the overlay leaves by itself and calls done. A video meme plays its clip, with the
// clip's own sound, and leaves when the clip ends, never before --duration-meme; a clip that cannot load or
// play leaves at --duration-meme, and any clip at --duration-clip at the latest. done runs once, from a timer:
// a screen change can take the overlay away, and then no animation would report its end. A second meme
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
  let clip: HTMLVideoElement | null = null;
  if (meme.video) {
    clip = el('video', 'meme__video');
    clip.playsInline = true;
    clip.preload = 'auto';
    clip.src = meme.video;
    figure.append(clip);
  }
  if (meme.text) figure.append(el('figcaption', 'meme__caption', meme.text));
  const frame = el('div', 'meme__frame');
  frame.append(figure);
  overlay.append(frame);
  parent.append(overlay);

  let shown = false; // --duration-meme is over
  let played = !clip; // the clip has ended, or cannot play; a meme with no clip has nothing to wait for
  let gone = false;
  const finish = () => {
    if (gone) return;
    gone = true;
    clearTimeout(least);
    clearTimeout(latest);
    if (finishShown === finish) finishShown = null;
    if (overlay.isConnected) hush();
    clip?.pause();
    overlay.remove();
    done();
  };
  const least = setTimeout(() => {
    shown = true;
    if (played) finish();
  }, durationOf('--duration-meme'));
  const latest = clip ? setTimeout(finish, durationOf('--duration-clip')) : undefined;
  finishShown = finish;
  // The timers come first, so nothing after them can leave an overlay that blocks every click.
  hush();
  if (meme.sound) audio.play(meme.sound);
  if (clip) {
    const over = () => {
      played = true;
      if (shown) finish();
    };
    clip.addEventListener('ended', over);
    clip.addEventListener('error', over);
    clip.play().catch(over);
  }
  // Last, so that whatever the old done does, the new meme already has its timer.
  replaced?.();
}
