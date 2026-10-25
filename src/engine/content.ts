// Content validation: checks content.json at startup against a schema that mirrors Content, so a
// broken edit stops the game with the faulty field named instead of failing halfway through a room. Each
// room adds its own fields to the ones every room shares.
import { CLUE_IDS, ROOM_IDS, type Content, type Room } from './types';

// Leaf kinds: text = non-empty string, texts = non-empty list of texts, seconds = number >= 0,
// count = whole number >= 0, map = object of texts. A trailing "?" on a kind also accepts null;
// a trailing "?" on a key makes the key optional.
type Kind = 'text' | 'texts' | 'seconds' | 'seconds?' | 'count' | 'count?' | 'map';
/** A leaf kind, [item] for a non-empty list whose every item follows item, or an object of fields. */
export type Schema = Kind | readonly [Schema] | { readonly [key: string]: Schema };

const each = (ids: readonly string[], schema: Schema): Schema => Object.fromEntries(ids.map((id) => [id, schema]));

const SKIP: Schema = { button: 'text', body: 'text', yes: 'text', no: 'text' };

// The fields every room shares. A room's own schema adds its fields and replaces the common ones it names,
// so a room with more witness lines lists intro among them.
const ROOM: Record<string, Schema> = {
  name: 'text',
  header: 'text',
  from: 'text',
  witness: { intro: 'text' },
  hints: 'texts',
  help: {
    hintAfterSec: 'seconds?',
    secondHintAfterSec: 'seconds?',
    hintAfterErrors: 'count?',
    skipAfterSec: 'seconds',
    skipAfterErrors: 'count?',
  },
  'locked?': 'text',
  'skip?': SKIP,
};

// The whole file, each room with the common fields and its own.
function schemaOf(rooms: readonly Pick<Room, 'id' | 'schema'>[]): Schema {
  const room = (id: string): Schema => ({ ...ROOM, ...rooms.find((candidate) => candidate.id === id)?.schema });
  return {
    tokens: 'count',
    audienceSeconds: 'seconds',
    sounds: 'map',
    loops: 'texts',
    witness: { board: 'text', help: 'text', wish: 'text', finale: 'text', epilogue: 'text' },
    clues: each(CLUE_IDS, { label: 'text', missing: 'text' }),
    rooms: Object.fromEntries(ROOM_IDS.map((id) => [id, room(id)])),
    ui: {
      file: 'text',
      case: 'text',
      witnessLabel: 'text',
      clueLabel: 'text',
      enter: 'text',
      solved: 'text',
      back: 'text',
      link: { label: 'text', done: 'text' },
      finale: { stamp: 'text', watch: 'text' },
      intro: { label: 'text', question: 'text', yes: 'text', no: 'text' },
      audience: { button: 'text', spent: 'text', label: 'text', title: 'text', seconds: 'text', tokens: 'text', done: 'text' },
      hint: { button: 'text', label: 'text' },
      skip: SKIP,
      reset: { 'button?': 'text', title: 'text', body: 'text', yes: 'text', no: 'text' }, // no button, no reset on the board
      debug: { title: 'text', close: 'text' },
      wish: { label: 'text', clue: 'text', clues: 'text', from: 'text', continue: 'text' },
    },
  };
}

const MEME: Schema = { 'text?': 'text', 'image?': 'text', 'video?': 'text', 'sound?': 'text' };
// Shown by name: the consolation by the engine itself, after a confirmed skip, error by the study on a wrong option
// and by the library on a wrong accusation, shelf by the library on a wrong book, run by Rapture on a lost run, and
// the rest by Room 46, after a wrong accusation (objection, innocent) and every few blind ones (getHelp).
// ctx.meme() shows nothing for a name it does not know, so a renamed key would drop its meme without an error.
const NEEDED_MEMES = ['consolation', 'error', 'shelf', 'run', 'objection', 'innocent', 'getHelp'];
// Played by name: click on every press, wish, stamp on a solved door, boom under the memes, and in Rapture
// chime at each order, buzz on each error and the deep loop. audio.ts stays silent on a name it does not know,
// so a renamed key would mute its sound without an error.
const NEEDED_SOUNDS = ['click', 'wish', 'boom', 'stamp', 'chime', 'buzz', 'deep'];
const MEME_FILE = /^assets\/memes\/[^/\\]+$/; // a file shipped in public/assets/memes: a URL would reach the network

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
const isList = (schema: Schema): schema is readonly [Schema] => Array.isArray(schema);
const isText = (value: unknown) => typeof value === 'string' && value.trim() !== '';
const isSeconds = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const isCount = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value >= 0;

