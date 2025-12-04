import { toast } from "sonner";

export enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  TOKEN_INVALID = "TOKEN_INVALID",
  ACCESS_DENIED = "ACCESS_DENIED",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  DATABASE_ERROR = "DATABASE_ERROR",
  DATABASE_CONNECTION_ERROR = "DATABASE_CONNECTION_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  OAUTH_ERROR = "OAUTH_ERROR",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  DEVICE_MISMATCH = "DEVICE_MISMATCH",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  ACCOUNT_DISABLED = "ACCOUNT_DISABLED",
  EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED",
  AI_SERVICE_ERROR = "AI_SERVICE_ERROR",
  AI_QUOTA_EXCEEDED = "AI_QUOTA_EXCEEDED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  NETWORK_ERROR = "NETWORK_ERROR",
}

export interface ErrorDetail {
  field?: string;
  constraint?: string;
  expected?: string;
  received?: string;
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  category: string;
  details?: ErrorDetail[];
  timestamp: string;
  requestId?: string;
  retryable: boolean;
  retryAfter?: number;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

const USER_FRIENDLY_MESSAGES: Partial<Record<ErrorCode, string>> = {
  [ErrorCode.VALIDATION_ERROR]: "Please check your input and try again.",
  [ErrorCode.AUTHENTICATION_REQUIRED]: "Please sign in to continue.",
  [ErrorCode.INVALID_CREDENTIALS]: "Incorrect email or password.",
  [ErrorCode.TOKEN_EXPIRED]: "Your session has expired. Please sign in again.",
  [ErrorCode.ACCESS_DENIED]: "You don't have permission to do this.",
  [ErrorCode.RESOURCE_NOT_FOUND]: "The requested item was not found.",
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: "This item already exists.",
  [ErrorCode.RATE_LIMIT_EXCEEDED]: "Too many requests. Please wait a moment.",
  [ErrorCode.DATABASE_CONNECTION_ERROR]: "Connection issue. Please try again.",
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: "A service is temporarily unavailable.",
  [ErrorCode.SESSION_EXPIRED]: "Your session has expired. Please sign in again.",
  [ErrorCode.DEVICE_MISMATCH]: "Sign-in detected from a different device.",
  [ErrorCode.ACCOUNT_LOCKED]: "Your account has been temporarily locked.",
  [ErrorCode.ACCOUNT_DISABLED]: "Your account is disabled.",
  [ErrorCode.EMAIL_NOT_VERIFIED]: "Please verify your email to continue.",
  [ErrorCode.AI_SERVICE_ERROR]: "AI service is temporarily unavailable.",
  [ErrorCode.AI_QUOTA_EXCEEDED]: "AI usage limit reached. Please try again later.",
  [ErrorCode.INTERNAL_ERROR]: "Something went wrong. Please try again.",
  [ErrorCode.SERVICE_UNAVAILABLE]: "Service temporarily unavailable.",
  [ErrorCode.NETWORK_ERROR]: "Network connection lost. Please check your connection.",
};

export function isApiErrorResponse(data: unknown): data is ApiErrorResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "success" in data &&
    (data as any).success === false &&
    "error" in data &&
    typeof (data as any).error === "object" &&
    "code" in (data as any).error
  );
}

export function parseApiError(response: Response, body: unknown): ApiError {
  if (isApiErrorResponse(body)) {
    return body.error;
  }

  let message = "An unexpected error occurred";
  if (typeof body === "object" && body !== null) {
    if ("message" in body && typeof (body as any).message === "string") {
      message = (body as any).message;
    } else if ("error" in body && typeof (body as any).error === "string") {
      message = (body as any).error;
    }
  } else if (typeof body === "string") {
    message = body;
  }

  const codeMap: Record<number, ErrorCode> = {
    400: ErrorCode.VALIDATION_ERROR,
    401: ErrorCode.AUTHENTICATION_REQUIRED,
    403: ErrorCode.ACCESS_DENIED,
    404: ErrorCode.RESOURCE_NOT_FOUND,
    409: ErrorCode.RESOURCE_ALREADY_EXISTS,
    429: ErrorCode.RATE_LIMIT_EXCEEDED,
    500: ErrorCode.INTERNAL_ERROR,
    502: ErrorCode.EXTERNAL_SERVICE_ERROR,
    503: ErrorCode.SERVICE_UNAVAILABLE,
  };

  return {
    code: codeMap[response.status] || ErrorCode.INTERNAL_ERROR,
    message,
    category: "UNKNOWN",
    timestamp: new Date().toISOString(),
    retryable: response.status >= 500 || response.status === 429,
    retryAfter: parseInt(response.headers.get("Retry-After") || "0") || undefined,
  };
}

export function getUserFriendlyMessage(error: ApiError): string {
  return USER_FRIENDLY_MESSAGES[error.code] || error.message;
}

