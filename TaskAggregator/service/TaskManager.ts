import { DatabaseManager } from "../../Common/DatabaseManager";
import { logger } from "../../Common/Logger";
import { Task } from "../../Common/model/Task";
import { TaskResponse } from "../../Common/model/TaskResponse";
import { OperatorHelper } from "./OperatorHelper";

// deafult values for quorums
const responsesCountQuorum = 9000;   // 90% of responses on the total number of Operators
const responsesContentQuorum = 9000;   // 90% of responses must have the same content

export class TaskManager {
    /**
     * 
     * @param taskId 
     * @returns 
     */
    static async validateTaskResponses(task: Task): Promise<Task> {
        return new Promise<Task>(async (resolve, reject) => {
            if (task.response != null) {
                logger.info(`[Task ${task.id}] Task Aggregator already reached consensus`);

                return reject("Task already validated");
            }

            // check if a sufficient number of responses have been received
            const { result: responsesAmountReachedQuorum, responsesCount, operatorsCount, quorum } = await TaskManager.checkResponsesAmountReachedQuorum(task);

            if (!responsesAmountReachedQuorum)  {
                const message = `[Task ${task.id}] Waiting for more responses. ${responsesCount} out of ${operatorsCount} received so far and quorum is ${quorum}/${operatorsCount}`;
                
                logger.info(message);
                return reject(message);
            }
            
            logger.info(`[Task ${task.id}] Reached quorum of ${quorum}/${operatorsCount}: verifying responses`);
            
            // check if most of the responses are the same
            TaskManager.getResponsesContentReachedQuorum(task)
                .then((responseReachingQuorum: number) => {
                    // store accepted response to Task
                    DatabaseManager.registerFinalTaskResponse(task, responseReachingQuorum)
                        .then((task: Task) => {
                            logger.info(`[Task ${task.id}] Consensus on responses reached`);

                            resolve(task);
                        })
                        .catch(() => {
                            return reject("Error storing response on Task");
                        });
                })
                .catch(() => {
                    // Task couldn't reach a consensus on the responses
                    DatabaseManager.handleConsensusNotReached(task)
                        .then((task: Task) => {
                            const message = `[Task ${task.id}] Responses were too different: unable to reach consensus`;
                            logger.info(message);
        
                            return reject(message);
                        })
                        .catch(() => {
                            return reject("Error storing response on Task");
                        });
                });
        });
    }

    /**
     * 
     * @param task 
     * @returns 
     */
    private static async checkResponsesAmountReachedQuorum(task: Task): Promise<{ result: boolean, responsesCount: number, operatorsCount: number, quorum: number }> {
        return new Promise<{ result: boolean; responsesCount: number, operatorsCount: number, quorum: number }>(async (resolve, reject) => {
            const responsesCount = await DatabaseManager.getTaskResponsesCount(task);
            const operatorsCount = await OperatorHelper.getRegisteredOperatorsCount();

            const percentageInBps = (responsesCount / operatorsCount) * 10000;

            let quorum = Math.floor((responsesCountQuorum / 10000) * operatorsCount);

            if (operatorsCount == 1) {
                quorum = 1
            }
            
            resolve({ 
                result: percentageInBps >= responsesCountQuorum, 
                responsesCount, 
                operatorsCount,
                quorum 
            });
        });
    }

    /**
     * 
     * @param task 
     * @returns 
     */
    private static async getResponsesContentReachedQuorum(task: Task): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const taskResponses: TaskResponse[] = await DatabaseManager.getTaskResponses(task);

            const responseFrequency: { [key: string]: number } = {};

            taskResponses.forEach(taskResponse => {
                responseFrequency[taskResponse.response] = (responseFrequency[taskResponse.response] || 0) + 1;
            });

            const mostFrequentResponse = Object.keys(responseFrequency).reduce((a, b) => 
                responseFrequency[a] > responseFrequency[b] ? a : b
            );

            
            const mostFrequentResponseCount = responseFrequency[mostFrequentResponse];

            if (mostFrequentResponseCount * 10000 >= responsesContentQuorum * taskResponses.length) {
                resolve(mostFrequentResponse);
            } else {
                reject();
            }
        });
    }
}
