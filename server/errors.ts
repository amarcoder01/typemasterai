import { ZodError } from "zod";
import { fromError } from "zod-validation-error";

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
  DATABASE_CONSTRAINT_ERROR = "DATABASE_CONSTRAINT_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  OAUTH_ERROR = "OAUTH_ERROR",
  OAUTH_STATE_INVALID = "OAUTH_STATE_INVALID",
  OAUTH_PROVIDER_ERROR = "OAUTH_PROVIDER_ERROR",
  EMAIL_SEND_ERROR = "EMAIL_SEND_ERROR",
  FILE_UPLOAD_ERROR = "FILE_UPLOAD_ERROR",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  INVALID_FILE_TYPE = "INVALID_FILE_TYPE",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  SESSION_INVALID = "SESSION_INVALID",
  DEVICE_MISMATCH = "DEVICE_MISMATCH",
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  ACCOUNT_DISABLED = "ACCOUNT_DISABLED",
  EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED",
  PASSWORD_TOO_WEAK = "PASSWORD_TOO_WEAK",
  OPERATION_NOT_ALLOWED = "OPERATION_NOT_ALLOWED",
  WEBSOCKET_ERROR = "WEBSOCKET_ERROR",
  AI_SERVICE_ERROR = "AI_SERVICE_ERROR",
  AI_QUOTA_EXCEEDED = "AI_QUOTA_EXCEEDED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  REQUEST_TIMEOUT = "REQUEST_TIMEOUT",
}

export enum ErrorCategory {
  VALIDATION = "VALIDATION",
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  RATE_LIMIT = "RATE_LIMIT",
  DATABASE = "DATABASE",
  EXTERNAL = "EXTERNAL",
  SECURITY = "SECURITY",
  INTERNAL = "INTERNAL",
}

const ERROR_CODE_TO_CATEGORY: Record<ErrorCode, ErrorCategory> = {
  [ErrorCode.VALIDATION_ERROR]: ErrorCategory.VALIDATION,
  [ErrorCode.AUTHENTICATION_REQUIRED]: ErrorCategory.AUTHENTICATION,
  [ErrorCode.INVALID_CREDENTIALS]: ErrorCategory.AUTHENTICATION,
  [ErrorCode.TOKEN_EXPIRED]: ErrorCategory.AUTHENTICATION,
  [ErrorCode.TOKEN_INVALID]: ErrorCategory.AUTHENTICATION,
  [ErrorCode.ACCESS_DENIED]: ErrorCategory.AUTHORIZATION,
  [ErrorCode.RESOURCE_NOT_FOUND]: ErrorCategory.NOT_FOUND,
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: ErrorCategory.CONFLICT,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: ErrorCategory.RATE_LIMIT,
  [ErrorCode.DATABASE_ERROR]: ErrorCategory.DATABASE,
  [ErrorCode.DATABASE_CONNECTION_ERROR]: ErrorCategory.DATABASE,
  [ErrorCode.DATABASE_CONSTRAINT_ERROR]: ErrorCategory.DATABASE,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: ErrorCategory.EXTERNAL,
  [ErrorCode.OAUTH_ERROR]: ErrorCategory.EXTERNAL,
  [ErrorCode.OAUTH_STATE_INVALID]: ErrorCategory.SECURITY,
  [ErrorCode.OAUTH_PROVIDER_ERROR]: ErrorCategory.EXTERNAL,
  [ErrorCode.EMAIL_SEND_ERROR]: ErrorCategory.EXTERNAL,
  [ErrorCode.FILE_UPLOAD_ERROR]: ErrorCategory.VALIDATION,
  [ErrorCode.FILE_TOO_LARGE]: ErrorCategory.VALIDATION,
  [ErrorCode.INVALID_FILE_TYPE]: ErrorCategory.VALIDATION,
  [ErrorCode.SESSION_EXPIRED]: ErrorCategory.AUTHENTICATION,
  [ErrorCode.SESSION_INVALID]: ErrorCategory.AUTHENTICATION,
  [ErrorCode.DEVICE_MISMATCH]: ErrorCategory.SECURITY,
  [ErrorCode.SUSPICIOUS_ACTIVITY]: ErrorCategory.SECURITY,
  [ErrorCode.ACCOUNT_LOCKED]: ErrorCategory.SECURITY,
  [ErrorCode.ACCOUNT_DISABLED]: ErrorCategory.AUTHORIZATION,
  [ErrorCode.EMAIL_NOT_VERIFIED]: ErrorCategory.AUTHORIZATION,
  [ErrorCode.PASSWORD_TOO_WEAK]: ErrorCategory.VALIDATION,
  [ErrorCode.OPERATION_NOT_ALLOWED]: ErrorCategory.AUTHORIZATION,
  [ErrorCode.WEBSOCKET_ERROR]: ErrorCategory.INTERNAL,
  [ErrorCode.AI_SERVICE_ERROR]: ErrorCategory.EXTERNAL,
  [ErrorCode.AI_QUOTA_EXCEEDED]: ErrorCategory.RATE_LIMIT,
  [ErrorCode.INTERNAL_ERROR]: ErrorCategory.INTERNAL,
  [ErrorCode.SERVICE_UNAVAILABLE]: ErrorCategory.INTERNAL,
  [ErrorCode.REQUEST_TIMEOUT]: ErrorCategory.INTERNAL,
};

