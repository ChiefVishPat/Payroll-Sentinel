import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Singleton database client for Supabase connection management
 * Provides a single point of access to the database with proper error handling
 */
class DatabaseClient {
  private static instance: DatabaseClient;
  private supabase: SupabaseClient<Database>;

  /**
   * Private constructor implementing singleton pattern
   * Initializes Supabase client with service role key for backend operations
   */
  private constructor() {
    const supabaseUrl: string | undefined = process.env.SUPABASE_URL;
    // Use service role key for backend operations
    const supabaseKey: string | undefined = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Validate required environment variables
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
      );
    }

    // Initialize Supabase client with backend-specific configuration
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false, // No token refresh needed for service role
        persistSession: false,   // No session persistence for backend
      },
    });
  }

  /**
   * Get the singleton instance of DatabaseClient
   * Creates instance on first call, returns existing instance thereafter
   * @returns DatabaseClient singleton instance
   */
  public static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  /**
   * Get the underlying Supabase client instance
   * @returns Typed Supabase client with Database schema
   */
  public getClient(): SupabaseClient<Database> {
    return this.supabase;
  }

  /**
   * Test database connection by attempting a lightweight query
   * Uses count query with head-only response to minimize data transfer
   * @returns Promise<boolean> - true if connection successful, false otherwise
   */
  public async testConnection(): Promise<boolean> {
    try {
      // Perform lightweight count query to test connection
      const { error } = await this.supabase
        .from('companies')
        .select('count', { count: 'exact', head: true });
      
      return !error; // Return true if no error occurred
    } catch (error) {
      // Log error for debugging but don't throw (graceful degradation)
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Enhanced connection test that provides detailed connection information
   * @returns Promise with connection status and details
   */
  public async getConnectionInfo(): Promise<{
    connected: boolean;
    url: string;
    error?: string;
    tableCount?: number;
  }> {
    const supabaseUrl = process.env.SUPABASE_URL || 'not-configured';
    
    try {
      // Test connection and get basic table count
      const { data, error } = await this.supabase
        .from('companies')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        return {
          connected: false,
          url: supabaseUrl,
          error: error.message,
        };
      }

      return {
        connected: true,
        url: supabaseUrl,
        tableCount: data?.length || 0,
      };
    } catch (error) {
      return {
        connected: false,
        url: supabaseUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance and client for application use
export const db = DatabaseClient.getInstance();
export const supabase = db.getClient();
