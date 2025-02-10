import { DatabaseManager } from "./DatabaseManager";
import { logger } from "./Logger";
import { Task } from "./model/Task";
import { TaskResponse } from "./model/TaskResponse";
import { OperatorHelper } from "./OperatorHelper";

// deafult values for quorums
const responsesCountQuorum = 9000; // 90% of responses on the total number of Operators
const responsesContentQuorum = 9000; // 90% of responses must have the same content

/**
 * The TaskManager class provides methods to validate task responses and ensure consensus is reached among operators
 * It includes methods to check if a sufficient number of responses have been received and if the responses are consistent
 * The class interacts with the DatabaseManager to store the final task response or handle cases where consensus is not reached
 */
export class TaskManager {
  /**
   * Checks if the number of responses for a given task has reached the quorum
   *
   * @param task The task for which to check the responses
   * @returns A promise that resolves to an object containing:
   * - result: A boolean indicating if the quorum has been reached
   * - responsesCount: The number of responses received for the task
   * - operatorsCount: The total number of registered operators
   * - quorum: The calculated quorum based on the number of operators
   */
  private static async checkResponsesAmountReachedQuorum(task: Task): Promise<{
    result: boolean;
    responsesCount: number;
    operatorsCount: number;
    quorum: number;
  }> {
    return new Promise<{
      result: boolean;
      responsesCount: number;
      operatorsCount: number;
      quorum: number;
    }>(async (resolve, reject) => {
      const responsesCount = await DatabaseManager.getTaskResponsesCount(task);
      const operatorsCount = await OperatorHelper.getRegisteredOperatorsCount();

      const percentageInBps = (responsesCount / operatorsCount) * 10000;

      let quorum = Math.floor((responsesCountQuorum / 10000) * operatorsCount);

      if (operatorsCount == 1) {
        quorum = 1;
      }

      resolve({
        result: percentageInBps >= responsesCountQuorum,
        responsesCount,
        operatorsCount,
        quorum,
      });
    });
  }

  /**
   * Determines the most frequent response for a given task and checks if it has reached the quorum
   *
   * @param {Task} task The task for which responses are being evaluated
   * @returns {Promise<any>} A promise that resolves with the most frequent response if it reaches the quorum, otherwise it rejects
   */
  private static async getResponsesContentReachedQuorum(
    task: Task,
  ): Promise<any> {
    return new Promise<any>(async (resolve, reject) => {
      const taskResponses: TaskResponse[] =
        await DatabaseManager.getTaskResponses(task);

      const responseFrequency: { [key: string]: number } = {};

      taskResponses.forEach((taskResponse) => {
        responseFrequency[taskResponse.response] =
          (responseFrequency[taskResponse.response] || 0) + 1;
      });

      const mostFrequentResponse = Object.keys(responseFrequency).reduce(
        (a, b) => (responseFrequency[a] > responseFrequency[b] ? a : b),
      );

      const mostFrequentResponseCount = responseFrequency[mostFrequentResponse];

      if (
        mostFrequentResponseCount * 10000 >=
        responsesContentQuorum * taskResponses.length
      ) {
        resolve(mostFrequentResponse);
      } else {
        reject();
      }
    });
  }
  /**
   * Validates the responses for a given task
   *
   * @param task The task to validate
   * @returns A promise that resolves if the task responses are validated successfully, or rejects with an error message if validation fails
   *
   * @throws Will reject with an error message if the task has already been validated
   * @throws Will reject with an error message if a sufficient number of responses have not been received
   * @throws Will reject with an error message if there is an error storing the final task response
   * @throws Will reject with an error message if the responses are too different to reach a consensus
   * @throws Will reject with an error message if there is an error handling the consensus not being reached
   */
  static async validateTaskResponses(task: Task): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      if (task.response != null) {
        logger.info(
          `[Task ${task.id}] Task Aggregator already reached consensus`,
        );

        return reject("Task already validated");
      }

      // check if a sufficient number of responses have been received
      const {
        result: responsesAmountReachedQuorum,
        responsesCount,
        operatorsCount,
        quorum,
      } = await TaskManager.checkResponsesAmountReachedQuorum(task);

      if (!responsesAmountReachedQuorum) {
        const message = `[Task ${task.id}] Waiting for more responses. ${responsesCount} out of ${operatorsCount} received so far and quorum is ${quorum}/${operatorsCount}`;

        logger.info(message);
        return reject(message);
      }

      logger.info(
        `[Task ${task.id}] Reached quorum of ${quorum}/${operatorsCount}: verifying responses`,
      );

      // check if most of the responses are the same
      TaskManager.getResponsesContentReachedQuorum(task)
        .then((responseReachingQuorum: number) => {
          // store accepted response to Task
          DatabaseManager.registerFinalTaskResponse(
            task,
            responseReachingQuorum,
          )
            .then((task: Task) => {
              logger.info(`[Task ${task.id}] Consensus on responses reached`);

              resolve();
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
}
