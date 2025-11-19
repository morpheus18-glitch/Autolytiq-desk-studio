import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = Response>(
  urlOrMethod: string,
  urlOrData?: string | unknown,
  data?: unknown | undefined,
): Promise<T> {
  // Support both old signature (method, url, data) and new signature (url, options)
  let method: string;
  let url: string;
  let body: unknown | undefined;

  if (typeof urlOrData === 'string') {
    // Old signature: apiRequest(method, url, data)
    method = urlOrMethod;
    url = urlOrData;
    body = data;
  } else if (urlOrData && typeof urlOrData === 'object' && 'method' in urlOrData) {
    // New signature: apiRequest(url, { method, body, headers })
    url = urlOrMethod;
    const options = urlOrData as { method?: string; body?: string; headers?: Record<string, string> };
    method = options.method || 'GET';
    body = options.body ? JSON.parse(options.body) : undefined;
  } else {
    // Simple GET: apiRequest(url)
    method = 'GET';
    url = urlOrMethod;
    body = urlOrData;
  }

  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);

  // If T is Response, return the raw response
  // Otherwise, parse JSON and return typed data
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await res.json() as T;
  }
  return res as unknown as T;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
