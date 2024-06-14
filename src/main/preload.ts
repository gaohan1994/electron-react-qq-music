// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import process from 'process';
import Utils from '../utils/utils';

const isProduction = false;

const initReloadInDevMode = () => {
  if (Utils.isDevMode()) {
    window.addEventListener('keyup', (event) => {
      if (event.key === 'F5') {
        window.location.reload();
      }
    });
  }
};

const initOpenDevToolInDevMode = () => {
  if (Utils.isDevMode()) {
    window.addEventListener('keyup', (event) => {
      if (event.key === 'F12') {
        ipcRenderer.send('openDevTools');
      }
    });
  }
};

if (!isProduction) {
  const windowId = Utils.getWindowId();
  process.title = `SLOBS Renderer ${windowId}`;
  console.log(`${windowId} - PID: ${process.pid}`);
}

document.addEventListener('dragover', (event) => event.preventDefault());
document.addEventListener('dragenter', (event) => event.preventDefault());
document.addEventListener('drop', (event) => event.preventDefault());
document.addEventListener('DOMContentLoaded', async () => {
  initReloadInDevMode();
  initOpenDevToolInDevMode();
});

export type Channels = 'ipc-example';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