const ERROR_CODE_TO_STATUS: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.AUTHENTICATION_REQUIRED]: 401,
  [ErrorCode.INVALID_CREDENTIALS]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.TOKEN_INVALID]: 401,
  [ErrorCode.ACCESS_DENIED]: 403,
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: 409,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.DATABASE_CONNECTION_ERROR]: 503,
  [ErrorCode.DATABASE_CONSTRAINT_ERROR]: 409,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.OAUTH_ERROR]: 502,
  [ErrorCode.OAUTH_STATE_INVALID]: 400,
  [ErrorCode.OAUTH_PROVIDER_ERROR]: 502,
  [ErrorCode.EMAIL_SEND_ERROR]: 502,
  [ErrorCode.FILE_UPLOAD_ERROR]: 400,
  [ErrorCode.FILE_TOO_LARGE]: 413,
  [ErrorCode.INVALID_FILE_TYPE]: 415,
  [ErrorCode.SESSION_EXPIRED]: 401,
  [ErrorCode.SESSION_INVALID]: 401,
  [ErrorCode.DEVICE_MISMATCH]: 401,
  [ErrorCode.SUSPICIOUS_ACTIVITY]: 403,
  [ErrorCode.ACCOUNT_LOCKED]: 423,
  [ErrorCode.ACCOUNT_DISABLED]: 403,
  [ErrorCode.EMAIL_NOT_VERIFIED]: 403,
  [ErrorCode.PASSWORD_TOO_WEAK]: 400,
  [ErrorCode.OPERATION_NOT_ALLOWED]: 403,
  [ErrorCode.WEBSOCKET_ERROR]: 500,
  [ErrorCode.AI_SERVICE_ERROR]: 502,
  [ErrorCode.AI_QUOTA_EXCEEDED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.REQUEST_TIMEOUT]: 504,
};

export interface ErrorDetails {
  field?: string;
  value?: unknown;
  constraint?: string;
  expected?: string;
  received?: string;
}

