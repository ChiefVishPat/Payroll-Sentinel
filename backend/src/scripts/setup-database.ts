/**
 * backend/src/scripts/setup-database.ts
 *
 * One-shot script: reads SQL files in src/db/, executes them inside a single
 * transaction, and exits.  Run via:
 *
 *   npm run env:backend -- tsx backend/src/scripts/setup-database.ts
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function main() {
  /*──────────────────────────  ENV  ──────────────────────────*/
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL is missing in backend/.env');
  }

  /*───────────────────────  READ FILES  ──────────────────────*/
  const base = resolve(__dirname, '../db'); // → backend/src/db
  const schemaSql = await readFile(resolve(base, 'schema.sql'), 'utf8');

  // seed.sql is optional
  let seedSql = '';
  try {
    seedSql = await readFile(resolve(base, 'seed.sql'), 'utf8');
  } catch (_) {
    // no-op: seed file absent
  }

  /*──────────────────────  EXECUTE SQL  ──────────────────────*/
  const pool = new Pool({ connectionString: dbUrl });

  try {
    console.log('🏗  Applying schema & seed...');
    await pool.query('BEGIN');
    await pool.query(schemaSql);
    if (seedSql.trim()) await pool.query(seedSql);
    await pool.query('COMMIT');
    console.log('✅  Database ready!');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('💥  Setup failed, rolled back.');
    throw err;
  } finally {
    await pool.end();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
