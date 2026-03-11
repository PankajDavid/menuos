import { pool } from './pool.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  console.log('🔄 Running database migrations...');
  
  try {
    const schemaSQL = readFileSync(join(__dirname, 'migrations', 'schema.sql'), 'utf8');
    await pool.query(schemaSQL);
    console.log('✅ Database migrations completed');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { migrate };
