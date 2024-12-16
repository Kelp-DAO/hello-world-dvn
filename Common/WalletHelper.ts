import { parseEther, toBeHex, Wallet } from 'ethers';
import { ethers, HDNodeWallet } from 'ethers';
import { ConfigHelper } from './ConfigHelper';
import { JsonRpcProvider } from 'ethers';
import { Contract } from 'ethers';
import DVNRegistryAbi from "../Common/abi/DVNRegistry";
import DVNCoordinatorAbi from "../Common/abi/DVNCoordinator";
import KernelConfigAbi from "../Common/abi/KernelConfig";
import OperatorRegistryAbi from "../Common/abi/OperatorRegistry";
import { CacheManager } from './CacheManager';
import { ContractTransactionResponse } from 'ethers';

export class WalletHelper {
  /**
   * Give some funds to an address on anvil
   * 
   * @returns 
   */
  static async fundAddress(recipient: string) {
    const balanceInHex = toBeHex(parseEther('10'));

    await WalletHelper.getRPCProvider().send("anvil_setBalance", [recipient, balanceInHex]);

    await WalletHelper.getRPCProvider().getBalance(recipient);
  }

  /**
   * 
   * @returns 
   */
  static generateWallet(): Wallet {
    const wallet: HDNodeWallet = ethers.Wallet.createRandom();

    return new ethers.Wallet(wallet.privateKey, WalletHelper.getRPCProvider());
  }

  /**
   * 
   * @returns 
   */
  static getKernelManagerWallet(): Wallet {
    return new ethers.Wallet(ConfigHelper.getKernelManagerPrivateKey(), WalletHelper.getRPCProvider());
  }

  /**
   * @returns 
   */
  static getRPCProvider(): JsonRpcProvider {
    return new ethers.JsonRpcProvider(ConfigHelper.getRpcProviderUrl());
  }

  /**
   * @returns 
   */
  static getKernelConfigContract(signer: Wallet): Contract {
    return new ethers.Contract(ConfigHelper.getKernelConfigAddress(), KernelConfigAbi, signer);
  }

  /**
   * @returns 
   */
  static getDVNRegistryContract(signer: Wallet): Promise<Contract> {
    return new Promise<Contract>(async (resolve, reject) => {
      const address = await (WalletHelper.getKernelConfigContract(signer)).getDVNRegistry();

      resolve(
        new ethers.Contract(address, DVNRegistryAbi, signer)
      )
    });
  }

  /**
   * @returns 
   */
  static getOperatorRegistryContract(signer: Wallet): Promise<Contract> {
    return new Promise<Contract>(async (resolve, reject) => {
      const address = await (WalletHelper.getKernelConfigContract(signer)).getOperatorRegistry();

      resolve(
        new ethers.Contract(address, OperatorRegistryAbi, signer)
      )
    });
  }

  /**
   * @returns 
   */
  static getDemoDVNCoordinatorContract(signer: Wallet): Contract {
    return new ethers.Contract(WalletHelper.getDemoDVNCoordinatorContractAddress(), DVNCoordinatorAbi, signer);
  }

  /**
   * @returns 
   */
  static getDemoDVNCoordinatorContractAddress(): string {
    return CacheManager.getValueInSharedCache(CacheManager.KEY_DEMO_DVN_COORDINATOR)!;
  }

  /**
   * @returns 
   */
  static derivePublicKeyFromWallet(wallet: Wallet): string {
    return ethers.computeAddress(wallet.signingKey.compressedPublicKey);
  }

  /**
   * @returns 
   */
  static getDVNOwnerWallet(): Wallet {
    return WalletHelper.createOrGenerateDVNOwnerWallet()
  }

  /**
   * @returns 
   */
  static createOrGenerateDVNOwnerWallet(): Wallet {
    let privateKey = CacheManager.getValueInSharedCache(CacheManager.KEY_DEMO_DVN_OWNER_PRIVATE_KEY);

    if (privateKey == null) {
      // generate a wallet
      const wallet = WalletHelper.generateWallet();
      privateKey = wallet.privateKey;

      // fund account
      WalletHelper.fundAddress(WalletHelper.derivePublicKeyFromWallet(wallet));
      
      // write in cache
      CacheManager.writeValueInSharedCache(CacheManager.KEY_DEMO_DVN_OWNER_PRIVATE_KEY, privateKey);
    }

    return new ethers.Wallet(privateKey, WalletHelper.getRPCProvider());
  }

  /**
   * 
   * @param receipt eg. await tx.wait();
   * @param eventSignature eg. OperatorRegistered(uint256,address)
   * @returns 
   */
  private static getParsedLog(abi: any, receipt: ContractTransactionResponse, eventSignature: string) {
    // Get the event topic for the event
    const eventTopic = ethers.id(eventSignature);

    // Find the log corresponding to theevent
    const log = receipt.logs.find((log) => log.topics[0] === eventTopic);

    if (!log) {
        throw Error(`${eventSignature} event not found in transaction logs`);
    }

    const eventName = eventSignature.split('(')[0];

    // Decode the log using the Interface
    const iface = new ethers.Interface(abi);
    const parsedLog = iface.decodeEventLog(eventName, log.data, log.topics);

    return parsedLog;
  }

