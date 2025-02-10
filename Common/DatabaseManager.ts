import * as fs from "fs";
import sqlite3 from "sqlite3";
import { CacheManager } from "./CacheManager";
import { Logger } from "pino";
import { Task } from "./model/Task";
import { TaskResponse } from "./model/TaskResponse";

/**
 * The `DatabaseManager` class provides methods to manage and interact with the SQLite3 database
 *
 * This class includes methods to reset the database, add tasks, fetch tasks, register responses, and handle consensus scenarios
 * It uses SQLite3 for database operations and includes methods for creating tables, inserting data, and querying data
 *
 * The class also includes utility methods for generating random salesman points and checking if an operator has sent a response to a task
 */
export class DatabaseManager {
  /**
   * Adds a dummy task to the database
   *
   * This method generates a set of random salesman points and adds them as a task
   *
   * @returns A promise that resolves to the added Task
   */
  static addDummyTask(): Promise<Task> {
    const input = DatabaseManager.generateRandomSalesmanPoints(10);

    return DatabaseManager.addTask(JSON.stringify(input));
  }

  /**
   * Adds a new task to the database
   *
   * @param input The input string for the task
   * @returns A promise that resolves to the created Task
   * @throws Will throw an error if the input is null or undefined
   * @throws Will throw an error if there is an issue inserting the task into the database
   */
  static addTask(input: string): Promise<Task> {
    return new Promise<Task>((resolve, reject) => {
      const db = DatabaseManager.getDatabase();

      if (input === null || input === undefined) {
        throw new Error("Input cannot be null or undefined");
      }

      const createdAt = Math.floor(Date.now());

      const task = new Task();
      task.createdAt = createdAt;
      task.input = input;

      db.serialize(() => {
        const stmt = db.prepare(
          "INSERT INTO task (status, createdAt, input) VALUES (?, ?, ?)",
        );

        stmt.run(Task.STATUS_READY, task.createdAt, task.input, function (err) {
          if (err) {
            throw new Error(`Error inserting task: ${err}`);
          }

          task.id = this.lastID;
        });

        stmt.finalize(() => {
          resolve(task);
        });
      });

      db.close();
    });
  }

  /**
   * Fetches the next unresolved task for a given operator
   *
   * @param operatorId The ID of the operator
   * @returns A promise that resolves to the next unresolved task or undefined if no task is found
   */
  static fetchNextUnresolvedTask(
    operatorId: number,
  ): Promise<Task | undefined> {
    return new Promise<Task | undefined>((resolve, reject) => {
      const db = DatabaseManager.getDatabase();

      db.serialize(() => {
        db.get(
          `
          SELECT t.* 
          FROM task t
          LEFT JOIN task_response tr ON t.id = tr.task_id AND tr.operator_id = ?
          WHERE t.status == ? AND tr.id IS NULL
          ORDER BY t.createdAt ASC 
          LIMIT 1
        `,
          operatorId,
          Task.STATUS_READY,
          (err, row) => {
            if (err) {
              throw new Error(`Error fetching task: ${err}`);
            }

            if (row == null) {
              resolve(undefined);
              return;
            }

            const task = new Task();
            task.id = row.id;
            task.createdAt = row.createdAt;
            task.input = row.input;

            resolve(task);
          },
        );
      });

      db.close();
    });
  }

  /**
   * Generates an array of random points representing salesmen locations
   * Each point is represented as a tuple [x, y] where x and y are random integers between 0 and 99
   *
   * @param length The number of points to generate
   * @returns An array of points, where each point is a tuple [x, y]
   */
  private static generateRandomSalesmanPoints(length: number): number[][] {
    const points: number[][] = [];

    for (let i = 0; i < length; i++) {
      const x = Math.floor(Math.random() * 100);
      const y = Math.floor(Math.random() * 100);
      points.push([x, y]);
    }

    return points;
  }

  /**
   * Retrieves a new instance of the SQLite3 database
   *
   * @returns A new instance of the SQLite3 database
   */
  private static getDatabase(): sqlite3.Database {
    return new sqlite3.Database(DatabaseManager.getDatabasePath());
  }

