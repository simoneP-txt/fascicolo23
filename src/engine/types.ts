// Engine contract: room and clue ids, the shape of content.json, and the interface every room
// implements (docs/PLAN.md, "Il contratto di ogni stanza").
import type { Schema } from './content';

export const ROOM_IDS = ['studio', 'scacchiera', 'biblioteca', 'rapture', 'stanza-46'] as const;
export const CLUE_IDS = ['rule', 'profile', 'g4', 'time-0451', 'confession'] as const;

export type RoomId = (typeof ROOM_IDS)[number];
export type ClueId = (typeof CLUE_IDS)[number];

/** When the auto-help ladder shows its buttons; null switches a rule off. */
export interface HelpThresholds {
  hintAfterSec: number | null;
  secondHintAfterSec: number | null;
  hintAfterErrors: number | null;
  skipAfterSec: number;
  skipAfterErrors: number | null;
}

/** A confirmation drawn by the game. */
export interface ConfirmText {
  title: string;
  body: string;
  yes: string;
  no: string;
}

/** The skip button and its confirmation: the button text is also the dialog title. */
export interface SkipText {
  button: string;
  body: string;
  yes: string;
  no: string;
}

/** A meme over the room: a caption in Anton and/or an image from public/assets/memes/, maybe a sound. */
export interface Meme {
  text?: string;
  image?: string;
  sound?: string; // a key of Content.sounds
}

/** The fields every room's slice of content.json shares. A room extends it with its own fields, declared in
 *  Room.schema, and gets its slice as ctx.content. */
export interface RoomContent {
  name: string;
  header: string;
  from: string; // where its fragment comes from, on the wish card ("dallo studio")
  witness: { intro: string };
  hints: string[];
  help: HelpThresholds;
  locked?: string;
  skip?: SkipText;
  placeholder?: { solve: string; error: string };
}

export interface Ui {
  file: string;
  case: string;
  witnessLabel: string;
  clueLabel: string;
  enter: string;
  solved: string;
  back: string;
  link: { label: string; done: string };
  finale: { stamp: string; watch: string };
  intro: { label: string; question: string; yes: string; no: string };
  audience: { button: string; spent: string; label: string; title: string; seconds: string; tokens: string; done: string };
  hint: { button: string; label: string };
  skip: SkipText;
  reset: ConfirmText;
  debug: { title: string; close: string };
  wish: { label: string; clue: string; clues: string; from: string; continue: string };
}

export interface Content {
  tokens: number;
  audienceSeconds: number;
  sounds: Record<string, string>;
  loops: string[]; // sounds that play in a loop until stopAll()
  link: { room: RoomId | 'fascicolo'; text: string }[];
  witness: { board: string; help: string; wish: string };
  clues: Record<ClueId, { label: string; missing: string }>;
  rooms: Record<RoomId, RoomContent>;
  memes: Record<string, Meme>; // "consolation" follows a confirmed skip
  ui: Ui;
}

/** Services the engine gives to a room. */
export interface GameContext<C extends RoomContent = RoomContent> {
  content: C; // this room's slice of content.json (hints, thresholds included), typed by the room
  common: Pick<Content, 'clues' | 'ui'>; // texts every screen shares: clue labels, "INDIZIO"
  hasClue(id: ClueId): boolean; // clues found in other rooms
  narrate(text: string): void; // witness bubble, appends "?" if missing
  playSfx(name: string): void; // sounds listed in content.json
  meme(id: string): void; // a meme from content.json over the room; the help clock waits for it to go
  reportError(): void; // a wrong attempt: feeds the auto-help ladder
  complete(): void; // award fragment + clues, save, back to the board
}

/** Every room and the finale implement this. A room typed on its own content (Room<ChessContent>) still
 *  fits in a Room[], because mount is a method and so takes its context bivariantly. */
export interface Room<C extends RoomContent = RoomContent> {
  id: RoomId;
  requires: ClueId[]; // the door opens only when all are found
  gives: ClueId[]; // clues awarded by complete()
  audienceHelp: boolean; // false in Rapture
  schema?: Record<string, Schema>; // the room's own fields in content.json; a key replaces the common one of that name
  mount(root: HTMLElement, ctx: GameContext<C>): void;
  unmount(): void; // must clear timers, listeners and audio
}
