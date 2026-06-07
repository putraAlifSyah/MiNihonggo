/**
 * Database initialisation module.
 *
 * - Opens (or creates) the SQLite database at data/nihongo.db
 * - Ensures the data/ directory exists
 * - Runs schema.sql on first launch (all CREATE TABLE IF NOT EXISTS)
 * - Enables WAL mode for better concurrent read performance
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Resolve paths relative to the project root (one level up from db/)
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'nihongo.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Ensure the data/ directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('[db] Created data/ directory');
}

// Open the database (creates the file if it doesn't exist)
const db = new Database(DB_PATH);

// Enable WAL mode — much better for concurrent reads while writing
db.pragma('journal_mode = WAL');

// Enable foreign key enforcement (SQLite has it OFF by default)
db.pragma('foreign_keys = ON');

// Read and execute the full schema (idempotent thanks to IF NOT EXISTS)
try {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
  console.log('[db] Schema applied successfully');
} catch (err) {
  console.error('[db] Failed to apply schema:', err.message);
  process.exit(1);
}

// Graceful shutdown — close DB when the process exits
process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));

module.exports = db;
