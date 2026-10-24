// Rapture (mockups 09 and 10, decisions 1, 5, 6 and 10): the deep plays in a loop from the entrance, and the
// engine's stopAll() ends it at every way out. First the keypad on the art deco door, between the reminder of
// the study's rule with the porthole and the witness: digits fill four slots, a fifth stays out, "Cancella?"
// takes the last one back, and "Apri?" stays off until the four are in. A wrong code shakes the slots and
// empties them while the witness nudges towards the library's time, then says it plainly, and counts nothing.
// The right one lights the slots gold and the door swings open on the orders game: the reminder, the errors
// and the attempt on the left, the order card with the time over the four controls. "Pronta?", then
// "Riprova?" after a lost run, starts a run; each new order chimes, a right press lights its control gold and a
// wrong one red, and every error, a question let go included, buzzes and fills an X. A lost run counts one
// error for the auto-help, shows the run meme and the witness's line; a won run gets its line, the area is
// marked solved and the room completes after --duration-beat. A control moves at each press and takes no other
// click while it moves, and the second click of a double click never reaches one. Bubbles rise, the rays behind
// the door sway and the fish swim, by transform and opacity. Every visit starts from the keypad and the first
// run.
import './rapture.css';
import type { Room } from '../../engine/types';
import { button, setEnabled } from '../../ui/button';
import { durationOf, el, replay } from '../../ui/dom';
import { svg } from '../../ui/svg';
import { GRAPH } from '../graph';
import { createScope } from '../scope';
import { BUBBLES, CONTROLS, CROSS, CROWN, ERASE, FLOOR, PORTHOLE, RAYS, SPEAKER } from './art';
import { RAPTURE_SCHEMA, type RaptureContent } from './content';
import { CONTROL_IDS, createChallenge, type ControlId, type Run, type RunView } from './orders';

const TICK_MS = 50; // how often the panel follows the run's clock, while a run goes on
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

const scope = createScope();
let view: HTMLElement | null = null;

/** The rings of one view's bubbles, each where its mockup draws it, rising from there out of step. */
function bubbles(list: readonly (readonly [number, number, number])[]): HTMLElement {
  const layer = el('div', 'rapture__bubbles');
  layer.setAttribute('aria-hidden', 'true');
  list.forEach(([x, y, r], i) => {
    const ring = el('span', 'rapture__bubble');
    const size = 2 * r + 2; // the mockup's circles are stroked 2 wide on their radius
    Object.assign(ring.style, { left: `${x - r - 1}px`, top: `${y - r - 1}px`, width: `${size}px`, height: `${size}px` });
    ring.style.setProperty('--lag', ((i * 0.618) % 1).toFixed(3));
    layer.append(ring);
  });
  return layer;
}

/** The deco panel with the study's rule under its pin. */
function reminder(tag: string, rule: string): HTMLElement {
  const card = el('div', 'rapture__reminder');
  card.dataset.reminder = '';
  const pin = el('span', 'paper__pin');
  pin.setAttribute('aria-hidden', 'true');
  card.append(pin, el('div', 'label', tag), el('p', 'rapture__rule', rule));
  return card;
}

