// Room scope: every timer a room starts goes through its scope, and unmount() clears the scope, so no timer
// of a room fires once the room has left the stage. A cleared scope takes new timers on the next visit.
export interface Scope {
  later(ms: number, run: () => void): void;
  every(ms: number, run: () => void): void;
  clear(): void; // cancels every pending later() and every()
}

export function createScope(): Scope {
  const timeouts = new Set<ReturnType<typeof setTimeout>>();
  const intervals = new Set<ReturnType<typeof setInterval>>();
  return {
    later(ms, run) {
      const id = setTimeout(() => {
        timeouts.delete(id);
        run();
      }, ms);
      timeouts.add(id);
    },
    every(ms, run) {
      intervals.add(setInterval(run, ms));
    },
    clear() {
      for (const id of timeouts) clearTimeout(id);
      for (const id of intervals) clearInterval(id);
      timeouts.clear();
      intervals.clear();
    },
  };
}
