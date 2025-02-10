/**
 * A helper class for managing configuration settings
 *
 * This class provides methods to retrieve various configuration values from environment variables
 * or default values if the environment variables are not set. It also includes a method to build
 * API URLs using the configuration settings.
 */
import "dotenv/config";

/**
 * A helper class for managing configuration settings
 *
 * The `ConfigHelper` class provides static methods to retrieve various configuration
 * values from environment variables or default values. It includes methods to get
 * the RPC provider URL, kernel configuration address, kernel manager private key,
 * task aggregator server host and port, and to build API URLs
 */
export class ConfigHelper {
  // Default kernel configuration address
  public static DEFAULT_KERNEL_CONFIG_ADDRESS =
    "0xA713481cEB09d3c8214fD1DEf27a935Aa1aFCFe8";

  // 1° anvil account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  public static DEFAULT_KERNEL_MANAGER_PRIVATE_KEY =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  // Default host address for the task aggregator server
  public static DEFAULT_TASK_AGGREGATOR_SERVER_HOST = "localhost";

  // Default port number for the task aggregator server
  public static DEFAULT_TASK_AGGREGATOR_SERVER_PORT = "3000";

  // Default RPC provider URL
  public static DEFAULT_RPC_PROVIDER = "http://127.0.0.1:8545";

  /**
   * Retrieves the RPC provider URL from the configuration
   *
   * @returns {string} The RPC provider URL
   */
  static getRpcProviderUrl(): string {
    return ConfigHelper.getConfigValue(
      "RPC_PROVIDER_URL",
      ConfigHelper.DEFAULT_RPC_PROVIDER,
    );
  }

  /**
   * Retrieves the kernel configuration address from the configuration settings
   *
   * @returns The kernel configuration address as a string
   */
  static getKernelConfigAddress(): string {
    return ConfigHelper.getConfigValue(
      "KERNEL_CONFIG_ADDRESS",
      ConfigHelper.DEFAULT_KERNEL_CONFIG_ADDRESS,
    );
  }

  /**
   * Retrieves the private key for the kernel manager
   *
   * This method fetches the value of the 'KERNEL_MANAGER_PRIVATE_KEY' from the configuration.
   * If the key is not found, it returns the default kernel manager private key
   *
   * @returns The kernel manager private key as a string
   */
  static getKernelManagerPrivateKey(): string {
    return ConfigHelper.getConfigValue(
      "KERNEL_MANAGER_PRIVATE_KEY",
      ConfigHelper.DEFAULT_KERNEL_MANAGER_PRIVATE_KEY,
    );
  }

  /**
   * Retrieves the host address for the task aggregator server
   *
   * @returns {string} The host address for the task aggregator server
   */
  static getTaskAggregatorServerHost(): string {
    return ConfigHelper.getConfigValue(
      "TASK_AGGREGATOR_SERVER_HOST",
      ConfigHelper.DEFAULT_TASK_AGGREGATOR_SERVER_HOST,
    );
  }

  /**
   * Retrieves the port number for the Task Aggregator Server
   *
   * This method fetches the value of the 'TASK_AGGREGATOR_SERVER_PORT' configuration
   * If the configuration is not set, it returns the default port value defined by 'DEFAULT_TASK_AGGREGATOR_SERVER_PORT'
   *
   * @returns {string} The port number for the Task Aggregator Server
   */
  static getTaskAggregatorServerPort(): string {
    return ConfigHelper.getConfigValue(
      "TASK_AGGREGATOR_SERVER_PORT",
      ConfigHelper.DEFAULT_TASK_AGGREGATOR_SERVER_PORT,
    );
  }

  /**
   * Retrieves the configuration value for the given key from environment variables
   *
   * @param key The key of the configuration value to retrieve
   * @param defaultVal The default value to return if the key is not found in the environment variables (default is an empty string)
   * @returns The configuration value associated with the given key, or the default value if the key is not found
   */
  private static getConfigValue(key: string, defaultVal: string = ""): string {
    const value = process.env[key];

    if (!value) {
      return defaultVal;
    }

    return value;
  }

  /**
   * Builds the API URL using the provided path and query parameters
   *
   * @param path The path of the API endpoint
   * @param query An optional object containing query parameters
   * @returns The full API URL as a string
   */
  static buildApiUrl(path: string, query: any = undefined): string {
    const host = ConfigHelper.getTaskAggregatorServerHost();
    const port = ConfigHelper.getTaskAggregatorServerPort();

    if (path.startsWith("/")) {
      path = path.substring(1);
    }

    let url = `http://${host}:${port}/${path}`;

    if (query && Object.keys(query).length > 0) {
      const queryString = Object.keys(query)
        .map(
          (key) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`,
        )
        .join("&");
      url += `?${queryString}`;
    }

    return url;
  }
}
