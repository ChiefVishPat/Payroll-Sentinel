import { FastifyRequest, FastifyReply } from 'fastify';
import { formatSuccessResponse, ApiError, ErrorType } from '../middleware/index.js';

/**
 * Generic route handler wrapper for consistent error handling and response formatting
 */
export const handleRoute = <T>(
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<T>
) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await handler(request, reply);
      const response = formatSuccessResponse(result, request.requestId || 'unknown');
      return reply.send(response);
    } catch (error) {
      // Let the global error handler deal with it
      throw error;
    }
  };
};

/**
 * Validation helper for request parameters
 */
export const validateRequired = (value: any, field: string): void => {
  if (value === undefined || value === null || value === '') {
    throw new ApiError(
      ErrorType.VALIDATION_ERROR,
      `Missing required field: ${field}`,
      400
    );
  }
};

/**
 * Validation helper for numeric values
 */
export const validateNumber = (value: any, field: string): number => {
  const num = Number(value);
  if (isNaN(num)) {
    throw new ApiError(
      ErrorType.VALIDATION_ERROR,
      `Invalid number for field: ${field}`,
      400
    );
  }
  return num;
};

/**
 * Validation helper for date values
 */
export const validateDate = (value: any, field: string): Date => {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new ApiError(
      ErrorType.VALIDATION_ERROR,
      `Invalid date for field: ${field}`,
      400
    );
  }
  return date;
};

/**
 * Validation helper for string values with length requirements
 */
export const validateString = (
  value: any,
  field: string,
  options: { minLength?: number; maxLength?: number } = {}
): string => {
  if (typeof value !== 'string') {
    throw new ApiError(
      ErrorType.VALIDATION_ERROR,
      `Field ${field} must be a string`,
      400
    );
  }
  
  if (options.minLength && value.length < options.minLength) {
    throw new ApiError(
      ErrorType.VALIDATION_ERROR,
      `Field ${field} must be at least ${options.minLength} characters long`,
      400
    );
  }
  
  if (options.maxLength && value.length > options.maxLength) {
    throw new ApiError(
      ErrorType.VALIDATION_ERROR,
      `Field ${field} must be at most ${options.maxLength} characters long`,
      400
    );
  }
  
  return value;
};

/**
 * Validation helper for email addresses
 */
export const validateEmail = (value: any, field: string): string => {
  const email = validateString(value, field);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(
      ErrorType.VALIDATION_ERROR,
      `Invalid email format for field: ${field}`,
      400
    );
  }
  return email;
};

/**
 * Validation helper for arrays
 */
export const validateArray = (value: any, field: string): any[] => {
  if (!Array.isArray(value)) {
    throw new ApiError(
      ErrorType.VALIDATION_ERROR,
      `Field ${field} must be an array`,
      400
    );
  }
  return value;
};

/**
 * Validation helper for boolean values
 */
export const validateBoolean = (value: any, field: string): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  
  throw new ApiError(
    ErrorType.VALIDATION_ERROR,
    `Field ${field} must be a boolean value`,
    400
  );
};

/**
 * Validation helper for enums
 */
export const validateEnum = <T extends string>(
  value: any,
  field: string,
  validValues: T[]
): T => {
  if (!validValues.includes(value)) {
    throw new ApiError(
      ErrorType.VALIDATION_ERROR,
      `Invalid value for field ${field}. Must be one of: ${validValues.join(', ')}`,
      400
    );
  }
  return value;
};

/**
 * Resolve a provided company identifier (UUID or company name) to a UUID
 */
// @ts-nocheck
export async function resolveCompanyId(value: any): Promise<string> {
  validateRequired(value, 'companyId');
  const raw = validateString(value, 'companyId');
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(raw)) {
    return raw;
  }
  // Lazy-load Supabase to avoid requiring DB config until used
  const { supabase } = await import('../db/client.js');
  const { data, error } = await supabase.from('companies').select('id').eq('name', raw).single();
  if (error || !data) {
    throw new ApiError(
      ErrorType.NOT_FOUND,
      `Company not found for provided companyId: ${raw}`,
      404
    );
  }
  return data.id;
}

/**
 * Pagination helper
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export const parsePagination = (query: any): PaginationParams => {
  const page = Math.max(1, parseInt(query.page || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20')));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
};

/**
 * Pagination response helper
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const formatPaginatedResponse = <T>(
  items: T[],
  total: number,
  pagination: PaginationParams
): PaginatedResponse<T> => {
  const totalPages = Math.ceil(total / pagination.limit);
  
  return {
    items,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1
    }
  };
};

/**
 * Query parameter helper for filtering
 */
export const parseFilters = (query: any): Record<string, any> => {
  const filters: Record<string, any> = {};
  
  // Common filter patterns
  if (query.startDate) {
    filters.startDate = validateDate(query.startDate, 'startDate');
  }
  
  if (query.endDate) {
    filters.endDate = validateDate(query.endDate, 'endDate');
  }
  
  if (query.status) {
    filters.status = validateString(query.status, 'status');
  }
  
  if (query.companyId) {
    filters.companyId = validateString(query.companyId, 'companyId');
  }
  
  return filters;
};

/**
 * Service error mapper - converts service errors to API errors
 */
export const mapServiceError = (error: any): ApiError => {
  if (error instanceof ApiError) {
    return error;
  }
  
  // Map common service errors
  if (error.message?.includes('not found')) {
    return new ApiError(
      ErrorType.NOT_FOUND,
      error.message,
      404
    );
  }
  
  if (error.message?.includes('unauthorized') || error.message?.includes('authentication')) {
    return new ApiError(
      ErrorType.AUTHENTICATION_ERROR,
      error.message,
      401
    );
  }
  
  if (error.message?.includes('forbidden') || error.message?.includes('permission')) {
    return new ApiError(
      ErrorType.AUTHORIZATION_ERROR,
      error.message,
      403
    );
  }
  
  if (error.message?.includes('validation') || error.message?.includes('invalid')) {
    return new ApiError(
      ErrorType.VALIDATION_ERROR,
      error.message,
      400
    );
  }
  
  // Default to external service error for unknown errors
  return new ApiError(
    ErrorType.EXTERNAL_SERVICE_ERROR,
    error.message || 'An external service error occurred',
    500,
    { originalError: error }
  );
};
// @ts-nocheck
