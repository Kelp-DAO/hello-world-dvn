import * as fs from 'fs';
import sqlite3 from 'sqlite3'
import { CacheManager } from './CacheManager';
import { Logger } from "pino";
import { Task } from './model/Task';
import { TaskResponse } from './model/TaskResponse';

export class DatabaseManager {
  /**
   * 
   * @returns 
   */
  private static getDatabasePath(): string {
    return CacheManager.getCacheDir() + '/db.sqlite';
  }

  /**
   * 
   * @returns 
   */
  private static getDatabase(): sqlite3.Database {
    return new sqlite3.Database(DatabaseManager.getDatabasePath());
  }

  /**
   * 
   */
  static resetDatabase(logger: Logger): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      logger.info('Start Resetting Database');

      const dbPath = DatabaseManager.getDatabasePath();
      
      // Delete the database file if it exists
      if (fs.existsSync(dbPath)) {
        logger.info('Deleting cached database...');
        fs.unlinkSync(dbPath);
      }
      
      // Create the database file
      const db = DatabaseManager.getDatabase();
      
      // Create Tables
      logger.info('Creating tables...');

      db.serialize(() => {
        db.exec(`
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
        `, (err) => {
          if (err) {
            db.exec('ROLLBACK'); // Rollback if there’s an error
            return reject(err);
          }

          db.close();
          resolve();
        });
      });
    });
  }

  /**
   * @param input 
   */
  static addDummyTask(): Promise<Task> {
    const input = DatabaseManager.generateRandomSalesmanPoints(10);

    return DatabaseManager.addTask(JSON.stringify(input));
  }

  /**
   * 
   * @param size 
   * @returns 
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
   * 
   * @param matrix 
   * @returns 
   */
  private static getRandomCoordinatesFromSquareMatrix(matrix) {
    const matrixSize = matrix.length; // Assuming a square matrix (n x n)

    // Generate a random row and column within the matrix bounds
    const row = Math.floor(Math.random() * matrixSize);
    const col = Math.floor(Math.random() * matrixSize);
  
    return [row, col]; // Return the random coordinate
  }

  /**
   * @param input 
   */
  static addTask(input: string): Promise<Task> {
    return new Promise<Task>((resolve, reject) => {
      const db = DatabaseManager.getDatabase();

      if (input === null || input === undefined) {
        throw new Error('Input cannot be null or undefined');
      }

      const createdAt = Math.floor(Date.now());

      const task = new Task();
      task.createdAt = createdAt;
      task.input = input;

      db.serialize(() => {
        const stmt = db.prepare("INSERT INTO task (status, createdAt, input) VALUES (?, ?, ?)");
        
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
    })
  }
  
  /**
   * 
   * @returns 
   */
  static fetchNextUnresolvedTask(operatorId: number): Promise<Task|undefined> {
    return new Promise<Task|undefined>((resolve, reject) => {
      const db = DatabaseManager.getDatabase();

      db.serialize(() => {
        db.get(`
          SELECT t.* 
          FROM task t
          LEFT JOIN task_response tr ON t.id = tr.task_id AND tr.operator_id = ?
          WHERE t.status == ? AND tr.id IS NULL
          ORDER BY t.createdAt ASC 
          LIMIT 1
        `, operatorId, Task.STATUS_READY, (err, row) => {
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
        });
      });

      db.close();
    });
  }

  /**
   * @todo verify signature
   * 
   * @param task 
   * @param operatorId 
   * @param response 
   * @returns 
   */
  static registerOperatorTaskResponse(task: Task, operatorId: number, response: string, signature: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const db = DatabaseManager.getDatabase();

      DatabaseManager.operatorSentTaskResponse(task, operatorId)
        .then((operatorSentResponse: boolean) => {
          if (operatorSentResponse)  {
            return reject('Operator already sent response');
          }

          db.serialize(() => {
            const stmt = db.prepare("INSERT INTO task_response (task_id, operator_id, response, createdAt, signature) VALUES (?, ?, ?, ?, ?)");
    
            stmt.run(task.id, operatorId, response, Math.floor(Date.now()), signature, (err) => {
              if (err) {
                throw new Error(`Error inserting task response: ${err}`);
              }
    
              resolve();
            });
    
            stmt.finalize();
          });
    
          db.close();
        })

    });
  };

  /**
   * 
   * @param task 
   * @param operatorId 
   * @param response 
   * @returns 
   */
  static operatorSentTaskResponse(task: Task, operatorId: number): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const db = DatabaseManager.getDatabase();

      db.serialize(() => {
        db.get("SELECT * FROM task_response WHERE task_id = ? AND operator_id = ?", task.id, operatorId, (err, row) => {
          if (err) {
            throw new Error(`Error fetching task response: ${err}`);
          }

          if (row == null) {
            resolve(false);
            return;
          }

          resolve(true);
        });
      });

      db.close();
    })
  }

  /**
   * 
   * @param taskId 
   * @returns 
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
            reject();
            return;
          }

          const task = new Task();
          task.id = row.id;
          task.createdAt = row.createdAt;
          task.input = row.input;

          resolve(task);
        });
      });

      db.close();
    })
  };

  /**
   * 
   * @param task 
   * @returns 
   */
  static getTaskResponsesCount(task: Task): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const db = DatabaseManager.getDatabase();

      db.serialize(() => {
        db.get("SELECT COUNT(*) as count FROM task_response WHERE task_id = ?", task.id, (err, row) => {
          if (err) {
            throw new Error(`Error fetching task responses count: ${err}`);
          }

          if (row == null) {
            reject();
            return;
          }

          resolve(row.count);
        });
      });

      db.close();
    })
  }

  /**
   * 
   * @param task 
   * @returns 
   */
  static getTaskResponses(task: Task): Promise<TaskResponse[]> {
    return new Promise<TaskResponse[]>((resolve, reject) => {
      const db = DatabaseManager.getDatabase();

      db.serialize(() => {
        db.all("SELECT * FROM task_response WHERE task_id = ?", task.id, (err, rows) => {
          if (err) {
            throw new Error(`Error fetching task responses: ${err}`);
          }

          if (rows == null) {
            reject();
            return;
          }

          const taskResponses: TaskResponse[] = [];

          rows.forEach(row => {
            taskResponses.push(TaskResponse.buildFromDatabase(row));
          });

          resolve(taskResponses);
        });
      });

      db.close();
    })
  }

  /**
   * 
   * @param task 
   * @param response 
   * @returns 
   */
  static registerFinalTaskResponse(task: Task, response: number): Promise<Task> {
    return new Promise<Task>((resolve, reject) => {
      const db = DatabaseManager.getDatabase();

      db.serialize(() => {
        db.run("UPDATE task SET response = ?, status = ? WHERE id = ?", response, Task.STATUS_COMPLETED, task.id, (err) => {
          if (err) {
            throw new Error(`Error updating task response: ${err}`);
          }

          task.response = response;
          resolve(task);
        });
      });

      db.close();
    });
  };

  /**
   * 
   * @param task 
   * @param response 
   * @returns 
   */
  static handleConsensusNotReached(task: Task): Promise<Task> {
    return new Promise<Task>((resolve, reject) => {
      const db = DatabaseManager.getDatabase();

      db.serialize(() => {
        db.run("UPDATE task SET status = ? WHERE id = ?", Task.STATUS_CONSENSUS_NOT_REACHED, task.id, (err) => {
          if (err) {
            throw new Error(`Error updating task status: ${err}`);
          }

          resolve(task);
        });
      });

      db.close();
    });
  };
}
