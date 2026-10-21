// Full playthrough e2e: one game for each order the clue graph allows, with the network blocked. At every
// step only the doors whose clues are found offer "Entra?" (Room 46 last), each solved room shows its
// fragment, nothing leaves the local server before "Guarda la confessione?", and that button opens
// exactly the video link.
import { expect, test } from '@playwright/test';
import { isOpen, validOrders } from '../../src/engine/clues';
import { graphRooms } from '../../src/rooms/graph';
import { board, content, door, offline, openCase, solveRoom } from './helpers';

const VIDEO = 'https://youtu.be/71Kg4_v7Qjs';

for (const order of validOrders(graphRooms())) {
  test(`plays the case in the order ${order.join(', ')}`, async ({ context, page, baseURL }) => {
    const outside = await offline(context, baseURL!);
    await openCase(page);

    const solved: string[] = [];
    for (const id of order) {
      const clues = graphRooms()
        .filter((room) => solved.includes(room.id))
        .flatMap((room) => room.gives);
      for (const room of graphRooms().filter((candidate) => !solved.includes(candidate.id))) {
        const enter = door(page, room.id).getByRole('button', { name: content.ui.enter });
        await expect(enter, `${room.id} after ${solved.join(', ') || 'nothing'}`).toHaveCount(isOpen(room, clues) ? 1 : 0);
      }
      await solveRoom(page, id);
      solved.push(id);
      const fragment = content.link.find((part: { room: string }) => part.room === id).text;
      await expect(page.locator(`[data-fragment="${id}"]`)).toHaveText(fragment);
    }

    await expect(page.locator('[data-fragment][data-hidden]')).toHaveCount(0);
    await expect(board(page)).toContainText(content.ui.link.done);
    await expect(board(page)).toContainText(content.ui.finale.stamp);
    expect(outside).toEqual([]);

    const request = context.waitForEvent('request', (candidate) => !candidate.url().startsWith(baseURL!));
    await page.getByRole('button', { name: content.ui.finale.watch }).click();
    expect((await request).url()).toBe(VIDEO);
    await expect.poll(() => outside).toEqual([VIDEO]);
  });
}
