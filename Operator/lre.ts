import { Task } from "../Common/model/Task";
import axios from "axios";
import { OperatorHelper } from "..//Common/OperatorHelper";
import { WalletHelper } from "../Common/WalletHelper";
import { logger } from "../Common/Logger";
import { ConfigHelper } from "../Common/ConfigHelper";
import { Wallet } from "ethers";
import { ProcessHelper } from "../Common/ProcessHelper";
import salesman from "@wemap/salesman.js";

// populated after Operator registration to kernel
let operatorId: number;
let operatorOwner: Wallet;

/**
 * Registers an operator to the demo DVN
 *
 * This function generates a new wallet for the operator owner and registers the operator to the demo DVN
 * It logs the registration process and resolves the promise when the registration is successful
 * If an error occurs during the registration, it logs the error and rejects the promise
 *
 * @returns {Promise<void>} A promise that resolves when the operator is successfully registered
 */
const registerOperator = async (): Promise<void> => {
  return new Promise<void>(async (resolve, reject) => {
    logger.info("Registering Operator to the demo DVN...");

    operatorOwner = WalletHelper.generateWallet();

    WalletHelper.registerOperatorToDemoDVN(operatorOwner)
      .then((id) => {
        logger.info(
          `Operator #${id} successfully registered to Kernel and to the demo DVN`,
        );
        logger.info(
          `  Owner: ${WalletHelper.derivePublicKeyFromWallet(operatorOwner)}`,
        );

        operatorId = id;

        resolve();
      })
      .catch((error) => {
        logger.error(error);
        reject(error);
      });
  });
};

/**
 * Executes a given task by computing the response, signing it, and sending it to the API
 *
 * @param task The task to be executed
 * @returns A promise that resolves when the response has been successfully sent
 */
const executeTask = async (task: Task): Promise<void> => {
  return new Promise<void>(async (resolve) => {
    const response = computeRespose(task);
    const jsonResponse = JSON.stringify(response);

    const signature = await OperatorHelper.signResponse(
      task,
      jsonResponse,
      operatorOwner,
    );

    axios
      .post(ConfigHelper.buildApiUrl(`task/${task.id}/response`), {
        operatorId: operatorId,
        response: jsonResponse,
        signature: signature,
      })
      .then((response) => {
        logger.info(`[task ${task.id}] response sent`);

        resolve();
      })
      .catch((error) => {
        logger.error(error);
      });
  });
};

/**
 * Computes the response for a given task by solving the TSP (Traveling Salesman Problem) with the provided input
 *
 * @param {Task} task The task object containing the input data for the TSP problem
 * @returns {number[][]} - A 2D array representing the solution to the TSP problem
 */
const computeRespose = (task: Task): number[][] => {
  const input = JSON.parse(task.input);
  const response = solveTSPProblem(input);

  return response;
};

/**
 * Solves the Traveling Salesman Problem (TSP) for a given set of points
 *
 * @param input A 2D array where each sub-array contains the x and y coordinates of a point
 * @returns A 2D array of points ordered to minimize the travel distance, where each sub-array contains the x and y coordinates of a point
 */
const solveTSPProblem = (input: number[][]): number[][] => {
  const points = input.map(([x, y]) => new salesman.Point(x, y));
  const solution = salesman.solve(points, 1);
  const orderedPoints = solution.map((i) => points[i]);

  return orderedPoints.map((point) => [point.x, point.y]);
};

/**
 * Fetches the next task for the operator from the API and executes it
 *
 * This function makes an HTTP GET request to retrieve the next task for the operator
 * If a task is received, it is built from the API response and executed
 * If no tasks are left, the function will wait for 1 second before trying again
 *
 * @returns {Promise<void>} A promise that resolves when the task is executed or no tasks are left
 */
const getNewTask = async () => {
  axios
    .get(ConfigHelper.buildApiUrl(`/operator/${operatorId}/task/next`))
    .then(async (response) => {
      const data = response.data;

      if (data === "") {
        // no tasks left
        return;
      }

      const task = Task.buildFromAPI(data);
      logger.info(`[task ${task.id}] received from Task Aggregator`);

      await executeTask(task);
    })
    .catch((error) => {
      logger.error(error);
    })
    .then(() => {
      setTimeout(() => {
        getNewTask();
      }, 1000);
    });
};

/**
 * Waits until the TaskAggregator service is available by periodically checking its status endpoint.
 * The function will resolve once the service responds with a status code of 200
 * If the connection is refused, it will continue to wait and retry
 * If any other error occurs, the promise will be rejected with the error
 *
 * @returns {Promise<void>} A promise that resolves when the TaskAggregator service is available
 */
const waitUntilTaskAggregatorIsAvailable = async () => {
  return new Promise<void>(async (resolve, reject) => {
    logger.info("Waiting for TaskAggregator...");

    const interval = setInterval(async () => {
      axios
        .get(ConfigHelper.buildApiUrl("/status"))
        .then((response) => {
          const status = response.status;

          if (status === 200) {
            logger.info("TaskAggregator is now available!");

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
};

/**
 * Main function
 */
const main = async () => {
  ProcessHelper.waitUntilAnvilIsAvailable().then(() => {
    waitUntilTaskAggregatorIsAvailable().then(() => {
      registerOperator().then(() => {
        logger.info("Ready to execute tasks");
        getNewTask();
      });
    });
  });
};

/**
 *
 */
main().catch((error) => {
  logger.error("Error in main function:", error);
});
