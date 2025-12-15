/**
 * Error Handling Library
 *
 * Provides comprehensive error classification, handling utilities,
 * and user-friendly error messages aligned with backend error codes.
 */

// ============================================================================
// Error Codes (matching backend)
// ============================================================================

export type ErrorCode =
  // Client errors (4xx)
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNPROCESSABLE_ENTITY'
  // Server errors (5xx)
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'TIMEOUT'
  // Business logic errors
  | 'INSUFFICIENT_FUNDS'
  | 'CREDIT_DENIED'
  | 'INVENTORY_UNAVAILABLE'
  | 'DEAL_EXPIRED'
  | 'DUPLICATE_ENTRY'
  | 'INVALID_STATE'
  // Unknown
  | 'UNKNOWN_ERROR';

// ============================================================================
// Field Error Type
// ============================================================================

export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

// ============================================================================
// API Error Response Interface
// ============================================================================

export interface APIErrorResponse {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  fields?: FieldError[];
  request_id?: string;
  timestamp?: string;
  path?: string;
}

// ============================================================================
// Application Error Class
// ============================================================================

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly fields?: FieldError[];
  public readonly requestId?: string;
  public readonly timestamp: Date;
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    code: ErrorCode = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    options?: {
      details?: Record<string, unknown>;
      fields?: FieldError[];
      requestId?: string;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = options?.details;
    this.fields = options?.fields;
    this.requestId = options?.requestId;
    this.timestamp = new Date();
    this.isRetryable = this.determineRetryable();

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  private determineRetryable(): boolean {
    // Server errors and timeouts are generally retryable
    const retryableCodes: ErrorCode[] = [
      'INTERNAL_ERROR',
      'SERVICE_UNAVAILABLE',
      'DATABASE_ERROR',
      'EXTERNAL_SERVICE_ERROR',
      'TIMEOUT',
      'TOO_MANY_REQUESTS',
    ];
    return retryableCodes.includes(this.code);
  }

  // ============================================================================
  // Error Type Checks
  // ============================================================================

  get isValidation(): boolean {
    return this.code === 'VALIDATION_ERROR';
  }

  get isAuth(): boolean {
    return this.code === 'UNAUTHORIZED' || this.code === 'FORBIDDEN';
  }

  get isNotFound(): boolean {
    return this.code === 'NOT_FOUND';
  }

  get isServer(): boolean {
    return this.statusCode >= 500;
  }

  get isClient(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  get isBusiness(): boolean {
    const businessCodes: ErrorCode[] = [
      'INSUFFICIENT_FUNDS',
      'CREDIT_DENIED',
      'INVENTORY_UNAVAILABLE',
      'DEAL_EXPIRED',
      'DUPLICATE_ENTRY',
      'INVALID_STATE',
    ];
    return businessCodes.includes(this.code);
  }

  // ============================================================================
  // User-Friendly Message
  // ============================================================================

  get userMessage(): string {
    return getUserFriendlyMessage(this.code, this.message);
  }

  // ============================================================================
  // Serialization
  // ============================================================================

  toJSON(): APIErrorResponse {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      fields: this.fields,
      request_id: this.requestId,
      timestamp: this.timestamp.toISOString(),
    };
  }

  // ============================================================================
  // Static Factory Methods
  // ============================================================================

  static fromAPIResponse(response: APIErrorResponse, statusCode: number): AppError {
    return new AppError(response.message, response.code, statusCode, {
      details: response.details,
      fields: response.fields,
      requestId: response.request_id,
    });
  }

  static validation(message: string, fields?: FieldError[]): AppError {
    return new AppError(message, 'VALIDATION_ERROR', 400, { fields });
  }

  static unauthorized(message: string = 'Authentication required'): AppError {
    return new AppError(message, 'UNAUTHORIZED', 401);
  }

  static forbidden(message: string = 'Access denied'): AppError {
    return new AppError(message, 'FORBIDDEN', 403);
  }

  static notFound(resource: string = 'Resource'): AppError {
    return new AppError(`${resource} not found`, 'NOT_FOUND', 404);
  }

  static conflict(message: string): AppError {
    return new AppError(message, 'CONFLICT', 409);
  }

  static internal(message: string = 'An unexpected error occurred'): AppError {
    return new AppError(message, 'INTERNAL_ERROR', 500);
  }

  static timeout(message: string = 'Request timed out'): AppError {
    return new AppError(message, 'TIMEOUT', 504);
  }

  static networkError(): AppError {
    return new AppError('Network error - please check your connection', 'SERVICE_UNAVAILABLE', 0);
  }

  // ============================================================================
  // Type Guard
  // ============================================================================

  static isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
  }
}

// ============================================================================
// User-Friendly Messages
// ============================================================================

const userFriendlyMessages: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Please check your input and try again.',
  BAD_REQUEST: 'The request could not be processed. Please try again.',
  UNAUTHORIZED: 'Please sign in to continue.',
  FORBIDDEN: "You don't have permission to perform this action.",
  NOT_FOUND: 'The requested item could not be found.',
  METHOD_NOT_ALLOWED: 'This action is not allowed.',
  CONFLICT: 'This item already exists or conflicts with another item.',
  TOO_MANY_REQUESTS: 'Too many requests. Please wait a moment and try again.',
  PAYLOAD_TOO_LARGE: 'The uploaded file is too large.',
  UNPROCESSABLE_ENTITY: 'The request could not be processed.',
  INTERNAL_ERROR: 'Something went wrong on our end. Please try again later.',
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again later.',
  DATABASE_ERROR: 'A database error occurred. Please try again later.',
  EXTERNAL_SERVICE_ERROR: 'An external service is unavailable. Please try again later.',
  TIMEOUT: 'The request took too long. Please try again.',
  INSUFFICIENT_FUNDS: 'Insufficient funds for this transaction.',
  CREDIT_DENIED: 'Credit application was not approved.',
  INVENTORY_UNAVAILABLE: 'This vehicle is no longer available.',
  DEAL_EXPIRED: 'This deal has expired. Please create a new deal.',
  DUPLICATE_ENTRY: 'This item already exists.',
  INVALID_STATE: 'This action cannot be performed at this time.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

