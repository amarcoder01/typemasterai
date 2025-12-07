import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

export enum AuthErrorCode {
  INVALID_INPUT = "AUTH_001",
  VALIDATION_FAILED = "AUTH_002",
  EMAIL_EXISTS = "AUTH_003",
  USERNAME_EXISTS = "AUTH_004",
  INVALID_CREDENTIALS = "AUTH_005",
  ACCOUNT_LOCKED = "AUTH_006",
  ACCOUNT_INACTIVE = "AUTH_007",
  OAUTH_ONLY_ACCOUNT = "AUTH_008",
  TOKEN_INVALID = "AUTH_009",
  TOKEN_EXPIRED = "AUTH_010",
  TOKEN_USED = "AUTH_011",
  PASSWORD_TOO_WEAK = "AUTH_012",
  PASSWORD_COMMON = "AUTH_013",
  USERNAME_RESERVED = "AUTH_014",
  USERNAME_INVALID_FORMAT = "AUTH_015",
  EMAIL_INVALID = "AUTH_016",
  SESSION_ERROR = "AUTH_017",
  RATE_LIMITED = "AUTH_018",
  PAYLOAD_TOO_LARGE = "AUTH_019",
  DATABASE_ERROR = "AUTH_020",
  CONCURRENT_REQUEST = "AUTH_021",
  OAUTH_CONFLICT = "AUTH_022",
  PROVIDER_ERROR = "AUTH_023",
  INTERNAL_ERROR = "AUTH_099",
}

interface AuthErrorDetails {
  code: AuthErrorCode;
  message: string;
  statusCode: number;
  field?: string;
  retryable?: boolean;
  attemptsRemaining?: number;
  lockoutMinutes?: number;
}

export class AuthError extends Error {
  public readonly code: AuthErrorCode;
  public readonly statusCode: number;
  public readonly field?: string;
  public readonly retryable: boolean;
  public readonly attemptsRemaining?: number;
  public readonly lockoutMinutes?: number;
  public readonly timestamp: Date;
  public readonly requestId?: string;

  constructor(details: AuthErrorDetails, requestId?: string) {
    super(details.message);
    this.name = "AuthError";
    this.code = details.code;
    this.statusCode = details.statusCode;
    this.field = details.field;
    this.retryable = details.retryable ?? false;
    this.attemptsRemaining = details.attemptsRemaining;
    this.lockoutMinutes = details.lockoutMinutes;
    this.timestamp = new Date();
    this.requestId = requestId;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        field: this.field,
        retryable: this.retryable,
        ...(this.attemptsRemaining !== undefined && { attemptsRemaining: this.attemptsRemaining }),
        ...(this.lockoutMinutes !== undefined && { lockoutMinutes: this.lockoutMinutes }),
      },
    };
  }
}

const COMMON_PASSWORDS = new Set([
  "password", "123456", "12345678", "qwerty", "abc123", "monkey", "1234567",
  "letmein", "trustno1", "dragon", "baseball", "iloveyou", "master", "sunshine",
  "ashley", "bailey", "shadow", "123123", "654321", "superman", "qazwsx",
  "michael", "football", "password1", "password123", "welcome", "welcome1",
  "admin", "login", "passw0rd", "starwars", "hello123", "charlie", "donald",
  "password12", "1qaz2wsx", "qwertyuiop", "000000", "princess", "computer",
  "zxcvbnm", "baseball1", "1234qwer", "12qwaszx", "qwerty123", "admin123",
  "access", "test", "test123", "root", "guest", "administrator", "111111",
  "123456789", "1234567890", "password1234", "typing", "typemaster", "typemasterai"
]);

