// Clue graph logic: a door opens when all its required clues are found. checkGraph() proves at startup
// that every door can open from zero clues; validOrders() lists every order in which a game can go.
import type { ClueId, Room, RoomId } from './types';

export type GraphRoom = Pick<Room, 'id' | 'requires' | 'gives'>;

export function isOpen(room: Pick<Room, 'requires'>, clues: readonly ClueId[]): boolean {
  return room.requires.every((clue) => clues.includes(clue));
}

/** Problems with the graph, empty when every door opens starting from zero clues. */
export function checkGraph(rooms: readonly GraphRoom[]): string[] {
  const given = new Set(rooms.flatMap((room) => room.gives));
  const problems = rooms.flatMap((room) =>
    room.requires.filter((clue) => !given.has(clue)).map((clue) => `${room.id} requires ${clue}, which no room gives`),
  );

  // Solve every open room until nothing changes: the rooms left never open (a missing clue or a cycle).
  const clues: ClueId[] = [];
  const left = new Set(rooms);
  let progress = true;
  while (progress) {
    progress = false;
    for (const room of left) {
      if (!isOpen(room, clues)) continue;
      clues.push(...room.gives);
      left.delete(room);
      progress = true;
    }
  }
  for (const room of left) {
    const missing = room.requires.filter((clue) => !clues.includes(clue));
    problems.push(`${room.id} never opens: it needs ${missing.join(', ')}`);
  }
  return problems;
}

/** Every order in which all rooms can be solved, depth first in the order of the list. */
export function validOrders(rooms: readonly GraphRoom[]): RoomId[][] {
  const orders: RoomId[][] = [];
  const walk = (done: readonly GraphRoom[], clues: readonly ClueId[]) => {
    if (done.length === rooms.length) orders.push(done.map((room) => room.id));
    for (const room of rooms) {
      if (!done.includes(room) && isOpen(room, clues)) walk([...done, room], [...clues, ...room.gives]);
    }
  };
  walk([], []);
  return orders;
}
