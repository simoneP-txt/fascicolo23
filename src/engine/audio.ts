// Audio: plays the sounds listed in content.json by name, each on an <audio> element of its own, which streams
// its file from the URL and so also loads from file:// inside the .exe. A sound loads on first use or at
// preload(), which the game calls once its first screen is up: the first sound opens the audio device, which
// blocks the page for about 0.4 s on this PC, and the first click of the game must not pay for it.
// play() starts the element at once, whatever it has loaded, and the browser plays it as soon as it can; a play
// over one still sounding gets a copy of the element; a sound listed in loops loops on its element with no gap.
// stop() pauses at once, even while a play() is pending. Howler, before, waited for canplaythrough to start a
// sound: a file it reloads at the first click of the page may stop loading short of that, and every later play
// of that sound then waited for good. It also queued a stop() that came during a play() and never ran it.
// An unknown name, a missing file or a failing device stays silent, because sound never stops the game.
import type { Sfx } from './game';

export interface Sound {
  play(): void;
  stop(): void;
}

export interface SoundBoard extends Sfx {
  preload(): void; // loads every listed sound now
}

// A play() that fails, or that a stop() cuts short, rejects: silence is the fallback.
function start(audio: HTMLAudioElement): void {
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function element(src: string, loop: boolean): Sound {
  const first = new Audio(src);
  first.preload = 'auto';
  first.loop = loop;
  const copies = [first];
  return {
    play() {
      const idle = loop ? first : copies.find((audio) => audio.paused || audio.ended);
      if (idle) return start(idle);
      const copy = first.cloneNode() as HTMLAudioElement;
      copies.push(copy);
      start(copy);
    },
    stop() {
      for (const audio of copies) {
        audio.pause();
        audio.currentTime = 0;
      }
    },
  };
}

export function createAudio(
  sounds: Record<string, string>,
  make: (src: string, loop: boolean) => Sound = element,
  loops: readonly string[] = [],
): SoundBoard {
  const loaded = new Map<string, Sound>();
  // The sound of this name, made on first use; it throws when the device fails.
  const get = (name: string): Sound => {
    let found = loaded.get(name);
    if (!found) loaded.set(name, (found = make(sounds[name], loops.includes(name))));
    return found;
  };
  return {
    play(name) {
      if (!Object.hasOwn(sounds, name)) return;
      try {
        get(name).play();
      } catch {
        // silence is the fallback
      }
    },
    preload() {
      for (const name of Object.keys(sounds)) {
        try {
          get(name);
        } catch {
          // silence is the fallback
        }
      }
    },
    stopAll() {
      for (const sound of loaded.values()) {
        try {
          sound.stop();
        } catch {
          // silence is the fallback
        }
      }
    },
  };
}
