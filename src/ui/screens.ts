// Screens: the GameUi the engine talks to. It puts the case opening, the board or a room on the stage;
// a room gets a frame (header, way back to the board, audience help, witness, auto-help) and the area
// it mounts into.
import type { AudienceStatus } from '../engine/audience';
import { renderBoard } from '../engine/board';
import type { Game, GameUi } from '../engine/game';
import type { Content, Room } from '../engine/types';
import { createAudienceButton, createAudienceOverlay, type AudienceView } from './audience';
import { createHelpPanel, type HelpPanel } from './autohelp';
import { el } from './dom';
import { renderIntro } from './intro';
import type { Stage } from './stage';
import { createWitness, type Witness } from './witness';

export function createScreens(stage: Stage, content: Content, rooms: readonly Room[], game: Game): GameUi {
  let witness: Witness | null = null;
  let audience: AudienceView[] = [];
  let help: HelpPanel | null = null;

  return {
    showIntro() {
      witness = null;
      audience = [];
      help = null;
      stage.show(renderIntro(content, stage, () => game.openCase()), 'intro');
    },

    showBoard(state) {
      const screen = renderBoard(content, rooms, state, (id) => game.enter(id));
      witness = createWitness(content);
      audience = [];
      help = null;
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
      help = createHelpPanel(content, content.rooms[room.id], screen, () => game.hint(false), () => game.solve());
      screen.append(area, header, witness.el, help.el);

      audience = [];
      if (room.audienceHelp) {
        const button = createAudienceButton(content, () => game.startAudience());
        const overlay = createAudienceOverlay(content, () => game.finishAudience());
        header.append(button.el);
        screen.append(overlay.el);
        audience = [button, overlay];
      }
      stage.show(screen, room.id);
      return area;
    },

    narrate(text) {
      witness?.say(text);
    },

    setAudience(status: AudienceStatus) {
      for (const view of audience) view.update(status);
    },

    setHelp(status) {
      help?.setHelp(status);
    },

    showHint(text, n, total) {
      help?.showHint(text, n, total);
    },
  };
}
