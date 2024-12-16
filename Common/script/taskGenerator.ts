import { DatabaseManager } from "../DatabaseManager";
import { Task } from "../model/Task";
import { logger } from "../Logger";

const INTERVAL_BETWEEN_TASKS = 2000;

/**
 * 
 */
setInterval(async () => {
    const task: Task = await DatabaseManager.addDummyTask();
    
    logger.info(`Added task with id ${task.id} and input ${task.input}`);
    logger.info(`Waiting ${INTERVAL_BETWEEN_TASKS / 1000} seconds before adding another task...`);
}, INTERVAL_BETWEEN_TASKS);
