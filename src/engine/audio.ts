// Audio: plays the sounds listed in content.json by name through howler. A sound loads on first use or at
// preload(), which the game calls once its first screen is up: the first sound opens the audio device,
// which blocks the page for about 0.4 s on this PC, and the first click of the game must not pay for it.
// An unknown name, a missing file or a failing device stays silent, because sound never stops the game.
import { Howl } from 'howler';
import type { Sfx } from './game';

export interface Sound {
  play(): void;
  stop(): void;
}

export interface SoundBoard extends Sfx {
  preload(): void; // loads every listed sound now
}

// html5 audio streams from the URL instead of fetching it, which also works on file:// inside the .exe.
const howl = (src: string): Sound => new Howl({ src: [src], html5: true, onloaderror() {}, onplayerror() {} });

export function createAudio(sounds: Record<string, string>, make: (src: string) => Sound = howl): SoundBoard {
  const loaded = new Map<string, Sound>();
  // The sound of this name, made on first use; it throws when the device fails.
  const sound = (name: string): Sound => {
    let found = loaded.get(name);
    if (!found) loaded.set(name, (found = make(sounds[name])));
    return found;
  };
  return {
    play(name) {
      if (!Object.hasOwn(sounds, name)) return;
      try {
        sound(name).play();
      } catch {
        // silence is the fallback
      }
    },
    preload() {
      for (const name of Object.keys(sounds)) {
        try {
          sound(name);
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
