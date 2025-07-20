// Database migration script
const DatabaseMigrator = require('../database/migrate');

async function runMigrations() {
    try {
        console.log('Starting database migrations...');
        const migrator = new DatabaseMigrator();
        await migrator.runMigrations();
        console.log('Database migrations completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigrations();