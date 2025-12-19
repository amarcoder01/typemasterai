/**
 * Backfill Script: Add verification data to existing certificates
 * 
 * This script adds verificationId and signatureHash to all existing certificates
 * that don't have verification data yet.
 * 
 * Usage:
 *   npx tsx -r dotenv/config server/scripts/backfill-certificate-verification.ts
 * 
 * Options:
 *   --dry-run     Preview changes without making updates
 *   --batch-size  Number of certificates to process per batch (default: 100)
 */

import { db } from "../storage";
import { certificates } from "@shared/schema";
import { isNull, eq } from "drizzle-orm";
import {
  generateVerificationData,
  VERIFICATION_CONFIG,
} from "../certificate-verification-service";

// Configuration
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "100", 10);
const DRY_RUN = process.argv.includes("--dry-run");

// Validate environment
if (!process.env.CERTIFICATE_SECRET && !DRY_RUN) {
  console.error("ERROR: CERTIFICATE_SECRET environment variable is required for production.");
  console.error("Set it in your .env file or environment before running this script.");
  process.exit(1);
}

async function backfillCertificates() {
  console.log("=".repeat(60));
  console.log("Certificate Verification Backfill Script");
  console.log("=".repeat(60));
  console.log(`Issuer: ${VERIFICATION_CONFIG.ISSUER_NAME} v${VERIFICATION_CONFIG.ISSUER_VERSION}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log("");

  if (DRY_RUN) {
    console.log("⚠️  DRY RUN MODE - No changes will be made\n");
  }

  try {
    // Count certificates without verification data
    const allCerts = await db
      .select()
      .from(certificates)
      .where(isNull(certificates.verificationId));

    const totalCount = allCerts.length;
    console.log(`Found ${totalCount} certificates without verification data\n`);

    if (totalCount === 0) {
      console.log("✅ All certificates already have verification data!");
      return;
    }

    let processed = 0;
    let errors = 0;

    // Process in batches
    for (let offset = 0; offset < totalCount; offset += BATCH_SIZE) {
      const batch = allCerts.slice(offset, offset + BATCH_SIZE);
      
      console.log(`Processing batch ${Math.floor(offset / BATCH_SIZE) + 1}/${Math.ceil(totalCount / BATCH_SIZE)}...`);

      for (const cert of batch) {
        try {
          // Generate verification data for this certificate
          const verificationData = generateVerificationData({
            userId: cert.userId,
            certificateType: cert.certificateType,
            wpm: cert.wpm,
            accuracy: cert.accuracy,
            consistency: cert.consistency,
            duration: cert.duration,
            testResultId: cert.testResultId,
            codeTestId: cert.codeTestId,
            bookTestId: cert.bookTestId,
            raceId: cert.raceId,
            dictationTestId: cert.dictationTestId,
            stressTestId: cert.stressTestId,
            metadata: cert.metadata as Record<string, any> | null,
          });

          if (!DRY_RUN) {
            // Update the certificate with verification data
            await db
              .update(certificates)
              .set({
                verificationId: verificationData.verificationId,
                signatureHash: verificationData.signatureHash,
                issuedAt: verificationData.issuedAt,
                issuerVersion: verificationData.issuerVersion,
              })
              .where(eq(certificates.id, cert.id));
          }

          processed++;

          if (processed % 10 === 0 || processed === totalCount) {
            console.log(`  Progress: ${processed}/${totalCount} (${((processed / totalCount) * 100).toFixed(1)}%)`);
          }
        } catch (err) {
          console.error(`  ❌ Error processing certificate ${cert.id}:`, err);
          errors++;
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("BACKFILL COMPLETE");
    console.log("=".repeat(60));
    console.log(`✅ Processed: ${processed}`);
    console.log(`❌ Errors: ${errors}`);
    
    if (DRY_RUN) {
      console.log("\n⚠️  This was a DRY RUN - no changes were made.");
      console.log("    Remove --dry-run flag to apply changes.");
    }

  } catch (error) {
    console.error("Fatal error during backfill:", error);
    process.exit(1);
  }
}

// Run the script
backfillCertificates()
  .then(() => {
    console.log("\nScript completed.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  });


