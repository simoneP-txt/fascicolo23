// Buttons: every control of the game is a <button type="button"> of one kind from button.css, never the
// browser's look. A press sinks it (a transform over --duration-press) and the stage's click listener in
// main.ts plays the click. A switched-off button carries aria-disabled, never disabled, so it still takes
// the click and its sound: the press shakes it and runs nothing.
import './button.css';
import { el, replay } from './dom';
import { icon as drawIcon, type Icon } from './svg';

export type ButtonKind = 'primary' | 'outline' | 'dark' | 'gold' | 'link' | 'help';

export function button(label: string, kind: ButtonKind, onPress: () => void, icon?: Icon): HTMLButtonElement {
  const node = el('button', `btn btn--${kind}`);
  node.type = 'button';
  if (icon) node.append(drawIcon(icon));
  node.append(label);
  node.addEventListener('click', () => {
    if (node.getAttribute('aria-disabled') === 'true') replay(node, 'nope');
    else onPress();
  });
  return node;
}

export function setEnabled(button: HTMLButtonElement, enabled: boolean): void {
  if (enabled) {
    button.removeAttribute('aria-disabled');
    delete button.dataset.nope;
  } else {
    button.setAttribute('aria-disabled', 'true');
  }
}
