/* eslint-disable import/newline-after-import */
/* eslint-disable prefer-object-spread */
/* eslint-disable no-new */
/* eslint global-require: off, no-console: off, promise/always-return: off */
/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */

import path from 'path';
import log from 'electron-log';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  IpcMainEvent,
  WebContents,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import { resolveHtmlPath } from './util';
import ApiClient from './api';
import Utils from '../utils/utils';
const remote = require('@electron/remote/main');
const os = require('os');

const indexUrl = resolveHtmlPath('index.html');

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
}

// Windows
let mainWindow: BrowserWindow | null = null;
let workerWindow: BrowserWindow | null = null;
let childWindow: BrowserWindow | null = null;
const cpus = os.cpus();

const humanFileSize = (bytes: number, si: boolean) => {
  const thresh = si ? 1000 : 1024;
  if (Math.abs(bytes) < thresh) {
    return `${bytes} B`;
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  do {
    bytes /= thresh;
    u += 1;
  } while (Math.abs(bytes) >= thresh && u < units.length - 1);
  return `${bytes.toFixed(1)} ${units[u]}`;
};

console.log('=================================');
console.log('Streamlabs Desktop');
console.log(`Version: ${process.env.SLOBS_VERSION}`);
console.log(`OS: ${os.platform()} ${os.release()}`);
console.log(`Arch: ${process.arch}`);
console.log(`CPU: ${cpus[0].model}`);
console.log(`Cores: ${cpus.length}`);
console.log(`Memory: ${humanFileSize(os.totalmem(), false)}`);
console.log(`Free: ${humanFileSize(os.freemem(), false)}`);
console.log('=================================');

const openWebContentsDevTools = (webContents: WebContents) => {
  webContents.openDevTools({ mode: 'detach' });
};

const openDevTools = () => {
  openWebContentsDevTools(mainWindow!.webContents);
  openWebContentsDevTools(workerWindow!.webContents);
  openWebContentsDevTools(childWindow!.webContents);
};

ipcMain.on('openDevTools', () => {
  openDevTools();
});

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createMainWindow = async () => {
  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: true,
      webviewTag: true,
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  remote.enable(mainWindow.webContents);

  mainWindow.loadURL(`${indexUrl}?windowId=main`);

  if (Utils.isDevMode()) {
    openWebContentsDevTools(mainWindow.webContents);
  }

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.removeMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  new AppUpdater();
  new ApiClient();
};

const createWorkerWindow = () => {
  workerWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });
  workerWindow.loadURL(`${indexUrl}?windowId=worker`);

  remote.enable(workerWindow.webContents);

  if (Utils.isDevMode()) {
    openWebContentsDevTools(workerWindow.webContents);
  }

  ipcMain.on('getWorkerWindowId', (event) => {
    if (workerWindow?.isDestroyed()) return;
    event.returnValue = workerWindow?.webContents.id;
  });
};

const createChildWindow = () => {
  childWindow = new BrowserWindow({
    show: false,
    frame: false,
    fullscreenable: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#17242D',
    webPreferences: {
      nodeIntegration: true,
      backgroundThrottling: false,
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });
  remote.enable(childWindow.webContents);

  childWindow.removeMenu();

  childWindow.loadURL(`${indexUrl}?windowId=child`);

  if (Utils.isDevMode()) {
    openWebContentsDevTools(childWindow.webContents);
  }
};

/**
 * Add event listeners...
 */
app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(async () => {
    if (isDebug) {
      await installExtensions();
    }
    createWorkerWindow();
    createMainWindow();
    createChildWindow();

    const requests: any = {};
    function sendRequest(
      request: any,
      event: IpcMainEvent | null = null,
      async = false,
    ) {
      if ((workerWindow as BrowserWindow).isDestroyed()) {
        console.log('Tried to send request but worker window was missing...');
        return;
      }

      workerWindow?.webContents.send('services-request', request);
      if (!event) {
        return;
      }
      requests[request.id] = Object.assign({}, request, { event, async });
    }

    ipcMain.on('services-request', (event, payload) => {
      sendRequest(payload, event);
    });

    ipcMain.on('services-request-async', (event, payload) => {
      sendRequest(payload, event, true);
    });

    ipcMain.on('services-response', (event, response) => {
      if (!requests[response.id]) return;

      if (requests[response.id].async) {
        requests[response.id].event.reply('services-response-async', response);
      } else {
        requests[response.id].event.returnValue = response;
      }
      delete requests[response.id];
    });

    ipcMain.on('services-message', (event, payload) => {
      const windows = BrowserWindow.getAllWindows();
      windows.forEach((window) => {
        if (window.id === workerWindow?.id || window.isDestroyed()) return;
        window.webContents.send('services-message', payload);
      });
    });

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createMainWindow();
    });
  })
  .catch(console.log);
