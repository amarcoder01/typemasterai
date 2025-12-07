import sgMail from "@sendgrid/mail";

export enum EmailErrorCode {
  INVALID_API_KEY = "EMAIL_INVALID_API_KEY",
  INVALID_FROM_EMAIL = "EMAIL_INVALID_FROM_EMAIL",
  INVALID_TO_EMAIL = "EMAIL_INVALID_TO_EMAIL",
  RATE_LIMITED = "EMAIL_RATE_LIMITED",
  SEND_FAILED = "EMAIL_SEND_FAILED",
  TEMPLATE_ERROR = "EMAIL_TEMPLATE_ERROR",
  NETWORK_ERROR = "EMAIL_NETWORK_ERROR",
  QUOTA_EXCEEDED = "EMAIL_QUOTA_EXCEEDED",
  BOUNCE_DETECTED = "EMAIL_BOUNCE_DETECTED",
  SPAM_REPORTED = "EMAIL_SPAM_REPORTED",
  SERVICE_UNAVAILABLE = "EMAIL_SERVICE_UNAVAILABLE",
  CONFIGURATION_ERROR = "EMAIL_CONFIGURATION_ERROR",
}

export interface EmailError {
  code: EmailErrorCode;
  message: string;
  statusCode?: number;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  timestamp: Date;
  attempts: number;
  error?: EmailError;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  category?: string[];
  customArgs?: Record<string, string>;
  sendAt?: number;
  batchId?: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class EmailRateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60 * 1000, maxRequests: number = 5) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    setInterval(() => this.cleanup(), windowMs);
  }

  canSend(key: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now >= entry.resetAt) {
      return true;
    }

    return entry.count < this.maxRequests;
  }

  recordSend(key: string): void {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now >= entry.resetAt) {
      this.limits.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });
    } else {
      entry.count++;
    }
  }

  getRemainingQuota(key: string): number {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now >= entry.resetAt) {
      return this.maxRequests;
    }

    return Math.max(0, this.maxRequests - entry.count);
  }

  getResetTime(key: string): number | null {
    const entry = this.limits.get(key);
    if (!entry) return null;
    return entry.resetAt;
  }

  private cleanup(): void {
    const now = Date.now();
    const keys = Array.from(this.limits.keys());
    for (const key of keys) {
      const entry = this.limits.get(key);
      if (entry && now >= entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }
}

class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: "closed" | "open" | "half-open" = "closed";
  
  private readonly failureThreshold: number;
  private readonly resetTimeMs: number;
  private readonly halfOpenRequests: number;
  private halfOpenAttempts: number = 0;

  constructor(
    failureThreshold: number = 5,
    resetTimeMs: number = 60 * 1000,
    halfOpenRequests: number = 2
  ) {
    this.failureThreshold = failureThreshold;
    this.resetTimeMs = resetTimeMs;
    this.halfOpenRequests = halfOpenRequests;
  }

  canExecute(): boolean {
    this.checkStateTransition();

    if (this.state === "open") {
      return false;
    }

    if (this.state === "half-open") {
      return this.halfOpenAttempts < this.halfOpenRequests;
    }

    return true;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = "closed";
    this.halfOpenAttempts = 0;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === "half-open") {
      this.state = "open";
      this.halfOpenAttempts = 0;
    } else if (this.failures >= this.failureThreshold) {
      this.state = "open";
    }
  }

  getState(): string {
    this.checkStateTransition();
    return this.state;
  }

  private checkStateTransition(): void {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime >= this.resetTimeMs) {
        this.state = "half-open";
        this.halfOpenAttempts = 0;
      }
    }
  }
}

export class EmailService {
  private initialized: boolean = false;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly appUrl: string;
  private readonly rateLimiter: EmailRateLimiter;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly retryConfig: RetryConfig;

