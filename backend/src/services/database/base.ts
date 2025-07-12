import { SupabaseClient } from '@supabase/supabase-js';
import DatabaseService from '@backend/config/database';
import { ServiceResponse } from '@backend/services/base';

/**
 * Base database service class with common CRUD operations
 */
export abstract class BaseDatabaseService {
  protected db: SupabaseClient;

  constructor() {
    this.db = DatabaseService.getInstance().getClient();
  }

  /**
   * Execute a database query with error handling
   */
  protected async executeQuery<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    operationName: string
  ): Promise<ServiceResponse<T>> {
    try {
      const { data, error } = await operation();
      
      if (error) {
        console.error(`Database ${operationName} error:`, error);
        return {
          success: false,
          error: {
            message: error.message || `Database ${operationName} failed`,
            code: error.code || 'DB_ERROR',
            details: (error.details || error) as Record<string, unknown>,
            retryable: this.isRetryableError(error)
          }
        };
      }

      return {
        success: true,
        data: data as T,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date().toISOString(),
          service: 'database'
        }
      };
    } catch (error) {
      console.error(`Database ${operationName} exception:`, error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown database error',
          code: 'DB_EXCEPTION',
          details: error as Record<string, unknown>,
          retryable: false
        }
      };
    }
  }

  /**
   * Execute a paginated query
   */
  protected async executePaginatedQuery<T>(
    baseQuery: any,
    pagination: { page: number; limit: number },
    operationName: string
  ): Promise<ServiceResponse<{ items: T[]; total: number }>> {
    try {
      // Get total count
      const { count, error: countError } = await baseQuery
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        throw countError;
      }

      // Get paginated data
      const offset = (pagination.page - 1) * pagination.limit;
      const { data, error } = await baseQuery
        .select('*')
        .range(offset, offset + pagination.limit - 1);

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: {
          items: data || [],
          total: count || 0
        },
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date().toISOString(),
          service: 'database'
        }
      };
    } catch (error) {
      console.error(`Database ${operationName} error:`, error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : `Database ${operationName} failed`,
          code: 'DB_ERROR',
          details: error as Record<string, unknown>,
          retryable: this.isRetryableError(error)
        }
      };
    }
  }

  /**
   * Create a new record
   */
  protected async create<T>(
    tableName: string,
    data: Partial<T>,
    operationName?: string
  ): Promise<ServiceResponse<T>> {
    return this.executeQuery(
      async () => {
        const result = await this.db.from(tableName).insert(data).select().single();
        return result;
      },
      operationName || `create ${tableName}`
    );
  }

  /**
   * Update a record by ID
   */
  protected async update<T>(
    tableName: string,
    id: string,
    data: Partial<T>,
    operationName?: string
  ): Promise<ServiceResponse<T>> {
    return this.executeQuery(
      async () => {
        const result = await this.db.from(tableName).update(data).eq('id', id).select().single();
        return result;
      },
      operationName || `update ${tableName}`
    );
  }

  /**
   * Delete a record by ID
   */
  protected async delete(
    tableName: string,
    id: string,
    operationName?: string
  ): Promise<ServiceResponse<void>> {
    return this.executeQuery(
      async () => {
        const result = await this.db.from(tableName).delete().eq('id', id);
        return { data: undefined as any, error: result.error };
      },
      operationName || `delete ${tableName}`
    );
  }

  /**
   * Find a record by ID
   */
  protected async findById<T>(
    tableName: string,
    id: string,
    operationName?: string
  ): Promise<ServiceResponse<T | null>> {
    return this.executeQuery(
      async () => {
        const result = await this.db.from(tableName).select('*').eq('id', id).single();
        return result;
      },
      operationName || `find ${tableName} by id`
    );
  }

  /**
   * Find records with filters
   */
  protected async findMany<T>(
    tableName: string,
    filters: Record<string, any> = {},
    pagination?: { page: number; limit: number },
    operationName?: string
  ): Promise<ServiceResponse<T[] | { items: T[]; total: number }>> {
    const query = this.db.from(tableName).select('*');

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.eq(key, value);
      }
    });

    if (pagination) {
      return this.executePaginatedQuery<T>(
        query,
        pagination,
        operationName || `find ${tableName}`
      );
    }

    return this.executeQuery(
      async () => {
        const result = await query;
        return result;
      },
      operationName || `find ${tableName}`
    );
  }

  /**
   * Count records with filters
   */
  protected async count(
    tableName: string,
    filters: Record<string, any> = {},
    operationName?: string
  ): Promise<ServiceResponse<number>> {
    const query = this.db.from(tableName).select('*', { count: 'exact', head: true });

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.eq(key, value);
      }
    });

    return this.executeQuery(
      async () => {
        const { count, error } = await query;
        if (error) throw error;
        return { data: count, error: null };
      },
      operationName || `count ${tableName}`
    );
  }

  /**
   * Execute a raw SQL query
   */
  protected async executeRawQuery<T>(
    query: string,
    params: any[] = [],
    operationName?: string
  ): Promise<ServiceResponse<T>> {
    return this.executeQuery(
      async () => {
        const result = await this.db.rpc('execute_sql', { query, params });
        return result;
      },
      operationName || 'raw query'
    );
  }
  /**
   * Generate unique request ID
   */
  protected generateRequestId(): string {
    return `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if error is retryable
   */
  protected isRetryableError(error: any): boolean {
    if (!error) return false;
    
    // Network errors
    const networkErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];
    if (networkErrors.includes(error.code)) {
      return true;
    }
    
    // Database connection errors
    if (error.code === 'PGRST301' || error.code === 'PGRST302') {
      return true;
    }
    
    return false;
  }
}

export default BaseDatabaseService;
