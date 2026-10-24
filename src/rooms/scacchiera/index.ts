// Chessboard (mockup 07): a mate in three for white that ends with Kg4. The position card on the left fills
// its rows with the moves found, in English notation; the board in the middle is 64 square buttons from
// grid8() under one layer of pieces that takes no clicks. A white piece pressed shows where it can go; a legal
// move off the line is not played, its square shakes and the witness answers; the right move slides the piece,
// and after --duration-reply black plays its forced answer by itself. Kg4 uncovers the rook's check: the area
// is marked solved, the mate stays on screen for --duration-beat and the room completes. The board ignores
// clicks while a piece slides, a square shakes or black answers, and the second click of a double click
// always; every visit starts from the position.
import './scacchiera.css';
import type { Room } from '../../engine/types';
import { paper } from '../../ui/card';
import { durationOf, el, replay } from '../../ui/dom';
import { axis, cell, grid8, type Square } from '../../ui/grid8';
import { svg } from '../../ui/svg';
import { GRAPH } from '../graph';
import { createScope } from '../scope';
import { NIGHT } from './art';
import { CHESS_SCHEMA, type ChessContent } from './content';
import { drawPiece } from './pieces';
import { createPuzzle } from './puzzle';

const CELL = 96; // a square, in stage pixels and in the units of the pieces' layer

const scope = createScope();
let view: HTMLElement | null = null;

/** The line for the n-th time, or the last one when the list is shorter. */
const nth = (lines: readonly string[], n: number) => lines[Math.min(n, lines.length - 1)];

function place(piece: SVGGElement, square: Square): void {
  const { col, row } = cell(square);
  piece.dataset.at = square;
  piece.style.transform = `translate(${col * CELL}px, ${row * CELL}px)`;
}