const KINDS: Record<Kind, [(value: unknown) => boolean, string]> = {
  text: [isText, 'must be a non-empty text'],
  texts: [(v) => Array.isArray(v) && v.length > 0 && v.every(isText), 'must be a non-empty list of texts'],
  seconds: [isSeconds, 'must be a number of seconds >= 0'],
  'seconds?': [(v) => v === null || isSeconds(v), 'must be a number of seconds >= 0, or null'],
  count: [isCount, 'must be a whole number >= 0'],
  'count?': [(v) => v === null || isCount(v), 'must be a whole number >= 0, or null'],
  map: [(v) => isObject(v) && Object.values(v).every(isText), 'must be an object of texts'],
};

function fail(path: string, problem: string): never {
  throw new Error(`content.json: ${path || 'the file'} ${problem}`);
}

function check(value: unknown, schema: Schema, path: string): void {
  if (typeof schema === 'string') {
    const [ok, problem] = KINDS[schema];
    if (!ok(value)) fail(path, problem);
    return;
  }
  if (isList(schema)) {
    if (!Array.isArray(value) || value.length === 0) fail(path, 'must be a non-empty list');
    value.forEach((item, i) => check(item, schema[0], `${path}[${i}]`));
    return;
  }
  if (!isObject(value)) fail(path, 'must be an object');
  for (const [rawKey, child] of Object.entries(schema)) {
    const optional = rawKey.endsWith('?');
    const key = optional ? rawKey.slice(0, -1) : rawKey;
    if (optional && value[key] === undefined) continue;
    check(value[key], child, path ? `${path}.${key}` : key);
  }
}

// The link is assembled in this order, so every room and the case opening appear exactly once.
function checkLink(link: unknown): void {
  if (!Array.isArray(link)) fail('link', 'must be a list');
  link.forEach((fragment, i) => check(fragment, { room: 'text', text: 'text' }, `link[${i}]`));
  const sources = ['fascicolo', ...ROOM_IDS];
  const rooms = link.map((fragment: { room: string }) => fragment.room);
  if (rooms.length !== sources.length || !sources.every((source) => rooms.includes(source))) {
    fail('link', `must list ${sources.join(', ')} once each`);
  }
}

// Every meme shows a caption, an image or a clip, its image and its clip are files in assets/memes, and its sound
// is one of the listed sounds.
function checkMemes(memes: unknown, sounds: Record<string, string>): void {
  if (!isObject(memes)) fail('memes', 'must be an object');
  for (const id of NEEDED_MEMES) if (memes[id] === undefined) fail(`memes.${id}`, 'is missing');
  for (const [id, meme] of Object.entries(memes)) {
    check(meme, MEME, `memes.${id}`);
    const { text, image, video, sound } = meme as Record<string, unknown>;
    if (text === undefined && image === undefined && video === undefined) fail(`memes.${id}`, 'needs a text, an image or a video');
    for (const [key, file] of Object.entries({ image, video })) {
      if (typeof file === 'string' && !MEME_FILE.test(file)) fail(`memes.${id}.${key}`, 'must be a file in assets/memes/');
    }
    if (typeof sound === 'string' && !Object.hasOwn(sounds, sound)) fail(`memes.${id}.sound`, 'must name one of the sounds');
  }
}

/** Returns the content typed, or throws an Error whose message names the faulty field. The rooms bring their
 *  own fields (Room.schema). */
export function validateContent(raw: unknown, rooms: readonly Pick<Room, 'id' | 'schema'>[]): Content {
  check(raw, schemaOf(rooms), '');
  const { sounds, loops } = raw as Content;
  for (const id of NEEDED_SOUNDS) if (!Object.hasOwn(sounds, id)) fail(`sounds.${id}`, 'is missing');
  loops.forEach((id, i) => Object.hasOwn(sounds, id) || fail(`loops[${i}]`, 'must name one of the sounds'));
  checkLink((raw as { link?: unknown }).link);
  checkMemes((raw as { memes?: unknown }).memes, sounds);
  return raw as Content;
}
