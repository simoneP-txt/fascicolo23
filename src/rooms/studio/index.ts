// Study (mockup 06, decision 9): the lamp and the plate on the left, the column of three reports in the
// middle, the witness and the stake card on the right. One report is open at a time: its tag, the question,
// the testimony and four phenomena, each an option with its dot. A wrong one shakes, counts an error, gets
// the witness's line for that report and stays switched off; the right one closes the report into its solved
// form, the testimony on one line, the check and the stamp, and the next report opens. After the third the
// witness speaks, the area is marked solved and the room completes after --duration-beat. Reports still
// locked show their tag, a grey line and the lock. The plate swings at each press and the witness finds it
// interesting, with no error. Clicks wait while an option shakes or a report opens, and the second click of a
// double click never reaches an option. Every visit starts from the first report.
import './studio.css';
import type { Room } from '../../engine/types';
import { button, setEnabled } from '../../ui/button';
import { paper, stamp } from '../../ui/card';
import { durationOf, el, replay } from '../../ui/dom';
import { icon, svg } from '../../ui/svg';
import { GRAPH } from '../graph';
import { createScope } from '../scope';
import { BLOT, CHECK, STUDY } from './art';
import { STUDIO_SCHEMA, type StudioContent } from './content';

const scope = createScope();
let view: HTMLElement | null = null;

export const studio: Room<StudioContent> = {
  id: 'studio',
  requires: [...GRAPH.studio.requires],
  gives: [...GRAPH.studio.gives],
  audienceHelp: true,
  schema: STUDIO_SCHEMA,
  mount(root, ctx) {
    const texts = ctx.content;
    const { testimonies } = texts;
    let current = 0; // the open report, from 0
    let busy = false; // an option shakes, a report opens or the room is solved

    const wait = (ms: number) => {
      busy = true;
      scope.later(ms, () => (busy = false));
    };

    const sheets = testimonies.map((_, i) => {
      const sheet = paper('studio__report');
      sheet.dataset.report = String(i + 1);
      return sheet;
    });
    const tag = (i: number) =>
      el('div', 'label', texts.reports.tag.replace('{n}', String(i + 1)).replace('{total}', String(testimonies.length)));
    const quote = (i: number) => el('p', 'studio__quote', testimonies[i].quote);

    const lock = (i: number) => {
      const line = el('div', 'studio__ghost');
      line.setAttribute('aria-hidden', 'true');
      const padlock = icon('lock');
      padlock.classList.add('studio__lock');
      sheets[i].dataset.state = 'locked';
      sheets[i].replaceChildren(tag(i), line, padlock);
    };

    const open = (i: number) => {
      const options = el('div', 'studio__options');
      testimonies[i].options.forEach((text, n) => {
        const option = button(text, 'outline', () => pick(n, option));
        option.classList.add('studio__option');
        option.dataset.option = String(n);
        const dot = el('span', 'studio__dot');
        dot.setAttribute('aria-hidden', 'true');
        option.prepend(dot);
        options.append(option);
      });
      sheets[i].dataset.state = 'open';
      sheets[i].replaceChildren(tag(i), el('h2', 'studio__question', texts.reports.question), quote(i), options);
    };

    // The solved form: the testimony on one line, its end cut by an ellipsis on purpose, the check with the
    // right phenomenon, and the stamp beating in.
    const close = (i: number) => {
      const { options, answer } = testimonies[i];
      const line = quote(i);
      line.dataset.ellipsis = '';
      const verdict = el('div', 'studio__verdict');
      verdict.append(svg(CHECK), el('span', undefined, options[answer]));
      const mark = stamp(ctx.common.ui.solved);
      mark.classList.add('studio__stamp');
      sheets[i].dataset.state = 'solved';
      delete sheets[i].dataset.unlock; // its lines came in when it opened; now only the stamp beats
      sheets[i].replaceChildren(tag(i), line, verdict, mark);
    };

    const pick = (n: number, option: HTMLButtonElement) => {
      if (busy) return;
      if (n !== testimonies[current].answer) {
        setEnabled(option, false);
        replay(option, 'nope');
        ctx.reportError();
        ctx.narrate(texts.witness.wrong[current]);
        wait(durationOf('--duration-nope'));
        return;
      }
      close(current);
      ctx.playSfx('stamp');
      current++;
      if (current < testimonies.length) {
        open(current);
        replay(sheets[current], 'unlock');
        wait(durationOf('--duration-unlock'));
        return;
      }
      busy = true;
      ctx.narrate(texts.witness.solved);
      root.dataset.solved = '';
      scope.later(durationOf('--duration-beat'), () => ctx.complete());
    };

    const column = el('div', 'studio__reports');
    column.dataset.reports = '';
    column.append(...sheets);
    // The second click of a double click lands on whatever the first one left under the pointer, maybe an
    // option of the report that just opened: it stops here, before any option hears it.
    column.addEventListener(
      'click',
      (event) => {
        if (event.detail > 1) event.stopPropagation();
      },
      { capture: true },
    );
    sheets.forEach((_, i) => (i === 0 ? open(i) : lock(i)));

    const card = paper('studio__plate-card', { pin: true, tilt: -4 });
    card.append(el('div', 'label', texts.plate), svg(BLOT));
    const plate = el('button', 'studio__plate');
    plate.type = 'button';
    plate.append(card);
    plate.addEventListener('click', () => {
      if (busy) return;
      replay(plate, 'swing');
      ctx.narrate(texts.witness.plate);
    });

    const chip = el('span', 'studio__chip');
    chip.setAttribute('aria-hidden', 'true');
    const prize = el('div', 'studio__prize');
    prize.append(chip, el('span', undefined, texts.stake.fragment));
    const stake = paper('studio__stake', { pin: true, tilt: 1.5 });
    stake.dataset.stake = '';
    stake.append(el('div', 'label', texts.stake.tag), prize, el('div', undefined, texts.stake.clues));

    view = el('div', 'studio');
    view.append(svg(STUDY), plate, column, stake);
    root.append(view);
  },
  unmount() {
    scope.clear();
    view?.remove();
    view = null;
  },
};