export const scacchiera: Room<ChessContent> = {
  id: 'scacchiera',
  requires: [...GRAPH.scacchiera.requires],
  gives: [...GRAPH.scacchiera.gives],
  audienceHelp: true,
  schema: CHESS_SCHEMA,
  mount(root, ctx) {
    const texts = ctx.content;
    const puzzle = createPuzzle(texts.fen, texts.line);
    let selected: Square | null = null;
    let busy = false; // a piece slides, a square shakes or black answers

    const squares = new Map<Square, HTMLButtonElement>();
    const grid = grid8('scacchiera__grid', (square) => {
      const button = el('button', 'scacchiera__square');
      button.type = 'button';
      button.setAttribute('aria-label', square);
      const { col, row } = cell(square);
      if ((col + row) % 2 === 1) button.dataset.dark = '';
      button.addEventListener('click', () => press(square));
      squares.set(square, button);
      return button;
    });
    // The second click of a double click may come after the shake of a wrong move: it stops here, before it
    // presses the piece still standing on that square.
    grid.addEventListener(
      'click',
      (event) => {
        if (event.detail > 1) event.stopPropagation();
      },
      { capture: true },
    );

    const start = puzzle.board();
    const layer = svg(
      `<svg class="scacchiera__pieces" viewBox="0 0 ${8 * CELL} ${8 * CELL}" aria-hidden="true">` +
        `${start.map(({ piece }) => drawPiece(piece)).join('')}</svg>`,
    );
    const pieces = new Map<Square, SVGGElement>();
    [...layer.children].forEach((node, i) => {
      place(node as SVGGElement, start[i].square);
      pieces.set(start[i].square, node as SVGGElement);
    });

    const ranks = axis('ranks', 'scacchiera__ranks');
    ranks.dataset.axis = 'ranks';
    const files = axis('files', 'scacchiera__files');
    files.dataset.axis = 'files';
    const board = el('div', 'scacchiera__board');
    board.append(ranks, files, grid, layer);

    // One row per white move, "1." then the moves of that turn, an empty line until they come.
    const rows = Array.from({ length: Math.ceil(texts.line.length / 2) }, (_, i) => {
      const moves = el('span', 'scacchiera__san');
      moves.dataset.san = '';
      const row = el('li', 'scacchiera__move');
      row.dataset.move = String(i + 1);
      row.append(el('span', 'scacchiera__n', `${i + 1}.`), ' ', moves);
      return { row, moves };
    });
    const list = el('ol', 'scacchiera__moves');
    list.append(...rows.map(({ row }) => row));
    const card = paper('scacchiera__card', { pin: true, tilt: -1 });
    card.append(
      el('div', 'label', texts.card.tag),
      el('h2', 'scacchiera__title', texts.card.title),
      el('p', 'scacchiera__task', texts.card.task),
      el('div', 'scacchiera__rule'),
      el('div', 'label', texts.card.moves),
      list,
    );

    view = el('div', 'scacchiera');
    view.append(svg(NIGHT), card, board);
    root.append(view);

    const wait = (ms: number) => {
      busy = true;
      scope.later(ms, () => (busy = false));
    };

    // The selection and the squares it reaches: a dot on an empty square, a ring round a piece to take.
    const select = (square: Square | null) => {
      for (const button of squares.values()) {
        delete button.dataset.selected;
        delete button.dataset.target;
      }
      selected = square;
      if (!square) return;
      squares.get(square)!.dataset.selected = '';
      for (const target of puzzle.targets(square)) squares.get(target)!.dataset.target = pieces.has(target) ? 'take' : 'move';
    };

    // The board after a move: the moves on the card and the red square of a king in check.
    const record = () => {
      const found = puzzle.found();
      rows.forEach(({ moves }, i) => (moves.textContent = found.slice(2 * i, 2 * i + 2).join(' ')));
      for (const button of squares.values()) delete button.dataset.check;
      const king = puzzle.inCheck();
      if (king) squares.get(king)!.dataset.check = '';
    };

    // The piece slides over the others to its square; the one it takes fades out there.
    const slide = (from: Square, to: Square) => {
      const taken = pieces.get(to);
      if (taken) {
        delete taken.dataset.piece;
        delete taken.dataset.at;
        taken.dataset.taken = '';
        scope.later(durationOf('--duration-slide'), () => taken.remove());
      }
      const piece = pieces.get(from)!;
      pieces.delete(from);
      pieces.set(to, piece);
      layer.append(piece); // drawn last, so it passes over the others
      piece.getBoundingClientRect(); // its old place is laid out, so the new one comes as a transition
      place(piece, to);
      record();
    };

    const move = (from: Square, to: Square) => {
      select(null);
      const verdict = puzzle.play(from, to);
      const turn = Math.floor(puzzle.found().length / 2); // this move's turn, from 0: the witness's line for it
      if (verdict === 'wrong') {
        replay(squares.get(to)!, 'nope');
        ctx.reportError();
        ctx.narrate(nth(texts.witness.wrong, turn));
        wait(durationOf('--duration-nope'));
        return;
      }
      if (verdict === 'illegal') return;
      slide(from, to);
      if (puzzle.solved()) {
        busy = true;
        ctx.narrate(texts.witness.solved);
        root.dataset.solved = '';
        scope.later(durationOf('--duration-beat'), () => ctx.complete());
        return;
      }
      wait(durationOf('--duration-reply') + durationOf('--duration-slide'));
      scope.later(durationOf('--duration-reply'), () => {
        const answer = puzzle.answer()!;
        slide(answer.from, answer.to);
        ctx.narrate(nth(texts.witness.replies, turn));
      });
    };

    const press = (square: Square) => {
      if (busy) return;
      const from = selected;
      if (from && squares.get(square)!.dataset.target) return move(from, square);
      const letter = pieces.get(square)?.dataset.piece;
      const white = !!letter && letter === letter.toUpperCase();
      select(white && square !== from ? square : null);
      if (letter && !white && !from) ctx.narrate(texts.witness.black);
    };
  },
  unmount() {
    scope.clear();
    view?.remove();
    view = null;
  },
};
