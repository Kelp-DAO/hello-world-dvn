import axios from "axios";
import { logger } from "./Logger";
import { ConfigHelper } from "./ConfigHelper";

export class ProcessHelper {
  /**
   * 
   */
  static async waitUntilAnvilIsAvailable() {
      return new Promise<void>(async (resolve, reject) => {
          logger.info("Waiting for Anvil...");
  
          const interval = setInterval(async () => {
              axios.post(ConfigHelper.getRpcProviderUrl(), {
                jsonrpc: "2.0",
                method: "web3_clientVersion",
                params: [],
                id: 1,
              })
                  .then((response) => {
                      const status = response.status;
                      
                      if (status === 200) {
                          logger.info("Anvil is now available!");
  
                          clearInterval(interval);
                          resolve()
                      }
                  })
                  .catch((error) => {
                      if (error.code === 'ECONNREFUSED') {
                          return; // do nothing, just wait for the server
                      }
  
                      reject(error)
                  })
          }, 1000);
      })
  };
}
