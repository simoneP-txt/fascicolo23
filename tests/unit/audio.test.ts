// Audio: sounds listed in content.json play by name and load once, on first use or at preload(); stopAll()
// stops every sound in progress, and an unknown name or a failing device stays silent instead of breaking
// the game. Each sound plays on an audio element of its own, which starts at once whatever it has loaded, a
// play over one still sounding gets a copy of it, and a sound listed in loops is made to loop; stopAll() stops
// them at once, even while a play() is still pending.
import { afterEach, expect, test, vi } from 'vitest';
import { createAudio } from '../../src/engine/audio';

afterEach(() => vi.unstubAllGlobals());

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

test('a looping sound is made to loop', () => {
  const { make } = fakeSounds();
  const audio = createAudio({ deep: 'x', click: 'y' }, make, ['deep']);
  audio.play('deep');
  audio.play('click');
  expect(make.mock.calls).toEqual([
    ['x', true],
    ['y', false],
  ]);
});

/** The browser's Audio as the tests see it: play() sets it going at once, whatever it has loaded, and its
 *  promise stays pending as when the data has not come yet; cloneNode() makes another one on the same file. */
class FakeAudio {
  static made: FakeAudio[] = [];
  loop = false;
  preload = '';
  currentTime = 0;
  paused = true;
  ended = false;
  readyState = 0;
  plays = 0;
  pauses = 0;
  constructor(public src = '') {
    FakeAudio.made.push(this);
  }
  play() {
    this.plays += 1;
    this.paused = false;
    return new Promise<void>(() => {});
  }
  pause() {
    this.pauses += 1;
    this.paused = true;
  }
  cloneNode() {
    return Object.assign(new FakeAudio(this.src), { loop: this.loop, preload: this.preload });
  }
}

function fakeAudio(): FakeAudio[] {
  FakeAudio.made = [];
  vi.stubGlobal('Audio', FakeAudio);
  return FakeAudio.made;
}

// howler waits for canplaythrough before it starts a sound, and a file it reloads at the first click of the
// page may stop loading short of that: every later play of that sound would wait for good.
test('a sound starts at once, even before its file has loaded', () => {
  const made = fakeAudio();
  const audio = createAudio({ click: 'assets/sounds/click.wav' });
  audio.play('click');
  expect(made).toHaveLength(1);
  expect(made[0]).toMatchObject({ src: 'assets/sounds/click.wav', preload: 'auto', loop: false, readyState: 0, plays: 1 });
});

test('a sound still playing gets a copy for the next play, and stopAll stops every copy', () => {
  const made = fakeAudio();
  const audio = createAudio({ click: 'click.wav' });
  audio.play('click');
  audio.play('click');
  expect(made.map((element) => [element.src, element.plays])).toEqual([
    ['click.wav', 1],
    ['click.wav', 1],
  ]);
  made[1].currentTime = 0.02;
  audio.stopAll();
  expect(made.map((element) => [element.pauses, element.paused, element.currentTime])).toEqual([
    [1, true, 0],
    [1, true, 0],
  ]);
});

test('a sound that has ended plays again on its own element', () => {
  const made = fakeAudio();
  const audio = createAudio({ chime: 'chime.wav' });
  audio.play('chime');
  Object.assign(made[0], { paused: true, ended: true });
  audio.play('chime');
  expect(made).toHaveLength(1);
  expect(made[0].plays).toBe(2);
});

// howler loops an html5 sound by restarting it from a timer, with a gap, and queues a stop() that comes while
// its play() is pending and never runs it, so a loop would go on.
test('a loop plays on its own looping audio element, which stops at once', () => {
  const made = fakeAudio();
  const audio = createAudio({ deep: 'assets/sounds/deep.wav' }, undefined, ['deep']);
  audio.play('deep');
  audio.play('deep');
  expect(made).toHaveLength(1);
  expect(made[0]).toMatchObject({ src: 'assets/sounds/deep.wav', loop: true, plays: 2 });
  made[0].currentTime = 3.2;
  audio.stopAll(); // the play() above has not settled
  expect(made[0]).toMatchObject({ pauses: 1, paused: true, currentTime: 0 });
});

test('a play() that fails stays silent', async () => {
  let plays = 0;
  // A plain function: a vi.fn() would subscribe to the promise it returns and so handle the rejection itself.
  const play = () => {
    plays += 1;
    return Promise.reject(new Error('no audio device'));
  };
  vi.stubGlobal(
    'Audio',
    vi.fn(function () {
      return { loop: false, currentTime: 0, paused: true, ended: false, play, pause() {} };
    }),
  );
  const audio = createAudio({ click: 'click.wav', deep: 'deep.wav' }, undefined, ['deep']);
  expect(() => audio.play('click')).not.toThrow();
  expect(() => audio.play('deep')).not.toThrow();
  expect(plays).toBe(2);
  await new Promise((resolve) => setTimeout(resolve)); // an unhandled rejection would fail the run
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
