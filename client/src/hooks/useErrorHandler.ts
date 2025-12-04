import { useCallback, useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ApiError,
  ApiRequestError,
  ErrorCode,
  showErrorToast,
  isAuthError,
  isRetryableError,
  withRetry,
  parseApiError,
} from "@/lib/error-utils";

interface ErrorState {
  error: ApiError | null;
  isLoading: boolean;
  retryCount: number;
}

interface UseErrorHandlerOptions {
  onAuthError?: () => void;
  showToast?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  onError?: (error: ApiError) => void;
  redirectOnAuth?: string;
}

interface UseErrorHandlerReturn {
  error: ApiError | null;
  isLoading: boolean;
  retryCount: number;
  clearError: () => void;
  handleError: (error: unknown) => void;
  executeWithErrorHandling: <T>(
    fn: () => Promise<T>,
    options?: { showSuccessToast?: string }
  ) => Promise<T | null>;
  wrapMutation: <T, A extends unknown[]>(
    fn: (...args: A) => Promise<T>
  ) => (...args: A) => Promise<T | null>;
}

export function useErrorHandler(
  options: UseErrorHandlerOptions = {}
): UseErrorHandlerReturn {
  const {
    onAuthError,
    showToast = true,
    autoRetry = false,
    maxRetries = 2,
    onError,
    redirectOnAuth = "/login",
  } = options;

  const [state, setState] = useState<ErrorState>({
    error: null,
    isLoading: false,
    retryCount: 0,
  });

  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback((update: Partial<ErrorState>) => {
    if (mountedRef.current) {
      setState((prev) => ({ ...prev, ...update }));
    }
  }, []);

  const clearError = useCallback(() => {
    safeSetState({ error: null, retryCount: 0 });
  }, [safeSetState]);

  const handleError = useCallback(
    (error: unknown) => {
      let apiError: ApiError;

      if (error instanceof ApiRequestError) {
        apiError = error.apiError;
      } else if (error instanceof Error) {
        const isNetworkError =
          error.name === "NetworkError" ||
          error.message.toLowerCase().includes("network") ||
          error.message.toLowerCase().includes("fetch");

        apiError = {
          code: isNetworkError ? ErrorCode.NETWORK_ERROR : ErrorCode.INTERNAL_ERROR,
          message: error.message,
          category: "INTERNAL",
          timestamp: new Date().toISOString(),
          retryable: isNetworkError,
        };
      } else {
        apiError = {
          code: ErrorCode.INTERNAL_ERROR,
          message: "An unexpected error occurred",
          category: "INTERNAL",
          timestamp: new Date().toISOString(),
          retryable: false,
        };
      }

      safeSetState({ error: apiError });

      if (isAuthError(apiError)) {
        if (onAuthError) {
          onAuthError();
        } else if (redirectOnAuth) {
          queryClient.clear();
          setLocation(redirectOnAuth);
        }
      }

      if (showToast) {
        showErrorToast(apiError, {
          action: isRetryableError(apiError)
            ? {
                label: "Retry",
                onClick: clearError,
              }
            : undefined,
        });
      }

      onError?.(apiError);
    },
    [
      safeSetState,
      onAuthError,
      showToast,
      onError,
      clearError,
      queryClient,
      setLocation,
      redirectOnAuth,
    ]
  );

  const executeWithErrorHandling = useCallback(
    async <T>(
      fn: () => Promise<T>,
      execOptions?: { showSuccessToast?: string }
    ): Promise<T | null> => {
      safeSetState({ isLoading: true, error: null });

      try {
        const executor = autoRetry
          ? () =>
              withRetry(fn, {
                maxRetries,
                onRetry: (_, attempt) => {
                  safeSetState({ retryCount: attempt + 1 });
                },
              })
          : fn;

        const result = await executor();

        safeSetState({ isLoading: false, retryCount: 0 });

        if (execOptions?.showSuccessToast) {
          const { toast } = await import("sonner");
          toast.success(execOptions.showSuccessToast);
        }

        return result;
      } catch (error) {
        safeSetState({ isLoading: false });
        handleError(error);
        return null;
      }
    },
    [safeSetState, autoRetry, maxRetries, handleError]
  );

  const wrapMutation = useCallback(
    <T, A extends unknown[]>(fn: (...args: A) => Promise<T>) => {
      return async (...args: A): Promise<T | null> => {
        return executeWithErrorHandling(() => fn(...args));
      };
    },
    [executeWithErrorHandling]
  );

  return {
    error: state.error,
    isLoading: state.isLoading,
    retryCount: state.retryCount,
    clearError,
    handleError,
    executeWithErrorHandling,
    wrapMutation,
  };
}

export async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    const apiError = parseApiError(response, body);
    throw new ApiRequestError(response.status, apiError);
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json();
  }

  return response.text() as unknown as T;
}

export function createApiRequest(baseUrl = "") {
  return {
    async get<T>(path: string): Promise<T> {
      return fetchWithErrorHandling<T>(`${baseUrl}${path}`, {
        method: "GET",
      });
    },

    async post<T>(path: string, data?: unknown): Promise<T> {
      return fetchWithErrorHandling<T>(`${baseUrl}${path}`, {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
      });
    },

    async put<T>(path: string, data?: unknown): Promise<T> {
      return fetchWithErrorHandling<T>(`${baseUrl}${path}`, {
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
      });
    },

    async patch<T>(path: string, data?: unknown): Promise<T> {
      return fetchWithErrorHandling<T>(`${baseUrl}${path}`, {
        method: "PATCH",
        body: data ? JSON.stringify(data) : undefined,
      });
    },

    async delete<T>(path: string): Promise<T> {
      return fetchWithErrorHandling<T>(`${baseUrl}${path}`, {
        method: "DELETE",
      });
    },
  };
}

export const api = createApiRequest("/api");
