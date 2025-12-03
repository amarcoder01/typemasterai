import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

export type AuthEventType = 
  | "login_success"
  | "login_failed"
  | "logout"
  | "oauth_login"
  | "oauth_link"
  | "oauth_unlink"
  | "password_change"
  | "remember_me_created"
  | "remember_me_used"
  | "remember_me_theft_detected"
  | "session_created"
  | "session_revoked"
  | "account_locked"
  | "account_unlocked"
  | "rate_limit_exceeded";

export interface AuthAuditLog {
  eventType: AuthEventType;
  userId?: string;
  email?: string;
  provider?: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  success: boolean;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface DeviceInfo {
  userAgent: string;
  ipAddress: string;
  fingerprint: string;
  acceptLanguage?: string;
  platform?: string;
}

export function generateDeviceFingerprint(req: Request): string {
  const components = [
    req.get("User-Agent") || "unknown",
    req.get("Accept-Language") || "unknown",
    req.get("Accept-Encoding") || "unknown",
    req.ip || "unknown",
  ];
  return crypto
    .createHash("sha256")
    .update(components.join("|"))
    .digest("hex")
    .slice(0, 32);
}

export function extractDeviceInfo(req: Request): DeviceInfo {
  return {
    userAgent: req.get("User-Agent") || "unknown",
    ipAddress: req.ip || "unknown",
    fingerprint: generateDeviceFingerprint(req),
    acceptLanguage: req.get("Accept-Language"),
    platform: extractPlatform(req.get("User-Agent") || ""),
  };
}

function extractPlatform(userAgent: string): string {
  if (/Windows/.test(userAgent)) return "Windows";
  if (/Macintosh/.test(userAgent)) return "macOS";
  if (/Linux/.test(userAgent)) return "Linux";
  if (/Android/.test(userAgent)) return "Android";
  if (/iPhone|iPad/.test(userAgent)) return "iOS";
  return "Unknown";
}

const auditLogs: AuthAuditLog[] = [];
const MAX_AUDIT_LOGS = 10000;

export function logAuthEvent(event: Omit<AuthAuditLog, "timestamp">): void {
  const log: AuthAuditLog = {
    ...event,
    timestamp: new Date(),
  };
  
  auditLogs.unshift(log);
  if (auditLogs.length > MAX_AUDIT_LOGS) {
    auditLogs.pop();
  }

  const logLevel = event.success ? "info" : "warn";
  const sanitizedLog = {
    ...log,
    userAgent: log.userAgent.slice(0, 100),
  };
  
  if (event.eventType === "remember_me_theft_detected") {
    console.error("[AUTH SECURITY] Token theft detected:", sanitizedLog);
  } else if (logLevel === "warn") {
    console.warn("[AUTH AUDIT]", sanitizedLog);
  } else {
    console.log("[AUTH AUDIT]", event.eventType, event.userId || event.email || "anonymous");
  }
}

export function getRecentAuthEvents(
  userId?: string,
  limit: number = 50
): AuthAuditLog[] {
  if (userId) {
    return auditLogs.filter((log) => log.userId === userId).slice(0, limit);
  }
  return auditLogs.slice(0, limit);
}

export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

const oauthStates = new Map<string, { 
  createdAt: Date; 
  codeVerifier?: string;
  returnTo?: string;
  linkToUserId?: string;
}>();

const STATE_EXPIRY_MS = 10 * 60 * 1000;

export function storeOAuthState(
  state: string, 
  options?: { 
    codeVerifier?: string; 
    returnTo?: string;
    linkToUserId?: string;
  }
): void {
  cleanupExpiredStates();
  oauthStates.set(state, {
    createdAt: new Date(),
    ...options,
  });
}

export function validateAndConsumeOAuthState(
  state: string
): { 
  valid: boolean; 
  codeVerifier?: string; 
  returnTo?: string;
  linkToUserId?: string;
} {
  const stored = oauthStates.get(state);
  if (!stored) {
    return { valid: false };
  }
  
  oauthStates.delete(state);
  
  const age = Date.now() - stored.createdAt.getTime();
  if (age > STATE_EXPIRY_MS) {
    return { valid: false };
  }
  
  return {
    valid: true,
    codeVerifier: stored.codeVerifier,
    returnTo: stored.returnTo,
    linkToUserId: stored.linkToUserId,
  };
}

function cleanupExpiredStates(): void {
  const now = Date.now();
  const entries = Array.from(oauthStates.entries());
  for (const [state, data] of entries) {
    if (now - data.createdAt.getTime() > STATE_EXPIRY_MS) {
      oauthStates.delete(state);
    }
  }
}

export interface RateLimitEntry {
  count: number;
  firstAttempt: Date;
  lastAttempt: Date;
  blocked: boolean;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
  blockDurationMs: number;
}

const authRateLimits: Record<string, RateLimitConfig> = {
  login: { windowMs: 15 * 60 * 1000, maxAttempts: 5, blockDurationMs: 30 * 60 * 1000 },
  oauth: { windowMs: 15 * 60 * 1000, maxAttempts: 10, blockDurationMs: 15 * 60 * 1000 },
  passwordChange: { windowMs: 60 * 60 * 1000, maxAttempts: 3, blockDurationMs: 60 * 60 * 1000 },
  unlink: { windowMs: 60 * 60 * 1000, maxAttempts: 5, blockDurationMs: 60 * 60 * 1000 },
};

export function checkRateLimit(
  identifier: string,
  action: keyof typeof authRateLimits
): { allowed: boolean; remainingAttempts: number; retryAfterMs?: number } {
  const config = authRateLimits[action];
  const key = `${action}:${identifier}`;
  const entry = rateLimitStore.get(key);
  const now = Date.now();

  if (!entry) {
    rateLimitStore.set(key, {
      count: 1,
      firstAttempt: new Date(),
      lastAttempt: new Date(),
      blocked: false,
    });
    return { allowed: true, remainingAttempts: config.maxAttempts - 1 };
  }

  if (entry.blocked) {
    const blockEndTime = entry.lastAttempt.getTime() + config.blockDurationMs;
    if (now < blockEndTime) {
      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfterMs: blockEndTime - now,
      };
    }
    rateLimitStore.delete(key);
    return checkRateLimit(identifier, action);
  }

