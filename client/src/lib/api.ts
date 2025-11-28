/**
 * API Client
 *
 * Fetch wrapper with JWT token handling, error management, and type safety.
 * All API calls should go through this client.
 */

const API_BASE_URL = '/api/v1';

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

  // Showroom
  showroom: {
    all: ['showroom'] as const,
    visits: {
      all: () => [...queryKeys.showroom.all, 'visits'] as const,
      lists: () => [...queryKeys.showroom.visits.all(), 'list'] as const,
      list: (filters: Record<string, unknown>) =>
        [...queryKeys.showroom.visits.lists(), filters] as const,
      details: () => [...queryKeys.showroom.visits.all(), 'detail'] as const,
      detail: (id: string) => [...queryKeys.showroom.visits.details(), id] as const,
    },
    workflowConfig: () => [...queryKeys.showroom.all, 'workflowConfig'] as const,
  },

  // Messaging
  messaging: {
    all: ['messaging'] as const,
    conversations: {
      all: () => [...queryKeys.messaging.all, 'conversations'] as const,
      lists: () => [...queryKeys.messaging.conversations.all(), 'list'] as const,
      list: (filters: Record<string, unknown>) =>
        [...queryKeys.messaging.conversations.lists(), filters] as const,
      details: () => [...queryKeys.messaging.conversations.all(), 'detail'] as const,
      detail: (id: string) => [...queryKeys.messaging.conversations.details(), id] as const,
    },
    messages: {
      all: () => [...queryKeys.messaging.all, 'messages'] as const,
      lists: () => [...queryKeys.messaging.messages.all(), 'list'] as const,
      list: (conversationId: string, filters: Record<string, unknown>) =>
        [...queryKeys.messaging.messages.lists(), conversationId, filters] as const,
      details: () => [...queryKeys.messaging.messages.all(), 'detail'] as const,
      detail: (conversationId: string, messageId: string) =>
        [...queryKeys.messaging.messages.details(), conversationId, messageId] as const,
    },
  },

  // Settings
  settings: {
    all: ['settings'] as const,
    user: () => [...queryKeys.settings.all, 'user'] as const,
    userSection: (section: string) => [...queryKeys.settings.user(), section] as const,
    dealership: () => [...queryKeys.settings.all, 'dealership'] as const,
  },

  // Email
  email: {
    all: ['email'] as const,
    logs: {
      all: () => [...queryKeys.email.all, 'logs'] as const,
      lists: () => [...queryKeys.email.logs.all(), 'list'] as const,
      list: (filters: Record<string, unknown>) =>
        [...queryKeys.email.logs.lists(), filters] as const,
      details: () => [...queryKeys.email.logs.all(), 'detail'] as const,
      detail: (id: string) => [...queryKeys.email.logs.details(), id] as const,
    },
    templates: {
      all: () => [...queryKeys.email.all, 'templates'] as const,
      lists: () => [...queryKeys.email.templates.all(), 'list'] as const,
      list: (filters: Record<string, unknown>) =>
        [...queryKeys.email.templates.lists(), filters] as const,
      details: () => [...queryKeys.email.templates.all(), 'detail'] as const,
      detail: (id: string) => [...queryKeys.email.templates.details(), id] as const,
    },
    inbox: {
      all: () => [...queryKeys.email.all, 'inbox'] as const,
      lists: () => [...queryKeys.email.inbox.all(), 'list'] as const,
      list: (filters: Record<string, unknown>) =>
        [...queryKeys.email.inbox.lists(), filters] as const,
      details: () => [...queryKeys.email.inbox.all(), 'detail'] as const,
      detail: (id: string) => [...queryKeys.email.inbox.details(), id] as const,
    },
    drafts: {
      all: () => [...queryKeys.email.all, 'drafts'] as const,
      lists: () => [...queryKeys.email.drafts.all(), 'list'] as const,
      list: (filters: Record<string, unknown>) =>
        [...queryKeys.email.drafts.lists(), filters] as const,
      details: () => [...queryKeys.email.drafts.all(), 'detail'] as const,
      detail: (id: string) => [...queryKeys.email.drafts.details(), id] as const,
    },
    labels: {
      all: () => [...queryKeys.email.all, 'labels'] as const,
      lists: () => [...queryKeys.email.labels.all(), 'list'] as const,
      list: (filters: Record<string, unknown>) =>
        [...queryKeys.email.labels.lists(), filters] as const,
    },
    signatures: {
      all: () => [...queryKeys.email.all, 'signatures'] as const,
      lists: () => [...queryKeys.email.signatures.all(), 'list'] as const,
      list: (filters: Record<string, unknown>) =>
        [...queryKeys.email.signatures.lists(), filters] as const,
    },
    attachments: {
      all: () => [...queryKeys.email.all, 'attachments'] as const,
      lists: () => [...queryKeys.email.attachments.all(), 'list'] as const,
      list: (emailId: string) => [...queryKeys.email.attachments.lists(), emailId] as const,
      details: () => [...queryKeys.email.attachments.all(), 'detail'] as const,
      detail: (id: string) => [...queryKeys.email.attachments.details(), id] as const,
    },
  },
} as const;
