import type { IStorage } from "./storage";
import type { Request } from "express";
import crypto from "node:crypto";
import { emailService, type EmailSendResult } from "./email-service";

interface LoginAttemptResult {
  allowed: boolean;
  lockoutMinutes?: number;
  attemptsRemaining?: number;
  message?: string;
}

export class AuthSecurityService {
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 30;
  private readonly FAILED_ATTEMPTS_WINDOW_MINUTES = 15;

  constructor(private storage: IStorage) {}

  async checkAccountLockout(userId: string): Promise<LoginAttemptResult> {
    const isLocked = await this.storage.isAccountLocked(userId);
    
    if (isLocked) {
      const lockout = await this.storage.getAccountLockout(userId);
      const lockedUntil = lockout?.lockedUntil;
      
      if (lockedUntil) {
        const minutesRemaining = Math.ceil((lockedUntil.getTime() - Date.now()) / (1000 * 60));
        return {
          allowed: false,
          lockoutMinutes: minutesRemaining,
          message: `Account is temporarily locked. Please try again in ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}.`,
        };
      }
    }

    return { allowed: true };
  }

  async handleFailedLogin(userId: string, email: string, req: Request, reason: string): Promise<void> {
    // Record failed login attempt and update lockout in a single transaction
    await this.storage.handleFailedLoginTransaction(
      userId,
      email,
      req,
      reason,
      this.FAILED_ATTEMPTS_WINDOW_MINUTES,
      this.MAX_FAILED_ATTEMPTS,
      this.LOCKOUT_DURATION_MINUTES
    );
  }

  async handleSuccessfulLogin(userId: string, email: string, req: Request): Promise<void> {
    // Record successful login
    await this.recordLoginAttempt(userId, email, req, true);

    // Clear any account lockout
    await this.storage.clearAccountLockout(userId);

    // Create or update session tracking
    if (req.session && req.session.id) {
      const sessionInfo = this.extractSessionInfo(req);
      await this.storage.createUserSession({
        userId,
        sessionId: req.session.id,
        ...sessionInfo,
      });
    }
  }

