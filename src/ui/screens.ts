// Screens: the GameUi the engine talks to. It puts the case opening, the board or a room on the stage;
// a room gets a frame (header, way back to the board, audience help, witness, auto-help) and the area
// it mounts into. The stage swaps screens at once for now, so the old screen is gone and a room is on
// screen as soon as show() returns. A meme goes on the stage itself, so it scales with it and leaves with
// the screen under it.
import type { AudienceStatus } from '../engine/audience';
import { renderBoard } from '../engine/board';
import type { Game, GameUi, Sfx } from '../engine/game';
import type { Content, Room } from '../engine/types';
import { createAudienceButton, createAudienceOverlay, type AudienceView } from './audience';
import { createHelpPanel, type HelpPanel } from './autohelp';
import { el } from './dom';
import { renderIntro } from './intro';
import { showMeme as showMemeOverlay } from './meme';
import type { Stage } from './stage';
import { createWitness, type Witness } from './witness';

export function createScreens(
  stage: Stage,
  content: Content,
  rooms: readonly Room[],
  game: Game,
  audio: Sfx,
  screenGone: () => void,
): GameUi {
  let witness: Witness | null = null;
  let audience: AudienceView[] = [];
  let help: HelpPanel | null = null;

  return {
    showIntro() {
      witness = null;
      audience = [];
      help = null;
      stage.show(renderIntro(content, stage, () => game.openCase()), 'intro');
      screenGone();
    },

    showBoard(state) {
      const screen = renderBoard(content, rooms, state, (id) => game.enter(id));
      witness = createWitness(content);
      audience = [];
      help = null;
      screen.append(witness.el);
      stage.show(screen, 'board');
      screenGone();
    },

    showRoom(room, shown) {
      const screen = el('section', 'screen room');
      screen.dataset.screen = 'room';
      screen.dataset.room = room.id;

      const area = el('div', 'room__area');
      const back = el('button', 'button button--quiet', content.ui.back);
      back.addEventListener('click', () => game.leave());
      const header = el('header', 'room__header');
      header.append(el('div', 'label room__title', content.rooms[room.id].header), back);

      witness = createWitness(content);
      help = createHelpPanel(content, content.rooms[room.id], screen, () => game.hint(false), () => game.skip());
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
      screenGone();
      shown();
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

    showMeme(meme, done) {
      showMemeOverlay(stage.root, meme, audio, done);
    },
  };
}
