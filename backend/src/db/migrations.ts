import fs from 'fs';
import path from 'path';
import { supabase } from './client';

/** Name of the table tracking applied migrations */
const MIGRATION_TABLE = 'schema_migrations';

/** Path to the migrations directory */
const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

/**
 * Apply pending SQL migrations in sequence. Each file is run only once and
 * recorded in the `schema_migrations` table. SQL files themselves should be
 * idempotent to safely re-run if needed.
 */
export async function applyMigrations(): Promise<void> {
  const logPath = path.resolve(__dirname, '../..', 'logs', 'SCHEMA_CHANGES.md');

  // ensure the migrations tracking table exists
  await supabase.rpc('execute_sql', {
    sql: `CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );`,
  });

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const { data: row, error: selectErr } = await supabase
      .from(MIGRATION_TABLE)
      .select('id')
      .eq('filename', file)
      .maybeSingle();

    if (selectErr) {
      throw new Error(`Failed to read migration table: ${selectErr.message}`);
    }

    // skip already applied migrations
    if (row) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const { error } = await supabase.rpc('execute_sql', { sql });
    if (error) {
      throw new Error(`Failed to apply migration ${file}: ${error.message}`);
    }

    await supabase.from(MIGRATION_TABLE).insert({ filename: file });
    fs.appendFileSync(
      logPath,
      `- ${new Date().toISOString()}: applied ${file}\n`
    );
  }
}
