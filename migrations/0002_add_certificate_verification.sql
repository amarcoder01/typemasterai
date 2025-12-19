-- Migration: Add Certificate Verification System
-- Description: Adds cryptographically secure verification columns to certificates table
--              and creates audit logging table for verification attempts

-- Add verification columns to certificates table
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "verification_id" VARCHAR(20) UNIQUE;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "signature_hash" VARCHAR(64);
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "issued_at" TIMESTAMP DEFAULT NOW();
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMP;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "revoked_reason" TEXT;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "verification_count" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "last_verified_at" TIMESTAMP;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "issuer_version" VARCHAR(10) DEFAULT '1.0';

-- Create index for fast verification lookups
CREATE INDEX IF NOT EXISTS "certificates_verification_id_idx" ON "certificates" ("verification_id");

-- Create certificate verification audit logs table
CREATE TABLE IF NOT EXISTS "certificate_verification_logs" (
  "id" SERIAL PRIMARY KEY,
  "certificate_id" INTEGER REFERENCES "certificates"("id") ON DELETE SET NULL,
  "verification_id" VARCHAR(20),
  "ip_address" VARCHAR(45),
  "user_agent" TEXT,
  "success" BOOLEAN NOT NULL,
  "failure_reason" VARCHAR(100),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for audit log queries
CREATE INDEX IF NOT EXISTS "cert_verify_logs_certificate_id_idx" ON "certificate_verification_logs" ("certificate_id");
CREATE INDEX IF NOT EXISTS "cert_verify_logs_verification_id_idx" ON "certificate_verification_logs" ("verification_id");
CREATE INDEX IF NOT EXISTS "cert_verify_logs_created_at_idx" ON "certificate_verification_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "cert_verify_logs_success_idx" ON "certificate_verification_logs" ("success");

-- Add comment for documentation
COMMENT ON COLUMN "certificates"."verification_id" IS 'Unique cryptographically secure ID in format TM-XXXX-XXXX-XXXX';
COMMENT ON COLUMN "certificates"."signature_hash" IS 'HMAC-SHA256 signature of certificate data for tamper detection';
COMMENT ON COLUMN "certificates"."issued_at" IS 'Timestamp when certificate was officially issued';
COMMENT ON COLUMN "certificates"."expires_at" IS 'Optional expiration timestamp for time-limited certificates';
COMMENT ON COLUMN "certificates"."revoked_at" IS 'Timestamp when certificate was revoked (null if valid)';
COMMENT ON COLUMN "certificates"."revoked_reason" IS 'Reason for revocation if applicable';
COMMENT ON COLUMN "certificates"."verification_count" IS 'Number of times this certificate has been verified';
COMMENT ON COLUMN "certificates"."last_verified_at" IS 'Timestamp of most recent verification';
COMMENT ON COLUMN "certificates"."issuer_version" IS 'Version of the verification system that issued this certificate';


