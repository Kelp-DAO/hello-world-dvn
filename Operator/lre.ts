import { Task } from "../Common/model/Task";
import axios from 'axios';
import { OperatorHelper } from "../TaskAggregator/service/OperatorHelper";
import { WalletHelper } from "../Common/WalletHelper";
import { logger } from "../Common/Logger";
import { ConfigHelper } from "../Common/ConfigHelper";
import { Wallet } from "ethers";
import { ProcessHelper } from "../Common/ProcessHelper";
import salesman from '@wemap/salesman.js';

// populated after Operator registration to kernel
let operatorId: number;
let operatorOwner: Wallet;

/**
 * 
 * @returns 
 */
const registerOperator = async (): Promise<void> => {
    return new Promise<void>(async (resolve, reject) => {
        logger.info("Registering Operator to the demo DVN...");

        operatorOwner = WalletHelper.generateWallet();

        WalletHelper.registerOperatorToDemoDVN(operatorOwner)
            .then((id) => {
                logger.info(`Operator #${id} successfully registered to Kernel and to the demo DVN`);

                operatorId = id;

                resolve();
            })
            .catch((error) => {
                logger.error(error)
                reject(error);
            })
    });
};

/**
 * 
 * @param task 
 */
const executeTask = async (task: Task): Promise<void> => {
    return new Promise<void>(async (resolve) => {
        const response = computeRespose(task);
        const jsonResponse = JSON.stringify(response);

        const signature = await OperatorHelper.signResponse(task, JSON.stringify(jsonResponse), operatorOwner);

        axios.post(ConfigHelper.buildApiUrl(`task/${task.id}/response`), {
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
            })
    });
}

/**
 * 
 * @param task 
 */
const computeRespose = (task: Task): number[][] => {
    const input = JSON.parse(task.input);
    const response = solveTSPProblem(input);

    return response;
}

/**
 * 
 * @param matrix 
 * @param source 
 * @param destination 
 * @returns 
 */
const solveTSPProblem = (
    input: number[][],
): number[][] => {
    const points = input.map(([x, y]) => new salesman.Point(x, y));
    const solution = salesman.solve(points, 1);
    const orderedPoints = solution.map(i => points[i]);

    return orderedPoints.map(point => [point.x, point.y]);
};

/**
 * 
 */
const getNewTask = async () => {
    axios.get(ConfigHelper.buildApiUrl(`/operator/${operatorId}/task/next`))
        .then(async (response) => {
            const data = response.data;
            
            if (data === '') {
                // no tasks left
                return;
            }
            
            const task = Task.buildFromAPI(data);
            logger.info(`[task ${task.id}] received from Task Aggregator`);
            
            await executeTask(task);
        })
        .catch((error) => {
            logger.error(error)
        })
        .then(() => {
            setTimeout(() => {
                getNewTask();
            }, 1000);
        })
};

/**
 * 
 */
const waitUntilTaskAggregatorIsAvailable = async () => {
    return new Promise<void>(async (resolve, reject) => {
        logger.info("Waiting for TaskAggregator...");

        const interval = setInterval(async () => {
            axios.get(ConfigHelper.buildApiUrl('/status'))
                .then((response) => {
                    const status = response.status;
                    
                    if (status === 200) {
                        logger.info("TaskAggregator is now available!");

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

/**
 * 
 */
const main = async () => {
    ProcessHelper.waitUntilAnvilIsAvailable()
        .then(() => {
            waitUntilTaskAggregatorIsAvailable()
            .then(() => {
                registerOperator()
                    .then(() => {
                        logger.info("Ready to execute tasks");
                        getNewTask()
                    })
            })
        })
};

main().catch((error) => {
    logger.error("Error in main function:", error);
});