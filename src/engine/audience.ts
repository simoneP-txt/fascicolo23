// Audience help: the status the screen shows (no button in Rapture, a spent button at zero tokens, a
// countdown while the audience talks) and the countdown itself, measured on the clock it is given.
export type AudienceStatus =
  | { mode: 'off' }
  | { mode: 'ready' | 'spent'; tokens: number; max: number }
  | { mode: 'running'; tokens: number; max: number; secondsLeft: number };

export interface Countdown {
  secondsLeft(): number;
  done(): boolean;
}

export function startCountdown(seconds: number, now: () => number): Countdown {
  const end = now() + seconds * 1000;
  return {
    secondsLeft: () => Math.max(0, Math.ceil((end - now()) / 1000)),
    done: () => now() >= end,
  };
}

export function audienceStatus(allowed: boolean, tokens: number, max: number, countdown: Countdown | null): AudienceStatus {
  if (!allowed) return { mode: 'off' };
  if (countdown) return { mode: 'running', tokens, max, secondsLeft: countdown.secondsLeft() };
  return { mode: tokens > 0 ? 'ready' : 'spent', tokens, max };
}
