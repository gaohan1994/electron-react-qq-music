/* eslint-disable no-console */
import { createRoot } from 'react-dom/client';
import App from './App';
import Utils from '../utils/utils';

const windowId = Utils.getWindowId();
console.log(`Renderer window id: ${windowId}`);

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

if (Utils.isMainWindow()) {
  root.render(<App />);
} else {
  root.render(null);
}

// calling IPC exposed from preload script
window.electron.ipcRenderer.once('ipc-example', (arg) => {
  // eslint-disable-next-line no-console
  console.log(arg);
});
window.electron.ipcRenderer.sendMessage('ipc-example', ['ping']);