export function getUserFriendlyMessage(code: ErrorCode, fallbackMessage?: string): string {
  return userFriendlyMessages[code] || fallbackMessage || userFriendlyMessages.UNKNOWN_ERROR;
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Convert unknown error to AppError
 */
export function handleApiError(error: unknown): AppError {
  // Already an AppError
  if (AppError.isAppError(error)) {
    return error;
  }

  // Response object with JSON body
  if (error instanceof Response) {
    // This shouldn't happen as we parse responses, but handle it
    return new AppError(
      `Request failed with status ${error.status}`,
      mapStatusToCode(error.status),
      error.status
    );
  }

  // Standard Error
  if (error instanceof Error) {
    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return AppError.networkError();
    }

    // AbortError (request was cancelled)
    if (error.name === 'AbortError') {
      return new AppError('Request was cancelled', 'TIMEOUT', 0);
    }

    return new AppError(error.message, 'UNKNOWN_ERROR', 500);
  }

  // String error
  if (typeof error === 'string') {
    return new AppError(error, 'UNKNOWN_ERROR', 500);
  }

  // Object with message
  if (error && typeof error === 'object' && 'message' in error) {
    const errObj = error as { message: string; code?: ErrorCode; statusCode?: number };
    return new AppError(
      errObj.message,
      errObj.code || 'UNKNOWN_ERROR',
      errObj.statusCode || 500
    );
  }

  // Unknown error type
  return AppError.internal();
}

/**
 * Map HTTP status code to error code
 */
function mapStatusToCode(status: number): ErrorCode {
  const statusMap: Record<number, ErrorCode> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    405: 'METHOD_NOT_ALLOWED',
    409: 'CONFLICT',
    410: 'DEAL_EXPIRED',
    413: 'PAYLOAD_TOO_LARGE',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_ERROR',
    502: 'EXTERNAL_SERVICE_ERROR',
    503: 'SERVICE_UNAVAILABLE',
    504: 'TIMEOUT',
  };

  return statusMap[status] || (status >= 500 ? 'INTERNAL_ERROR' : 'UNKNOWN_ERROR');
}

// ============================================================================
// Error Logging
// ============================================================================

interface ErrorLogEntry {
  timestamp: string;
  code: ErrorCode;
  message: string;
  stack?: string;
  requestId?: string;
  context?: Record<string, unknown>;
}

const ERROR_LOG_KEY = 'autolytiq_error_log';
const MAX_ERROR_LOGS = 50;

/**
 * Log error to localStorage for debugging
 */
export function logError(error: AppError, context?: Record<string, unknown>): void {
  try {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      code: error.code,
      message: error.message,
      stack: error.stack,
      requestId: error.requestId,
      context,
    };

    // Get existing logs
    const existingLogs = JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || '[]') as ErrorLogEntry[];

    // Add new entry and limit size
    const updatedLogs = [entry, ...existingLogs].slice(0, MAX_ERROR_LOGS);

    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(updatedLogs));

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[AppError]', error.code, error.message, context);
    }
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Get error logs
 */
export function getErrorLogs(): ErrorLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || '[]') as ErrorLogEntry[];
  } catch {
    return [];
  }
}

/**
 * Clear error logs
 */
export function clearErrorLogs(): void {
  try {
    localStorage.removeItem(ERROR_LOG_KEY);
  } catch {
    // Silently fail
  }
}

// ============================================================================
// React Query Error Handler
// ============================================================================

/**
 * Global error handler for React Query
 */
export function queryErrorHandler(error: unknown): void {
  const appError = handleApiError(error);

  // Log the error
  logError(appError);

  // Handle auth errors globally
  if (appError.isAuth) {
    window.dispatchEvent(new CustomEvent('auth:error', { detail: appError }));
  }

  // Handle rate limiting
  if (appError.code === 'TOO_MANY_REQUESTS') {
    window.dispatchEvent(new CustomEvent('ratelimit:exceeded', { detail: appError }));
  }
}

// ============================================================================
// Retry Logic
// ============================================================================

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryCondition?: (error: AppError, attempt: number) => boolean;
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

/**
 * Calculate exponential backoff delay
 */
export function getRetryDelay(attempt: number, config: RetryConfig = defaultRetryConfig): number {
  const delay = config.baseDelay * Math.pow(2, attempt);
  return Math.min(delay, config.maxDelay);
}

/**
 * Determine if error should be retried
 */
export function shouldRetry(
  error: AppError,
  attempt: number,
  config: RetryConfig = defaultRetryConfig
): boolean {
  if (attempt >= config.maxRetries) {
    return false;
  }

  if (config.retryCondition) {
    return config.retryCondition(error, attempt);
  }

  return error.isRetryable;
}

// ============================================================================
// Async Error Handler
// ============================================================================

/**
 * Wrap async function with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const appError = handleApiError(error);
    logError(appError, context);
    throw appError;
  }
}
