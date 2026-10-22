// Audio: sounds listed in content.json play by name and load once, on first use or at preload(); stopAll()
// stops every sound in progress, and an unknown name or a failing device stays silent instead of breaking
// the game.
import { expect, test, vi } from 'vitest';
import { createAudio } from '../../src/engine/audio';

function fakeSounds() {
  const made = new Map<string, { play: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }>();
  const make = vi.fn((src: string) => {
    const sound = { play: vi.fn(), stop: vi.fn() };
    made.set(src, sound);
    return sound;
  });
  return { made, make };
}

test('a listed sound plays and loads once', () => {
  const { made, make } = fakeSounds();
  const audio = createAudio({ click: 'assets/sounds/click.wav' }, make);
  audio.play('click');
  audio.play('click');
  expect(make).toHaveBeenCalledOnce();
  expect(made.get('assets/sounds/click.wav')!.play).toHaveBeenCalledTimes(2);
});

test('preload loads every listed sound once, and a later play reuses it', () => {
  const { made, make } = fakeSounds();
  const audio = createAudio({ click: 'a.wav', wish: 'b.wav' }, make);
  audio.preload();
  expect(make).toHaveBeenCalledTimes(2);
  audio.play('wish');
  expect(make).toHaveBeenCalledTimes(2);
  expect(made.get('b.wav')!.play).toHaveBeenCalledOnce();
});

test('a device that fails during preload stays silent', () => {
  const audio = createAudio({ click: 'a.wav' }, () => {
    throw new Error('no audio device');
  });
  expect(() => audio.preload()).not.toThrow();
});

test('stopAll stops the sounds in progress', () => {
  const { made, make } = fakeSounds();
  const audio = createAudio({ click: 'a.wav', boom: 'b.wav' }, make);
  audio.play('click');
  audio.play('boom');
  audio.stopAll();
  expect(made.get('a.wav')!.stop).toHaveBeenCalledOnce();
  expect(made.get('b.wav')!.stop).toHaveBeenCalledOnce();
});

test('an unknown sound is silent', () => {
  const { make } = fakeSounds();
  const audio = createAudio({ click: 'a.wav' }, make);
  expect(() => audio.play('nope')).not.toThrow();
  expect(() => audio.play('toString')).not.toThrow();
  expect(make).not.toHaveBeenCalled();
});

test('a sound that fails to play stays silent', () => {
  const audio = createAudio({ click: 'a.wav' }, () => ({
    play: () => {
      throw new Error('no audio device');
    },
    stop: () => {},
  }));
  expect(() => audio.play('click')).not.toThrow();
  expect(() => audio.stopAll()).not.toThrow();
});
