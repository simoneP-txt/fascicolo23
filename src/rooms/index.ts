// Room list in board order. Each room lives in its own folder and copies its clues from graph.ts.
import type { Room } from '../engine/types';
import { biblioteca } from './biblioteca';
import { rapture } from './rapture';
import { scacchiera } from './scacchiera';
import { stanza46 } from './stanza-46';
import { studio } from './studio';

export const rooms: readonly Room[] = [studio, scacchiera, biblioteca, rapture, stanza46];
