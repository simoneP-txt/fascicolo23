// Stage: every screen is drawn on a 1920x1080 stage, scaled to fit the window and centered, while the
// host behind it paints the screen's background across the whole window (decision 15). The scale goes
// on the root element as --stage-scale, so what the host paints around the stage can follow it too.
import { el } from './dom';

export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;

export interface Stage {
  root: HTMLElement; // the 1920x1080 stage
  show(screen: HTMLElement, backdrop: string): void; // replaces the current screen and its overlays
  toStage(clientX: number, clientY: number): { x: number; y: number }; // window pixels to stage pixels
}

export function createStage(host: HTMLElement): Stage {
  const root = el('div', 'stage');
  root.id = 'stage';
  host.append(root);

  let scale = 1;
  const fit = () => {
    scale = Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT);
    document.documentElement.style.setProperty('--stage-scale', String(scale));
  };
  fit();
  window.addEventListener('resize', fit);

  return {
    root,
    show(screen, backdrop) {
      host.dataset.backdrop = backdrop;
      root.replaceChildren(screen);
    },
    toStage(clientX, clientY) {
      const box = root.getBoundingClientRect();
      return { x: (clientX - box.left) / scale, y: (clientY - box.top) / scale };
    },
  };
}
