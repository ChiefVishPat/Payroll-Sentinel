import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  url: string;
  anonKey: string;
  serviceKey?: string;
  environment: 'development' | 'staging' | 'production';
}

/**
 * Supabase client singleton
 */
class DatabaseService {
  private static instance: DatabaseService;
  private client: SupabaseClient;
  private config: DatabaseConfig;

  private constructor(config: DatabaseConfig) {
    this.config = config;
    this.client = createClient(config.url, config.anonKey);
  }

  public static getInstance(config?: DatabaseConfig): DatabaseService {
    if (!DatabaseService.instance) {
      if (!config) {
        throw new Error('Database configuration required for first initialization');
      }
      DatabaseService.instance = new DatabaseService(config);
    }
    return DatabaseService.instance;
  }

  public getClient(): SupabaseClient {
    return this.client;
  }

  public async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('companies')
        .select('id')
        .limit(1);
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "relation does not exist"
        console.error('Database connection test failed:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Database connection test error:', error);
      return false;
    }
  }

  public getConfig(): DatabaseConfig {
    return { ...this.config };
  }
}

/**
 * Initialize database connection
 */
export function initializeDatabase(): DatabaseService {
  const config: DatabaseConfig = {
    url: process.env.SUPABASE_URL || 'http://localhost:54321',
    anonKey: process.env.SUPABASE_ANON_KEY || 'mock-anon-key',
    ...(process.env.SUPABASE_SERVICE_KEY && { serviceKey: process.env.SUPABASE_SERVICE_KEY }),
    environment: (process.env.NODE_ENV as DatabaseConfig['environment']) || 'development'
  };

  return DatabaseService.getInstance(config);
}

export default DatabaseService;
