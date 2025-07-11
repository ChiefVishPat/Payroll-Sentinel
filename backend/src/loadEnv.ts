import * as dotenvFlow from 'dotenv-flow';
import path from 'path';
import fs from 'fs';

/**
 * Load environment variables for the backend.
 *
 * Attempts to load `.env` from either the project root or the `backend` folder
 * so developers can run commands from different locations.
 */
export function loadEnv(): void {
  const rootDir = path.resolve(__dirname, '../..');
  const backendDir = path.resolve(__dirname, '..');

  const envDir = fs.existsSync(path.join(backendDir, '.env')) ? backendDir : rootDir;

  dotenvFlow.config({ path: envDir });
}

// Auto-load when this module is imported for side effects
loadEnv();
