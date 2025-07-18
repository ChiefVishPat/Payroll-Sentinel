#!/usr/bin/env tsx

/**
 * Apply latest database schema changes.
 * Usage: npm run migrate
 */
import '@backend/loadEnv';
import { applyMigrations } from '../db/migrations';

// Make PAT and project ref available to the Supabase CLI if present
if (process.env.SUPABASE_PAT && !process.env.SUPABASE_ACCESS_TOKEN) {
  process.env.SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_PAT;
}
if (process.env.SUPABASE_REF && !process.env.SUPABASE_PROJECT_REF) {
  process.env.SUPABASE_PROJECT_REF = process.env.SUPABASE_REF;
}

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