  constructor(options?: {
    rateLimitWindowMs?: number;
    rateLimitMaxRequests?: number;
    circuitBreakerThreshold?: number;
    circuitBreakerResetMs?: number;
    retryMaxAttempts?: number;
    retryBaseDelayMs?: number;
    retryMaxDelayMs?: number;
    retryBackoffMultiplier?: number;
  }) {
    const apiKey = process.env.NDGRID_API_KEY || process.env.SENDGRID_API_KEY;
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || "";
    this.fromName = process.env.SENDGRID_FROM_NAME || "TypeMasterAI";
    this.appUrl = process.env.APP_URL || "https://typemasterai.com";

    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.initialized = true;
      console.log("[EmailService] Initialized with SendGrid API");
    } else {
      console.warn("[EmailService] No SendGrid API key found - emails will be logged only");
    }

    this.rateLimiter = new EmailRateLimiter(
      options?.rateLimitWindowMs ?? 60 * 1000,
      options?.rateLimitMaxRequests ?? 5
    );

    this.circuitBreaker = new CircuitBreaker(
      options?.circuitBreakerThreshold ?? 5,
      options?.circuitBreakerResetMs ?? 60 * 1000
    );

    this.retryConfig = {
      maxAttempts: options?.retryMaxAttempts ?? 3,
      baseDelayMs: options?.retryBaseDelayMs ?? 1000,
      maxDelayMs: options?.retryMaxDelayMs ?? 30000,
      backoffMultiplier: options?.retryBackoffMultiplier ?? 2,
    };
  }

  private validateEmail(email: string): boolean {
    if (!email || typeof email !== "string") return false;
    if (email.length > 254) return false;
    return EMAIL_REGEX.test(email);
  }

  private sanitizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private calculateBackoff(attempt: number): number {
    const delay = this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
    const jitter = delay * 0.2 * Math.random();
    return Math.min(delay + jitter, this.retryConfig.maxDelayMs);
  }

  private mapSendGridError(error: any): EmailError {
    const statusCode = error.code || error.response?.statusCode || 500;
    const body = error.response?.body || {};

    if (statusCode === 401) {
      return {
        code: EmailErrorCode.INVALID_API_KEY,
        message: "Invalid SendGrid API key",
        statusCode,
        retryable: false,
      };
    }

    if (statusCode === 403) {
      return {
        code: EmailErrorCode.CONFIGURATION_ERROR,
        message: "SendGrid API access forbidden - check sender authentication",
        statusCode,
        retryable: false,
        details: { body },
      };
    }

    if (statusCode === 429) {
      return {
        code: EmailErrorCode.RATE_LIMITED,
        message: "SendGrid rate limit exceeded",
        statusCode,
        retryable: true,
      };
    }

    if (statusCode >= 500) {
      return {
        code: EmailErrorCode.SERVICE_UNAVAILABLE,
        message: "SendGrid service temporarily unavailable",
        statusCode,
        retryable: true,
      };
    }

    if (body.errors && Array.isArray(body.errors)) {
      const errorMessages = body.errors.map((e: any) => e.message).join("; ");
      const firstError = body.errors[0];

      if (firstError?.field === "to") {
        return {
          code: EmailErrorCode.INVALID_TO_EMAIL,
          message: `Invalid recipient: ${errorMessages}`,
          statusCode,
          retryable: false,
        };
      }

      if (firstError?.field === "from") {
        return {
          code: EmailErrorCode.INVALID_FROM_EMAIL,
          message: `Invalid sender: ${errorMessages}`,
          statusCode,
          retryable: false,
        };
      }
    }

    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      return {
        code: EmailErrorCode.NETWORK_ERROR,
        message: `Network error: ${error.message}`,
        statusCode: 0,
        retryable: true,
      };
    }

    return {
      code: EmailErrorCode.SEND_FAILED,
      message: error.message || "Failed to send email",
      statusCode,
      retryable: statusCode >= 500,
      details: { body, originalError: error.message },
    };
  }

  async send(options: EmailOptions): Promise<EmailSendResult> {
    const startTime = Date.now();
    const sanitizedTo = this.sanitizeEmail(options.to);

    if (!this.validateEmail(sanitizedTo)) {
      return {
        success: false,
        timestamp: new Date(),
        attempts: 0,
        error: {
          code: EmailErrorCode.INVALID_TO_EMAIL,
          message: "Invalid recipient email address",
          retryable: false,
        },
      };
    }

    if (!this.fromEmail || !this.validateEmail(this.fromEmail)) {
      console.error("[EmailService] Invalid or missing SENDGRID_FROM_EMAIL");
      return {
        success: false,
        timestamp: new Date(),
        attempts: 0,
        error: {
          code: EmailErrorCode.INVALID_FROM_EMAIL,
          message: "Invalid sender email configuration",
          retryable: false,
        },
      };
    }

    if (!this.rateLimiter.canSend(sanitizedTo)) {
      const resetTime = this.rateLimiter.getResetTime(sanitizedTo);
      return {
        success: false,
        timestamp: new Date(),
        attempts: 0,
        error: {
          code: EmailErrorCode.RATE_LIMITED,
          message: "Too many emails sent to this address. Please try again later.",
          retryable: false,
          details: { resetTime },
        },
      };
    }

    if (!this.circuitBreaker.canExecute()) {
      return {
        success: false,
        timestamp: new Date(),
        attempts: 0,
        error: {
          code: EmailErrorCode.SERVICE_UNAVAILABLE,
          message: "Email service temporarily unavailable due to repeated failures",
          retryable: true,
          details: { circuitState: this.circuitBreaker.getState() },
        },
      };
    }

    if (!this.initialized) {
      console.log("[EmailService] Development mode - logging email instead of sending");
      console.log(`[EmailService] To: ${sanitizedTo}`);
      console.log(`[EmailService] Subject: ${options.subject}`);
      console.log(`[EmailService] Text: ${options.text || "(HTML only)"}`);
      
      this.rateLimiter.recordSend(sanitizedTo);
      
      return {
        success: true,
        messageId: `dev-${Date.now()}`,
        timestamp: new Date(),
        attempts: 1,
      };
    }

    const msg = {
      to: sanitizedTo,
      from: {
        email: this.fromEmail,
        name: this.fromName,
      },
      subject: options.subject,
      html: options.html,
      text: options.text || this.htmlToText(options.html),
      replyTo: options.replyTo,
      categories: options.category,
      customArgs: options.customArgs,
      sendAt: options.sendAt,
      batchId: options.batchId,
    };

    let lastError: EmailError | undefined;
    let attempts = 0;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      attempts = attempt;

      try {
        const [response] = await sgMail.send(msg);
        
        this.circuitBreaker.recordSuccess();
        this.rateLimiter.recordSend(sanitizedTo);

        const messageId = response.headers["x-message-id"] || `sg-${Date.now()}`;
        
        console.log(`[EmailService] Email sent successfully to ${sanitizedTo} (attempt ${attempt}, messageId: ${messageId})`);

        return {
          success: true,
          messageId,
          timestamp: new Date(),
          attempts,
        };
      } catch (error: any) {
        lastError = this.mapSendGridError(error);
        
        console.error(`[EmailService] Send attempt ${attempt} failed:`, {
          code: lastError.code,
          message: lastError.message,
          statusCode: lastError.statusCode,
          retryable: lastError.retryable,
        });

        this.circuitBreaker.recordFailure();

        if (!lastError.retryable || attempt >= this.retryConfig.maxAttempts) {
          break;
        }

        const backoffMs = this.calculateBackoff(attempt);
        console.log(`[EmailService] Retrying in ${backoffMs}ms...`);
        await this.sleep(backoffMs);
      }
    }

    console.error(`[EmailService] All ${attempts} attempts failed for ${sanitizedTo}`);

    return {
      success: false,
      timestamp: new Date(),
      attempts,
      error: lastError,
    };
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li[^>]*>/gi, "  • ")
      .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "$2 ($1)")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    options?: {
      username?: string;
      ipAddress?: string;
      userAgent?: string;
      expiresInMinutes?: number;
    }
  ): Promise<EmailSendResult> {
    const resetUrl = `${this.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const expiresIn = options?.expiresInMinutes ?? 60;

    const html = this.generatePasswordResetEmailHtml({
      resetUrl,
      username: options?.username,
      expiresInMinutes: expiresIn,
      ipAddress: options?.ipAddress,
      requestTime: new Date().toISOString(),
    });

    return this.send({
      to: email,
      subject: "Reset Your Password - TypeMasterAI",
      html,
      category: ["password_reset", "transactional"],
      customArgs: {
        email_type: "password_reset",
        user_email: email,
      },
    });
  }

  async sendEmailVerificationEmail(
    email: string,
    token: string,
    options?: {
      username?: string;
    }
  ): Promise<EmailSendResult> {
    const verifyUrl = `${this.appUrl}/verify-email?token=${encodeURIComponent(token)}`;

    const html = this.generateEmailVerificationHtml({
      verifyUrl,
      username: options?.username,
    });

    return this.send({
      to: email,
      subject: "Verify Your Email - TypeMasterAI",
      html,
      category: ["email_verification", "transactional"],
      customArgs: {
        email_type: "email_verification",
        user_email: email,
      },
    });
  }

  async sendPasswordChangedEmail(
    email: string,
    options?: {
      username?: string;
      ipAddress?: string;
    }
  ): Promise<EmailSendResult> {
    const html = this.generatePasswordChangedEmailHtml({
      username: options?.username,
      ipAddress: options?.ipAddress,
      changedAt: new Date().toISOString(),
    });

    return this.send({
      to: email,
      subject: "Your Password Was Changed - TypeMasterAI",
      html,
      category: ["security_alert", "transactional"],
      customArgs: {
        email_type: "password_changed",
        user_email: email,
      },
    });
  }

  private generatePasswordChangedEmailHtml(params: {
    username?: string;
    ipAddress?: string;
    changedAt: string;
  }): string {
    const greeting = params.username ? `Hi ${params.username},` : "Hi,";
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="referrer" content="no-referrer">
  <title>Password Changed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0b; color: #fafafa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0b;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #18181b; border-radius: 16px; border: 1px solid #27272a;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">🔐</span>
              </div>
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #fafafa;">Password Changed</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #a1a1aa;">
                ${greeting}
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #a1a1aa;">
                Your TypeMasterAI account password was successfully changed.
              </p>
              
              <!-- Security Info -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 20px; background-color: #27272a; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-size: 13px; color: #71717a;">
                      <strong style="color: #a1a1aa;">Change Details:</strong><br>
                      ${params.ipAddress ? `IP Address: ${params.ipAddress}<br>` : ""}
                      Time: ${new Date(params.changedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Warning -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 20px; background-color: #422006; border-radius: 12px; border: 1px solid #854d0e;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-size: 14px; color: #fbbf24;">
                      <strong>⚠️ Didn't make this change?</strong><br>
                      <span style="color: #fcd34d;">If you didn't change your password, your account may have been compromised. Please contact support immediately and secure your account.</span>
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                For your security, all other sessions have been logged out.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #27272a;">
              <p style="margin: 0; font-size: 13px; color: #52525b; text-align: center;">
                © ${new Date().getFullYear()} TypeMasterAI. All rights reserved.<br>
                <a href="${this.appUrl}" style="color: #6366f1; text-decoration: none;">typemasterai.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private generatePasswordResetEmailHtml(params: {
    resetUrl: string;
    username?: string;
    expiresInMinutes: number;
    ipAddress?: string;
    requestTime: string;
  }): string {
    const greeting = params.username ? `Hi ${params.username},` : "Hi,";
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0b; color: #fafafa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0b;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #18181b; border-radius: 16px; border: 1px solid #27272a;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">⌨️</span>
              </div>
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #fafafa;">Reset Your Password</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #a1a1aa;">
                ${greeting}
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #a1a1aa;">
                We received a request to reset your password for your TypeMasterAI account. Click the button below to create a new password:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 20px 0;" align="center">
                    <a href="${params.resetUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                This link will expire in <strong style="color: #a1a1aa;">${params.expiresInMinutes} minutes</strong> for security reasons.
              </p>
              
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #71717a;">
                If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
              
              <!-- Security Info -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 20px; background-color: #27272a; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-size: 13px; color: #71717a;">
                      <strong style="color: #a1a1aa;">Security Information:</strong><br>
                      ${params.ipAddress ? `Request IP: ${params.ipAddress}<br>` : ""}
                      Request Time: ${new Date(params.requestTime).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Fallback URL -->
              <p style="margin: 24px 0 0; font-size: 12px; line-height: 1.6; color: #52525b;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${params.resetUrl}" style="color: #6366f1; word-break: break-all;">${params.resetUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #27272a;">
              <p style="margin: 0; font-size: 13px; color: #52525b; text-align: center;">
                © ${new Date().getFullYear()} TypeMasterAI. All rights reserved.<br>
                <a href="${this.appUrl}" style="color: #6366f1; text-decoration: none;">typemasterai.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private generateEmailVerificationHtml(params: {
    verifyUrl: string;
    username?: string;
  }): string {
    const greeting = params.username ? `Welcome ${params.username}!` : "Welcome!";
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0b; color: #fafafa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0b;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #18181b; border-radius: 16px; border: 1px solid #27272a;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">✉️</span>
              </div>
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #fafafa;">Verify Your Email</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #fafafa;">
                ${greeting}
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #a1a1aa;">
                Thanks for signing up for TypeMasterAI! Please verify your email address to get started on your typing journey.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 20px 0;" align="center">
                    <a href="${params.verifyUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                This link will expire in <strong style="color: #a1a1aa;">24 hours</strong>.
              </p>
              
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #71717a;">
                If you didn't create an account with TypeMasterAI, you can safely ignore this email.
              </p>
              
              <!-- Features Teaser -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 20px; background-color: #27272a; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #fafafa;">
                      What awaits you:
                    </p>
                    <ul style="margin: 0; padding: 0 0 0 20px; color: #a1a1aa; font-size: 14px; line-height: 1.8;">
                      <li>Real-time typing analytics and progress tracking</li>
                      <li>Multiplayer racing with players worldwide</li>
                      <li>AI-powered practice recommendations</li>
                      <li>Achievements and leaderboards</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <!-- Fallback URL -->
              <p style="margin: 24px 0 0; font-size: 12px; line-height: 1.6; color: #52525b;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${params.verifyUrl}" style="color: #22c55e; word-break: break-all;">${params.verifyUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #27272a;">
              <p style="margin: 0; font-size: 13px; color: #52525b; text-align: center;">
                © ${new Date().getFullYear()} TypeMasterAI. All rights reserved.<br>
                <a href="${this.appUrl}" style="color: #6366f1; text-decoration: none;">typemasterai.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  isConfigured(): boolean {
    return this.initialized && !!this.fromEmail;
  }

  getServiceStatus(): {
    configured: boolean;
    circuitBreakerState: string;
    fromEmail: string;
  } {
    return {
      configured: this.isConfigured(),
      circuitBreakerState: this.circuitBreaker.getState(),
      fromEmail: this.fromEmail ? `${this.fromEmail.substring(0, 3)}***` : "not set",
    };
  }
}

export const emailService = new EmailService({
  rateLimitWindowMs: 60 * 1000,
  rateLimitMaxRequests: 3,
  circuitBreakerThreshold: 5,
  circuitBreakerResetMs: 60 * 1000,
  retryMaxAttempts: 3,
  retryBaseDelayMs: 1000,
  retryMaxDelayMs: 30000,
});
