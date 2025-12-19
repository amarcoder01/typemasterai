/**
 * Certificate Verification Service
 * 
 * Production-ready, cryptographically secure certificate verification system.
 * 
 * Security Features:
 * - HMAC-SHA256 signatures for tamper detection
 * - Cryptographically secure verification ID generation
 * - Constant-time comparison to prevent timing attacks
 * - Rate limiting support
 * - Comprehensive audit logging
 * 
 * @module certificate-verification-service
 */

import crypto from 'crypto';
import type { Certificate, VerificationResponse, InsertCertificateVerificationLog } from '@shared/schema';

// Configuration
const ISSUER_NAME = 'TypeMasterAI';
const ISSUER_URL = 'https://typemasterai.com';
const ISSUER_VERSION = '1.0';
const VERIFICATION_ID_PREFIX = 'TM';

// Character set for verification IDs (excludes ambiguous characters: 0, O, I, 1, L)
const VERIFICATION_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Get the certificate signing secret from environment
 * In production, this MUST be set - falls back to dev secret only in development
 */
function getSigningSecret(): string {
  const secret = process.env.CERTIFICATE_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!secret) {
    if (isProduction) {
      // In production, throw an error - certificates MUST be properly signed
      throw new Error('[CertVerification] CRITICAL: CERTIFICATE_SECRET environment variable is required in production.');
    }
    console.warn('[CertVerification] WARNING: CERTIFICATE_SECRET not set. Using development fallback. DO NOT use in production!');
    // Development fallback - NEVER use in production
    return 'dev-certificate-secret-not-for-production-use-32chars';
  }
  
  if (secret.length < 32) {
    console.warn('[CertVerification] WARNING: CERTIFICATE_SECRET should be at least 32 characters for security.');
  }
  
  return secret;
}

/**
 * Generate a cryptographically secure verification ID
 * Format: TM-XXXX-XXXX-XXXX (19 characters total)
 * 
 * Uses crypto.randomBytes for true randomness and base32-like encoding
 * with an unambiguous character set.
 * 
 * @returns Unique verification ID
 */
export function generateVerificationId(): string {
  const bytes = crypto.randomBytes(9); // 72 bits of entropy
  let id = '';
  
  for (let i = 0; i < 12; i++) {
    // Use 6 bits per character (allowing for 32 characters in charset)
    const bitOffset = i * 6;
    const byteIndex = Math.floor(bitOffset / 8);
    const bitIndex = bitOffset % 8;
    
    let value: number;
    if (bitIndex <= 2) {
      // Can get all 6 bits from one byte
      value = (bytes[byteIndex] >> (2 - bitIndex)) & 0x3F;
    } else {
      // Need to span two bytes
      const highBits = (bytes[byteIndex] << (bitIndex - 2)) & 0x3F;
      const lowBits = byteIndex + 1 < bytes.length 
        ? (bytes[byteIndex + 1] >> (10 - bitIndex)) 
        : 0;
      value = highBits | lowBits;
    }
    
    id += VERIFICATION_CHARSET[value % VERIFICATION_CHARSET.length];
  }
  
  // Format as TM-XXXX-XXXX-XXXX
  return `${VERIFICATION_ID_PREFIX}-${id.slice(0, 4)}-${id.slice(4, 8)}-${id.slice(8, 12)}`;
}

/**
 * Validate verification ID format
 * Accepts both old format (TM-XXXX-XXXX) and new format (TM-XXXX-XXXX-XXXX)
 * @param verificationId - ID to validate
 * @returns true if format is valid
 */
export function isValidVerificationIdFormat(verificationId: string): boolean {
  if (!verificationId || typeof verificationId !== 'string') {
    return false;
  }
  
  const id = verificationId.toUpperCase().trim();
  
  // New format: TM-XXXX-XXXX-XXXX (3 groups of 4 alphanumeric characters)
  const newPattern = /^TM-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  
  // Old/legacy format: TM-XXXX-XXXX (2 groups of 4 alphanumeric characters)
  const legacyPattern = /^TM-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  
  return newPattern.test(id) || legacyPattern.test(id);
}

/**
 * Certificate data payload for signing
 * Includes all critical fields that must be protected from tampering
 */
interface SignaturePayload {
  verificationId: string;
  userId: string;
  certificateType: string;
  wpm: number;
  accuracy: number;
  consistency: number;
  duration: number;
  testResultId?: number | null;
  codeTestId?: number | null;
  bookTestId?: number | null;
  raceId?: number | null;
  dictationTestId?: number | null;
  stressTestId?: number | null;
  issuedAt: string;
  metadata?: Record<string, any> | null;
}

/**
 * Generate HMAC-SHA256 signature for certificate data
 * 
 * @param payload - Certificate data to sign
 * @returns Hex-encoded HMAC signature
 */
