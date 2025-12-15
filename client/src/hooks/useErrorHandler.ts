/**
 * Error Handling Hooks
 *
 * React hooks for handling errors with automatic toast notifications
 * and proper error classification.
 */

import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui';
import {
  AppError,
  handleApiError,
  logError,
  shouldRetry,
  getRetryDelay,
  type RetryConfig,
} from '@/lib/errors';

// ============================================================================
// useErrorHandler Hook
// ============================================================================

interface UseErrorHandlerOptions {
  showToast?: boolean;
  logToStorage?: boolean;
  onAuthError?: (error: AppError) => void;
  context?: Record<string, unknown>;
}

interface ErrorHandlerResult {
  error: AppError | null;
  isError: boolean;
  handleError: (error: unknown) => AppError;
  clearError: () => void;
}

/**
 * Hook for handling errors with automatic toast notifications
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}): ErrorHandlerResult {
  const { showToast = true, logToStorage = true, onAuthError, context } = options;
  const toast = useToast();
  const [error, setError] = useState<AppError | null>(null);

  const handleError = useCallback(
    (err: unknown): AppError => {
      const appError = handleApiError(err);

      // Log error
      if (logToStorage) {
        logError(appError, context);
      }

      // Set error state
      setError(appError);

      // Handle auth errors
      if (appError.isAuth && onAuthError) {
        onAuthError(appError);
      }

      // Show toast notification
      if (showToast) {
        if (appError.isServer) {
          toast.error('Server Error', appError.userMessage);
        } else if (appError.isValidation) {
          toast.warning('Validation Error', appError.userMessage);
        } else if (appError.isAuth) {
          toast.error('Authentication Error', appError.userMessage);
        } else if (appError.isBusiness) {
          toast.warning('Unable to Complete', appError.userMessage);
        } else {
          toast.error('Error', appError.userMessage);
        }
      }

      return appError;
    },
    [showToast, logToStorage, onAuthError, context, toast]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    isError: error !== null,
    handleError,
    clearError,
  };
}

// ============================================================================
// useAsyncHandler Hook
// ============================================================================

interface UseAsyncHandlerOptions<T> extends UseErrorHandlerOptions {
  onSuccess?: (data: T) => void;
  retry?: RetryConfig;
}

interface AsyncHandlerState<T> {
  data: T | null;
  error: AppError | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}

interface AsyncHandlerResult<T> extends AsyncHandlerState<T> {
  execute: () => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook for handling async operations with loading state and error handling
 */
export function useAsyncHandler<T>(
  asyncFn: () => Promise<T>,
  options: UseAsyncHandlerOptions<T> = {}
): AsyncHandlerResult<T> {
  const { onSuccess, retry, ...errorOptions } = options;
  const { handleError, clearError } = useErrorHandler(errorOptions);
  const toast = useToast();

  const [state, setState] = useState<AsyncHandlerState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
  });

  const execute = useCallback(async (): Promise<T | null> => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      isError: false,
      error: null,
    }));

    let attempt = 0;

    const attemptRequest = async (): Promise<T | null> => {
      try {
        const data = await asyncFn();
        setState({
          data,
          error: null,
          isLoading: false,
          isError: false,
          isSuccess: true,
        });
        onSuccess?.(data);
        return data;
      } catch (err) {
        const appError = handleApiError(err);

        // Check if we should retry
        if (retry && shouldRetry(appError, attempt, retry)) {
          attempt++;
          const delay = getRetryDelay(attempt, retry);
          toast.info('Retrying...', `Attempt ${attempt + 1} in ${delay / 1000}s`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return attemptRequest();
        }

        // Final error
        const finalError = handleError(err);
        setState({
          data: null,
          error: finalError,
          isLoading: false,
          isError: true,
          isSuccess: false,
        });
        return null;
      }
    };

    return attemptRequest();
  }, [asyncFn, handleError, onSuccess, retry, toast]);

  const reset = useCallback(() => {
    clearError();
    setState({
      data: null,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
    });
  }, [clearError]);

  return {
    ...state,
    execute,
    reset,
  };
}

// ============================================================================
// useFormErrorHandler Hook
// ============================================================================

interface FormErrors {
  [field: string]: string | undefined;
}

interface UseFormErrorHandlerResult {
  fieldErrors: FormErrors;
  generalError: string | null;
  handleFormError: (error: unknown) => void;
  setFieldError: (field: string, message: string) => void;
  clearFieldError: (field: string) => void;
  clearAllErrors: () => void;
  hasErrors: boolean;
}

/**
 * Hook for handling form validation errors
 */
export function useFormErrorHandler(): UseFormErrorHandlerResult {
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleFormError = useCallback((err: unknown) => {
    const appError = handleApiError(err);

    if (appError.isValidation && appError.fields) {
      // Set field-level errors
      const errors: FormErrors = {};
      appError.fields.forEach((field) => {
        errors[field.field] = field.message;
      });
      setFieldErrors(errors);
      setGeneralError(null);
    } else {
      // Set general error
      setFieldErrors({});
      setGeneralError(appError.userMessage);
    }

    logError(appError, { type: 'form_error' });
  }, []);

  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setFieldErrors({});
    setGeneralError(null);
  }, []);

  const hasErrors = Object.keys(fieldErrors).length > 0 || generalError !== null;

  return {
    fieldErrors,
    generalError,
    handleFormError,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    hasErrors,
  };
}

// ============================================================================
// useRetry Hook
// ============================================================================

interface UseRetryResult {
  attempt: number;
  canRetry: boolean;
  retry: () => void;
  reset: () => void;
}

/**
 * Hook for managing retry logic
 */
export function useRetry(
  maxRetries: number = 3,
  onRetry?: (attempt: number) => void
): UseRetryResult {
  const [attempt, setAttempt] = useState(0);

  const canRetry = attempt < maxRetries;

  const retry = useCallback(() => {
    if (canRetry) {
      const nextAttempt = attempt + 1;
      setAttempt(nextAttempt);
      onRetry?.(nextAttempt);
    }
  }, [attempt, canRetry, onRetry]);

  const reset = useCallback(() => {
    setAttempt(0);
  }, []);

  return {
    attempt,
    canRetry,
    retry,
    reset,
  };
}
