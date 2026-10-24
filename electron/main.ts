// Electron main process: opens the game fullscreen, toggles fullscreen with F11, leaves it with Esc
// (so the window is easy to close; the game uses Esc for nothing else, and out of fullscreen Esc does
// nothing) and hands https links (the finale video) to the system browser. For the video the game leaves
// fullscreen, so the browser comes up in front of it, and goes back to fullscreen when the window
// is back in front: at the first focus after it has lost it, so a focus with no blur before it,
// which leaving fullscreen may bring, does not cover the browser again.
import { app, BrowserWindow, Menu, shell } from 'electron';
import { join } from 'node:path';

app.whenReady().then(() => {
  // The default menu binds Ctrl+Shift+R to force reload, which would clash with the host reset hotkey.
  Menu.setApplicationMenu(null);

  const win = new BrowserWindow({ width: 1280, height: 720, fullscreen: true, show: false });
  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) {
      win.setFullScreen(false);
      void shell.openExternal(url);
      win.once('blur', () => win.once('focus', () => win.setFullScreen(true)));
    }
    return { action: 'deny' };
  });

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') {
      event.preventDefault();
      win.setFullScreen(!win.isFullScreen());
    } else if (input.key === 'Escape' && win.isFullScreen()) {
      event.preventDefault();
      win.setFullScreen(false);
    }
  });

  void win.loadFile(join(app.getAppPath(), 'dist/index.html'));
});
