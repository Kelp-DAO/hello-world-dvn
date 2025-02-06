import 'dotenv/config';

export class ConfigHelper {
  public static DEFAULT_KERNEL_CONFIG_ADDRESS = '0xA713481cEB09d3c8214fD1DEf27a935Aa1aFCFe8'
  
  // 1° anvil account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  public static DEFAULT_KERNEL_MANAGER_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

  public static DEFAULT_TASK_AGGREGATOR_SERVER_HOST = 'localhost'
  public static DEFAULT_TASK_AGGREGATOR_SERVER_PORT = '3000'
  public static DEFAULT_RPC_PROVIDER = 'http://127.0.0.1:8545'


  /**
   * 
   * @returns 
   */
  static getRpcProviderUrl(): string {
    return ConfigHelper.getConfigValue('RPC_PROVIDER_URL', ConfigHelper.DEFAULT_RPC_PROVIDER);
  }
  
  /**
   * @returns 
   */
  static getKernelConfigAddress(): string {
    return ConfigHelper.getConfigValue('KERNEL_CONFIG_ADDRESS', ConfigHelper.DEFAULT_KERNEL_CONFIG_ADDRESS);
  }
  
  /**
   * 
   * @returns 
   */
  static getKernelManagerPrivateKey(): string {
    return ConfigHelper.getConfigValue('KERNEL_MANAGER_PRIVATE_KEY', ConfigHelper.DEFAULT_KERNEL_MANAGER_PRIVATE_KEY);
  }
  
  /**
   * 
   * @returns 
   */
  static getTaskAggregatorServerHost(): string {
    return ConfigHelper.getConfigValue('TASK_AGGREGATOR_SERVER_HOST', ConfigHelper.DEFAULT_TASK_AGGREGATOR_SERVER_HOST);
  }
  
  /**
   * 
   * @returns 
   */
  static getTaskAggregatorServerPort(): string {
    return ConfigHelper.getConfigValue('TASK_AGGREGATOR_SERVER_PORT', ConfigHelper.DEFAULT_TASK_AGGREGATOR_SERVER_PORT);
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
