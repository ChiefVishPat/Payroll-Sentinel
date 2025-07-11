#!/usr/bin/env tsx

/**
 * Supabase Connection Verification Script
 * 
 * This script verifies your Supabase connection and helps diagnose any issues.
 * Run with: npm run verify-supabase
 */

import '../loadEnv.js';
import { db } from '../db/client';

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

/**
 * Print colored console messages
 * @param message - Message to print
 * @param color - Color code to use
 */
function printColored(message: string, color: string): void {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Print a section header
 * @param title - Section title
 */
function printSection(title: string): void {
  console.log(`\n${colors.bold}${colors.blue}=== ${title} ===${colors.reset}`);
}

/**
 * Main verification function that runs all tests
 */
async function verifySupabaseConnection(): Promise<void> {
  printColored(`${colors.bold}🔍 Supabase Connection Verification${colors.reset}`, colors.blue);
  printColored('This script will test your Supabase connection and configuration.\n', colors.reset);
  
  // Check environment variables
  printSection('Environment Variables Check');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
    printColored('❌ SUPABASE_URL: Not configured or using placeholder value', colors.red);
    printColored('\nPlease update your .env file with your real Supabase URL', colors.yellow);
    return;
  } else {
    printColored(`✅ SUPABASE_URL: ${supabaseUrl}`, colors.green);
  }
  
  if (!supabaseKey || supabaseKey === 'your_supabase_service_role_key') {
    printColored('❌ SUPABASE_SERVICE_ROLE_KEY: Not configured or using placeholder value', colors.red);
    printColored('\nPlease update your .env file with your real Supabase service role key', colors.yellow);
    return;
  } else {
    printColored(`✅ SUPABASE_SERVICE_ROLE_KEY: ${supabaseKey.substring(0, 10)}...`, colors.green);
  }
  
  // Test basic connection
  printSection('Basic Connection Test');
  
  try {
    const isConnected: boolean = await db.testConnection();
    
    if (isConnected) {
      printColored('✅ Basic connection test: PASSED', colors.green);
    } else {
      printColored('❌ Basic connection test: FAILED', colors.red);
      return;
    }
  } catch (error) {
    printColored(`❌ Basic connection test: ERROR - ${error}`, colors.red);
    return;
  }
  
  // Get detailed connection info
  printSection('Detailed Connection Information');
  
  try {
    const connectionInfo = await db.getConnectionInfo();
    
    console.log(`Connection Status: ${connectionInfo.connected ? 
      `${colors.green}✅ Connected${colors.reset}` : 
      `${colors.red}❌ Not Connected${colors.reset}`
    }`);
    
    console.log(`Database URL: ${colors.blue}${connectionInfo.url}${colors.reset}`);
    
    if (connectionInfo.error) {
      console.log(`Error: ${colors.red}${connectionInfo.error}${colors.reset}`);
    }
  } catch (error) {
    printColored(`❌ Failed to get connection info: ${error}`, colors.red);
  }
  
  // Test database schema
  printSection('Database Schema Check');
  
  const requiredTables: string[] = [
    'companies',
    'bank_accounts', 
    'payroll_runs',
    'balance_snapshots',
    'risk_assessments',
    'alerts'
  ];
  
  let allTablesExist = true;
  
  for (const tableName of requiredTables) {
    try {
      // Test if table exists by attempting a count query
      const { error } = await db.getClient()
        .from(tableName as any)
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        printColored(`❌ Table '${tableName}': ${error.message}`, colors.red);
        allTablesExist = false;
      } else {
        printColored(`✅ Table '${tableName}': Exists`, colors.green);
      }
    } catch (error) {
      printColored(`❌ Table '${tableName}': Error checking - ${error}`, colors.red);
      allTablesExist = false;
    }
  }
  
  // Final summary
  printSection('Verification Summary');
  
  if (allTablesExist) {
    printColored('🎉 All tests passed! Your Supabase connection is working perfectly.', colors.green);
    printColored('\nYou can now:', colors.reset);
    printColored('• Start the development server: npm run dev:backend', colors.reset);
    printColored('• Test the API endpoints with your Supabase data', colors.reset);
    printColored('• Visit http://localhost:3001/docs for API documentation', colors.reset);
  } else {
    printColored('⚠️  Database schema is not complete.', colors.yellow);
    printColored('Please run the SQL schema from backend/src/db/schema.sql in your Supabase SQL editor.', colors.reset);
  }
}

// Run the verification if this script is executed directly
if (require.main === module) {
  verifySupabaseConnection().catch((error) => {
    console.error('Verification script failed:', error);
    process.exit(1);
  });
}

export { verifySupabaseConnection };
