/**
 * Error Handling Utilities
 * Provides type-safe error handling patterns for the entire application
 */

import type { AppError, ErrorDetails, ErrorCode } from '@shared/types';

/**
 * Type guard for Error instances
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard for AppError instances
 */
export function isAppError(error: unknown): error is AppError {
  return isError(error) && 'code' in error && 'statusCode' in error;
}

/**
 * Type guard for specific error code
 */
export function hasErrorCode(error: unknown, code: string): error is AppError {
  return isAppError(error) && error.code === code;
}

/**
 * Extract error message safely
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as Record<string, unknown>).message);
  }
  return 'An unknown error occurred';
}

/**
 * Extract error status code
 */
export function getErrorStatusCode(error: unknown): number {
  if (isAppError(error)) {
    return error.statusCode;
  }
  if (isError(error) && 'statusCode' in error) {
    const code = (error as Error & { statusCode?: number }).statusCode;
    return typeof code === 'number' ? code : 500;
  }
  return 500;
}

/**
 * Create a safe error response
 */
export function createErrorResponse(error: unknown): {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
} {
  if (isAppError(error)) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
  }

  return {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: getErrorMessage(error),
    },
  };
}

/**
 * Async error wrapper for Express handlers
 */
export function asyncHandler<T extends (...args: Parameters<T>) => Promise<unknown>>(
  fn: T
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...(args as Parameters<T>));
    } catch (error) {
      throw error;
    }
  }) as T;
}

/**
 * Safe JSON stringify that handles circular references
 */
export function safeStringify(obj: unknown, maxDepth = 5): string {
  const seen = new WeakSet<object>();

  function replacer(key: string, value: unknown, depth = 0): unknown {
    if (depth > maxDepth) {
      return '[Object - Max Depth]';
    }

    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }

    return value;
  }

  try {
    return JSON.stringify(obj, replacer as (key: string, value: unknown) => unknown);
  } catch {
    return String(obj);
  }
}

/**
 * Database error classifier
 */
export function isDatabaseError(error: unknown): boolean {
  if (!isError(error)) return false;

  const message = error.message.toLowerCase();
  const dbErrorPatterns = ['database', 'connection', 'query', 'sql', 'postgres', 'constraint'];

  return dbErrorPatterns.some((pattern) => message.includes(pattern)) ||
    ('code' in error && typeof (error as Record<string, unknown>).code === 'string');
}

/**
 * Validation error classifier
 */
export function isValidationError(error: unknown): boolean {
  if (!isError(error)) return false;

  return (
    error.message.toLowerCase().includes('validation') ||
    error.message.toLowerCase().includes('invalid') ||
    ('code' in error && (error as Record<string, unknown>).code === 'VALIDATION_ERROR')
  );
}

/**
 * Timeout error classifier
 */
export function isTimeoutError(error: unknown): boolean {
  if (!isError(error)) return false;

  const message = error.message.toLowerCase();
  return message.includes('timeout') || message.includes('timed out');
}

/**
 * Rate limit error classifier
 */
export function isRateLimitError(error: unknown): boolean {
  if (!isError(error)) return false;

  return (
    error.message.toLowerCase().includes('rate limit') ||
    ('code' in error && (error as Record<string, unknown>).code === 'RATE_LIMIT_EXCEEDED') ||
    ('statusCode' in error && (error as Record<string, unknown>).statusCode === 429)
  );
}

/**
 * Extract field-level validation errors
 */
export function getValidationErrors(error: unknown): Record<string, string> {
  const errors: Record<string, string> = {};

  if (isAppError(error) && error.details && typeof error.details === 'object') {
    for (const [key, value] of Object.entries(error.details)) {
      if (typeof value === 'string') {
        errors[key] = value;
      } else if (value && typeof value === 'object' && 'message' in value) {
        errors[key] = String((value as Record<string, unknown>).message);
      }
    }
  }

  return errors;
}

/**
 * Retry helper with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 100,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = isError(error) ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = Math.min(initialDelay * Math.pow(backoffMultiplier, attempt), maxDelay);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Promise timeout helper
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message = 'Operation timed out'
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
}

/**
 * Safe optional chain evaluation
 */
export function safeGet<T>(
  obj: unknown,
  path: string,
  defaultValue?: T
): T | undefined {
  try {
    const result = path.split('.').reduce((acc, part) => {
      if (acc && typeof acc === 'object' && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);

    return result as T | undefined;
  } catch {
    return defaultValue;
  }
}

/**
 * Type-safe error logging
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const message = getErrorMessage(error);
  const statusCode = getErrorStatusCode(error);

  const logEntry = {
    timestamp: new Date().toISOString(),
    message,
    statusCode,
    context,
    ...(isAppError(error) && { code: error.code }),
    ...(isError(error) && { stack: error.stack }),
  };

  console.error('[Error Log]', safeStringify(logEntry));
}
