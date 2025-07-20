import DatabaseManager from '../../../src/server/database/connection';
import DatabaseMigrator from '../../../database/migrate';
import path from 'path';
import fs from 'fs';

// Use a separate test database
const TEST_DB_PATH = path.join(process.cwd(), 'database', 'test-ai-social.db');

export async function setupTestDatabase(): Promise<void> {
  // Remove existing test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  // Override the database path for testing
  process.env.DB_PATH = TEST_DB_PATH;

  // Run migrations
  const migrator = new DatabaseMigrator();
  await migrator.runMigrations();

  // Connect to database
  await DatabaseManager.getInstance().connect();
}

export async function teardownTestDatabase(): Promise<void> {
  await DatabaseManager.getInstance().close();
  
  // Clean up test database file
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
}