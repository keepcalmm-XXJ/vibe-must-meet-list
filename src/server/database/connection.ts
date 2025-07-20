import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

// Database configuration
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'database', 'ai-social.db');

export interface DatabaseConnection {
  db: Database<sqlite3.Database, sqlite3.Statement>;
}

class DatabaseManager {
  private static instance: DatabaseManager;
  private db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public static resetInstance(): void {
    if (DatabaseManager.instance) {
      DatabaseManager.instance.db = null;
    }
    DatabaseManager.instance = new DatabaseManager();
  }

  public async connect(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
    if (this.db) {
      return this.db;
    }

    try {
      this.db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
      });

      // Enable foreign key constraints
      await this.db.exec('PRAGMA foreign_keys = ON');
      
      // Set journal mode to WAL for better concurrency
      await this.db.exec('PRAGMA journal_mode = WAL');
      
      // Set synchronous mode to NORMAL for better performance
      await this.db.exec('PRAGMA synchronous = NORMAL');

      console.log('Database connected successfully');
      return this.db;
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      console.log('Database connection closed');
    }
  }

  public getConnection(): Database<sqlite3.Database, sqlite3.Statement> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  public async isConnected(): Promise<boolean> {
    if (!this.db) {
      return false;
    }
    
    try {
      await this.db.get('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

export default DatabaseManager;