const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "root", "system", "support", "help", "info",
  "contact", "webmaster", "postmaster", "hostmaster", "abuse", "security",
  "sales", "marketing", "billing", "legal", "privacy", "terms", "api",
  "www", "ftp", "mail", "email", "smtp", "pop", "imap", "ns", "dns",
  "test", "demo", "staging", "dev", "development", "prod", "production",
  "null", "undefined", "nan", "true", "false", "bot", "robot", "ai",
  "typemasterai", "typemaster", "official", "verified", "anonymous",
  "moderator", "mod", "staff", "team", "owner", "founder", "ceo", "cto",
  "guest", "user", "member", "account", "profile", "settings", "dashboard",
  "login", "logout", "register", "signup", "signin", "password", "reset",
  "verify", "verification", "confirm", "confirmation", "delete", "remove",
  "create", "update", "edit", "new", "all", "everyone", "anybody", "nobody"
]);

const CONFUSING_CHAR_PATTERNS = [
  /[^\x00-\x7F]/, // Non-ASCII characters (homoglyphs)
  /[\u200B-\u200D\uFEFF]/, // Zero-width characters
  /[\u202A-\u202E]/, // Bidirectional text control
  /[\u2066-\u2069]/, // Additional bidi controls
];

export class InputSanitizer {
  static normalizeEmail(email: string): string {
    if (!email || typeof email !== "string") {
      throw new AuthError({
        code: AuthErrorCode.EMAIL_INVALID,
        message: "Email is required",
        statusCode: 400,
        field: "email",
      });
    }

    let normalized = email.trim().toLowerCase();
    
    if (normalized.length > 254) {
      throw new AuthError({
        code: AuthErrorCode.PAYLOAD_TOO_LARGE,
        message: "Email address is too long",
        statusCode: 400,
        field: "email",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new AuthError({
        code: AuthErrorCode.EMAIL_INVALID,
        message: "Invalid email format",
        statusCode: 400,
        field: "email",
      });
    }

    return normalized;
  }

  static normalizeUsername(username: string): string {
    if (!username || typeof username !== "string") {
      throw new AuthError({
        code: AuthErrorCode.USERNAME_INVALID_FORMAT,
        message: "Username is required",
        statusCode: 400,
        field: "username",
      });
    }

    const normalized = username.trim();
    
    if (normalized.length < 3) {
      throw new AuthError({
        code: AuthErrorCode.USERNAME_INVALID_FORMAT,
        message: "Username must be at least 3 characters",
        statusCode: 400,
        field: "username",
      });
    }

    if (normalized.length > 30) {
      throw new AuthError({
        code: AuthErrorCode.PAYLOAD_TOO_LARGE,
        message: "Username must be less than 30 characters",
        statusCode: 400,
        field: "username",
      });
    }

    if (!/^[a-zA-Z]/.test(normalized)) {
      throw new AuthError({
        code: AuthErrorCode.USERNAME_INVALID_FORMAT,
        message: "Username must start with a letter",
        statusCode: 400,
        field: "username",
      });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(normalized)) {
      throw new AuthError({
        code: AuthErrorCode.USERNAME_INVALID_FORMAT,
        message: "Username can only contain letters, numbers, and underscores",
        statusCode: 400,
        field: "username",
      });
    }

    for (const pattern of CONFUSING_CHAR_PATTERNS) {
      if (pattern.test(normalized)) {
        throw new AuthError({
          code: AuthErrorCode.USERNAME_INVALID_FORMAT,
          message: "Username contains invalid characters",
          statusCode: 400,
          field: "username",
        });
      }
    }

    if (RESERVED_USERNAMES.has(normalized.toLowerCase())) {
      throw new AuthError({
        code: AuthErrorCode.USERNAME_RESERVED,
        message: "This username is reserved. Please choose a different one.",
        statusCode: 400,
        field: "username",
      });
    }

    return normalized;
  }

  static sanitizeToken(token: string): string {
    if (!token || typeof token !== "string") {
      throw new AuthError({
        code: AuthErrorCode.TOKEN_INVALID,
        message: "Token is required",
        statusCode: 400,
        field: "token",
      });
    }

    const sanitized = token.trim();
    
    if (!/^[a-fA-F0-9]{64}$/.test(sanitized)) {
      throw new AuthError({
        code: AuthErrorCode.TOKEN_INVALID,
        message: "Invalid token format",
        statusCode: 400,
        field: "token",
      });
    }

    return sanitized.toLowerCase();
  }
}

export class PasswordValidator {
  static validate(password: string, email?: string, username?: string): void {
    if (!password || typeof password !== "string") {
      throw new AuthError({
        code: AuthErrorCode.PASSWORD_TOO_WEAK,
        message: "Password is required",
        statusCode: 400,
        field: "password",
      });
    }

    if (password.length < 8) {
      throw new AuthError({
        code: AuthErrorCode.PASSWORD_TOO_WEAK,
        message: "Password must be at least 8 characters",
        statusCode: 400,
        field: "password",
      });
    }

    if (password.length > 128) {
      throw new AuthError({
        code: AuthErrorCode.PAYLOAD_TOO_LARGE,
        message: "Password is too long (max 128 characters)",
        statusCode: 400,
        field: "password",
      });
    }

    if (!/[A-Z]/.test(password)) {
      throw new AuthError({
        code: AuthErrorCode.PASSWORD_TOO_WEAK,
        message: "Password must contain at least one uppercase letter",
        statusCode: 400,
        field: "password",
      });
    }

    if (!/[a-z]/.test(password)) {
      throw new AuthError({
        code: AuthErrorCode.PASSWORD_TOO_WEAK,
        message: "Password must contain at least one lowercase letter",
        statusCode: 400,
        field: "password",
      });
    }

    if (!/[0-9]/.test(password)) {
      throw new AuthError({
        code: AuthErrorCode.PASSWORD_TOO_WEAK,
        message: "Password must contain at least one number",
        statusCode: 400,
        field: "password",
      });
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      throw new AuthError({
        code: AuthErrorCode.PASSWORD_TOO_WEAK,
        message: "Password must contain at least one special character",
        statusCode: 400,
        field: "password",
      });
    }

    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.has(lowerPassword)) {
      throw new AuthError({
        code: AuthErrorCode.PASSWORD_COMMON,
        message: "This password is too common. Please choose a more secure password.",
        statusCode: 400,
        field: "password",
      });
    }

    if (email) {
      const emailPart = email.split("@")[0].toLowerCase();
      if (lowerPassword.includes(emailPart) && emailPart.length >= 3) {
        throw new AuthError({
          code: AuthErrorCode.PASSWORD_TOO_WEAK,
          message: "Password should not contain your email address",
          statusCode: 400,
          field: "password",
        });
      }
    }

    if (username && username.length >= 3) {
      if (lowerPassword.includes(username.toLowerCase())) {
        throw new AuthError({
          code: AuthErrorCode.PASSWORD_TOO_WEAK,
          message: "Password should not contain your username",
          statusCode: 400,
          field: "password",
        });
      }
    }
  }

  static checkBreached(password: string): boolean {
    return COMMON_PASSWORDS.has(password.toLowerCase());
  }
}

export class TokenSecurity {
  static timingSafeCompare(a: string, b: string): boolean {
    if (typeof a !== "string" || typeof b !== "string") {
      return false;
    }

    try {
      const bufA = Buffer.from(a, "utf8");
      const bufB = Buffer.from(b, "utf8");

      if (bufA.length !== bufB.length) {
        crypto.timingSafeEqual(bufA, bufA);
        return false;
      }

      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  static isTokenExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  static validateTokenState(token: { expiresAt: Date; used?: boolean; usedAt?: Date | null } | null | undefined): void {
    if (!token) {
      throw new AuthError({
        code: AuthErrorCode.TOKEN_INVALID,
        message: "Invalid or expired token",
        statusCode: 400,
      });
    }

    if (token.used || token.usedAt) {
      throw new AuthError({
        code: AuthErrorCode.TOKEN_USED,
        message: "This token has already been used",
        statusCode: 400,
      });
    }

    if (this.isTokenExpired(token.expiresAt)) {
      throw new AuthError({
        code: AuthErrorCode.TOKEN_EXPIRED,
        message: "This token has expired. Please request a new one.",
        statusCode: 400,
      });
    }
  }
}

const POSTGRES_ERROR_CODES = {
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  NOT_NULL_VIOLATION: "23502",
  CHECK_VIOLATION: "23514",
  SERIALIZATION_FAILURE: "40001",
  DEADLOCK_DETECTED: "40P01",
  CONNECTION_EXCEPTION: "08000",
  CONNECTION_FAILURE: "08006",
  ADMIN_SHUTDOWN: "57P01",
  CRASH_SHUTDOWN: "57P02",
  CANNOT_CONNECT_NOW: "57P03",
};

interface DatabaseErrorInfo {
  isRetryable: boolean;
  authError: AuthError;
  shouldLog: boolean;
}

export class DatabaseErrorHandler {
  static handle(error: any, context: string, requestId?: string): DatabaseErrorInfo {
    const pgCode = error?.code;
    const detail = error?.detail || "";
    const constraint = error?.constraint || "";

    if (pgCode === POSTGRES_ERROR_CODES.UNIQUE_VIOLATION) {
      if (detail.includes("email") || constraint.includes("email")) {
        return {
          isRetryable: false,
          shouldLog: false,
          authError: new AuthError({
            code: AuthErrorCode.EMAIL_EXISTS,
            message: "An account with this email already exists",
            statusCode: 409,
            field: "email",
          }, requestId),
        };
      }
      if (detail.includes("username") || constraint.includes("username")) {
        return {
          isRetryable: false,
          shouldLog: false,
          authError: new AuthError({
            code: AuthErrorCode.USERNAME_EXISTS,
            message: "This username is already taken",
            statusCode: 409,
            field: "username",
          }, requestId),
        };
      }
      return {
        isRetryable: false,
        shouldLog: true,
        authError: new AuthError({
          code: AuthErrorCode.CONCURRENT_REQUEST,
          message: "This request conflicts with another operation. Please try again.",
          statusCode: 409,
          retryable: true,
        }, requestId),
      };
    }

    if (pgCode === POSTGRES_ERROR_CODES.SERIALIZATION_FAILURE || 
        pgCode === POSTGRES_ERROR_CODES.DEADLOCK_DETECTED) {
      return {
        isRetryable: true,
        shouldLog: true,
        authError: new AuthError({
          code: AuthErrorCode.CONCURRENT_REQUEST,
          message: "Server is busy. Please try again in a moment.",
          statusCode: 503,
          retryable: true,
        }, requestId),
      };
    }

    if ([
      POSTGRES_ERROR_CODES.CONNECTION_EXCEPTION,
      POSTGRES_ERROR_CODES.CONNECTION_FAILURE,
      POSTGRES_ERROR_CODES.ADMIN_SHUTDOWN,
      POSTGRES_ERROR_CODES.CRASH_SHUTDOWN,
      POSTGRES_ERROR_CODES.CANNOT_CONNECT_NOW,
    ].includes(pgCode)) {
      return {
        isRetryable: true,
        shouldLog: true,
        authError: new AuthError({
          code: AuthErrorCode.DATABASE_ERROR,
          message: "Service temporarily unavailable. Please try again later.",
          statusCode: 503,
          retryable: true,
        }, requestId),
      };
    }

    return {
      isRetryable: false,
      shouldLog: true,
      authError: new AuthError({
        code: AuthErrorCode.INTERNAL_ERROR,
        message: "An unexpected error occurred. Please try again.",
        statusCode: 500,
      }, requestId),
    };
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 100
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        const errorInfo = this.handle(error, "withRetry");
        
        if (!errorInfo.isRetryable || attempt === maxRetries) {
          throw error;
        }

        const jitter = Math.random() * 50;
        const delay = baseDelayMs * Math.pow(2, attempt) + jitter;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

interface AuthLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  event: string;
  requestId?: string;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  errorCode?: AuthErrorCode;
  errorMessage?: string;
  durationMs?: number;
  metadata?: Record<string, any>;
}

export class AuthLogger {
  private static hashEmail(email: string): string {
    return crypto.createHash("sha256").update(email.toLowerCase()).digest("hex").substring(0, 16);
  }

  private static getClientIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      return forwarded.split(",")[0].trim();
    }
    return req.socket?.remoteAddress || "unknown";
  }

  static log(entry: AuthLogEntry): void {
    const sanitized = {
      ...entry,
      email: entry.email ? this.hashEmail(entry.email) : undefined,
    };
    
    const logLine = JSON.stringify(sanitized);
    
    switch (entry.level) {
      case "error":
        console.error(`[AUTH] ${logLine}`);
        break;
      case "warn":
        console.warn(`[AUTH] ${logLine}`);
        break;
      default:
        console.log(`[AUTH] ${logLine}`);
    }
  }

  static logAuthEvent(
    event: string,
    req: Request,
    options: {
      level?: "info" | "warn" | "error";
      userId?: string;
      email?: string;
      error?: AuthError | Error;
      durationMs?: number;
      metadata?: Record<string, any>;
    } = {}
  ): void {
    const requestId = (req as any).requestId || crypto.randomUUID().substring(0, 8);
    
    this.log({
      timestamp: new Date().toISOString(),
      level: options.level || "info",
      event,
      requestId,
      userId: options.userId,
      email: options.email,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers["user-agent"]?.substring(0, 200),
      errorCode: options.error instanceof AuthError ? options.error.code : undefined,
      errorMessage: options.error?.message,
      durationMs: options.durationMs,
      metadata: options.metadata,
    });
  }

  static logLoginAttempt(req: Request, email: string, success: boolean, userId?: string, reason?: string): void {
    this.logAuthEvent(success ? "LOGIN_SUCCESS" : "LOGIN_FAILED", req, {
      level: success ? "info" : "warn",
      userId,
      email,
      metadata: reason ? { reason } : undefined,
    });
  }

  static logRegistration(req: Request, email: string, success: boolean, userId?: string, reason?: string): void {
    this.logAuthEvent(success ? "REGISTRATION_SUCCESS" : "REGISTRATION_FAILED", req, {
      level: success ? "info" : "warn",
      userId,
      email,
      metadata: reason ? { reason } : undefined,
    });
  }

  static logPasswordReset(req: Request, email: string, stage: "requested" | "completed" | "failed", reason?: string): void {
    this.logAuthEvent(`PASSWORD_RESET_${stage.toUpperCase()}`, req, {
      level: stage === "failed" ? "warn" : "info",
      email,
      metadata: reason ? { reason } : undefined,
    });
  }
}

export function authErrorMiddleware(err: Error, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof AuthError) {
    AuthLogger.logAuthEvent("AUTH_ERROR", req, {
      level: err.statusCode >= 500 ? "error" : "warn",
      error: err,
    });
    
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  AuthLogger.logAuthEvent("UNEXPECTED_ERROR", req, {
    level: "error",
    error: err,
  });
  
  res.status(500).json({
    error: {
      code: AuthErrorCode.INTERNAL_ERROR,
      message: "An unexpected error occurred. Please try again.",
    },
  });
}

export function payloadLimitMiddleware(maxSizeKB: number = 10) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);
    const maxBytes = maxSizeKB * 1024;

