/* eslint-disable no-underscore-dangle */
import URI from 'urijs';
// import * as remote from '@electron/remote';

interface Dictionary<T> {
  [key: string]: T;
}

interface IEnv {
  NODE_ENV: 'production' | 'development';
}

class Utils {
  // private static _env: IEnv;

  // static get env(): IEnv {
  //   if (!Utils._env) Utils._env = remote.process.env as any;
  //   return Utils._env;
  // }

  static getUrlParams(url: string) {
    return URI.parseQuery(URI.parse(url).query) as Dictionary<string>;
  }

  static getCurrentUrlParams(): Dictionary<string> {
    return this.getUrlParams(window.location.href);
  }

  static getWindowId(): string {
    return this.getCurrentUrlParams().windowId;
  }

  static isWorkerWindow(): boolean {
    return this.getWindowId() === 'worker';
  }

  static isMainWindow(): boolean {
    return this.getWindowId() === 'main';
  }

  static isDevMode() {
    return true;
  }
}

export default Utils;
