import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError, ErrorCode, wrapError, isOperationalError, SerializedError } from "./errors";
import { log } from "./app";
import crypto from "crypto";

interface ErrorLogEntry {
  requestId: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  errorCode: ErrorCode;
  message: string;
  stack?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  context?: Record<string, unknown>;
}

const errorLog: ErrorLogEntry[] = [];
const MAX_ERROR_LOG_SIZE = 1000;

function generateRequestId(): string {
  return crypto.randomBytes(8).toString("hex");
}

function sanitizeErrorMessage(message: string, isProduction: boolean): string {
  if (!isProduction) {
    return message;
  }

  const sensitivePatterns = [
    /password/gi,
    /secret/gi,
    /token/gi,
    /api[_-]?key/gi,
    /authorization/gi,
    /credential/gi,
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  ];

  let sanitized = message;
  for (const pattern of sensitivePatterns) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }
  return sanitized;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

function logError(entry: ErrorLogEntry): void {
  errorLog.push(entry);
  if (errorLog.length > MAX_ERROR_LOG_SIZE) {
    errorLog.shift();
  }

  const logLevel = entry.statusCode >= 500 ? "ERROR" : "WARN";
  const logMessage = `[${logLevel}] ${entry.method} ${entry.path} - ${entry.errorCode}: ${entry.message} (${entry.requestId})`;
  
  if (entry.statusCode >= 500) {
    console.error(logMessage, entry.stack ? `\n${entry.stack}` : "");
  } else {
    log(logMessage, "error");
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers["x-request-id"] as string) || generateRequestId();
  (req as any).requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
}

export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const startTime = (req as any).startTime || Date.now();
  const requestId = (req as any).requestId || generateRequestId();
  const isProduction = process.env.NODE_ENV === "production";

  let appError: AppError;

  if (err instanceof ZodError) {
    appError = AppError.fromZodError(err);
  } else if (err instanceof AppError) {
    appError = err;
  } else {
    appError = wrapError(err);
  }

  const userId = (req.user as any)?.id;
  const ip = getClientIp(req);
  const userAgent = req.headers["user-agent"] || "unknown";

  const logEntry: ErrorLogEntry = {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    statusCode: appError.statusCode,
    errorCode: appError.code,
    message: appError.message,
    stack: isProduction ? undefined : appError.stack,
    userId,
    ip,
    userAgent,
    duration: Date.now() - startTime,
    context: appError.context,
  };

  logError(logEntry);

  if (!isOperationalError(err) && !isProduction) {
    console.error("Non-operational error:", err);
  }

  const serialized = appError.serialize(requestId);
  
  if (isProduction) {
    serialized.error.message = sanitizeErrorMessage(serialized.error.message, true);
    
    if (appError.statusCode >= 500) {
      serialized.error.message = "An unexpected error occurred. Please try again later.";
    }
  }

  if (appError.retryAfter) {
    res.setHeader("Retry-After", appError.retryAfter);
  }

  res.status(appError.statusCode).json(serialized);
};

export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = AppError.notFound(`Route ${req.method} ${req.path}`);
  next(error);
}

export function getErrorLog(): ErrorLogEntry[] {
  return [...errorLog];
}

export function clearErrorLog(): void {
  errorLog.length = 0;
}

export function getErrorStats(): {
  total: number;
  byCode: Record<string, number>;
  byCategory: Record<string, number>;
  byStatus: Record<number, number>;
  last24Hours: number;
} {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const stats = {
    total: errorLog.length,
    byCode: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
    byStatus: {} as Record<number, number>,
    last24Hours: 0,
  };

  for (const entry of errorLog) {
    stats.byCode[entry.errorCode] = (stats.byCode[entry.errorCode] || 0) + 1;
    stats.byStatus[entry.statusCode] = (stats.byStatus[entry.statusCode] || 0) + 1;
    
    if (new Date(entry.timestamp).getTime() > oneDayAgo) {
      stats.last24Hours++;
    }
  }

  return stats;
}

export function createErrorResponse(
  code: ErrorCode,
  message: string,
  requestId?: string
): SerializedError {
  return {
    success: false,
    error: {
      code,
      message,
      category: AppError.prototype["category"] || "INTERNAL" as any,
      timestamp: new Date().toISOString(),
      requestId,
      retryable: false,
    },
  };
}

export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorTransformer?: (error: unknown) => AppError
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (errorTransformer) {
        throw errorTransformer(error);
      }
      throw wrapError(error);
    }
  }) as T;
}

export function createValidationError(
  message: string,
  fields: Array<{ field: string; message: string }>
): AppError {
  return AppError.validation(message, fields.map(f => ({
    field: f.field,
    constraint: f.message,
  })));
}
