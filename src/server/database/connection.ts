import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { appConfig } from '../config';

let db: Database | null = null;

/**
 * Initialize database connection
 */
export async function initializeDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  try {
    db = await open({
      filename: appConfig.database.path,
      driver: sqlite3.Database,
    });

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON');
    
    console.log(`[${new Date().toISOString()}] Database connected: ${appConfig.database.path}`);
    return db;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database connection failed:`, error);
    throw error;
  }
}

/**
 * Get database instance
 */
export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    console.log(`[${new Date().toISOString()}] Database connection closed`);
  }
}