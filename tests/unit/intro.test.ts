// Case opening: the "No?" card jumps to a spot at least MIN_JUMP from the pointer and inside the stage,
// and its search for that spot ends whatever the random numbers are.
import { expect, test } from 'vitest';
import { MIN_JUMP, pickSpot, type Point, type Size } from '../../src/ui/intro';
import { STAGE_HEIGHT, STAGE_WIDTH } from '../../src/ui/stage';

/** A random source that returns the given values, one per call. */
function sequence(...values: number[]): () => number {
  let next = 0;
  return () => {
    if (next >= values.length) throw new Error('the sequence ran out of values');
    return values[next++];
  };
}

/** The box at this spot lies on the stage. */
function insideStage(spot: Point, size: Size): boolean {
  return spot.x >= 0 && spot.y >= 0 && spot.x + size.width <= STAGE_WIDTH && spot.y + size.height <= STAGE_HEIGHT;
}

test('a new spot keeps away from the pointer and inside the stage', () => {
  const spot = pickSpot({ x: 960, y: 540 }, { width: 224, height: 88 }, sequence(0.5, 0.5, 0.95, 0.1));
  expect(Math.hypot(spot.x + 112 - 960, spot.y + 44 - 540)).toBeGreaterThanOrEqual(MIN_JUMP);
  expect(insideStage(spot, { width: 224, height: 88 })).toBe(true);
});

test('the search for a spot always ends', () => {
  const spot = pickSpot({ x: 960, y: 540 }, { width: 224, height: 88 }, () => 0.5); // every try lands on the pointer
  expect(insideStage(spot, { width: 224, height: 88 })).toBe(true);
});
