import { parseEther, toBeHex, Wallet } from "ethers";
import { ethers, HDNodeWallet } from "ethers";
import { ConfigHelper } from "./ConfigHelper";
import { JsonRpcProvider } from "ethers";
import { Contract } from "ethers";
import DVNRegistryAbi from "../Common/abi/DVNRegistry";
import DVNCoordinatorAbi from "../Common/abi/DVNCoordinator";
import KernelConfigAbi from "../Common/abi/KernelConfig";
import OperatorRegistryAbi from "../Common/abi/OperatorRegistry";
import { CacheManager } from "./CacheManager";
import { ContractTransactionResponse } from "ethers";

export class WalletHelper {
  /**
   * Accepts an operator registration request by the DemoDVNCoordinator contract
   *
   * @param operatorId The ID of the operator to be registered
   * @returns A promise that resolves when the transaction is complete
   *
   * @throws Will throw an error if the transaction fails
   */
  static async acceptOperatorRegistrationByDemoDVN(
    operatorId: number,
  ): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      const signer: Wallet = WalletHelper.getDVNOwnerWallet();
      const contract = WalletHelper.getDemoDVNCoordinatorContract(signer);

      await CacheManager.acquireTransactionLock(signer);

      try {
        const tx = await contract.acceptOperatorRegistrationRequest(
          operatorId.toString(),
        );
        CacheManager.releaseTransactionLock(signer);
        await tx.wait();

        resolve();
      } catch (error) {
        console.log(error);
        WalletHelper.handleTransactionException(error, reject);
      }
    });
  }

  /**
   * Retrieves the DVN owner wallet
   *
   * @returns {Wallet} The DVN owner wallet
   */
  static createOrGenerateDVNOwnerWallet(): Wallet {
    let privateKey = CacheManager.getValueInSharedCache(
      CacheManager.KEY_DEMO_DVN_OWNER_PRIVATE_KEY,
    );

    if (privateKey == null) {
      // generate a wallet
      const wallet = WalletHelper.generateWallet();
      privateKey = wallet.privateKey;

      // fund account
      WalletHelper.fundAddress(WalletHelper.derivePublicKeyFromWallet(wallet));

      // write in cache
      CacheManager.writeValueInSharedCache(
        CacheManager.KEY_DEMO_DVN_OWNER_PRIVATE_KEY,
        privateKey,
      );
    }

    return new ethers.Wallet(privateKey, WalletHelper.getRPCProvider());
  }

  /**
   * Derives the public key from the given wallet
   *
   * @param wallet The wallet object from which to derive the public key
   * @returns The derived public key as a string
   */
  static derivePublicKeyFromWallet(wallet: Wallet): string {
    return ethers.computeAddress(wallet.signingKey.compressedPublicKey);
  }

  /**
   * Funds the specified address with a predefined amount of ether
   *
   * @param recipient The address to be funded
   * @returns A promise that resolves when the address has been funded and the balance has been retrieved
   */
  static async fundAddress(recipient: string) {
    const balanceInHex = toBeHex(parseEther("10"));

    await WalletHelper.getRPCProvider().send("anvil_setBalance", [
      recipient,
      balanceInHex,
    ]);

    await WalletHelper.getRPCProvider().getBalance(recipient);
  }

  /**
   * Generates a new wallet using a random private key and returns it
   *
   * @returns {Wallet} A new wallet instance connected to the RPC provider
   */
  static generateWallet(): Wallet {
    const wallet: HDNodeWallet = ethers.Wallet.createRandom();

    return new ethers.Wallet(wallet.privateKey, WalletHelper.getRPCProvider());
  }

  /**
   * Handles exceptions that occur during a transaction and rejects the promise with an appropriate message
   *
   * @param error The error object containing details about the transaction failure
   * @param reject The function to call to reject the promise with a specific reason
   */
  public static handleTransactionException(
    error: any,
    reject: (reason?: any) => void,
  ) {
    console.error("Transaction rejected or failed:", error);

    if (error.code === "INSUFFICIENT_FUNDS") {
      reject("Insufficient funds to complete the transaction.");
    } else if (error.code === "UNPREDICTABLE_GAS_LIMIT") {
      reject("The transaction likely will fail (gas estimation issue).");
    } else if (error.error?.message) {
      reject("Revert reason:", error.error.message); // Contract revert reason
    }
  }

  /**
   * Retrieves an instance of the Demo DVNCoordinator contract
   *
   * @param signer The wallet instance used to sign transactions
   * @returns An instance of the Demo DVNCoordinator contract
   */
  static getDemoDVNCoordinatorContract(signer: Wallet): Contract {
    return new ethers.Contract(
      WalletHelper.getDemoDVNCoordinatorContractAddress(),
      DVNCoordinatorAbi,
      signer,
    );
  }

  /**
   * Retrieves the demo DVNCoordinator contract address from the shared cache
   *
   * @returns {string} The demo DVNCoordinator contract address
   */
  static getDemoDVNCoordinatorContractAddress(): string {
    return CacheManager.getValueInSharedCache(
      CacheManager.KEY_DEMO_DVN_COORDINATOR,
    )!;
  }

  /**
   * Retrieves the owner of the demo DVN from the shared cache
   *
   * @returns {Wallet} The wallet instance of the DVN owner
   */
  static getDVNOwnerWallet(): Wallet {
    return WalletHelper.createOrGenerateDVNOwnerWallet();
  }

  /**
   * Retrieves the DVNRegistry contract instance using the provided signer
   *
   * @param signer The wallet signer to interact with the contract
   * @returns A promise that resolves to the DVNRegistry contract instance
   */
  static getDVNRegistryContract(signer: Wallet): Promise<Contract> {
    return new Promise<Contract>(async (resolve, reject) => {
      const address =
        await WalletHelper.getKernelConfigContract(signer).getDVNRegistry();

      resolve(new ethers.Contract(address, DVNRegistryAbi, signer));
    });
  }

  /**
   * Retrieves the KernelConfig contract instance using the provided signer
   *
   * @param signer The wallet signer to interact with the contract
   * @returns The KernelConfig contract instance
   */
  static getKernelConfigContract(signer: Wallet): Contract {
    return new ethers.Contract(
      ConfigHelper.getKernelConfigAddress(),
      KernelConfigAbi,
      signer,
    );
  }

  /**
   * Retrieves the kernel manager wallet instance
   *
   * @returns {Wallet} The wallet instance created using the kernel manager's private key and the RPC provider
   */
  static getKernelManagerWallet(): Wallet {
    return new ethers.Wallet(
      ConfigHelper.getKernelManagerPrivateKey(),
      WalletHelper.getRPCProvider(),
    );
  }

  /**
   * Return the public address of the owner of an Operator
   *
   * @returns
   */
  static async getOperatorOwner(operatorId: number): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      const contract = await WalletHelper.getOperatorRegistryContract(
        WalletHelper.getDVNOwnerWallet(),
      );

      try {
        const operatorOwner = await contract.getOperatorOwner(operatorId);

        resolve(operatorOwner);
      } catch (error) {
        WalletHelper.handleTransactionException(error, reject);
      }
    });
  }

  /**
   * Retrieves the Operator Registry contract instance using the provided signer
   *
   * @param {Wallet} signer The wallet signer to interact with the contract
   * @returns {Promise<Contract>} A promise that resolves to the Operator Registry contract instance
   */
  static getOperatorRegistryContract(signer: Wallet): Promise<Contract> {
    return new Promise<Contract>(async (resolve, reject) => {
      const address =
        await WalletHelper.getKernelConfigContract(
          signer,
        ).getOperatorRegistry();

      resolve(new ethers.Contract(address, OperatorRegistryAbi, signer));
    });
  }

  /**
   * Retrieves an instance of JsonRpcProvider using the RPC provider URL from the configuration
   *
   * @returns {JsonRpcProvider} An instance of JsonRpcProvider
   */
  static getRPCProvider(): JsonRpcProvider {
    return new ethers.JsonRpcProvider(ConfigHelper.getRpcProviderUrl());
  }

  /**
   * Parses a specific event log from a contract transaction receipt.
   *
   * @param abi The ABI of the contract
   * @param receipt The transaction receipt containing the logs
   * @param eventSignature The signature of the event to parse
   * @returns The parsed log object
   * @throws Error if the specified event is not found in the transaction logs
   */
  private static getParsedLog(
    abi: any,
    receipt: ContractTransactionResponse,
    eventSignature: string,
  ) {
    // Get the event topic for the event
    const eventTopic = ethers.id(eventSignature);

    // Find the log corresponding to theevent
    const log = receipt.logs.find((log) => log.topics[0] === eventTopic);

    if (!log) {
      throw Error(`${eventSignature} event not found in transaction logs`);
    }

    const eventName = eventSignature.split("(")[0];

    // Decode the log using the Interface
    const iface = new ethers.Interface(abi);
    const parsedLog = iface.decodeEventLog(eventName, log.data, log.topics);

    return parsedLog;
  }

  /**
   * Checks if an operator is registered to DVN
   *
   * @param operatorId The ID of the operator to check
   * @returns A promise that resolves to a boolean indicating whether the operator is registered to DVN
   */
  static async isOperatorRegisteredToDVN(operatorId: number): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      const contract = WalletHelper.getDemoDVNCoordinatorContract(
        WalletHelper.getDVNOwnerWallet(),
      );

      try {
        const isOperatorRegisteredToDVN =
          await contract.isOperatorRegistered(operatorId);

        resolve(isOperatorRegisteredToDVN);
      } catch (error) {
        WalletHelper.handleTransactionException(error, reject);
      }
    });
  }

  /**
   * Registers a demo DVN and returns the DVNCoordinator and owner wallets
   *
   * @returns {Promise<{ dvnCoordinator: string; dvnOwner: Wallet }>} A promise that resolves with an object containing the DVNCoordinator address and the DVN owner wallet
   *
   * @throws Will throw an error if the registration transaction fails
   */
  static async registerDemoDVN(): Promise<{
    dvnCoordinator: string;
    dvnOwner: Wallet;
  }> {
    return new Promise<{ dvnCoordinator: string; dvnOwner: Wallet }>(
      async (resolve, reject) => {
        const wallet = WalletHelper.getKernelManagerWallet();
        const contract = await WalletHelper.getDVNRegistryContract(wallet);

        const dvnOwner = WalletHelper.getDVNOwnerWallet();

        try {
          const tx = await contract.register(dvnOwner, "");
          const receipt = await tx.wait();

          const parsedLog = WalletHelper.getParsedLog(
            DVNRegistryAbi,
            receipt,
            "DVNRegistered(address,address)",
          );

          const dvnCoordinator = parsedLog[0];

          await CacheManager.writeValueInSharedCache(
            CacheManager.KEY_DEMO_DVN_COORDINATOR,
            dvnCoordinator,
          );

          resolve({ dvnCoordinator: dvnCoordinator, dvnOwner: dvnOwner });
        } catch (error) {
          WalletHelper.handleTransactionException(error, reject);
        }
      },
    );
  }

  /**
   * Registers an operator to the kernel
   *
   * @param operatorOwner The wallet of the operator owner
   * @returns A promise that resolves to the operator ID
   */
  static async registerOperatorToKernel(
    operatorOwner: Wallet,
  ): Promise<number> {
    return new Promise<number>(async (resolve, reject) => {
      const contract =
        await WalletHelper.getOperatorRegistryContract(operatorOwner);

      WalletHelper.fundAddress(
        WalletHelper.derivePublicKeyFromWallet(operatorOwner),
      );

      try {
        const tx = await contract.register(
          WalletHelper.derivePublicKeyFromWallet(operatorOwner),
          "",
        );
        const receipt = await tx.wait();

        const parsedLog = WalletHelper.getParsedLog(
          OperatorRegistryAbi,
          receipt,
          "OperatorRegistered(uint256,address)",
        );

        const operatorId = parseInt(parsedLog[0]);

        resolve(operatorId);
      } catch (error) {
        WalletHelper.handleTransactionException(error, reject);
      }
    });
  }

  /**
   * Registers an operator to the demo DVN
   *
   * This function performs the following steps:
   * 1. Registers the operator to the Kernel
   * 2. Registers the operator to the demo DVN
   * 3. Accepts the operator registration by the demo DVN
   *
   * @param operatorOwner The wallet of the operator owner
   * @returns A promise that resolves to the operator ID if the registration is successful
   */
  static async registerOperatorToDemoDVN(
    operatorOwner: Wallet,
  ): Promise<number> {
    return new Promise<number>(async (resolve, reject) => {
      // register Operator to Kernel
      WalletHelper.registerOperatorToKernel(operatorOwner).then(
        async (operatorId) => {
          // register Operator to the demo DVN
          WalletHelper.requestRegisterOperatorToDVN(operatorOwner, operatorId)
            .then(() => {
              // accept Operator registration by the demo DVN
              WalletHelper.acceptOperatorRegistrationByDemoDVN(operatorId)
                .then(() => {
                  resolve(operatorId);
                })
                .catch((error) => {
                  reject(error);
                });
            })
            .catch((error) => {
              reject(error);
            });
        },
      );
    });
  }

  /**
   * Requests the registration of an operator to the DVN
   *
   * @param operatorOwner The wallet instance of the operator owner
   * @param operatorId The unique identifier of the operator
   * @returns A promise that resolves when the registration transaction is confirmed
   *
   * @throws Will call `handleTransactionException` if the transaction fails
   */
  static async requestRegisterOperatorToDVN(
    operatorOwner: Wallet,
    operatorId: number,
  ): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      const contract =
        WalletHelper.getDemoDVNCoordinatorContract(operatorOwner);

      try {
        const tx = await contract.requestOperatorRegistration(operatorId);
        await tx.wait();

        resolve();
      } catch (error) {
        WalletHelper.handleTransactionException(error, reject);
      }
    });
  }
}
