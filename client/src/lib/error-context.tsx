import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { ApiError, ErrorCode, showErrorToast, isAuthError } from "./error-utils";
import { useLocation } from "wouter";

interface GlobalError {
  id: string;
  error: ApiError;
  timestamp: Date;
  dismissed: boolean;
}

interface ErrorContextValue {
  errors: GlobalError[];
  lastError: ApiError | null;
  hasErrors: boolean;
  addError: (error: ApiError) => void;
  clearError: (id: string) => void;
  clearAllErrors: () => void;
  dismissError: (id: string) => void;
  getErrorById: (id: string) => GlobalError | undefined;
  handleGlobalError: (error: unknown) => void;
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

const MAX_ERRORS = 50;

function generateErrorId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface ErrorProviderProps {
  children: ReactNode;
  onAuthError?: () => void;
  maxErrors?: number;
}

export function ErrorProvider({
  children,
  onAuthError,
  maxErrors = MAX_ERRORS,
}: ErrorProviderProps) {
  const [errors, setErrors] = useState<GlobalError[]>([]);
  const [, setLocation] = useLocation();

  const addError = useCallback((error: ApiError) => {
    const globalError: GlobalError = {
      id: generateErrorId(),
      error,
      timestamp: new Date(),
      dismissed: false,
    };

    setErrors((prev) => {
      const newErrors = [globalError, ...prev];
      if (newErrors.length > maxErrors) {
        return newErrors.slice(0, maxErrors);
      }
      return newErrors;
    });

    if (isAuthError(error)) {
      if (onAuthError) {
        onAuthError();
      } else {
        setLocation("/login");
      }
    }

    showErrorToast(error);
  }, [maxErrors, onAuthError, setLocation]);

  const clearError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const dismissError = useCallback((id: string) => {
    setErrors((prev) =>
      prev.map((e) => (e.id === id ? { ...e, dismissed: true } : e))
    );
  }, []);

  const getErrorById = useCallback(
    (id: string) => errors.find((e) => e.id === id),
    [errors]
  );

  const handleGlobalError = useCallback(
    (error: unknown) => {
      let apiError: ApiError;

      if (error instanceof Error) {
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
      } else if (typeof error === "object" && error !== null && "code" in error) {
        apiError = error as ApiError;
      } else {
        apiError = {
          code: ErrorCode.INTERNAL_ERROR,
          message: String(error),
          category: "INTERNAL",
          timestamp: new Date().toISOString(),
          retryable: false,
        };
      }

      addError(apiError);
    },
    [addError]
  );

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      handleGlobalError(event.reason);
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [handleGlobalError]);

  const lastError = errors.length > 0 ? errors[0].error : null;
  const hasErrors = errors.filter((e) => !e.dismissed).length > 0;

  const value: ErrorContextValue = {
    errors,
    lastError,
    hasErrors,
    addError,
    clearError,
    clearAllErrors,
    dismissError,
    getErrorById,
    handleGlobalError,
  };

  return (
    <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>
  );
}

export function useGlobalError(): ErrorContextValue {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error("useGlobalError must be used within an ErrorProvider");
  }
  return context;
}

export function useErrorReporting() {
  const { addError, clearAllErrors, errors } = useGlobalError();

  const reportError = useCallback(
    async (error: ApiError, additionalContext?: Record<string, unknown>) => {
      addError(error);

      if (process.env.NODE_ENV === "production") {
        try {
          await fetch("/api/error-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              error,
              context: additionalContext,
              timestamp: new Date().toISOString(),
              url: window.location.href,
              userAgent: navigator.userAgent,
            }),
          });
        } catch {
        }
      }
    },
    [addError]
  );

  const getErrorSummary = useCallback(() => {
    const summary: Record<string, number> = {};
    for (const { error } of errors) {
      summary[error.code] = (summary[error.code] || 0) + 1;
    }
    return summary;
  }, [errors]);

  return {
    reportError,
    clearAllErrors,
    getErrorSummary,
    errorCount: errors.length,
  };
}

export function ErrorDisplay() {
  const { errors, dismissError } = useGlobalError();
  const activeErrors = errors.filter((e) => !e.dismissed);

  if (activeErrors.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {activeErrors.slice(0, 3).map((globalError) => (
        <div
          key={globalError.id}
          className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 shadow-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-destructive">
                {globalError.error.message}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {globalError.timestamp.toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => dismissError(globalError.id)}
              className="text-muted-foreground hover:text-foreground"
              data-testid={`button-dismiss-error-${globalError.id}`}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