  /**
   * 
   * @param receipt eg. await tx.wait();
   * @param eventSignature eg. OperatorRegistered(uint256,address)
   * @returns 
   */
  public static handleTransactionException(error: any, reject: (reason?: any) => void) {
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
   * @returns 
   */
  static async registerDemoDVN(): Promise<{ dvnCoordinator: string; dvnOwner: Wallet }> {
    return new Promise<{ dvnCoordinator: string; dvnOwner: Wallet }>(async (resolve, reject) => {
        const wallet = WalletHelper.getKernelManagerWallet();
        const contract = await WalletHelper.getDVNRegistryContract(wallet);

        const dvnOwner = WalletHelper.getDVNOwnerWallet();

        try {
          const tx = await contract.register(dvnOwner, '');
            const receipt = await tx.wait()

            const parsedLog = WalletHelper.getParsedLog(DVNRegistryAbi, receipt, "DVNRegistered(address,address)");

            const dvnCoordinator = parsedLog[0];

            await CacheManager.writeValueInSharedCache(CacheManager.KEY_DEMO_DVN_COORDINATOR, dvnCoordinator);

            resolve({ dvnCoordinator: dvnCoordinator, dvnOwner: dvnOwner });
        } catch (error) {
          WalletHelper.handleTransactionException(error, reject)
        }
    });
  }

  /**
   * Register an Operator to Kernel and obtain Operator id
   * @returns 
   */
  static async registerOperatorToKernel(operatorOwner: Wallet): Promise<number> {
    return new Promise<number>(async (resolve, reject) => {
        const contract = await WalletHelper.getOperatorRegistryContract(operatorOwner);

        WalletHelper.fundAddress(WalletHelper.derivePublicKeyFromWallet(operatorOwner));

        try {
            const tx = await contract.register(WalletHelper.derivePublicKeyFromWallet(operatorOwner), '');
            const receipt = await tx.wait();

            const parsedLog = WalletHelper.getParsedLog(OperatorRegistryAbi, receipt, "OperatorRegistered(uint256,address)");

            const operatorId = parseInt(parsedLog[0]);

            resolve(operatorId);
        } catch (error) {
          WalletHelper.handleTransactionException(error, reject)
        }
    });
  }

  /**
   * @returns 
   */
  static async requestRegisterOperatorToDVN(operatorOwner: Wallet, operatorId: number): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      const contract = WalletHelper.getDemoDVNCoordinatorContract(operatorOwner);

      try {
          const tx = await contract.requestOperatorRegistration(operatorId);
          await tx.wait();
          
          resolve();
      } catch (error) {
        WalletHelper.handleTransactionException(error, reject)
      }
    });
  }

  /**
   * @returns 
   */
  static async acceptOperatorRegistrationByDemoDVN(operatorId: number): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      const signer: Wallet = WalletHelper.getDVNOwnerWallet();
      const contract = WalletHelper.getDemoDVNCoordinatorContract(signer);

      await CacheManager.acquireTransactionLock(signer);

      try {
        const tx = await contract.acceptOperatorRegistrationRequest(operatorId.toString());
        CacheManager.releaseTransactionLock(signer);
        await tx.wait();

        resolve();
      } catch (error) {
        console.log(error)
        WalletHelper.handleTransactionException(error, reject)
      }

    });
  }

  /**
   * @returns 
   */
  static async registerOperatorToDemoDVN(operatorOwner: Wallet): Promise<number> {
    return new Promise<number>(async (resolve, reject) => {
      // register Operator to Kernel
      WalletHelper.registerOperatorToKernel(operatorOwner)
        .then(async (operatorId) => {
          // register Operator to the demo DVN
          WalletHelper.requestRegisterOperatorToDVN(operatorOwner, operatorId)
            .then(() => {
              // accept Operator registration by the demo DVN
              WalletHelper.acceptOperatorRegistrationByDemoDVN(operatorId)
                .then(() => {
                    resolve(operatorId)
                  })
                  .catch((error) => {
                      reject(error);
                  });
            })
            .catch((error) => {
                reject(error);
            });
        }
      );
    });
  }

  /**
   * @returns 
   */
  static async isOperatorRegisteredToDVN(operatorId: number): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      const contract = WalletHelper.getDemoDVNCoordinatorContract(WalletHelper.getDVNOwnerWallet());

      try {
          const isOperatorRegisteredToDVN = await contract.isOperatorRegistered(operatorId);
          
          resolve(isOperatorRegisteredToDVN);
      } catch (error) {
        WalletHelper.handleTransactionException(error, reject)
      }
    });
  }
}

