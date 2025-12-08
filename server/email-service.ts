import formData from "form-data";
import Mailgun from "mailgun.js";

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
  private mg: any;
  private readonly domain: string;

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
    const apiKey = process.env.MAILGUN_API_KEY;
    this.fromEmail = process.env.MAILGUN_FROM_EMAIL || "no-reply@typemasterai.com";
    this.fromName = process.env.MAILGUN_FROM_NAME || "TypeMasterAI";
    this.domain = process.env.MAILGUN_DOMAIN || "sandbox3f76c67c33064dd69234ec4b94f9895c.mailgun.org";
    this.appUrl = process.env.APP_URL || "https://typemasterai.com";

    if (apiKey) {
      const mailgun = new Mailgun(formData);
      this.mg = mailgun.client({
        username: 'api',
        key: apiKey,
        url: 'https://api.mailgun.net'
      });
      this.initialized = true;
      console.log("[EmailService] Initialized with Mailgun API");
      console.log(`[EmailService] From Email: ${this.fromEmail}`);
      console.log(`[EmailService] From Name: ${this.fromName}`);
      console.log(`[EmailService] Domain: ${this.domain}`);
      console.log(`[EmailService] API Key length: ${apiKey.length}`);
    } else {
      console.warn("[EmailService] No Mailgun API key found - emails will be logged only");
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

  private mapMailgunError(error: any): EmailError {
    const statusCode = error.status || error.response?.status || 500;
    const errorMessage = error.message || error.response?.data?.message || "Unknown error";

    if (statusCode === 401) {
      return {
        code: EmailErrorCode.INVALID_API_KEY,
        message: "Invalid Mailgun API key",
        statusCode,
        retryable: false,
      };
    }

    if (statusCode === 403) {
      return {
        code: EmailErrorCode.CONFIGURATION_ERROR,
        message: "Mailgun API access forbidden - check sender authentication",
        statusCode,
        retryable: false,
        details: { error: errorMessage },
      };
    }

    if (statusCode === 429) {
      return {
        code: EmailErrorCode.RATE_LIMITED,
        message: "Mailgun rate limit exceeded",
        statusCode,
        retryable: true,
      };
    }

    if (statusCode >= 500) {
      return {
        code: EmailErrorCode.SERVICE_UNAVAILABLE,
        message: "Mailgun service temporarily unavailable",
        statusCode,
        retryable: true,
      };
    }

    if (errorMessage.includes("to parameter") || errorMessage.includes("invalid recipient")) {
      return {
        code: EmailErrorCode.INVALID_TO_EMAIL,
        message: `Invalid recipient: ${errorMessage}`,
        statusCode,
        retryable: false,
      };
    }

    if (errorMessage.includes("from parameter") || errorMessage.includes("invalid sender")) {
      return {
        code: EmailErrorCode.INVALID_FROM_EMAIL,
        message: `Invalid sender: ${errorMessage}`,
        statusCode,
        retryable: false,
      };
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
      message: errorMessage || "Failed to send email",
      statusCode,
      retryable: statusCode >= 500,
      details: { originalError: errorMessage },
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
      console.error("[EmailService] Invalid or missing MAILGUN_FROM_EMAIL");
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

    const msg: any = {
      from: `${this.fromName} <${this.fromEmail}>`,
      to: [sanitizedTo],
      subject: options.subject,
      html: options.html,
      text: options.text || this.htmlToText(options.html),
      'o:tracking': 'no',
      'o:tracking-clicks': 'no',
      'o:tracking-opens': 'no',
      'h:X-Mailer': 'TypeMasterAI Email Service',
      'h:List-Unsubscribe': `<mailto:support@typemasterai.com?subject=Unsubscribe>`,
      'h:List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    };

    if (options.replyTo) {
      msg['h:Reply-To'] = options.replyTo;
    }

    if (options.category && options.category.length > 0) {
      msg['o:tag'] = options.category;
    }

    if (options.customArgs) {
      Object.entries(options.customArgs).forEach(([key, value]) => {
        msg[`v:${key}`] = value;
      });
    }

    if (options.sendAt) {
      msg['o:deliverytime'] = new Date(options.sendAt * 1000).toUTCString();
    }

    if (options.batchId) {
      msg['v:batch_id'] = options.batchId;
    }

    console.log(`[EmailService] Attempting to send email:`, {
      to: sanitizedTo,
      from: this.fromEmail,
      fromName: this.fromName,
      subject: options.subject,
      domain: this.domain,
      initialized: this.initialized,
    });

    let lastError: EmailError | undefined;
    let attempts = 0;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      attempts = attempt;

      try {
        const response = await this.mg.messages.create(this.domain, msg);
        
        this.circuitBreaker.recordSuccess();
        this.rateLimiter.recordSend(sanitizedTo);

        const messageId = response.id || `mg-${Date.now()}`;
        
        console.log(`[EmailService] Email sent successfully to ${sanitizedTo} (attempt ${attempt}, messageId: ${messageId})`);

        return {
          success: true,
          messageId,
          timestamp: new Date(),
          attempts,
        };
      } catch (error: any) {
        lastError = this.mapMailgunError(error);
        
        console.error(`[EmailService] Send attempt ${attempt} failed:`, {
          code: lastError.code,
          message: lastError.message,
          statusCode: lastError.statusCode,
          retryable: lastError.retryable,
        });
        
        if (error.response?.data) {
          console.error(`[EmailService] Mailgun error data:`, JSON.stringify(error.response.data, null, 2));
        }

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
      timezone?: string;
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
      timezone: options?.timezone,
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
      timezone?: string;
    }
  ): Promise<EmailSendResult> {
    const html = this.generatePasswordChangedEmailHtml({
      username: options?.username,
      ipAddress: options?.ipAddress,
      changedAt: new Date().toISOString(),
      timezone: options?.timezone,
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
    timezone?: string;
  }): string {
    const greeting = params.username ? `Hi ${params.username},` : "Hi there,";
    const formattedDate = new Date(params.changedAt).toLocaleString("en-US", { 
      weekday: "long",
      year: "numeric",
      month: "long", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: params.timezone || "UTC",
    });
    
    return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="referrer" content="no-referrer">
  <title>Password Changed Successfully</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Container -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 40px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="background-color: #ffffff; width: 48px; height: 48px; border-radius: 12px; text-align: center; vertical-align: middle;">
                          <span style="font-size: 24px; line-height: 48px;">⌨️</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">TypeMasterAI</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Success Icon Banner -->
          <tr>
            <td style="background-color: #dcfce7; padding: 24px 40px; text-align: center; border-bottom: 1px solid #bbf7d0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width: 56px; height: 56px; background-color: #22c55e; border-radius: 50%; text-align: center; vertical-align: middle;">
                          <span style="font-size: 28px; line-height: 56px; color: #ffffff;">✓</span>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 16px 0 0; font-size: 20px; font-weight: 600; color: #166534;">Password Changed Successfully</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #18181b;">
                ${greeting}
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                Your TypeMasterAI account password has been successfully updated. You can now use your new password to sign in.
              </p>
              
              <!-- Change Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #f4f4f5; border-radius: 12px; padding: 20px; border-left: 4px solid #6366f1;">
                    <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Change Details</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding: 4px 0;">
                          <span style="font-size: 14px; color: #71717a;">Date & Time:</span>
                        </td>
                        <td style="padding: 4px 0; text-align: right;">
                          <span style="font-size: 14px; font-weight: 500; color: #18181b;">${formattedDate}</span>
                        </td>
                      </tr>
                      ${params.ipAddress ? `
                      <tr>
                        <td style="padding: 4px 0;">
                          <span style="font-size: 14px; color: #71717a;">IP Address:</span>
                        </td>
                        <td style="padding: 4px 0; text-align: right;">
                          <span style="font-size: 14px; font-weight: 500; color: #18181b;">${params.ipAddress}</span>
                        </td>
                      </tr>
                      ` : ""}
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #52525b;">
                For your security, all other active sessions have been automatically logged out.
              </p>
              
              <!-- Warning Alert -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #fef3c7; border-radius: 12px; padding: 20px; border: 1px solid #fcd34d;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width: 24px; vertical-align: top; padding-right: 12px;">
                          <span style="font-size: 20px;">⚠️</span>
                        </td>
                        <td>
                          <p style="margin: 0 0 4px; font-size: 14px; font-weight: 600; color: #92400e;">Didn't make this change?</p>
                          <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #a16207;">
                            If you didn't change your password, your account may have been compromised. Please <a href="${this.appUrl}/forgot-password" style="color: #b45309; font-weight: 600;">reset your password immediately</a> and contact our support team.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding: 8px 0;">
                    <a href="${this.appUrl}/login" style="display: inline-block; padding: 14px 32px; background-color: #6366f1; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px; mso-padding-alt: 0;">
                      <!--[if mso]>
                      <i style="mso-font-width: 200%; mso-text-raise: 24pt;">&nbsp;</i>
                      <![endif]-->
                      <span style="mso-text-raise: 12pt;">Sign In to Your Account</span>
                      <!--[if mso]>
                      <i style="mso-font-width: 200%;">&nbsp;</i>
                      <![endif]-->
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e4e4e7;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px; font-size: 14px; color: #71717a;">
                      Need help? <a href="${this.appUrl}/contact" style="color: #6366f1; text-decoration: none; font-weight: 500;">Contact Support</a>
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                      © ${new Date().getFullYear()} TypeMasterAI. All rights reserved.<br>
                      <a href="${this.appUrl}" style="color: #a1a1aa; text-decoration: none;">typemasterai.com</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        
        <!-- Security Note -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="padding: 24px 20px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                This is an automated security notification. Please do not reply to this email.<br>
                If you have any questions, visit our <a href="${this.appUrl}/help" style="color: #6366f1; text-decoration: none;">Help Center</a>.
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
    timezone?: string;
  }): string {
    const greeting = params.username ? `Hi ${params.username},` : "Hi there,";
    const formattedTime = new Date(params.requestTime).toLocaleString("en-US", { 
      weekday: "long",
      year: "numeric",
      month: "long", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: params.timezone || "UTC",
    });
    
    return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="referrer" content="no-referrer">
  <title>Reset Your Password</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Container -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 40px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="background-color: #ffffff; width: 48px; height: 48px; border-radius: 12px; text-align: center; vertical-align: middle;">
                          <span style="font-size: 24px; line-height: 48px;">⌨️</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">TypeMasterAI</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #eef2ff; padding: 28px 40px; text-align: center; border-bottom: 1px solid #c7d2fe;">
              <p style="margin: 0; font-size: 22px; font-weight: 600; color: #4338ca;">Password Reset Request</p>
              <p style="margin: 8px 0 0; font-size: 14px; color: #6366f1;">Secure your account with a new password</p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #18181b;">
                ${greeting}
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                We received a request to reset your password for your TypeMasterAI account. Click the button below to create a new password:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding: 16px 0 24px;">
                    <a href="${params.resetUrl}" style="display: inline-block; padding: 16px 40px; background-color: #6366f1; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; mso-padding-alt: 0;">
                      <!--[if mso]>
                      <i style="mso-font-width: 200%; mso-text-raise: 24pt;">&nbsp;</i>
                      <![endif]-->
                      <span style="mso-text-raise: 12pt;">Reset My Password</span>
                      <!--[if mso]>
                      <i style="mso-font-width: 200%;">&nbsp;</i>
                      <![endif]-->
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Expiry Notice -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #fef3c7; border-radius: 8px; padding: 14px 16px; text-align: center;">
                    <p style="margin: 0; font-size: 14px; color: #92400e;">
                      <span style="font-weight: 600;">⏱ This link expires in ${params.expiresInMinutes} minutes</span> for your security.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Security Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #f4f4f5; border-radius: 12px; padding: 20px; border-left: 4px solid #6366f1;">
                    <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Request Details</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding: 4px 0;">
                          <span style="font-size: 14px; color: #71717a;">Date & Time:</span>
                        </td>
                        <td style="padding: 4px 0; text-align: right;">
                          <span style="font-size: 14px; font-weight: 500; color: #18181b;">${formattedTime}</span>
                        </td>
                      </tr>
                      ${params.ipAddress ? `
                      <tr>
                        <td style="padding: 4px 0;">
                          <span style="font-size: 14px; color: #71717a;">IP Address:</span>
                        </td>
                        <td style="padding: 4px 0; text-align: right;">
                          <span style="font-size: 14px; font-weight: 500; color: #18181b;">${params.ipAddress}</span>
                        </td>
                      </tr>
                      ` : ""}
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Safety Note -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #f0fdf4; border-radius: 12px; padding: 16px; border: 1px solid #bbf7d0;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #166534;">
                      <strong>Didn't request this?</strong> You can safely ignore this email. Your password will remain unchanged and no action is needed.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-top: 1px solid #e4e4e7; padding-top: 20px;">
                    <p style="margin: 0 0 8px; font-size: 13px; color: #71717a;">
                      If the button doesn't work, copy and paste this link into your browser:
                    </p>
                    <p style="margin: 0; font-size: 12px; word-break: break-all;">
                      <a href="${params.resetUrl}" style="color: #6366f1; text-decoration: none;">${params.resetUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e4e4e7;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px; font-size: 14px; color: #71717a;">
                      Need help? <a href="${this.appUrl}/contact" style="color: #6366f1; text-decoration: none; font-weight: 500;">Contact Support</a>
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                      © ${new Date().getFullYear()} TypeMasterAI. All rights reserved.<br>
                      <a href="${this.appUrl}" style="color: #a1a1aa; text-decoration: none;">typemasterai.com</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        
        <!-- Security Note -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="padding: 24px 20px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                This is an automated security notification. Please do not reply to this email.<br>
                If you have any questions, visit our <a href="${this.appUrl}/help" style="color: #6366f1; text-decoration: none;">Help Center</a>.
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
    const greeting = params.username ? `Welcome, ${params.username}!` : "Welcome!";
    
    return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="referrer" content="no-referrer">
  <title>Verify Your Email - TypeMasterAI</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Container -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 40px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="background-color: #ffffff; width: 48px; height: 48px; border-radius: 12px; text-align: center; vertical-align: middle;">
                          <span style="font-size: 24px; line-height: 48px;">⌨️</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">TypeMasterAI</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Welcome Banner -->
          <tr>
            <td style="background-color: #dbeafe; padding: 24px 40px; text-align: center; border-bottom: 1px solid #bfdbfe;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width: 56px; height: 56px; background-color: #3b82f6; border-radius: 50%; text-align: center; vertical-align: middle;">
                          <span style="font-size: 28px; line-height: 56px; color: #ffffff;">✉️</span>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 16px 0 0; font-size: 20px; font-weight: 600; color: #1e40af;">Verify Your Email Address</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 8px; font-size: 20px; font-weight: 600; line-height: 1.4; color: #18181b;">
                ${greeting}
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                Thanks for signing up for TypeMasterAI! Please verify your email address to complete your registration and unlock all features.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${params.verifyUrl}" style="height:52px;v-text-anchor:middle;width:220px;" arcsize="12%" stroke="f" fillcolor="#22c55e">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:600;">Verify Email Address</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${params.verifyUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.3); transition: transform 0.2s;">
                      Verify Email Address
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
              
              <!-- Expiry Notice -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #fef3c7; border-radius: 12px; padding: 16px 20px; border-left: 4px solid #f59e0b;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width: 24px; vertical-align: top;">
                          <span style="font-size: 16px;">⏰</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #92400e;">
                            This verification link will expire in <strong>24 hours</strong>. If it expires, you can request a new one from the login page.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Features Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #f4f4f5; border-radius: 12px; padding: 24px; border-left: 4px solid #6366f1;">
                    <p style="margin: 0 0 16px; font-size: 15px; font-weight: 600; color: #18181b;">
                      🎉 Here's what awaits you:
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding: 6px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="width: 24px; vertical-align: top;">
                                <span style="color: #22c55e; font-size: 14px;">✓</span>
                              </td>
                              <td style="padding-left: 8px;">
                                <span style="font-size: 14px; color: #3f3f46;">Real-time typing analytics & progress tracking</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="width: 24px; vertical-align: top;">
                                <span style="color: #22c55e; font-size: 14px;">✓</span>
                              </td>
                              <td style="padding-left: 8px;">
                                <span style="font-size: 14px; color: #3f3f46;">Multiplayer racing with players worldwide</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="width: 24px; vertical-align: top;">
                                <span style="color: #22c55e; font-size: 14px;">✓</span>
                              </td>
                              <td style="padding-left: 8px;">
                                <span style="font-size: 14px; color: #3f3f46;">AI-powered practice recommendations</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="width: 24px; vertical-align: top;">
                                <span style="color: #22c55e; font-size: 14px;">✓</span>
                              </td>
                              <td style="padding-left: 8px;">
                                <span style="font-size: 14px; color: #3f3f46;">Achievements, challenges & leaderboards</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Safety Note -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #f0fdf4; border-radius: 12px; padding: 16px 20px; border-left: 4px solid #22c55e;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width: 24px; vertical-align: top;">
                          <span style="font-size: 16px;">💡</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #166534;">
                            If you didn't create an account with TypeMasterAI, you can safely ignore this email. No action is required.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Fallback URL -->
              <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #71717a;">
                If the button above doesn't work, copy and paste this link into your browser:<br>
                <a href="${params.verifyUrl}" style="color: #6366f1; word-break: break-all; text-decoration: none;">${params.verifyUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; border-top: 1px solid #e4e4e7;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px; font-size: 14px; color: #71717a;">
                      Need help? <a href="${this.appUrl}/help" style="color: #6366f1; text-decoration: none; font-weight: 500;">Visit our Help Center</a>
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                      © ${new Date().getFullYear()} TypeMasterAI. All rights reserved.<br>
                      <a href="${this.appUrl}" style="color: #a1a1aa; text-decoration: none;">typemasterai.com</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        
        <!-- Security Note -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="padding: 24px 20px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                This is an automated email from TypeMasterAI. Please do not reply to this email.<br>
                If you have any questions, visit our <a href="${this.appUrl}/help" style="color: #6366f1; text-decoration: none;">Help Center</a>.
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

  async sendFeedbackResolutionEmail(
    email: string,
    options: {
      feedbackId: number;
      subject: string;
      resolutionNotes?: string;
      username?: string;
      status: string;
    }
  ): Promise<EmailSendResult> {
    const feedbackUrl = `${this.appUrl}/feedback/${options.feedbackId}`;
    const statusLabel = options.status === 'resolved' ? 'Resolved' : 'Closed';
    const statusColor = options.status === 'resolved' ? '#22c55e' : '#3b82f6';
    
    const html = this.generateFeedbackResolutionEmailHtml({
      feedbackUrl,
      feedbackId: options.feedbackId,
      subject: options.subject,
      resolutionNotes: options.resolutionNotes,
      username: options.username,
      statusLabel,
      statusColor,
    });

    return this.send({
      to: email,
      subject: `Your Feedback Has Been ${statusLabel} - TypeMasterAI`,
      html,
      category: ["feedback_resolution", "transactional"],
      customArgs: {
        email_type: "feedback_resolution",
        feedback_id: options.feedbackId.toString(),
        user_email: email,
      },
    });
  }

  private generateFeedbackResolutionEmailHtml(params: {
    feedbackUrl: string;
    feedbackId: number;
    subject: string;
    resolutionNotes?: string;
    username?: string;
    statusLabel: string;
    statusColor: string;
  }): string {
    const greeting = params.username ? `Hi ${params.username},` : "Hi there,";
    
    return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="referrer" content="no-referrer">
  <title>Feedback ${params.statusLabel} - TypeMasterAI</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Container -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 40px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="background-color: #ffffff; width: 48px; height: 48px; border-radius: 12px; text-align: center; vertical-align: middle;">
                          <span style="font-size: 24px; line-height: 48px;">⌨️</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">TypeMasterAI</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Status Banner -->
          <tr>
            <td style="background-color: #dcfce7; padding: 24px 40px; text-align: center; border-bottom: 1px solid #bbf7d0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width: 56px; height: 56px; background-color: ${params.statusColor}; border-radius: 50%; text-align: center; vertical-align: middle;">
                          <span style="font-size: 28px; line-height: 56px; color: #ffffff;">✓</span>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 16px 0 0; font-size: 20px; font-weight: 600; color: #166534;">Feedback ${params.statusLabel}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #18181b;">
                ${greeting}
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                Thank you for sharing your feedback with us! We're writing to let you know that your feedback has been ${params.statusLabel.toLowerCase()}.
              </p>
              
              <!-- Feedback Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #f4f4f5; border-radius: 12px; padding: 20px; border-left: 4px solid #6366f1;">
                    <p style="margin: 0 0 8px; font-size: 13px; font-weight: 500; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">
                      Your Feedback
                    </p>
                    <p style="margin: 0 0 4px; font-size: 16px; font-weight: 600; color: #18181b;">
                      ${params.subject}
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #71717a;">
                      Feedback ID: #${params.feedbackId}
                    </p>
                  </td>
                </tr>
              </table>
              ${params.resolutionNotes ? `
              <!-- Resolution Notes -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #f0fdf4; border-radius: 12px; padding: 20px; border-left: 4px solid #22c55e;">
                    <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #166534;">
                      Resolution Details
                    </p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #166534;">
                      ${params.resolutionNotes}
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="padding: 8px 0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${params.feedbackUrl}" style="height:52px;v-text-anchor:middle;width:200px;" arcsize="12%" stroke="f" fillcolor="#6366f1">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:600;">View Full Details</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${params.feedbackUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);">
                      View Full Details
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
              
              <!-- Thank You Note -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background-color: #fef3c7; border-radius: 12px; padding: 20px; border-left: 4px solid #f59e0b;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width: 24px; vertical-align: top;">
                          <span style="font-size: 16px;">💙</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #92400e;">
                            Your feedback helps us improve TypeMasterAI for everyone. We truly appreciate you taking the time to share your thoughts with us!
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e4e4e7;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px; font-size: 14px; color: #71717a;">
                      Have more feedback? <a href="${this.appUrl}/feedback" style="color: #6366f1; text-decoration: none; font-weight: 500;">Share it with us</a>
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                      © ${new Date().getFullYear()} TypeMasterAI. All rights reserved.<br>
                      <a href="${this.appUrl}" style="color: #a1a1aa; text-decoration: none;">typemasterai.com</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        
        <!-- Footer Note -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="padding: 24px 20px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                This is an automated notification email. Please do not reply to this email.<br>
                If you have questions, visit our <a href="${this.appUrl}/help" style="color: #6366f1; text-decoration: none;">Help Center</a>.
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