export function generateSignature(payload: SignaturePayload): string {
  const secret = getSigningSecret();
  
  // Normalize and serialize the payload deterministically
  const normalizedPayload = JSON.stringify(payload, Object.keys(payload).sort());
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(normalizedPayload);
  
  return hmac.digest('hex');
}

/**
 * Create signature payload from certificate data
 * 
 * @param certificate - Certificate record
 * @param verificationId - Generated verification ID
 * @param issuedAt - Issuance timestamp
 * @returns Signature payload
 */
export function createSignaturePayload(
  certificate: {
    userId: string;
    certificateType: string;
    wpm: number;
    accuracy: number;
    consistency: number;
    duration: number;
    testResultId?: number | null;
    codeTestId?: number | null;
    bookTestId?: number | null;
    raceId?: number | null;
    dictationTestId?: number | null;
    stressTestId?: number | null;
    metadata?: Record<string, any> | null;
  },
  verificationId: string,
  issuedAt: Date
): SignaturePayload {
  return {
    verificationId,
    userId: certificate.userId,
    certificateType: certificate.certificateType,
    wpm: certificate.wpm,
    accuracy: certificate.accuracy,
    consistency: certificate.consistency,
    duration: certificate.duration,
    testResultId: certificate.testResultId || null,
    codeTestId: certificate.codeTestId || null,
    bookTestId: certificate.bookTestId || null,
    raceId: certificate.raceId || null,
    dictationTestId: certificate.dictationTestId || null,
    stressTestId: certificate.stressTestId || null,
    issuedAt: issuedAt.toISOString(),
    metadata: certificate.metadata || null,
  };
}

/**
 * Verify certificate signature using constant-time comparison
 * 
 * @param certificate - Certificate record from database
 * @returns Object with verification result and details
 */
export function verifySignature(certificate: Certificate): {
  isValid: boolean;
  error?: string;
} {
  if (!certificate.verificationId || !certificate.signatureHash || !certificate.issuedAt) {
    return {
      isValid: false,
      error: 'Missing verification data',
    };
  }
  
  const payload = createSignaturePayload(
    certificate,
    certificate.verificationId,
    certificate.issuedAt
  );
  
  const expectedSignature = generateSignature(payload);
  
  // Constant-time comparison to prevent timing attacks
  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(certificate.signatureHash, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
    
    return { isValid };
  } catch (error) {
    // Buffer length mismatch or other error
    return {
      isValid: false,
      error: 'Signature verification failed',
    };
  }
}

/**
 * Check if certificate is expired
 * 
 * @param certificate - Certificate record
 * @returns true if expired
 */
export function isExpired(certificate: Certificate): boolean {
  if (!certificate.expiresAt) {
    return false; // No expiration set
  }
  return new Date(certificate.expiresAt) < new Date();
}

/**
 * Check if certificate is revoked
 * 
 * @param certificate - Certificate record
 * @returns true if revoked
 */
export function isRevoked(certificate: Certificate): boolean {
  return certificate.revokedAt !== null;
}

/**
 * Get performance tier from certificate metadata
 * 
 * @param certificate - Certificate record
 * @returns Tier string or default
 */
function getTier(certificate: Certificate): string | null {
  if (certificate.metadata && typeof certificate.metadata === 'object') {
    return (certificate.metadata as any).tier || null;
  }
  return null;
}

/**
 * Get username from certificate metadata
 * 
 * @param certificate - Certificate record
 * @returns Username or null
 */
function getUsername(certificate: Certificate): string | null {
  if (certificate.metadata && typeof certificate.metadata === 'object') {
    return (certificate.metadata as any).username || null;
  }
  return null;
}

/**
 * Build complete verification response
 * 
 * @param certificate - Certificate record (or null if not found)
 * @param signatureResult - Signature verification result
 * @returns Formatted verification response
 */
export function buildVerificationResponse(
  certificate: Certificate | null,
  signatureResult: { isValid: boolean; error?: string } | null
): VerificationResponse {
  // Certificate not found
  if (!certificate) {
    return {
      verified: false,
      certificate: null,
      verificationStatus: {
        isValid: false,
        signatureVerified: false,
        notExpired: false,
        notRevoked: false,
      },
      verificationCount: 0,
      issuer: {
        name: ISSUER_NAME,
        version: ISSUER_VERSION,
        url: ISSUER_URL,
      },
    };
  }
  
  const signatureVerified = signatureResult?.isValid ?? false;
  const notExpired = !isExpired(certificate);
  const notRevoked = !isRevoked(certificate);
  const isValid = signatureVerified && notExpired && notRevoked;
  
  return {
    verified: isValid,
    certificate: {
      verificationId: certificate.verificationId || '',
      type: certificate.certificateType,
      username: getUsername(certificate),
      wpm: certificate.wpm,
      accuracy: certificate.accuracy,
      consistency: certificate.consistency,
      duration: certificate.duration,
      issuedAt: certificate.issuedAt?.toISOString() || certificate.createdAt.toISOString(),
      tier: getTier(certificate),
      metadata: certificate.metadata as Record<string, any> | null,
    },
    verificationStatus: {
      isValid,
      signatureVerified,
      notExpired,
      notRevoked,
    },
    verificationCount: certificate.verificationCount || 0,
    issuer: {
      name: ISSUER_NAME,
      version: certificate.issuerVersion || ISSUER_VERSION,
      url: ISSUER_URL,
    },
  };
}

