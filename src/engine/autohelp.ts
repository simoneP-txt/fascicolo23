// Auto-help ladder: for one room, unlocks the hints and the skip as time passes and errors pile up, so
// the player never stays stuck. Time counts only while nothing pauses it (the audience help now, engine
// animations from phase 3) and is read from the given clock, so a late tick loses no seconds.
import type { HelpThresholds } from './types';

/** Which auto-help buttons are visible. */
export interface HelpStatus {
  hint: boolean;
  skip: boolean;
}

export interface Ladder {
  status(): HelpStatus;
  error(): void; // ctx.reportError()
  reveal(force: boolean): number | null; // index of the next hint; force ignores the thresholds (Ctrl+Shift+H)
  revealed(): number; // hints shown so far
  pause(): void; // pauses nest: every pause needs its resume
  resume(): void;
}

export function createLadder(thresholds: HelpThresholds, hints: number, now: () => number): Ladder {
  const { hintAfterSec, secondHintAfterSec, hintAfterErrors, skipAfterSec, skipAfterErrors } = thresholds;
  const hasHintButton = hintAfterSec !== null || secondHintAfterSec !== null || hintAfterErrors !== null;
  let elapsed = 0; // unpaused milliseconds in the room
  let last = now();
  let paused = 0;
  let errors = 0;
  let shown = 0;

  const sync = () => {
    const at = now();
    if (paused === 0) elapsed += at - last;
    last = at;
  };
  const after = (seconds: number | null) => seconds !== null && elapsed >= seconds * 1000;
  const reached = (count: number | null) => count !== null && errors >= count;
  const unlocked = () => {
    sync();
    const first = after(hintAfterSec) || reached(hintAfterErrors) ? 1 : 0;
    return Math.min(hints, after(secondHintAfterSec) ? 2 : first);
  };

  return {
    status() {
      const open = unlocked();
      return { hint: hasHintButton && shown < open, skip: after(skipAfterSec) || reached(skipAfterErrors) };
    },
    error() {
      errors += 1;
    },
    reveal(force) {
      if (shown >= hints || (!force && shown >= unlocked())) return null;
      return shown++;
    },
    revealed: () => shown,
    pause() {
      sync();
      paused += 1;
    },
    resume() {
      sync();
      paused = Math.max(0, paused - 1);
    },
  };
}
