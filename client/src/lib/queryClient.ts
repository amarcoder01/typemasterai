import { QueryClient, QueryFunction } from "@tanstack/react-query";

export class NetworkError extends Error {
  constructor(message: string = "Network connection lost") {
    super(message);
    this.name = "NetworkError";
  }
}

export class ServerError extends Error {
  status: number;
  
  constructor(status: number, message: string) {
    super(message);
    this.name = "ServerError";
    this.status = status;
  }
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();
    return (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('failed to fetch') ||
      message.includes('load failed') ||
      message.includes('networkerror')
    );
  }
  return error instanceof NetworkError;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new ServerError(res.status, `${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    if (isNetworkError(error)) {
      throw new NetworkError("Unable to connect. Please check your internet connection.");
    }
    throw error;
  }
}

export async function apiRequestWithRetry(
  method: string,
  url: string,
  data?: unknown,
  options: { maxRetries?: number; retryDelay?: number } = {}
): Promise<Response> {
  const { maxRetries = 2, retryDelay = 1000 } = options;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiRequest(method, url, data);
    } catch (error) {
      lastError = error as Error;
      
      if (!isNetworkError(error) || attempt === maxRetries) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }
  
  throw lastError;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      if (isNetworkError(error)) {
        throw new NetworkError("Unable to connect. Please check your internet connection.");
      }
      throw error;
    }
  };

function shouldRetryOnError(error: unknown): boolean {
  if (isNetworkError(error)) {
    return navigator.onLine;
  }
  
  if (error instanceof ServerError) {
    return error.status >= 500 && error.status < 600;
  }
  
  return false;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false;
        return shouldRetryOnError(error);
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      networkMode: 'online',
    },
    mutations: {
      retry: (failureCount, error) => {
        if (failureCount >= 1) return false;
        return shouldRetryOnError(error);
      },
      retryDelay: 1000,
      networkMode: 'online',
    },
  },
});

export { isNetworkError };