/**
 * Create verification log entry
 * 
 * @param verificationId - Attempted verification ID
 * @param certificate - Certificate if found
 * @param success - Whether verification succeeded
 * @param failureReason - Reason for failure if applicable
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @returns Log entry object
 */
export function createVerificationLogEntry(
  verificationId: string,
  certificate: Certificate | null,
  success: boolean,
  failureReason: string | null,
  ipAddress: string | null,
  userAgent: string | null
): InsertCertificateVerificationLog {
  return {
    certificateId: certificate?.id || null,
    verificationId,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    success,
    failureReason: failureReason || null,
  };
}

/**
 * Rate limiter state (in-memory for simplicity)
 * For production at scale, consider using Redis or similar distributed cache
 */
const rateLimitState = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_MAX_ENTRIES = 50000; // Max entries before forced cleanup
const RATE_LIMIT_CLEANUP_THRESHOLD = 10000; // Trigger cleanup when exceeding this

// Periodic cleanup to prevent memory leaks
let lastCleanupTime = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Every 5 minutes

function cleanupExpiredEntries(): void {
  const now = Date.now();
  let deleted = 0;
  
  for (const [key, value] of rateLimitState.entries()) {
    if (value.resetAt < now) {
      rateLimitState.delete(key);
      deleted++;
    }
  }
  
  if (deleted > 0) {
    console.log(`[RateLimit] Cleaned up ${deleted} expired entries. Current size: ${rateLimitState.size}`);
  }
  
  lastCleanupTime = now;
}

/**
 * Check rate limit for verification requests
 *
 * @param identifier - Client identifier (IP address)
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const state = rateLimitState.get(identifier);

  // Periodic cleanup or forced cleanup if too many entries
  if (rateLimitState.size > RATE_LIMIT_MAX_ENTRIES) {
    // Force cleanup - map is getting too large
    cleanupExpiredEntries();
    
    // If still too large after cleanup, reject to prevent DoS
    if (rateLimitState.size > RATE_LIMIT_MAX_ENTRIES) {
      console.warn('[RateLimit] Map still too large after cleanup - possible DoS attack');
      return {
        allowed: false,
        remaining: 0,
        resetAt: now + RATE_LIMIT_WINDOW_MS,
      };
    }
  } else if (rateLimitState.size > RATE_LIMIT_CLEANUP_THRESHOLD && 
             now - lastCleanupTime > CLEANUP_INTERVAL_MS) {
    // Background cleanup
    cleanupExpiredEntries();
  }

  if (!state || state.resetAt < now) {
    // New window
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimitState.set(identifier, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt,
    };
  }

  if (state.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: state.resetAt,
    };
  }
  
  state.count++;
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - state.count,
    resetAt: state.resetAt,
  };
}

/**
 * Sanitize verification ID input
 * 
 * @param input - Raw input string
 * @returns Sanitized and normalized verification ID
 */
export function sanitizeVerificationId(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove whitespace and convert to uppercase
  return input.trim().toUpperCase();
}

/**
 * Generate verification data for a new certificate
 * 
 * @param certificateData - Certificate data being created
 * @returns Object with verificationId, signatureHash, and issuedAt
 */
export function generateVerificationData(certificateData: {
  userId: string;
  certificateType: string;
  wpm: number;
  accuracy: number;
  consistency: number;
  duration: number;
  testResultId?: number | null;
  codeTestId?: number | null;
  bookTestId?: number | null;
  raceId?: number | null;
  dictationTestId?: number | null;
  stressTestId?: number | null;
  metadata?: Record<string, any> | null;
}): {
  verificationId: string;
  signatureHash: string;
  issuedAt: Date;
  issuerVersion: string;
} {
  const verificationId = generateVerificationId();
  const issuedAt = new Date();
  
  const payload = createSignaturePayload(certificateData, verificationId, issuedAt);
  const signatureHash = generateSignature(payload);
  
  return {
    verificationId,
    signatureHash,
    issuedAt,
    issuerVersion: ISSUER_VERSION,
  };
}

// Export constants for external use
export const VERIFICATION_CONFIG = {
  ISSUER_NAME,
  ISSUER_URL,
  ISSUER_VERSION,
  VERIFICATION_ID_PREFIX,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
} as const;


