// Room list: the five rooms come in board order, follow the clue graph, and only Rapture refuses
// the audience help.
import { expect, test } from 'vitest';
import { ROOM_IDS } from '../../src/engine/types';
import { rooms } from '../../src/rooms';
import { GRAPH } from '../../src/rooms/graph';

test('the rooms follow the graph', () => {
  expect(rooms.map((room) => room.id)).toEqual([...ROOM_IDS]);
  for (const room of rooms) {
    expect(room.requires).toEqual(GRAPH[room.id].requires);
    expect(room.gives).toEqual(GRAPH[room.id].gives);
    expect(room.audienceHelp).toBe(room.id !== 'rapture');
  }
});
