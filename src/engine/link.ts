// Link assembly: joins the fragments, in their fixed link order, into the URL the finale opens, and
// tells the board, and Room 46 through its context, which fragments the player has earned so far.
import type { Earned } from './game';
import type { GameState } from './state';
import type { Content } from './types';

/** A fragment of the case link, in content order, and whether it is earned. */
export interface LinkPart {
  room: Earned;
  text: string;
  shown: boolean;
}

export function assembleLink(fragments: readonly string[]): string {
  return `https://${fragments.join('')}`;
}

/** The link in content order: youtu.be/ shows once the case is open, every other fragment once its room is solved. */
export function linkParts(link: Content['link'], state: GameState): LinkPart[] {
  return link.map(({ room, text }) => ({
    room,
    text,
    shown: room === 'fascicolo' ? state.opened : state.solved.includes(room),
  }));
}