export function getFieldErrors(error: ApiError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  
  if (error.details) {
    for (const detail of error.details) {
      if (detail.field) {
        fieldErrors[detail.field] = detail.constraint || "Invalid value";
      }
    }
  }
  
  return fieldErrors;
}

export type ToastType = "error" | "warning" | "info";

function getToastType(error: ApiError): ToastType {
  if (error.code === ErrorCode.RATE_LIMIT_EXCEEDED) {
    return "warning";
  }
  if (error.code === ErrorCode.SERVICE_UNAVAILABLE || error.retryable) {
    return "warning";
  }
  return "error";
}

export function showErrorToast(
  error: ApiError | string,
  options: {
    title?: string;
    duration?: number;
    action?: {
      label: string;
      onClick: () => void;
    };
  } = {}
): void {
  const apiError = typeof error === "string" 
    ? { code: ErrorCode.INTERNAL_ERROR, message: error, category: "UNKNOWN", timestamp: new Date().toISOString(), retryable: false }
    : error;

  const message = getUserFriendlyMessage(apiError);
  const type = getToastType(apiError);
  const duration = options.duration ?? (apiError.retryable ? 8000 : 5000);

  const toastOptions: any = {
    duration,
    description: options.title ? message : undefined,
  };

  if (options.action) {
    toastOptions.action = {
      label: options.action.label,
      onClick: options.action.onClick,
    };
  }

  const displayMessage = options.title || message;

  switch (type) {
    case "warning":
      toast.warning(displayMessage, toastOptions);
      break;
    case "info":
      toast.info(displayMessage, toastOptions);
      break;
    default:
      toast.error(displayMessage, toastOptions);
  }
}

export function isRetryableError(error: ApiError): boolean {
  if (error.retryable) return true;

  const retryableCodes = [
    ErrorCode.DATABASE_CONNECTION_ERROR,
    ErrorCode.EXTERNAL_SERVICE_ERROR,
    ErrorCode.SERVICE_UNAVAILABLE,
    ErrorCode.NETWORK_ERROR,
    ErrorCode.AI_SERVICE_ERROR,
  ];

  return retryableCodes.includes(error.code);
}

export function isAuthError(error: ApiError): boolean {
  const authCodes = [
    ErrorCode.AUTHENTICATION_REQUIRED,
    ErrorCode.TOKEN_EXPIRED,
    ErrorCode.TOKEN_INVALID,
    ErrorCode.SESSION_EXPIRED,
    ErrorCode.DEVICE_MISMATCH,
  ];
  return authCodes.includes(error.code);
}

export function isValidationError(error: ApiError): boolean {
  return error.code === ErrorCode.VALIDATION_ERROR;
}

export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? "s" : ""}`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
}

export class ApiRequestError extends Error {
  public readonly apiError: ApiError;
  public readonly status: number;

  constructor(status: number, apiError: ApiError) {
    super(apiError.message);
    this.name = "ApiRequestError";
    this.status = status;
    this.apiError = apiError;
  }

  get code(): ErrorCode {
    return this.apiError.code;
  }

  get isRetryable(): boolean {
    return isRetryableError(this.apiError);
  }

  get isAuthError(): boolean {
    return isAuthError(this.apiError);
  }

  get retryAfter(): number | undefined {
    return this.apiError.retryAfter;
  }

  getUserFriendlyMessage(): string {
    return getUserFriendlyMessage(this.apiError);
  }

  getFieldErrors(): Record<string, string> {
    return getFieldErrors(this.apiError);
  }

  showToast(options?: Parameters<typeof showErrorToast>[1]): void {
    showErrorToast(this.apiError, options);
  }
}

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: ApiRequestError, attempt: number) => boolean;
  onRetry?: (error: ApiRequestError, attempt: number, delay: number) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = (error) => error.isRetryable,
    onRetry,
  } = options;

  let lastError: ApiRequestError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!(error instanceof ApiRequestError)) {
        throw error;
      }

      lastError = error;

      if (attempt >= maxRetries || !shouldRetry(error, attempt)) {
        throw error;
      }

      let delay = error.retryAfter
        ? error.retryAfter * 1000
        : Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

      delay += Math.random() * 1000;

      onRetry?.(error, attempt, delay);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  halfOpenMaxAttempts?: number;
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;

  constructor(private readonly options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: 5,
      resetTimeout: 30000,
      halfOpenMaxAttempts: 3,
      ...options,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.options.resetTimeout!) {
        this.state = "half-open";
        this.halfOpenAttempts = 0;
      } else {
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === "half-open") {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.options.halfOpenMaxAttempts!) {
        this.state = "open";
      }
    } else if (this.failures >= this.options.failureThreshold!) {
      this.state = "open";
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = "closed";
    this.failures = 0;
    this.halfOpenAttempts = 0;
  }
}