  /**
   * Retrieves the path to the database file
   *
   * @returns The full path to the database file as a string
   */
  private static getDatabasePath(): string {
    return CacheManager.getCacheDir() + "/db.sqlite";
  }

  /**
   * Retrieves a task from the database by its ID
   *
   * @param taskId The ID of the task to retrieve
   * @returns A promise that resolves to the task if found, or rejects with an error message if not found or if there is an error fetching the task
   */
  static getTask(taskId: number): Promise<Task> {
    return new Promise<Task>((resolve, reject) => {
      const db = DatabaseManager.getDatabase();

      db.serialize(() => {
        db.get("SELECT * FROM task WHERE id = ?", taskId, (err, row) => {
          if (err) {
            throw new Error(`Error fetching task: ${err}`);
          }

          if (row == null) {
            return reject(`Task with ID ${taskId} not found`);
          }

          const task = new Task();
          task.id = row.id;
          task.createdAt = row.createdAt;
          task.input = row.input;

          resolve(task);
        });
      });

      db.close();
    });
  }

  /**
   * Retrieves the responses for a given task from the database
   *
   * @param task The task for which to fetch responses
   * @returns A promise that resolves to an array of TaskResponse objects
   * @throws An error if there is an issue fetching the task responses from the database
   */
  static getTaskResponses(task: Task): Promise<TaskResponse[]> {
    return new Promise<TaskResponse[]>((resolve, reject) => {
      const db = DatabaseManager.getDatabase();

      db.serialize(() => {
        db.all(
          "SELECT * FROM task_response WHERE task_id = ?",
          task.id,
          (err, rows) => {
            if (err) {
              throw new Error(`Error fetching task responses: ${err}`);
            }

            if (rows == null) {
              reject();
              return;
            }

            const taskResponses: TaskResponse[] = [];

            rows.forEach((row) => {
              taskResponses.push(TaskResponse.buildFromDatabase(row));
            });

            resolve(taskResponses);
          },
        );
      });

      db.close();
    });
  }

  /**
   * Retrieves the count of responses for a given task from the database
   *
   * @param task The task for which to count responses
   * @returns A promise that resolves to the number of responses for the specified task
   * @throws An error if there is an issue fetching the task responses count
   */
  static getTaskResponsesCount(task: Task): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const db = DatabaseManager.getDatabase();

      db.serialize(() => {
        db.get(
          "SELECT COUNT(*) as count FROM task_response WHERE task_id = ?",
          task.id,
          (err, row) => {
            if (err) {
              throw new Error(`Error fetching task responses count: ${err}`);
            }

            if (row == null) {
              reject();
              return;
            }

            resolve(row.count);
          },
        );
      });

