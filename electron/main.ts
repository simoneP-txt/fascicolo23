// Electron main process: opens the game fullscreen, toggles fullscreen with F11
// and hands https links (the finale video) to the system browser.
import { app, BrowserWindow, Menu, shell } from 'electron';
import { join } from 'node:path';

app.whenReady().then(() => {
  // The default menu binds Ctrl+Shift+R to force reload, which would clash with the host reset hotkey.
  Menu.setApplicationMenu(null);

  const win = new BrowserWindow({ width: 1280, height: 720, fullscreen: true, show: false });
  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      event.preventDefault();
      win.setFullScreen(!win.isFullScreen());
    }
  });

  void win.loadFile(join(app.getAppPath(), 'dist/index.html'));
});
