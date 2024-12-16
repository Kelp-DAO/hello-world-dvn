import * as fs from 'fs';
import * as sqlite3 from 'sqlite3';
import { CacheManager } from './CacheManager';

export class ResetDatabase {
  static reset() {
    const dbPath = CacheManager.getCacheDir() + '/db.sqlite';

    // Delete the database file if it exists
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    // Create the database file
    const db = new sqlite3.Database(dbPath);

    // Execute a couple of "CREATE" queries
    db.serialize(() => {
      db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)");
      db.run("CREATE TABLE tasks (id INTEGER PRIMARY KEY, description TEXT, userId INTEGER, FOREIGN KEY(userId) REFERENCES users(id))");
    });

    db.close();
  }
}