  async recordLoginAttempt(
    userId: string | null,
    email: string,
    req: Request,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers["user-agent"] || "";
    const deviceFingerprint = this.generateDeviceFingerprint(req);

    await this.storage.createLoginHistory({
      userId,
      email,
      ipAddress,
      userAgent,
      deviceFingerprint,
      success,
      failureReason,
      isSuspicious: false, // Can be enhanced with ML-based detection
    });
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      return forwarded.split(",")[0].trim();
    }
    return req.socket.remoteAddress || "";
  }

  private extractSessionInfo(req: Request) {
    const userAgent = req.headers["user-agent"] || "";
    const ipAddress = this.getClientIp(req);

    // Parse user agent for device/browser info
    const deviceInfo = this.parseUserAgent(userAgent);

    return {
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      browserVersion: deviceInfo.browserVersion,
      os: deviceInfo.os,
      osVersion: deviceInfo.osVersion,
      ipAddress,
    };
  }

  private parseUserAgent(userAgent: string): {
    deviceName: string;
    deviceType: string;
    browser: string;
    browserVersion: string;
    os: string;
    osVersion: string;
  } {
    // Simple user agent parsing (can be enhanced with a library like ua-parser-js)
    let browser = "Unknown";
    let browserVersion = "";
    let os = "Unknown";
    let osVersion = "";
    let deviceType = "desktop";

    // Browser detection
    if (userAgent.includes("Chrome")) {
      browser = "Chrome";
      const match = userAgent.match(/Chrome\/([\d.]+)/);
      browserVersion = match ? match[1] : "";
    } else if (userAgent.includes("Firefox")) {
      browser = "Firefox";
      const match = userAgent.match(/Firefox\/([\d.]+)/);
      browserVersion = match ? match[1] : "";
    } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
      browser = "Safari";
      const match = userAgent.match(/Version\/([\d.]+)/);
      browserVersion = match ? match[1] : "";
    } else if (userAgent.includes("Edge")) {
      browser = "Edge";
      const match = userAgent.match(/Edge\/([\d.]+)/);
      browserVersion = match ? match[1] : "";
    }

    // OS detection
    if (userAgent.includes("Windows")) {
      os = "Windows";
      if (userAgent.includes("Windows NT 10.0")) osVersion = "10";
      else if (userAgent.includes("Windows NT 6.3")) osVersion = "8.1";
      else if (userAgent.includes("Windows NT 6.2")) osVersion = "8";
      else if (userAgent.includes("Windows NT 6.1")) osVersion = "7";
    } else if (userAgent.includes("Mac OS X")) {
      os = "macOS";
      const match = userAgent.match(/Mac OS X ([\d_]+)/);
      osVersion = match ? match[1].replace(/_/g, ".") : "";
    } else if (userAgent.includes("Linux")) {
      os = "Linux";
    } else if (userAgent.includes("Android")) {
      os = "Android";
      deviceType = "mobile";
      const match = userAgent.match(/Android ([\d.]+)/);
      osVersion = match ? match[1] : "";
    } else if (userAgent.includes("iOS") || userAgent.includes("iPhone") || userAgent.includes("iPad")) {
      os = "iOS";
      deviceType = userAgent.includes("iPad") ? "tablet" : "mobile";
      const match = userAgent.match(/OS ([\d_]+)/);
      osVersion = match ? match[1].replace(/_/g, ".") : "";
    }

    // Device type detection
    if (userAgent.includes("Mobile") && deviceType === "desktop") {
      deviceType = "mobile";
    } else if (userAgent.includes("Tablet")) {
      deviceType = "tablet";
    }

    const deviceName = `${os} ${deviceType}`;

    return {
      deviceName,
      deviceType,
      browser,
      browserVersion,
      os,
      osVersion,
    };
  }

  private generateDeviceFingerprint(req: Request): string {
    const userAgent = req.headers["user-agent"] || "";
    const acceptLanguage = req.headers["accept-language"] || "";
    const acceptEncoding = req.headers["accept-encoding"] || "";
    
    const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
    return crypto.createHash("sha256").update(fingerprintData).digest("hex").substring(0, 64);
  }

  async getRemainingAttempts(userId: string): Promise<number> {
    const recentFailures = await this.storage.getRecentFailedLogins(
      userId,
      this.FAILED_ATTEMPTS_WINDOW_MINUTES
    );
    return Math.max(0, this.MAX_FAILED_ATTEMPTS - recentFailures.length);
  }

  async generateSecureToken(): Promise<string> {
    return crypto.randomBytes(32).toString("hex");
  }

  async sendVerificationEmail(userId: string, email: string, username?: string): Promise<EmailSendResult> {
    const token = await this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.storage.deleteEmailVerificationToken(userId).catch(() => {});
    await this.storage.createEmailVerificationToken(userId, token, expiresAt);

    const result = await emailService.sendEmailVerificationEmail(email, token, { username });

    if (!result.success) {
      console.error(`[AuthSecurityService] Failed to send verification email to ${email}:`, result.error);
    } else {
      console.log(`[AuthSecurityService] Verification email sent to ${email} (messageId: ${result.messageId})`);
    }

    return result;
  }

  async sendPasswordResetEmail(userId: string, email: string, ipAddress: string, username?: string, timezone?: string): Promise<EmailSendResult> {
    const token = await this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.storage.deletePasswordResetTokens(userId).catch(() => {});
    await this.storage.createPasswordResetToken(userId, token, expiresAt, ipAddress);

    const result = await emailService.sendPasswordResetEmail(email, token, {
      username,
      ipAddress,
      expiresInMinutes: 60,
      timezone,
    });

    if (!result.success) {
      console.error(`[AuthSecurityService] Failed to send password reset email to ${email}:`, result.error);
    } else {
      console.log(`[AuthSecurityService] Password reset email sent to ${email} (messageId: ${result.messageId})`);
    }

    return result;
  }

  getEmailServiceStatus() {
    return emailService.getServiceStatus();
  }
}
