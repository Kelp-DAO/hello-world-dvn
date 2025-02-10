import axios from "axios";
import { logger } from "./Logger";
import { ConfigHelper } from "./ConfigHelper";

/**
 * A helper class for handling processes related to the Anvil server
 * Provides methods to wait until the Anvil server is available
 */
export class ProcessHelper {
  /**
   * Waits until the Anvil server is available by periodically sending a request to the RPC provider URL
   * Logs the status and resolves the promise when the server is available
   * If the connection is refused, it continues to wait without rejecting the promise
   *
   * @returns {Promise<void>} A promise that resolves when the Anvil server is available
   */
  static async waitUntilAnvilIsAvailable() {
    return new Promise<void>(async (resolve, reject) => {
      logger.info("Waiting for Anvil...");

      const interval = setInterval(async () => {
        axios
          .post(ConfigHelper.getRpcProviderUrl(), {
            jsonrpc: "2.0",
            method: "web3_clientVersion",
            params: [],
            id: 1,
          })
          .then((response) => {
            const status = response.status;

            if (status === 200) {
              logger.info("Anvil is now available!");

              // log about KernelConfig
              logger.info(
                `Using KernelConfig proxy: ${ConfigHelper.getKernelConfigAddress()}`,
              );

              clearInterval(interval);
              resolve();
            }
          })
          .catch((error) => {
            if (error.code === "ECONNREFUSED") {
              return; // do nothing, just wait for the server
            }

            reject(error);
          });
      }, 1000);
    });
  }
}
