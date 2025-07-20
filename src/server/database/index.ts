import DatabaseManager from './connection';

export { DatabaseManager };
export * from './repositories';

/**
 * Initialize database connection
 * Note: Run migrations separately using npm run db:migrate
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('Initializing database...');
    
    // Connect to database
    await DatabaseManager.getInstance().connect();
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  try {
    await DatabaseManager.getInstance().close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database:', error);
    throw error;
  }
}