      db.close();
    });
  }

  /**
   * Handles the scenario where consensus is not reached for a given task
   *
   * This method updates the status of the task in the database to indicate that consensus was not reached
   *
   * @param task The task for which consensus was not reached
   * @returns A promise that resolves to the updated task
   * @throws An error if there is an issue updating the task status in the database
   */
  static handleConsensusNotReached(task: Task): Promise<Task> {
    return new Promise<Task>((resolve, reject) => {
      const db = DatabaseManager.getDatabase();

      db.serialize(() => {
        db.run(
          "UPDATE task SET status = ? WHERE id = ?",
          Task.STATUS_CONSENSUS_NOT_REACHED,
          task.id,
          (err) => {
            if (err) {
              throw new Error(`Error updating task status: ${err}`);
            }

            resolve(task);
          },
        );
      });

      db.close();
    });
  }

  /**
   * Checks if an operator has sent a response to a specific task
   *
   * @param task The task for which the response is being checked
   * @param operatorId The ID of the operator
   * @returns A promise that resolves to true if the operator has sent a response, otherwise false
   */
  static operatorSentTaskResponse(
    task: Task,
    operatorId: number,
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const db = DatabaseManager.getDatabase();

      db.serialize(() => {
        db.get(
          "SELECT * FROM task_response WHERE task_id = ? AND operator_id = ?",
          task.id,
          operatorId,
          (err, row) => {
            if (err) {
              throw new Error(`Error fetching task response: ${err}`);
            }

            if (row == null) {
              resolve(false);
              return;
            }

            resolve(true);
          },
        );
      });

      db.close();
    });
  }

  /**
   * Registers the final response for a given task in the database
   *
   * @param task The task object for which the response is being registered
   * @param response The response value to be registered
   * @returns A promise that resolves to the updated task object
   * @throws Will throw an error if there is an issue updating the task response in the database
   */
  static registerFinalTaskResponse(
    task: Task,
    response: number,
  ): Promise<Task> {
    return new Promise<Task>((resolve, reject) => {
      const db = DatabaseManager.getDatabase();

      db.serialize(() => {
        db.run(
          "UPDATE task SET response = ?, status = ? WHERE id = ?",
          response,
          Task.STATUS_COMPLETED,
          task.id,
          (err) => {
            if (err) {
              throw new Error(`Error updating task response: ${err}`);
            }

            task.response = response;
            resolve(task);
          },
        );
      });

      db.close();
    });
  }

  /**
   * Registers a response from an operator for a given task
   *
   * @param task The task for which the response is being registered
   * @param operatorId The ID of the operator sending the response
   * @param response The response content from the operator
   * @param signature The signature of the operator for the response
   * @returns A promise that resolves when the response is successfully registered or rejects with an error message
   */
  static registerOperatorTaskResponse(
    task: Task,
    operatorId: number,
    response: string,
    signature: string,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const db = DatabaseManager.getDatabase();

      DatabaseManager.operatorSentTaskResponse(task, operatorId).then(
        (operatorSentResponse: boolean) => {
          if (operatorSentResponse) {
            return reject("Operator already sent response");
          }

          db.serialize(() => {
            const stmt = db.prepare(
              "INSERT INTO task_response (task_id, operator_id, response, createdAt, signature) VALUES (?, ?, ?, ?, ?)",
            );

            stmt.run(
              task.id,
              operatorId,
              response,
              Math.floor(Date.now()),
              signature,
              (err) => {
                if (err) {
                  throw new Error(`Error inserting task response: ${err}`);
                }

                resolve();
              },
            );

            stmt.finalize();
          });

          db.close();
        },
      );
    });
  }

  /**
   * Resets the database by deleting the existing database file and creating a new one with the necessary tables
   *
   * @param logger The logger instance used to log information during the reset process
   * @returns A promise that resolves when the database has been successfully reset or rejects if an error occurs
   */
  static resetDatabase(logger: Logger): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      logger.info("Start Resetting Database");

      const dbPath = DatabaseManager.getDatabasePath();

      // Delete the database file if it exists
      if (fs.existsSync(dbPath)) {
        logger.info("Deleting cached database...");
        fs.unlinkSync(dbPath);
      }

      // Create the database file
      const db = DatabaseManager.getDatabase();

      // Create Tables
      logger.info("Creating tables...");

      db.serialize(() => {
        db.exec(
          `
          BEGIN TRANSACTION;
          
          PRAGMA foreign_keys = ON;

          CREATE TABLE IF NOT EXISTS task (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            status TEXT NOT NULL DEFAULT '${Task.STATUS_READY}',
            createdAt INTEGER NOT NULL,
            input TEXT NOT NULL,
            response INTEGER NULL
          );

          
          CREATE TABLE task_response (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            operator_id INTEGER NOT NULL,
            response INTEGER NOT NULL,
            signature TEXT NOT NULL DEFAULT '',
            createdAt INTEGER NOT NULL,
            FOREIGN KEY (task_id) REFERENCES task(id),
            UNIQUE (task_id, operator_id)
          );

        COMMIT;
        `,
          (err) => {
            if (err) {
              db.exec("ROLLBACK"); // Rollback if there’s an error
              return reject(err);
            }

            db.close();
            resolve();
          },
        );
      });
    });
  }
}
