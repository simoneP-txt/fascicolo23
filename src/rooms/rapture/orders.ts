// Rapture's orders game, with no DOM: eight orders share the run's time in equal windows, and the rule of the
// study says which to obey. Pressing the control of a question is right, any other press is wrong; a question
// left open until its window closes is an error, an imperative left open is right; each order takes one mark.
// The error after the allowed ones loses the run at once and calls onLost() once; the last window closed
// without that wins it. Every lost run makes the next one slower. A run reads the clock it is given whenever
// it is asked, so a late tick loses no time and settles every window closed since.
export const CONTROL_IDS = ['lever', 'button', 'valve', 'switch'] as const;
export type ControlId = (typeof CONTROL_IDS)[number];

export interface Order {
  text: string;
  control: ControlId;
}

/** Whether the order asks rather than commands: its text ends with "?". */
export function isQuestion(order: Order): boolean {
  return order.text.trimEnd().endsWith('?');
}

export type Mark = 'open' | 'right' | 'wrong';

/** The run as of now: the order on screen and its mark, the errors, the ms left, and how it stands. Once the run
 *  is over, index and left stay where it ended. */
export interface RunView {
  index: number;
  mark: Mark;
  errors: number;
  left: number;
  state: 'running' | 'won' | 'lost';
}

export interface Run {
  press(control: ControlId): Mark | null; // null: the order is settled already, or the run is over
  view(): RunView; // brings the run up to now
}

/** seconds: the first run; slower: seconds added by each lost run; errors: the errors a run forgives. */
export interface RunRules {
  seconds: number;
  slower: number;
  errors: number;
}

export interface Challenge {
  start(): Run; // a new run from now
  attempt(): number; // the number of the run under way, or of the next one once a run is lost
  seconds(): number; // that run's length
}

export function createChallenge(orders: readonly Order[], rules: RunRules, now: () => number, onLost: () => void): Challenge {
  let lost = 0; // runs lost so far
  const seconds = () => rules.seconds + rules.slower * lost;

  return {
    attempt: () => lost + 1,
    seconds,
    start() {
      const length = seconds() * 1000;
      const begun = now();
      const closes = (i: number) => ((i + 1) * length) / orders.length; // ms into the run when window i closes
      const marks: Mark[] = orders.map(() => 'open');
      let errors = 0;
      let state: RunView['state'] = 'running';
      let ended = { index: orders.length - 1, at: length }; // where and when the run stopped

      const fail = (index: number, at: number) => {
        errors += 1;
        if (errors <= rules.errors) return;
        state = 'lost';
        ended = { index, at };
        lost += 1;
        onLost();
      };

      // Settles every window closed by now, in order, until the run is over.
      const catchUp = () => {
        const at = now() - begun;
        for (let i = 0; i < orders.length && state === 'running'; i++) {
          if (at < closes(i)) return;
          if (marks[i] !== 'open') continue;
          if (isQuestion(orders[i])) {
            marks[i] = 'wrong';
            fail(i, closes(i));
          } else {
            marks[i] = 'right';
          }
        }
        if (state === 'running') state = 'won';
      };
      const current = () => Math.floor(((now() - begun) * orders.length) / length);

      return {
        press(control) {
          catchUp();
          if (state !== 'running') return null;
          const i = current();
          if (marks[i] !== 'open') return null;
          const right = isQuestion(orders[i]) && orders[i].control === control;
          marks[i] = right ? 'right' : 'wrong';
          if (!right) fail(i, now() - begun);
          return marks[i];
        },
        view() {
          catchUp();
          const index = state === 'running' ? current() : ended.index;
          const at = state === 'running' ? now() - begun : ended.at;
          return { index, mark: marks[index], errors, left: Math.max(0, length - at), state };
        },
      };
    },
  };
}
