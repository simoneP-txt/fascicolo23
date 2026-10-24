// Drag, or two clicks (the plan's decision 4): a handle follows the pointer by transform: translate(), divided by
// the scale of the stage, under pointer capture, and lands on the target under the point of release, or is
// cancelled when it is released off every target, the window included, or when the browser takes the pointer away
// (pointercancel, lostpointercapture). A gesture that moves less than SLOP stage pixels is a click instead: the
// handle is picked, and the next click lands it on the target it hits, or cancels it anywhere else, so on a
// touchpad a card goes where it must in two presses. While dragged the handle carries data-dragging, and the
// target under the pointer data-over; while picked it carries data-picked. drop() and cancel() leave the handle
// as it is, transform included: the caller settles it or sends it back. The second click of a double click
// neither picks nor lands nor cancels.

const SLOP = 8; // stage pixels a press may wander and still be a click

export interface DragOptions {
  targets(): HTMLElement[]; // where the handle may land
  drop(target: HTMLElement): void; // released over a target, or the target clicked after the handle
  cancel(): void; // released anywhere else, cancelled, or a click elsewhere
}

/** Window pixels per stage pixel: the stage's drawn width over its laid-out width. */
function scaleOf(node: HTMLElement): number {
  const stage = node.closest<HTMLElement>('.stage');
  return stage && stage.offsetWidth ? stage.getBoundingClientRect().width / stage.offsetWidth : 1;
}

/** Makes the handle draggable and returns the cleanup that undoes it. */
export function draggable(handle: HTMLElement, options: DragOptions): () => void {
  let gesture: { pointer: number; x: number; y: number; scale: number; moved: boolean } | null = null;
  let dragged = false; // the last gesture was a drag: the click that ends it is no pick
  let consumed: Event | null = null; // the click that took the pick off this handle
  let over: HTMLElement | null = null;

  // The target under a point of the window: the topmost element there that a target holds, the dragged handle
  // aside, which never takes the pointer from what lies under it.
  const targetAt = (x: number, y: number): HTMLElement | null => {
    const targets = options.targets();
    for (const node of document.elementsFromPoint(x, y)) {
      const target = targets.find((candidate) => candidate.contains(node));
      if (target) return target;
    }
    return null;
  };
  const targetOf = (event: Event): HTMLElement | null =>
    event.target instanceof Node ? (options.targets().find((target) => target.contains(event.target as Node)) ?? null) : null;

  const mark = (target: HTMLElement | null) => {
    if (target === over) return;
    if (over) delete over.dataset.over;
    over = target;
    if (over) over.dataset.over = '';
  };

  // The pick: the next click anywhere lands the handle or cancels it, before anything else hears that click.
  const onClickWhilePicked = (event: MouseEvent) => {
    if (event.detail > 1) return;
    unpick();
    if (handle.contains(event.target as Node)) {
      consumed = event; // a second press on the handle puts it down
      return options.cancel();
    }
    const target = targetOf(event);
    if (target) options.drop(target);
    else options.cancel();
  };
  const pick = () => {
    handle.dataset.picked = '';
    window.addEventListener('click', onClickWhilePicked, true);
  };
  function unpick() {
    delete handle.dataset.picked;
    window.removeEventListener('click', onClickWhilePicked, true);
  }

  const onClick = (event: MouseEvent) => {
    if (dragged) {
      dragged = false;
      return;
    }
    if (event.detail > 1 || event === consumed) return;
    pick();
  };

  // The end of a gesture, however it ends.
  const end = () => {
    if (!gesture) return;
    if (handle.hasPointerCapture(gesture.pointer)) handle.releasePointerCapture(gesture.pointer);
    gesture = null;
    delete handle.dataset.dragging;
    mark(null);
  };

  const onDown = (event: PointerEvent) => {
    if (event.button !== 0 || gesture) return;
    dragged = false;
    gesture = { pointer: event.pointerId, x: event.clientX, y: event.clientY, scale: scaleOf(handle), moved: false };
    handle.setPointerCapture(event.pointerId);
  };

  const onMove = (event: PointerEvent) => {
    if (!gesture || event.pointerId !== gesture.pointer) return;
    const dx = (event.clientX - gesture.x) / gesture.scale;
    const dy = (event.clientY - gesture.y) / gesture.scale;
    if (!gesture.moved) {
      if (Math.hypot(dx, dy) < SLOP) return;
      gesture.moved = true;
      unpick();
      handle.dataset.dragging = '';
    }
    handle.style.transform = `translate(${dx}px, ${dy}px)`;
    mark(targetAt(event.clientX, event.clientY));
  };

  const onUp = (event: PointerEvent) => {
    if (!gesture || event.pointerId !== gesture.pointer) return;
    const { moved } = gesture;
    end();
    if (!moved) return; // a click: the click event that follows picks the handle
    dragged = true;
    const target = targetAt(event.clientX, event.clientY);
    if (target) options.drop(target);
    else options.cancel();
  };

  // Whatever pointer the browser cancels on the handle, the gesture under way ends.
  const onCancel = () => {
    if (!gesture) return;
    const { moved } = gesture;
    end();
    if (!moved) return;
    dragged = true;
    options.cancel();
  };

  handle.addEventListener('pointerdown', onDown);
  handle.addEventListener('pointermove', onMove);
  handle.addEventListener('pointerup', onUp);
  handle.addEventListener('pointercancel', onCancel);
  handle.addEventListener('lostpointercapture', onCancel);
  handle.addEventListener('click', onClick);

  return () => {
    end();
    unpick();
    handle.removeEventListener('pointerdown', onDown);
    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', onUp);
    handle.removeEventListener('pointercancel', onCancel);
    handle.removeEventListener('lostpointercapture', onCancel);
    handle.removeEventListener('click', onClick);
  };
}
