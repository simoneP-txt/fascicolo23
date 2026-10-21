// Audio: plays the sounds listed in content.json by name through howler. A sound loads on first use;
// an unknown name, a missing file or a failing device stays silent, because sound never stops the game.
import { Howl } from 'howler';
import type { Sfx } from './game';

export interface Sound {
  play(): void;
  stop(): void;
}

// html5 audio streams from the URL instead of fetching it, which also works on file:// inside the .exe.
const howl = (src: string): Sound => new Howl({ src: [src], html5: true, onloaderror() {}, onplayerror() {} });

export function createAudio(sounds: Record<string, string>, make: (src: string) => Sound = howl): Sfx {
  const loaded = new Map<string, Sound>();
  return {
    play(name) {
      if (!Object.hasOwn(sounds, name)) return;
      try {
        let sound = loaded.get(name);
        if (!sound) loaded.set(name, (sound = make(sounds[name])));
        sound.play();
      } catch {
        // silence is the fallback
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
