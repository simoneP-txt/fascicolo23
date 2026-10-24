// Library (mockups 02 and 08, with decision 8): the open window on the left, with the shelf card and the g4
// clue under it, and in the middle the shelf, 64 square buttons from grid8() that read like the chessboard. A
// square pressed shows its name and its book's title on the card. "Sfila il libro?" on a wrong book slides it
// out and back, counts an error and shows the shelf meme, and stays off for that book; on the secret square the
// book stays out and the shelf turns on itself to the mystery behind it: the hedge card and three statement
// cards, each with its accusation. A truthful witness accused shakes the card, counts an error and turns that
// accusation off. The liar accused sooner than quickGuessSec after the mystery came in is questioned first:
// the witness asks each line of witness.sure ("Sicura?", "Sicura sicura?") and the click after the last one
// counts, while another accusation starts the questions over. Once the liar is taken he gets the red outline
// and the stamp, the solution names the time the model finds, the time clue comes, the area is marked solved
// and the room completes after --duration-beat. Clicks wait while a book moves, the shelf turns, a card
// shakes or a question comes, the second click of a double click never reaches an accusation, and every
// visit starts from the shelf, with a new time for a quick guess.
import './biblioteca.css';
import type { Room } from '../../engine/types';
import { button, setEnabled } from '../../ui/button';
import { clueCard, paper, stamp } from '../../ui/card';
import { durationOf, el, replay } from '../../ui/dom';
import { axis, grid8, type Square } from '../../ui/grid8';
import { svg } from '../../ui/svg';
import { GRAPH } from '../graph';
import { createScope } from '../scope';
import { GUSTS, HEDGE, LOOSE_PAGES, WINDOW } from './art';
import { LIBRARY_SCHEMA, type LibraryContent } from './content';
import { clock, consistentLiars, cutTimes } from './liar';
import { shelfSpines } from './shelf';

const SPINES = shelfSpines();
const TILTS = [-1, 0.8, -0.6]; // the statement cards of mockup 08

const scope = createScope();
let view: HTMLElement | null = null;

/** A square's cell: its spines standing on the shelf board, the tallest one marked as the book that comes out. */
function shelfCell(square: Square, label: string): HTMLButtonElement {
  const cell = el('button', 'biblioteca__cell');
  cell.type = 'button';
  cell.setAttribute('aria-label', label);
  const spines = SPINES[square];
  const tallest = spines.reduce((best, spine, i) => (spine.height > spines[best].height ? i : best), 0);
  spines.forEach((spine, i) => {
    const node = el('span', 'biblioteca__spine');
    node.style.width = `${spine.width}px`;
    node.style.height = `${spine.height}px`;
    node.style.backgroundColor = `var(--book-${spine.book})`;
    if (spine.band) node.dataset.band = '';
    if (i === tallest) node.dataset.book = '';
    cell.append(node);
  });
  return cell;
}