    if (contentLength > maxBytes) {
      const error = new AuthError({
        code: AuthErrorCode.PAYLOAD_TOO_LARGE,
        message: `Request payload too large. Maximum size is ${maxSizeKB}KB.`,
        statusCode: 413,
      });
      
      res.status(error.statusCode).json(error.toJSON());
      return;
    }

    next();
  };
}

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  (req as any).requestId = crypto.randomUUID().substring(0, 8);
  next();
}

export async function addTimingJitter(minMs: number = 100, maxMs: number = 300): Promise<void> {
  const delay = minMs + Math.random() * (maxMs - minMs);
  await new Promise(resolve => setTimeout(resolve, delay));
}

const idempotencyStore = new Map<string, { timestamp: number; response: any }>();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function generateIdempotencyKey(email: string, action: string): string {
  const window = Math.floor(Date.now() / IDEMPOTENCY_TTL_MS);
  return crypto.createHash("sha256").update(`${email}:${action}:${window}`).digest("hex");
}

export function checkIdempotency(key: string): { isDuplicate: boolean; cachedResponse?: any } {
  const now = Date.now();
  
  Array.from(idempotencyStore.entries()).forEach(([k, v]) => {
    if (now - v.timestamp > IDEMPOTENCY_TTL_MS) {
      idempotencyStore.delete(k);
    }
  });

  const cached = idempotencyStore.get(key);
  if (cached) {
    return { isDuplicate: true, cachedResponse: cached.response };
  }

  return { isDuplicate: false };
}

