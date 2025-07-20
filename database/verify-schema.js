const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'ai-social.db');

function verifySchema() {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error('Error opening database:', err.message);
            return;
        }
        console.log('Connected to database for schema verification');
    });

    // Get all tables
    db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
        if (err) {
            console.error('Error fetching tables:', err.message);
            return;
        }

        console.log('\n=== Database Tables ===');
        tables.forEach(table => {
            console.log(`- ${table.name}`);
        });

        // Get all indexes
        db.all("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name", (err, indexes) => {
            if (err) {
                console.error('Error fetching indexes:', err.message);
                return;
            }

            console.log('\n=== Database Indexes ===');
            indexes.forEach(index => {
                console.log(`- ${index.name}`);
            });

            // Verify migrations table
            db.all("SELECT filename FROM migrations ORDER BY id", (err, migrations) => {
                if (err) {
                    console.error('Error fetching migrations:', err.message);
                    return;
                }

                console.log('\n=== Executed Migrations ===');
                migrations.forEach(migration => {
                    console.log(`- ${migration.filename}`);
                });

                console.log('\n✓ Database schema verification completed successfully');
                db.close();
            });
        });
    });
}

verifySchema();