export const biblioteca: Room<LibraryContent> = {
  id: 'biblioteca',
  requires: [...GRAPH.biblioteca.requires],
  gives: [...GRAPH.biblioteca.gives],
  audienceHelp: true,
  schema: LIBRARY_SCHEMA,
  mount(root, ctx) {
    const texts = ctx.content;
    const { shelf, mystery } = texts;
    const name = (square: Square) => shelf.tag.replace('{square}', square.toUpperCase());
    let busy = false; // a book moves, the shelf turns, a card shakes or a question comes
    let chosen: Square | null = null;
    const tried = new Set<Square>(); // wrong books already pulled
    let shown = 0; // when the mystery came in, the start of the time for a quick guess
    let asked = 0; // questions on the liar in a row, since the last other accusation

    const wait = (ms: number) => {
      busy = true;
      scope.later(ms, () => (busy = false));
    };

    // The window and its sill, in both views.
    const frame = el('div', 'biblioteca__window');
    frame.dataset.window = '';
    frame.append(svg(WINDOW));

    // The shelf view: the card and the g4 clue on the left, the shelf in the middle.
    const cells = new Map<Square, HTMLButtonElement>();
    const grid = grid8('biblioteca__grid', (square) => {
      const cell = shelfCell(square, name(square));
      cell.addEventListener('click', () => choose(square));
      cells.set(square, cell);
      return cell;
    });
    const files = axis('files', 'biblioteca__files');
    files.dataset.axis = 'files';
    const ranks = axis('ranks', 'biblioteca__ranks');
    ranks.dataset.axis = 'ranks';
    const bookcase = el('div', 'biblioteca__shelf');
    bookcase.append(files, ranks, grid);

    const tag = el('div', 'label');
    const title = el('div', 'biblioteca__title');
    const pull = button(shelf.pull, 'outline', () => pullBook());
    const card = paper('biblioteca__card');
    card.dataset.shelfCard = '';
    card.dataset.empty = '';
    card.append(tag, title, pull);
    const g4 = clueCard(ctx.common, 'g4', 2);
    g4.classList.add('biblioteca__g4');

    const shelfView = el('div', 'biblioteca__view');
    shelfView.dataset.view = 'shelf';
    shelfView.append(card, g4, bookcase);

    // The mystery view: the hedge card, the statements, then the solution and the time clue once solved.
    const head = paper('biblioteca__case', { pin: true, tilt: -0.4 });
    const intro = el('div', 'biblioteca__case-text');
    intro.append(el('div', 'label', mystery.tag), el('h2', 'biblioteca__case-title', mystery.title), el('p', 'biblioteca__intro', mystery.intro));
    head.append(intro, svg(HEDGE));

    const liar = consistentLiars()[0];
    const statements = el('div', 'biblioteca__statements');
    for (const [i, statement] of mystery.statements.entries()) {
      const sheet = paper('biblioteca__statement', { pin: true, tilt: TILTS[i % TILTS.length] });
      sheet.dataset.statement = statement.id;
      const accuse = button(statement.accuse, 'outline', () => {
        if (busy) return;
        if (statement.id === liar) return accuseLiar(sheet, accuse);
        asked = 0;
        setEnabled(accuse, false);
        replay(sheet, 'nope');
        ctx.reportError();
        const line = texts.witness.wrong[statement.id];
        if (line) ctx.narrate(line);
        wait(durationOf('--duration-nope'));
      });
      sheet.append(el('h3', 'biblioteca__name', statement.name), el('p', 'biblioteca__says', statement.says), accuse);
      statements.append(sheet);
    }
    // The second click of a double click may come after the wait that follows a question or a shake: it stops
    // here, before any accusation hears it.
    statements.addEventListener(
      'click',
      (event) => {
        if (event.detail > 1) event.stopPropagation();
      },
      { capture: true },
    );

    const [before, after] = mystery.solution.text.split('{time}');
    const answer = el('p', 'biblioteca__answer');
    answer.append(before, el('span', 'biblioteca__time', clock(cutTimes(liar)[0])), after ?? '');
    const solution = paper('biblioteca__solution');
    solution.append(el('div', 'label', mystery.solution.tag), answer);
    solution.hidden = true;
    const time = clueCard(ctx.common, 'time-0451', 3);
    time.classList.add('biblioteca__clock');
    time.hidden = true;

    const mysteryView = el('div', 'biblioteca__view');
    mysteryView.dataset.view = 'mystery';
    mysteryView.append(svg(GUSTS), ...LOOSE_PAGES.map((markup) => svg(markup)), head, statements, solution, time);
    mysteryView.hidden = true;

    view = el('div', 'biblioteca');
    view.append(frame, el('div', 'biblioteca__sill'), shelfView, mysteryView);
    root.append(view);

    const choose = (square: Square) => {
      if (busy) return;
      if (chosen) delete cells.get(chosen)!.dataset.chosen;
      chosen = square;
      cells.get(square)!.dataset.chosen = '';
      delete card.dataset.empty;
      tag.textContent = name(square);
      const book = shelf.titles[square];
      title.textContent = book ?? shelf.untitled;
      title.toggleAttribute('data-untitled', !book);
      setEnabled(pull, !tried.has(square));
    };

    // The secret book comes out and stays out, then the shelf turns and the mystery comes in its place.
    const openPassage = (book: HTMLElement) => {
      busy = true;
      book.dataset.out = '';
      const out = durationOf('--duration-pull');
      scope.later(out, () => (shelfView.dataset.turn = ''));
      scope.later(out + durationOf('--duration-turn'), () => {
        shelfView.hidden = true;
        mysteryView.hidden = false;
        shown = Date.now();
        busy = false;
        ctx.narrate(texts.witness.passage);
      });
    };

    const pullBook = () => {
      if (busy || !chosen) return;
      const book = cells.get(chosen)!.querySelector<HTMLElement>('[data-book]')!;
      if (chosen === texts.secret) return openPassage(book);
      tried.add(chosen);
      setEnabled(pull, false);
      replay(book, 'pull');
      ctx.reportError();
      ctx.meme('shelf');
      wait(durationOf('--duration-pull'));
    };

    // The liar accused: taken at once when the guess took quickGuessSec or more, or when every question of
    // witness.sure has been asked in a row; otherwise the next question, which counts no error and holds clicks
    // back as an answer does, so a double click asks once.
    const accuseLiar = (sheet: HTMLElement, accuse: HTMLButtonElement) => {
      const { sure } = texts.witness;
      if (Date.now() - shown >= texts.quickGuessSec * 1000 || asked === sure.length) return unmask(sheet, accuse);
      ctx.narrate(sure[asked]);
      asked++;
      wait(durationOf('--duration-nope'));
    };

    // The liar unmasked: red outline, the stamp and its sound, the solution and the time, then the beat.
    const unmask = (sheet: HTMLElement, accuse: HTMLButtonElement) => {
      busy = true;
      sheet.dataset.liar = '';
      accuse.classList.replace('btn--outline', 'btn--dark');
      accuse.setAttribute('aria-pressed', 'true');
      const mark = stamp(mystery.stamp);
      mark.classList.add('biblioteca__stamp');
      sheet.append(mark);
      ctx.playSfx('stamp');
      solution.hidden = false;
      time.hidden = false;
      ctx.narrate(texts.witness.solved);
      root.dataset.solved = '';
      scope.later(durationOf('--duration-beat'), () => ctx.complete());
    };
  },
  unmount() {
    scope.clear();
    view?.remove();
    view = null;
  },
};
