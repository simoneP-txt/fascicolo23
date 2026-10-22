// Stage: every screen is drawn on a 1920x1080 stage, scaled to fit the window and centered, while the
// host behind it paints the screen's background across the whole window (decision 15). The scale goes
// on the root element as --stage-scale, so what the host paints around the stage can follow it too.
// A screen with a new backdrop comes in through an ink dip (base.css): the host's ink layer fades in over
// --duration-dip, the screens and backdrops swap under it, and it fades out over --duration-dip. The first
// screen, or one with the backdrop already on, swaps at once. Timers read from the token mark the swap and
// the end, so both come even when no transition runs. The countdown starts once the task that called
// show() is over: what follows show() in that task (a room mounting, the first click sound waking the
// audio device) holds back the frame that starts the ink, and a countdown already running would swap the
// screens before the ink is in. Pointer clicks on the stage are ignored from show() until --duration-hush
// after the new screen is on screen, and for --duration-hush after an overlay comes or goes: the ink layer
// takes them. Keys still work.
import { durationOf, el } from './dom';

export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;

/** The two moments of a screen change: gone, the old screen and its overlays have left the stage; shown,
 *  the new screen is on screen. A newer show() supersedes a change, whose moments still due never come. */
export interface ScreenChange {
  gone: Promise<void>;
  shown: Promise<void>;
}

export interface Stage {
  root: HTMLElement; // the 1920x1080 stage
  show(screen: HTMLElement, backdrop: string): ScreenChange; // replaces the current screen and its overlays
  toStage(clientX: number, clientY: number): { x: number; y: number }; // window pixels to stage pixels
}

interface Change {
  screen: HTMLElement;
  backdrop: string;
  outgoing: Element[]; // what the stage held when show() came: it leaves at the swap
  gone(): void;
  shown(): void;
}

let guarded: HTMLElement | null = null; // the host, whose ink layer takes the clicks while it has data-hush
let changing = false; // from show() until the new screen is on screen
let lift: ReturnType<typeof setTimeout> | undefined; // takes data-hush off

/** Ignores clicks on the stage for --duration-hush, or until --duration-hush after the screen change under
 *  way is over. Every overlay calls it when it opens and when it closes. */
export function hush(): void {
  const host = guarded;
  if (!host) return;
  clearTimeout(lift);
  host.dataset.hush = '';
  if (!changing) lift = setTimeout(() => delete host.dataset.hush, durationOf('--duration-hush'));
}

export function createStage(host: HTMLElement): Stage {
  const root = el('div', 'stage');
  root.id = 'stage';
  host.append(root);
  guarded = host;

  let scale = 1;
  const fit = () => {
    scale = Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT);
    document.documentElement.style.setProperty('--stage-scale', String(scale));
  };
  fit();
  window.addEventListener('resize', fit);

  let incoming: Change | null = null; // the change waiting under the ink for its swap
  let timer: ReturnType<typeof setTimeout> | undefined; // the countdown, the swap, then the end of the change

  const swap = (change: Change) => {
    for (const node of change.outgoing) node.remove();
    delete change.screen.dataset.incoming;
    host.dataset.backdrop = change.backdrop;
    change.gone();
  };
  const end = (change: Change) => {
    changing = false;
    hush();
    change.shown();
  };
  const swapUnderInk = () => {
    const change = incoming!;
    incoming = null;
    delete host.dataset.dip;
    swap(change);
    timer = setTimeout(() => end(change), durationOf('--duration-dip'));
  };

  return {
    root,
    show(screen, backdrop) {
      let gone!: () => void;
      let shown!: () => void;
      const signals: ScreenChange = {
        gone: new Promise((resolve) => (gone = resolve)),
        shown: new Promise((resolve) => (shown = resolve)),
      };
      changing = true;
      hush();
      incoming?.screen.remove(); // superseded before it ever came on screen
      const change: Change = { screen, backdrop, outgoing: [...root.children], gone, shown };
      screen.dataset.incoming = ''; // laid out, so a room can measure it, but hidden until the swap
      root.append(screen);

      if (incoming) {
        incoming = change; // the dip under way brings this screen instead, at the swap already set
        return signals;
      }
      clearTimeout(timer); // an earlier change still fading out never reaches its end
      if (!host.dataset.backdrop || backdrop === host.dataset.backdrop) {
        swap(change);
        end(change);
      } else {
        incoming = change;
        host.dataset.dip = '';
        // The countdown to the swap starts on the next task, once the work that called show() is over.
        timer = setTimeout(() => (timer = setTimeout(swapUnderInk, durationOf('--duration-dip'))));
      }
      return signals;
    },
    toStage(clientX, clientY) {
      const box = root.getBoundingClientRect();
      return { x: (clientX - box.left) / scale, y: (clientY - box.top) / scale };
    },
  };
}
