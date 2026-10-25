// Electron main process: opens the game fullscreen, toggles fullscreen with F11, leaves it with Esc
// (so the window is easy to close; the game uses Esc for nothing else, and out of fullscreen Esc does
// nothing) and hands https links (the finale video) to the system browser. For the video the game leaves
// fullscreen, so the browser comes up in front of it, and goes back to fullscreen when the window
// is back in front: at the first focus after it has lost it, so a focus with no blur before it,
// which leaving fullscreen may bring, does not cover the browser again.
// Party-day guards: one instance only (a second launch brings the open window to the front), the
// window never navigates away from the game (a file or link dropped on it), and localStorage is
// flushed to disk every second, so a forced close keeps the last save.
import { app, BrowserWindow, Menu, session, shell } from 'electron';
import { join } from 'node:path';

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win: BrowserWindow | undefined;

  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(() => {
    // The default menu binds Ctrl+Shift+R to force reload, which would clash with the host reset hotkey.
    Menu.setApplicationMenu(null);

    const w = new BrowserWindow({ width: 1280, height: 720, fullscreen: true, show: false });
    win = w;
    w.once('ready-to-show', () => w.show());

    w.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://')) {
        w.setFullScreen(false);
        void shell.openExternal(url);
        w.once('blur', () => w.once('focus', () => w.setFullScreen(true)));
      }
      return { action: 'deny' };
    });

    // loadFile below does not emit will-navigate; anything the page starts does, and the game starts none.
    w.webContents.on('will-navigate', (event) => event.preventDefault());

    w.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;
      if (input.key === 'F11') {
        event.preventDefault();
        w.setFullScreen(!w.isFullScreen());
      } else if (input.key === 'Escape' && w.isFullScreen()) {
        event.preventDefault();
        w.setFullScreen(false);
      }
    });

    // Chromium writes localStorage to disk a few seconds late; a kill from Task Manager would lose it.
    setInterval(() => session.defaultSession.flushStorageData(), 1000);

    void w.loadFile(join(app.getAppPath(), 'dist/index.html'));
  });
}
