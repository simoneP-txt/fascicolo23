// Link assembly: joins the fragments, in their fixed link order, into the URL the finale opens, and
// tells the board which fragments the player has earned so far.
import type { GameState } from './state';
import type { Content } from './types';

export function assembleLink(fragments: readonly string[]): string {
  return `https://${fragments.join('')}`;
}

/** The link in content order: youtu.be/ shows once the case is open, every other fragment once its room is solved. */
export function linkParts(link: Content['link'], state: GameState) {
  return link.map(({ room, text }) => ({
    room,
    text,
    shown: room === 'fascicolo' ? state.opened : state.solved.includes(room),
  }));
}
