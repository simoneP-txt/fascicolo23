// Comeback (the plan's decisions 12 and 13, Review Focus 1): the game window back in front after the video. back()
// runs once, at the first focus that follows a blur. A focus with no blur before it, which leaving fullscreen or a
// click on the game while the browser opens may bring, does nothing. The returned function cancels the wait.
export function awaitComeback(target: EventTarget, back: () => void): () => void {
  let away = false; // the window has lost the focus since the wait began
  const blur = () => {
    away = true;
  };
  const focus = () => {
    if (!away) return;
    cancel();
    back();
  };
  const cancel = () => {
    target.removeEventListener('blur', blur);
    target.removeEventListener('focus', focus);
  };
  target.addEventListener('blur', blur);
  target.addEventListener('focus', focus);
  return cancel;
}
