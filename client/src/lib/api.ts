/**
 * API Client
 *
 * Fetch wrapper with JWT token handling, error management, and type safety.
 * All API calls should go through this client.
 */

const API_BASE_URL = '/api';

/**
 * Standard API error response
 */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

/**
 * Custom error class for API errors
 */
export class ApiRequestError extends Error {
  public statusCode: number;
  public details?: Record<string, unknown>;

  constructor(message: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static isApiRequestError(error: unknown): error is ApiRequestError {
    return error instanceof ApiRequestError;
  }
}

/**
 * Token storage keys
 */
const TOKEN_KEY = 'autolytiq_access_token';
const REFRESH_TOKEN_KEY = 'autolytiq_refresh_token';

/**
 * Token management
 */
export const tokenStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  clearTokens(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  hasToken(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  },
};

/**
 * Parse JWT payload (without validation - validation is done server-side)
 */
export function parseJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as T;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired (with 5-minute buffer)
 */
export function isTokenExpired(token: string): boolean {
  const payload = parseJwtPayload<{ exp?: number }>(token);
  if (!payload?.exp) return true;

  const expirationTime = payload.exp * 1000;
  const bufferTime = 5 * 60 * 1000; // 5 minutes
  return Date.now() >= expirationTime - bufferTime;
}

/**
 * Request configuration
 */
interface RequestConfig extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
}

/**
 * Build request headers
 */
function buildHeaders(config: RequestConfig): Headers {
  const headers = new Headers(config.headers);

  // Set content type for JSON bodies
  if (config.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Add authorization header
  if (!config.skipAuth) {
    const token = tokenStorage.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return headers;
}

/**
 * Process response
 */
async function processResponse<T>(response: Response): Promise<T> {
  // Handle no content responses
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let details: Record<string, unknown> | undefined;

    if (isJson) {
      try {
        const errorBody = (await response.json()) as ApiError;
        errorMessage = errorBody.message || errorBody.error || errorMessage;
        details = errorBody.details;
      } catch {
        // Keep default error message
      }
    }

    throw new ApiRequestError(errorMessage, response.status, details);
  }

  if (isJson) {
    return response.json() as Promise<T>;
  }

  return response.text() as unknown as T;
}

/**
 * Core fetch wrapper
 */
async function request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const headers = buildHeaders(config);
  const body = config.body ? JSON.stringify(config.body) : undefined;

  const response = await fetch(url, {
    ...config,
    headers,
    body,
  });

  // Handle 401 - clear tokens and redirect to login
  if (response.status === 401) {
    tokenStorage.clearTokens();
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  return processResponse<T>(response);
}

/**
 * API client with typed methods
 */
export const api = {
  /**
   * GET request
   */
  get<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T> {
    return request<T>(endpoint, { ...config, method: 'GET' });
  },

  /**
   * POST request
   */
  post<T>(endpoint: string, body?: unknown, config?: Omit<RequestConfig, 'method'>): Promise<T> {
    return request<T>(endpoint, { ...config, method: 'POST', body });
  },

  /**
   * PUT request
   */
  put<T>(endpoint: string, body?: unknown, config?: Omit<RequestConfig, 'method'>): Promise<T> {
    return request<T>(endpoint, { ...config, method: 'PUT', body });
  },

  /**
   * PATCH request
   */
  patch<T>(endpoint: string, body?: unknown, config?: Omit<RequestConfig, 'method'>): Promise<T> {
    return request<T>(endpoint, { ...config, method: 'PATCH', body });
  },

  /**
   * DELETE request
   */
  delete<T>(endpoint: string, config?: Omit<RequestConfig, 'method'>): Promise<T> {
    return request<T>(endpoint, { ...config, method: 'DELETE' });
  },
};

/**
 * Type-safe query key factory
 */
export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
  },

  // Deals
  deals: {
    all: ['deals'] as const,
    lists: () => [...queryKeys.deals.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.deals.lists(), filters] as const,
    details: () => [...queryKeys.deals.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.deals.details(), id] as const,
  },

  // Customers
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.customers.lists(), filters] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
  },

  // Inventory
  inventory: {
    all: ['inventory'] as const,
    lists: () => [...queryKeys.inventory.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.inventory.lists(), filters] as const,
    details: () => [...queryKeys.inventory.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.inventory.details(), id] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },

  // Config
  config: {
    all: ['config'] as const,
    dealership: () => [...queryKeys.config.all, 'dealership'] as const,
  },
} as const;
