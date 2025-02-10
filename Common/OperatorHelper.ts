import { ethers, verifyMessage } from "ethers";
import { Task } from "./model/Task";
import { WalletHelper } from "./WalletHelper";
import { Wallet } from "ethers";

/**
 * A helper class for performing various operations related to operators in the demo DVN
 *
 * This class provides methods to verify operator registration, verify task response signatures,
 * retrieve registered operators, count registered operators, and sign response messages
 */
export class OperatorHelper {
  /**
   * Retrieves the list of registered operators from the DVNCoordinator contract
   *
   * @returns {Promise<number[]>} A promise that resolves to an array of operator IDs
   * @throws Will call WalletHelper.handleTransactionException if an error occurs during the contract call
   */
  static getRegisteredOperators(): Promise<number[]> {
    return new Promise<number[]>(async (resolve, reject) => {
      const contract = WalletHelper.getDemoDVNCoordinatorContract(
        WalletHelper.getDVNOwnerWallet(),
      );

      try {
        const operators = await contract.getOperators();

        resolve(operators);
      } catch (error) {
        WalletHelper.handleTransactionException(error, reject);
      }
    });
  }

  /**
   * Retrieves the count of registered operators
   *
   * @returns A promise that resolves to the number of registered operators
   */
  static getRegisteredOperatorsCount(): Promise<number> {
    return new Promise<number>(async (resolve, reject) => {
      OperatorHelper.getRegisteredOperators()
        .then((operators: number[]) => {
          resolve(operators.length);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  /**
   * Signs a response message for a given task using the provided signer wallet
   *
   * @param task The task object containing the task ID
   * @param response The response string to be signed
   * @param signer The wallet instance used to sign the message
   * @returns A promise that resolves to the signature string
   */
  static signResponse(
    task: Task,
    response: string,
    signer: Wallet,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const messageToSign = JSON.stringify({
        task: task.id,
        response: response,
      });

      const messageHash = ethers.solidityPackedKeccak256(
        ["string"],
        [messageToSign],
      );
      const messageBytes = ethers.getBytes(messageHash);
      signer.signMessage(messageBytes).then((signature: string) => {
        resolve(signature);
      });
    });
  }

  /**
   * Verifies if the operator with the given ID is registered to the demo DVN
   *
   * @param operatorId The ID of the operator to verify
   * @returns A promise that resolves if the operator is registered, or rejects with an error message if not
   */
  static verifyOperator(operatorId: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      WalletHelper.isOperatorRegisteredToDVN(operatorId)
        .then((isRegistered: boolean) => {
          if (isRegistered) {
            resolve();
          } else {
            reject(`Operator #${operatorId} is not registered to the demo DVN`);
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  /**
   * Verifies the signature of a task response from an operator.
   *
   * @param task The task object containing the task details
   * @param operatorId The ID of the operator whose signature needs to be verified
   * @param response The response string that was signed by the operator
   * @param signature The signature string to be verified
   * @returns A promise that resolves if the signature is valid, otherwise it rejects with an error message
   */
  static verifySignature(
    task: Task,
    operatorId: number,
    response: string,
    signature: string,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      WalletHelper.getOperatorOwner(operatorId)
        .then((getOperatorOwner: string) => {
          const messageToSign = JSON.stringify({
            task: task.id,
            response: response,
          });

          const messageHash = ethers.solidityPackedKeccak256(
            ["string"],
            [messageToSign],
          );
          const messageBytes = ethers.getBytes(messageHash);

          const signer = verifyMessage(messageBytes, signature);

          if (signer === getOperatorOwner) {
            resolve();
          } else {
            reject(`Signature verification failed`);
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
}
