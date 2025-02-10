import * as fs from "fs";
import * as sqlite3 from "sqlite3";
import { CacheManager } from "./CacheManager";

/**
 * The `ResetDatabase` class provides a static method to reset the database
 * by deleting the existing database file and creating a new one
 */
export class ResetDatabase {
  /**
   * Resets the database by deleting the existing database file and creating a new one
   *
   * This method performs the following steps:
   * 1. Deletes the existing database file if it exists
   * 2. Creates a new database file
   * 3. Executes SQL queries to create the necessary tables
   *
   * The tables created are:
   * - `users`: Stores user information with columns for id, name, and email
   * - `tasks`: Stores task information with columns for id, description, and userId, with a foreign key reference to the users table
   */
  static reset() {
    const dbPath = CacheManager.getCacheDir() + "/db.sqlite";

    // Delete the database file if it exists
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    // Create the database file
    const db = new sqlite3.Database(dbPath);

    // Execute a couple of "CREATE" queries
    db.serialize(() => {
      db.run(
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)",
      );
      db.run(
        "CREATE TABLE tasks (id INTEGER PRIMARY KEY, description TEXT, userId INTEGER, FOREIGN KEY(userId) REFERENCES users(id))",
      );
    });

    db.close();
  }
}
