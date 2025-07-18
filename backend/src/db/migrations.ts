import fs from 'fs';
import path from 'path';
import { supabase } from './client';

/** Path to the migrations directory */
const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

/**
 * Apply all SQL migrations located in the migrations directory.  Each file
 * should be idempotent so running this function repeatedly keeps the schema
 * in sync without additional tracking tables.
 */
export async function applyMigrations(): Promise<void> {
  const logPath = path.resolve(__dirname, '../..', 'logs', 'SCHEMA_CHANGES.md');

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const { error } = await supabase.rpc('execute_sql', { sql });
    if (error) {
      throw new Error(`Failed to apply migration ${file}: ${error.message}`);
    }

    fs.appendFileSync(
      logPath,
      `- ${new Date().toISOString()}: applied ${file}\n`
    );
  }
}
