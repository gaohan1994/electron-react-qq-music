import ElectronLog from 'electron-log';
import qqMusic from 'qq-music-api';

const logger = ElectronLog;

class ApiClient {
  private readonly caller = qqMusic;

  private readonly call = (path: string, query = {}) => {
    return this.caller.api(path, query);
  };

  public readonly login = async (cookie: string) => {
    logger.info('receive ipc login event: cookie', cookie);
    const result = await this.call('/user/setCookie', { data: cookie });
    logger.info('login result: ', result);
  };

  public getRecommendPlayList = () => {
    return this.call('/recommend/playlist/u');
  };
}

export default ApiClient;
