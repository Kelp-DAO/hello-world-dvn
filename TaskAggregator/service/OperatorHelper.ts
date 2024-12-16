import { ethers } from "ethers";
import { Task } from "../../Common/model/Task";
import { WalletHelper } from "../../Common/WalletHelper";
import { Wallet } from "ethers";

export class OperatorHelper {
    /**
     * 
     * @param operatorId 
     * @returns 
     */
    static verifyOperator(operatorId: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            WalletHelper.isOperatorRegisteredToDVN(operatorId)
                .then((isRegistered: boolean) => {
                    if (isRegistered) {
                        resolve()
                    } else {
                        reject(`Operator #${operatorId} is not registered to the demo DVN`);
                    }
                })
                .catch((error) => {
                    reject(error);
                })
        });
    }

    /**
     * 
     * @returns 
     */
    static getRegisteredOperators(): Promise<number[]> {
        return new Promise<number[]>(async (resolve, reject) => {
            const contract = WalletHelper.getDemoDVNCoordinatorContract(WalletHelper.getDVNOwnerWallet());
        
            try {
                const operators = await contract.getOperators();
                
                resolve(operators);
            } catch (error) {
                WalletHelper.handleTransactionException(error, reject)
            }
        });
    }

    /**
     * 
     * @returns 
     */
    static getRegisteredOperatorsCount(): Promise<number> {
        return new Promise<number>(async (resolve, reject) => {
            OperatorHelper.getRegisteredOperators()
                .then((operators: number[]) => {
                    resolve(operators.length);
                })
                .catch((error) => {
                    reject(error);
                })
        });
    }

    /**
     * 
     * @param message 
     * @returns 
     */
    static signResponse(task: Task, response: string, signer: Wallet): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const messageToSign = JSON.stringify({
                task: task.id,
                response: response,
            });

            const messageHash = ethers.solidityPackedKeccak256(["string"], [messageToSign]);
            const messageBytes = ethers.getBytes(messageHash);
            signer.signMessage(messageBytes)
                .then((signature: string) => {
                    resolve(signature);
                })
        });
    }
}
