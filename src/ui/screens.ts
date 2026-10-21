// Screens: the GameUi the engine talks to. It puts the case opening, the board or a room on the stage;
// a room gets a frame (header, way back to the board, witness) and the area it mounts into.
import { renderBoard } from '../engine/board';
import type { Game, GameUi } from '../engine/game';
import type { Content, Room } from '../engine/types';
import { el } from './dom';
import { renderIntro } from './intro';
import type { Stage } from './stage';
import { createWitness, type Witness } from './witness';

export function createScreens(stage: Stage, content: Content, rooms: readonly Room[], game: Game): GameUi {
  let witness: Witness | null = null;

  return {
    showIntro() {
      witness = null;
      stage.show(renderIntro(content, stage, () => game.openCase()), 'intro');
    },

    showBoard(state) {
      const screen = renderBoard(content, rooms, state, (id) => game.enter(id));
      witness = createWitness(content);
      screen.append(witness.el);
      stage.show(screen, 'board');
    },

    showRoom(room) {
      const screen = el('section', 'screen room');
      screen.dataset.screen = 'room';
      screen.dataset.room = room.id;

      const area = el('div', 'room__area');
      const back = el('button', 'button button--quiet', content.ui.back);
      back.addEventListener('click', () => game.leave());
      const header = el('header', 'room__header');
      header.append(el('div', 'label room__title', content.rooms[room.id].header), back);

      witness = createWitness(content);
      screen.append(area, header, witness.el);
      stage.show(screen, room.id);
      return area;
    },

    narrate(text) {
      witness?.say(text);
    },
  };
}
