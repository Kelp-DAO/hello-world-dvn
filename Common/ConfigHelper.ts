import 'dotenv/config';

export class ConfigHelper {
  /**
   * 
   * @returns 
   */
  static getRpcProviderUrl(): string {
    return ConfigHelper.getConfigValue('RPC_PROVIDER_URL', 'http://localhost:8545');
  }
  
  /**
   * @returns 
   */
  static getKernelConfigAddress(): string {
    return ConfigHelper.getConfigValue('KERNEL_CONFIG_ADDRESS');
  }
  
  /**
   * 
   * @returns 
   */
  static getKernelManagerPrivateKey(): string {
    return ConfigHelper.getConfigValue('KERNEL_MANAGER_PRIVATE_KEY');
  }
  
  /**
   * 
   * @returns 
   */
  static getTaskAggregatorServerHost(): string {
    return ConfigHelper.getConfigValue('TASK_AGGREGATOR_SERVER_HOST', 'localhost');
  }
  
  /**
   * 
   * @returns 
   */
  static getTaskAggregatorServerPort(): string {
    return ConfigHelper.getConfigValue('TASK_AGGREGATOR_SERVER_PORT');
  }

  /**
   * 
   * @param key 
   * @param defaultVal 
   * @returns 
   */
  private static getConfigValue(key: string, defaultVal: string = ''): string {
    const value = process.env[key];
    
    if (!value) {
        // throw new Error(`"${key}" is not defined in the .env`)
        return defaultVal;
    }

    return value;
  }
  
  /**
   * 
   * @returns 
   */
  static buildApiUrl(path: string, query: any = undefined): string {
    const host = ConfigHelper.getTaskAggregatorServerHost();
    const port = ConfigHelper.getTaskAggregatorServerPort();

    if (path.startsWith('/')) {
      path = path.substring(1);
    }

    let url = `http://${host}:${port}/${path}`;
    
    if (query && Object.keys(query).length > 0) {
      const queryString = Object.keys(query)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
      .join('&');
      url += `?${queryString}`;
    }
    
    return url;
  }
}
