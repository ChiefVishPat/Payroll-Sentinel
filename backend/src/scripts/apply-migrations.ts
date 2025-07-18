#!/usr/bin/env tsx

/**
 * Apply latest database schema changes.
 * Usage: npm run migrate
 */
import '@backend/loadEnv';
import { applyMigrations } from '../db/migrations';

async function run(): Promise<void> {
  try {
    await applyMigrations();
    console.log('✅ Schema migrations applied');
  } catch (err) {
    console.error('❌ Failed to apply migrations', err);
    process.exit(1);
  }
}

run();
