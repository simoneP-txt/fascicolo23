// Shelf spines: the generator of mockup 02, which fills each of the 64 squares with three or four books of
// random width, height and color, some with a gold band at the top. A seeded generator draws the same shelf
// on every visit; seed 23 draws the shelf of the mockup.
import { SQUARES, type Square } from '../../ui/grid8';

/** A book standing on its shelf, in stage pixels; book picks its color, --book-1 to --book-10. */
export interface Spine {
  width: number;
  height: number;
  book: number;
  band: boolean;
}

const BOOKS = 10;

export function shelfSpines(seed = 23): Record<Square, Spine[]> {
  // The mockup's linear congruential generator, called in the mockup's order.
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const shelf = {} as Record<Square, Spine[]>;
  for (const square of SQUARES) {
    const count = 3 + Math.floor(random() * 2);
    shelf[square] = Array.from({ length: count }, () => {
      const height = 54 + Math.floor(random() * 26);
      const width = 13 + Math.floor(random() * 8);
      const book = 1 + Math.floor(random() * BOOKS);
      return { width, height, book, band: random() > 0.55 };
    });
  }
  return shelf;
}