  const windowStart = now - config.windowMs;
  if (entry.firstAttempt.getTime() < windowStart) {
    rateLimitStore.set(key, {
      count: 1,
      firstAttempt: new Date(),
      lastAttempt: new Date(),
      blocked: false,
    });
    return { allowed: true, remainingAttempts: config.maxAttempts - 1 };
  }

  entry.count++;
  entry.lastAttempt = new Date();

  if (entry.count > config.maxAttempts) {
    entry.blocked = true;
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterMs: config.blockDurationMs,
    };
  }

  return {
    allowed: true,
    remainingAttempts: config.maxAttempts - entry.count,
  };
}

export function resetRateLimit(identifier: string, action: keyof typeof authRateLimits): void {
  const key = `${action}:${identifier}`;
  rateLimitStore.delete(key);
}

export function validateDeviceBinding(
  storedFingerprint: string | null,
  currentFingerprint: string,
  strictMode: boolean = false
): boolean {
  if (!storedFingerprint) return true;
  
  if (strictMode) {
    return storedFingerprint === currentFingerprint;
  }
  
  const similarity = calculateFingerprintSimilarity(storedFingerprint, currentFingerprint);
  return similarity > 0.5;
}

function calculateFingerprintSimilarity(fp1: string, fp2: string): number {
  if (fp1 === fp2) return 1.0;
  
  let matches = 0;
  const len = Math.min(fp1.length, fp2.length);
  for (let i = 0; i < len; i++) {
    if (fp1[i] === fp2[i]) matches++;
  }
  return matches / len;
}

export async function canUnlinkProvider(
  userId: string,
  providerToUnlink: string
): Promise<{ allowed: boolean; reason?: string }> {
  const user = await storage.getUser(userId);
  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  const linkedAccounts = await storage.getUserOAuthAccounts(userId);
  const hasPassword = !!user.password;
  const otherProviders = linkedAccounts.filter((acc: { provider: string }) => acc.provider !== providerToUnlink);

  if (!hasPassword && otherProviders.length === 0) {
    return {
      allowed: false,
      reason: "Cannot unlink the only login method. Please set a password first or link another account.",
    };
  }

  return { allowed: true };
}

export function getProviderAvailability(): Record<string, boolean> {
  return {
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    facebook: !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
  };
}

export function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    const oldSession = req.session;
    req.session.regenerate((err) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (oldSession) {
        Object.keys(oldSession).forEach((key) => {
          if (key !== "cookie" && key !== "id") {
            (req.session as any)[key] = (oldSession as any)[key];
          }
        });
      }
      
      resolve();
    });
  });
}

export function csrfProtection() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
      const origin = req.get("Origin");
      const host = req.get("Host");
      
      if (origin) {
        try {
          const originUrl = new URL(origin);
          const expectedHost = host?.split(":")[0];
          const actualHost = originUrl.hostname;
          
          if (actualHost !== expectedHost && actualHost !== "localhost") {
            console.warn("[CSRF] Origin mismatch:", { origin, host });
            return res.status(403).json({ message: "CSRF validation failed" });
          }
        } catch {
          return res.status(403).json({ message: "Invalid origin header" });
        }
      }
    }
    next();
  };
}

export function securityHeaders() {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https://accounts.google.com https://github.com https://www.facebook.com; " +
      "frame-ancestors 'none';"
    );
    
    if (process.env.NODE_ENV === "production") {
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload"
      );
    }
    
    next();
  };
}
