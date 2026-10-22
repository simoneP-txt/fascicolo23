// Screens: the GameUi the engine talks to. It puts the case opening, the board or a room on the stage;
// a room gets the frame of mockups 06, 07 and 10 (header, way back to the board, audience button, the
// witness top right with its silhouette, auto-help bottom right), colored by the room's frame theme, and
// the area it mounts into. When the board comes with a fragment just won, the wish plays over it first and
// the board reveals the fragment once the wish is over. Overlays, the meme and the wish included, go on the
// stage root: they scale with the stage, leave with the screen under them and stay outside the screen's
// clip, so a veil reaches the bands. The stage swaps screens at once for now, so the old screen is gone
// and a room is on screen as soon as show() returns.
import './room.css';
import type { AudienceStatus } from '../engine/audience';
import { renderBoard } from '../engine/board';
import type { Earned, Game, GameUi, Sfx } from '../engine/game';
import type { ClueId, Content, Room } from '../engine/types';
import { createAudienceButton, createAudienceOverlay, type AudienceView } from './audience';
import { createHelpPanel, type HelpPanel } from './autohelp';
import { button } from './button';
import { el } from './dom';
import { renderIntro } from './intro';
import { showMeme as showMemeOverlay } from './meme';
import type { Stage } from './stage';
import { showWish, wishCard } from './wish';
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
  const gives = (earned: Earned): readonly ClueId[] => rooms.find((room) => room.id === earned)?.gives ?? [];

  return {
    showIntro() {
      witness = null;
      audience = [];
      help = null;
      stage.show(renderIntro(content, stage, () => game.openCase()), 'intro');
      screenGone();
    },

    showBoard(state, earned) {
      const board = renderBoard(content, rooms, state, earned, (id) => game.enter(id));
      witness = createWitness(content, 'right');
      audience = [];
      help = null;
      board.el.append(witness.el);
      stage.show(board.el, 'board');
      if (earned) showWish(stage.root, content, wishCard(content, earned, gives(earned)), audio, () => board.reveal());
      screenGone();
    },

    showRoom(room, shown) {
      const screen = el('section', 'screen room');
      screen.dataset.screen = 'room';
      screen.dataset.room = room.id;

      const area = el('div', 'room__area');
      const back = button(content.ui.back, 'link', () => game.leave(), 'back');
      back.classList.add('room__back');
      const header = el('header', 'room__header');
      header.append(el('div', 'label room__title', content.rooms[room.id].header), back);

      witness = createWitness(content, 'down');
      help = createHelpPanel(content, content.rooms[room.id], stage.root, () => game.hint(false), () => game.skip());
      screen.append(area, header, witness.el, help.el);

      audience = [];
      let overlay: AudienceView | null = null;
      if (room.audienceHelp) {
        const button = createAudienceButton(content, () => game.startAudience());
        overlay = createAudienceOverlay(content, () => game.finishAudience());
        header.append(button.el);
        audience = [button, overlay];
      }
      stage.show(screen, room.id);
      if (overlay) stage.root.append(overlay.el);
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