export function storeIdempotencyResult(key: string, response: any): void {
  idempotencyStore.set(key, { timestamp: Date.now(), response });
}

export const authErrors = {
  emailExists: () => new AuthError({
    code: AuthErrorCode.EMAIL_EXISTS,
    message: "An account with this email already exists",
    statusCode: 409,
    field: "email",
  }),
  usernameExists: () => new AuthError({
    code: AuthErrorCode.USERNAME_EXISTS,
    message: "This username is already taken",
    statusCode: 409,
    field: "username",
  }),
  invalidCredentials: (attemptsRemaining?: number) => new AuthError({
    code: AuthErrorCode.INVALID_CREDENTIALS,
    message: attemptsRemaining !== undefined && attemptsRemaining > 0
      ? `Invalid email or password. ${attemptsRemaining} attempt${attemptsRemaining > 1 ? 's' : ''} remaining.`
      : "Invalid email or password",
    statusCode: 401,
    attemptsRemaining,
  }),
  accountLocked: (minutesRemaining: number) => new AuthError({
    code: AuthErrorCode.ACCOUNT_LOCKED,
    message: `Account is temporarily locked. Please try again in ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}.`,
    statusCode: 403,
    lockoutMinutes: minutesRemaining,
  }),
  accountInactive: () => new AuthError({
    code: AuthErrorCode.ACCOUNT_INACTIVE,
    message: "Account has been deactivated. Please contact support.",
    statusCode: 403,
  }),
  oauthOnlyAccount: () => new AuthError({
    code: AuthErrorCode.OAUTH_ONLY_ACCOUNT,
    message: "This account uses social login. Please sign in with your connected provider.",
    statusCode: 400,
  }),
  sessionError: () => new AuthError({
    code: AuthErrorCode.SESSION_ERROR,
    message: "Session error occurred. Please try logging in again.",
    statusCode: 500,
    retryable: true,
  }),
  rateLimited: () => new AuthError({
    code: AuthErrorCode.RATE_LIMITED,
    message: "Too many requests. Please wait before trying again.",
    statusCode: 429,
    retryable: true,
  }),
  oauthConflict: (provider: string) => new AuthError({
    code: AuthErrorCode.OAUTH_CONFLICT,
    message: `This email is already associated with a different account. Please sign in with your original method or link your ${provider} account from settings.`,
    statusCode: 409,
  }),
  providerError: (provider: string) => new AuthError({
    code: AuthErrorCode.PROVIDER_ERROR,
    message: `Failed to authenticate with ${provider}. Please try again.`,
    statusCode: 502,
    retryable: true,
  }),
};
