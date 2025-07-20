const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database configuration
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'ai-social.db');
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Migration tracking table
const MIGRATION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT UNIQUE NOT NULL,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

class DatabaseMigrator {
    constructor() {
        this.db = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    console.error('Error opening database:', err.message);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    resolve();
                }
            });
        });
    }

    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                        reject(err);
                    } else {
                        console.log('Database connection closed');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    async createMigrationTable() {
        return new Promise((resolve, reject) => {
            this.db.exec(MIGRATION_TABLE_SQL, (err) => {
                if (err) {
                    console.error('Error creating migration table:', err.message);
                    reject(err);
                } else {
                    console.log('Migration table ready');
                    resolve();
                }
            });
        });
    }

    async getExecutedMigrations() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT filename FROM migrations ORDER BY id', (err, rows) => {
                if (err) {
                    console.error('Error fetching executed migrations:', err.message);
                    reject(err);
                } else {
                    resolve(rows.map(row => row.filename));
                }
            });
        });
    }

    async executeMigration(filename, sql) {
        return new Promise((resolve, reject) => {
            this.db.exec(sql, (err) => {
                if (err) {
                    console.error(`Error executing migration ${filename}:`, err.message);
                    reject(err);
                } else {
                    // Record the migration as executed
                    this.db.run('INSERT INTO migrations (filename) VALUES (?)', [filename], (err) => {
                        if (err) {
                            console.error(`Error recording migration ${filename}:`, err.message);
                            reject(err);
                        } else {
                            console.log(`✓ Migration ${filename} executed successfully`);
                            resolve();
                        }
                    });
                }
            });
        });
    }

    async runMigrations() {
        try {
            await this.connect();
            await this.createMigrationTable();

            // Get list of executed migrations
            const executedMigrations = await this.getExecutedMigrations();
            console.log('Previously executed migrations:', executedMigrations);

            // Get all migration files
            const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
                .filter(file => file.endsWith('.sql'))
                .sort();

            console.log('Available migration files:', migrationFiles);

            // Execute pending migrations
            let executedCount = 0;
            for (const filename of migrationFiles) {
                if (!executedMigrations.includes(filename)) {
                    const filePath = path.join(MIGRATIONS_DIR, filename);
                    const sql = fs.readFileSync(filePath, 'utf8');
                    
                    console.log(`Executing migration: ${filename}`);
                    await this.executeMigration(filename, sql);
                    executedCount++;
                }
            }

            if (executedCount === 0) {
                console.log('No pending migrations to execute');
            } else {
                console.log(`Successfully executed ${executedCount} migration(s)`);
            }

        } catch (error) {
            console.error('Migration failed:', error);
            throw error;
        } finally {
            await this.close();
        }
    }
}

// Run migrations if this script is executed directly
if (require.main === module) {
    const migrator = new DatabaseMigrator();
    migrator.runMigrations()
        .then(() => {
            console.log('Database migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Database migration failed:', error);
            process.exit(1);
        });
}

module.exports = DatabaseMigrator;