export interface SerializedError {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    category: ErrorCategory;
    details?: ErrorDetails[];
    timestamp: string;
    requestId?: string;
    retryable: boolean;
    retryAfter?: number;
  };
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly category: ErrorCategory;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: ErrorDetails[];
  public readonly retryable: boolean;
  public readonly retryAfter?: number;
  public readonly originalError?: Error;
  public readonly context?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    options: {
      details?: ErrorDetails[];
      retryable?: boolean;
      retryAfter?: number;
      originalError?: Error;
      context?: Record<string, unknown>;
      statusCode?: number;
    } = {}
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.category = ERROR_CODE_TO_CATEGORY[code];
    this.statusCode = options.statusCode || ERROR_CODE_TO_STATUS[code];
    this.isOperational = true;
    this.details = options.details;
    this.retryable = options.retryable ?? this.determineRetryable(code);
    this.retryAfter = options.retryAfter;
    this.originalError = options.originalError;
    this.context = options.context;

    Error.captureStackTrace(this, this.constructor);
  }

  private determineRetryable(code: ErrorCode): boolean {
    const retryableCodes = [
      ErrorCode.DATABASE_CONNECTION_ERROR,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      ErrorCode.SERVICE_UNAVAILABLE,
      ErrorCode.REQUEST_TIMEOUT,
      ErrorCode.RATE_LIMIT_EXCEEDED,
    ];
    return retryableCodes.includes(code);
  }

  serialize(requestId?: string): SerializedError {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        category: this.category,
        details: this.details,
        timestamp: new Date().toISOString(),
        requestId,
        retryable: this.retryable,
        retryAfter: this.retryAfter,
      },
    };
  }

  static fromZodError(error: ZodError, message?: string): AppError {
    const validationError = fromError(error);
    const details: ErrorDetails[] = error.errors.map((err) => ({
      field: err.path.join("."),
      constraint: err.code,
      expected: "expected" in err ? String(err.expected) : undefined,
      received: "received" in err ? String(err.received) : undefined,
    }));

    return new AppError(
      ErrorCode.VALIDATION_ERROR,
      message || validationError.toString(),
      { details, originalError: error }
    );
  }

  static fromDatabaseError(error: Error): AppError {
    const message = error.message.toLowerCase();
    
    if (message.includes("connection") || message.includes("timeout")) {
      return new AppError(
        ErrorCode.DATABASE_CONNECTION_ERROR,
        "Database connection failed. Please try again.",
        { originalError: error, retryable: true }
      );
    }
    
    if (message.includes("unique") || message.includes("duplicate")) {
      return new AppError(
        ErrorCode.DATABASE_CONSTRAINT_ERROR,
        "A record with this value already exists.",
        { originalError: error }
      );
    }
    
    if (message.includes("foreign key") || message.includes("constraint")) {
      return new AppError(
        ErrorCode.DATABASE_CONSTRAINT_ERROR,
        "This operation violates data integrity constraints.",
        { originalError: error }
      );
    }
    
    return new AppError(
      ErrorCode.DATABASE_ERROR,
      "A database error occurred. Please try again.",
      { originalError: error }
    );
  }

  static validation(message: string, details?: ErrorDetails[]): AppError {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, { details });
  }

  static unauthorized(message = "Authentication required"): AppError {
    return new AppError(ErrorCode.AUTHENTICATION_REQUIRED, message);
  }

  static forbidden(message = "Access denied"): AppError {
    return new AppError(ErrorCode.ACCESS_DENIED, message);
  }

  static notFound(resource = "Resource"): AppError {
    return new AppError(ErrorCode.RESOURCE_NOT_FOUND, `${resource} not found`);
  }

  static conflict(message: string): AppError {
    return new AppError(ErrorCode.RESOURCE_ALREADY_EXISTS, message);
  }

  static rateLimited(retryAfter?: number): AppError {
    return new AppError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      "Too many requests. Please slow down.",
      { retryAfter, retryable: true }
    );
  }

  static internal(message = "An unexpected error occurred"): AppError {
    return new AppError(ErrorCode.INTERNAL_ERROR, message);
  }

  static serviceUnavailable(service = "Service"): AppError {
    return new AppError(
      ErrorCode.SERVICE_UNAVAILABLE,
      `${service} is temporarily unavailable`,
      { retryable: true }
    );
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails[]) {
    super(ErrorCode.VALIDATION_ERROR, message, { details });
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(
    code: ErrorCode.AUTHENTICATION_REQUIRED | ErrorCode.INVALID_CREDENTIALS | ErrorCode.TOKEN_EXPIRED | ErrorCode.TOKEN_INVALID | ErrorCode.SESSION_EXPIRED | ErrorCode.SESSION_INVALID = ErrorCode.AUTHENTICATION_REQUIRED,
    message = "Authentication required"
  ) {
    super(code, message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Access denied") {
    super(ErrorCode.ACCESS_DENIED, message);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(ErrorCode.RESOURCE_NOT_FOUND, `${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(ErrorCode.RESOURCE_ALREADY_EXISTS, message);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(ErrorCode.RATE_LIMIT_EXCEEDED, "Too many requests. Please slow down.", {
      retryAfter,
      retryable: true,
    });
    this.name = "RateLimitError";
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(ErrorCode.DATABASE_ERROR, message, { originalError });
    this.name = "DatabaseError";
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: Error) {
    super(ErrorCode.EXTERNAL_SERVICE_ERROR, `${service} service error`, {
      originalError,
      retryable: true,
    });
    this.name = "ExternalServiceError";
  }
}

export class OAuthError extends AppError {
  constructor(
    code: ErrorCode.OAUTH_ERROR | ErrorCode.OAUTH_STATE_INVALID | ErrorCode.OAUTH_PROVIDER_ERROR = ErrorCode.OAUTH_ERROR,
    message: string,
    originalError?: Error
  ) {
    super(code, message, { originalError });
    this.name = "OAuthError";
  }
}

export class SecurityError extends AppError {
  constructor(
    code: ErrorCode.DEVICE_MISMATCH | ErrorCode.SUSPICIOUS_ACTIVITY | ErrorCode.ACCOUNT_LOCKED = ErrorCode.SUSPICIOUS_ACTIVITY,
    message: string
  ) {
    super(code, message);
    this.name = "SecurityError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

export function wrapError(error: unknown, fallbackMessage?: string): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof ZodError) {
    return AppError.fromZodError(error);
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes("econnrefused") || message.includes("etimedout")) {
      return new AppError(ErrorCode.SERVICE_UNAVAILABLE, "Service temporarily unavailable", {
        originalError: error,
        retryable: true,
      });
    }

    if (message.includes("database") || message.includes("postgres") || message.includes("sql")) {
      return AppError.fromDatabaseError(error);
    }

    return new AppError(
      ErrorCode.INTERNAL_ERROR,
      fallbackMessage || "An unexpected error occurred",
      { originalError: error }
    );
  }

  return AppError.internal(fallbackMessage);
}
