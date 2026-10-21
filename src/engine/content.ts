// Content validation: checks content.json at startup against a schema that mirrors Content, so a
// broken edit stops the game with the faulty field named instead of failing halfway through a room.
import { CLUE_IDS, ROOM_IDS, type Content } from './types';

// Leaf kinds: text = non-empty string, texts = non-empty list of texts, seconds = number >= 0,
// count = whole number >= 0, map = object of texts. A trailing "?" on a kind also accepts null;
// a trailing "?" on a key makes the key optional.
type Kind = 'text' | 'texts' | 'seconds' | 'seconds?' | 'count' | 'count?' | 'map';
type Schema = Kind | { [key: string]: Schema };

const each = (ids: readonly string[], schema: Schema): Schema => Object.fromEntries(ids.map((id) => [id, schema]));

const SKIP: Schema = { button: 'text', body: 'text', yes: 'text', no: 'text' };

const ROOM: Schema = {
  name: 'text',
  header: 'text',
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
  'placeholder?': { solve: 'text', error: 'text' },
};

const SCHEMA: Schema = {
  tokens: 'count',
  audienceSeconds: 'seconds',
  sounds: 'map',
  witness: { board: 'text', help: 'text' },
  clues: each(CLUE_IDS, { label: 'text', missing: 'text' }),
  rooms: each(ROOM_IDS, ROOM),
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
    reset: { title: 'text', body: 'text', yes: 'text', no: 'text' },
    debug: { title: 'text', close: 'text' },
  },
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
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

/** Returns the content typed, or throws an Error whose message names the faulty field. */
export function validateContent(raw: unknown): Content {
  check(raw, SCHEMA, '');
  checkLink((raw as { link?: unknown }).link);
  return raw as Content;
}