export const rapture: Room<RaptureContent> = {
  id: 'rapture',
  requires: [...GRAPH.rapture.requires],
  gives: [...GRAPH.rapture.gives],
  audienceHelp: false,
  schema: RAPTURE_SCHEMA,
  mount(root, ctx) {
    const texts = ctx.content;
    const { panel, orders } = texts;
    const rule = ctx.common.clues.rule.label;
    let phase: 'keypad' | 'opening' | 'ready' | 'running' | 'lost' | 'won' = 'keypad';
    let code = '';
    let misses = 0; // wrong codes so far
    let shaking = false; // the slots shake a wrong code
    let moving = false; // a control moves under a press

    // The keypad view: the rays and the porthole, the door with its crown, prompt, slots and keys.
    const caret = el('span', 'rapture__caret');
    caret.setAttribute('aria-hidden', 'true');
    const cells = [...texts.code].map(() => {
      const cell = el('span', 'rapture__slot');
      cell.dataset.slot = '';
      return cell;
    });
    const slots = el('div', 'rapture__slots');
    slots.dataset.slots = '';
    slots.setAttribute('role', 'group');
    slots.setAttribute('aria-label', texts.keypad.prompt);
    slots.append(...cells);

    const open = button(texts.keypad.open, 'gold', () => tryCode());
    const showCode = () => {
      cells.forEach((cell, i) => {
        cell.textContent = code[i] ?? '';
        cell.toggleAttribute('data-current', i === code.length);
      });
      cells[code.length]?.append(caret);
      setEnabled(open, code.length === cells.length);
    };
    const press = (digit: string) => {
      if (phase !== 'keypad' || shaking) return;
      if (code.length === cells.length) return replay(slots, 'nope'); // a fifth digit stays out
      code += digit;
      showCode();
    };
    const key = (label: string, onPress: () => void) => {
      const node = button(label, 'outline', onPress);
      node.classList.add('rapture__key');
      return node;
    };
    const erase = key('', () => {
      if (phase !== 'keypad' || shaking) return;
      code = code.slice(0, -1);
      showCode();
    });
    erase.setAttribute('aria-label', texts.keypad.erase);
    erase.append(svg(ERASE));
    const digitKey = (digit: string) => {
      const node = key(digit, () => press(digit));
      node.dataset.digit = digit;
      return node;
    };
    open.classList.add('rapture__key', 'rapture__open');
    const keys = el('div', 'rapture__keys');
    keys.append(...DIGITS.map(digitKey), erase, digitKey('0'), open);

    const door = el('div', 'rapture__door');
    door.append(svg(CROWN), el('p', 'rapture__prompt', texts.keypad.prompt), slots, keys);
    const porthole = svg(PORTHOLE);
    const keypadView = el('div', 'rapture__view');
    keypadView.dataset.view = 'keypad';
    keypadView.append(svg(RAYS), bubbles(BUBBLES.keypad), reminder(texts.reminder, rule), porthole, door);

    // The orders view: the reminder, the errors and the attempt, the order card, the time and the controls.
    const marks = Array.from({ length: texts.run.errors }, () => {
      const slot = el('span', 'rapture__error');
      slot.dataset.error = 'open';
      return slot;
    });
    const count = el('span', 'rapture__count');
    const errorRow = el('div', 'rapture__error-row');
    errorRow.append(...marks, count);
    const errors = el('div', 'rapture__panel rapture__errors');
    errors.dataset.errors = '';
    errors.append(el('div', 'label', panel.errors), errorRow);

    const number = el('div', 'rapture__number');
    const attempt = el('div', 'rapture__panel rapture__attempt');
    attempt.dataset.attempt = '';
    attempt.append(el('div', 'label', panel.attempt), number);

    const tag = el('div', 'label');
    const line = el('p', 'rapture__line');
    line.dataset.orderText = '';
    const words = el('div', 'rapture__words');
    const card = el('div', 'rapture__order');
    card.dataset.order = '';
    card.append(svg(SPEAKER), words);

    const left = el('span', 'rapture__left');
    left.dataset.timeLeft = '';
    const time = el('div', 'rapture__time');
    time.append(el('span', 'label', panel.time), left);
    const fill = el('div', 'rapture__fill');
    const bar = el('div', 'rapture__bar');
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', panel.time);
    bar.setAttribute('aria-valuemin', '0');
    bar.append(fill);

    const controls = new Map<ControlId, HTMLButtonElement>();
    const row = el('div', 'rapture__controls');
    for (const id of CONTROL_IDS) {
      const control = button(texts.controls[id], 'outline', () => pressControl(id));
      control.classList.add('rapture__control');
      control.dataset.control = id;
      control.prepend(svg(CONTROLS[id]));
      controls.set(id, control);
      row.append(control);
    }
    // The second click of a double click may land on the next order: it stops here, before any control.
    row.addEventListener(
      'click',
      (event) => {
        if (event.detail > 1) event.stopPropagation();
      },
      { capture: true },
    );

    const ordersView = el('div', 'rapture__view');
    ordersView.dataset.view = 'orders';
    ordersView.hidden = true;
    ordersView.append(bubbles(BUBBLES.orders), reminder(texts.reminder, rule), errors, attempt, card, time, bar, row);

    view = el('div', 'rapture');
    view.append(svg(FLOOR), keypadView, ordersView);
    root.append(view);

    // The run: the challenge counts the lost runs of this visit, each slower than the one before.
    let run: Run | null = null;
    let length = 0; // ms of the run under way, or of the next one
    let shown = { index: -1, errors: 0 }; // what the panel shows of the run

    const showErrors = (n: number) => {
      marks.forEach((mark, i) => {
        const made = i < n;
        if (made === (mark.dataset.error === 'made')) return;
        mark.dataset.error = made ? 'made' : 'open';
        mark.replaceChildren(...(made ? [svg(CROSS)] : []));
      });
      count.textContent = panel.count.replace('{n}', String(Math.min(n, marks.length))).replace('{total}', String(marks.length));
    };
    const showTime = (ms: number) => {
      const seconds = Math.ceil(ms / 1000);
      left.textContent = panel.seconds.replace('{s}', String(seconds));
      fill.style.transform = `scaleX(${ms / length})`;
      bar.setAttribute('aria-valuemax', String(length / 1000));
      bar.setAttribute('aria-valuenow', String(seconds));
    };
    // The card waits for "Pronta?" or "Riprova?"; after a lost run the panel keeps its errors and time until then.
    const ready = (label: string) => {
      card.dataset.state = 'ready';
      const go = button(label, 'gold', () => start());
      go.classList.add('rapture__go');
      words.replaceChildren(go);
    };
    const start = () => {
      if (phase !== 'ready' && phase !== 'lost') return;
      phase = 'running';
      run = challenge.start();
      length = challenge.seconds() * 1000;
      shown = { index: -1, errors: 0 };
      number.textContent = panel.number.replace('{n}', String(challenge.attempt()));
      showErrors(0);
      card.dataset.state = 'running';
      words.replaceChildren(tag, line);
      render(run.view());
      // The panel follows the run every TICK_MS, and each window closes on time, the last one ending the run.
      const current = run;
      const follow = () => phase === 'running' && run === current && render(current.view());
      const tick = () => {
        if (!follow()) return;
        scope.later(TICK_MS, tick);
      };
      scope.later(TICK_MS, tick);
      for (let i = 1; i <= orders.length; i++) scope.later(Math.ceil((i * length) / orders.length), follow);
    };

    // Follows the run: a new order chimes, a new error buzzes, the time runs down, a won run ends the room.
    // Returns whether the run goes on.
    const render = (now: RunView): boolean => {
      if (now.state === 'running' && now.index !== shown.index) {
        shown.index = now.index;
        tag.textContent = panel.order.replace('{n}', String(now.index + 1)).replace('{total}', String(orders.length));
        line.textContent = orders[now.index].text;
        for (const control of controls.values()) delete control.dataset.mark;
        replay(card, 'chime');
        ctx.playSfx('chime');
      }
      if (now.errors > shown.errors) {
        shown.errors = now.errors;
        showErrors(now.errors);
        ctx.playSfx('buzz');
      }
      showTime(now.left);
      if (now.state === 'won') win();
      return phase === 'running';
    };

    // The error after the allowed ones: one error for the auto-help, the meme, the witness, "Riprova?".
    const lose = () => {
      phase = 'lost';
      ctx.reportError();
      ctx.meme('run');
      ctx.narrate(texts.witness.lost);
      ready(panel.again);
    };
    const challenge = createChallenge(orders, texts.run, () => Date.now(), lose);

    const win = () => {
      if (phase === 'won') return;
      phase = 'won';
      ctx.narrate(texts.witness.solved);
      root.dataset.solved = '';
      scope.later(durationOf('--duration-beat'), () => ctx.complete());
    };

    const pressControl = (id: ControlId) => {
      if (moving || phase === 'won') return;
      const control = controls.get(id)!;
      replay(control, 'press');
      moving = true;
      scope.later(durationOf('--duration-control'), () => (moving = false));
      if (phase !== 'running' || !run) return;
      const mark = run.press(id);
      if (mark) control.dataset.mark = mark;
      render(run.view());
    };

    const tryCode = () => {
      if (phase !== 'keypad' || shaking) return;
      if (code === texts.code) return openDoor();
      ctx.narrate(texts.witness.code[Math.min(misses, texts.witness.code.length - 1)]);
      misses++;
      shaking = true;
      slots.dataset.state = 'wrong';
      replay(slots, 'nope');
      scope.later(durationOf('--duration-nope'), () => {
        shaking = false;
        delete slots.dataset.state;
        code = '';
        showCode();
      });
    };

    // The slots light up gold and the door swings open, then the orders view comes in.
    const openDoor = () => {
      phase = 'opening';
      slots.dataset.state = 'right';
      door.dataset.open = '';
      keypadView.dataset.leaving = '';
      scope.later(durationOf('--duration-door'), () => {
        keypadView.hidden = true;
        ordersView.hidden = false;
        phase = 'ready';
        length = challenge.seconds() * 1000;
        number.textContent = panel.number.replace('{n}', String(challenge.attempt()));
        showErrors(0);
        showTime(length);
        ready(panel.start);
        ctx.narrate(texts.witness.open);
      });
    };

    showCode();
    ctx.playSfx('deep');
  },
  unmount() {
    scope.clear();
    view?.remove();
    view = null;
  },
};
