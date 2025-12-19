/**
 * QR Code Utility Functions
 * 
 * Generates QR codes for certificate verification URLs
 */

import QRCode from 'qrcode';

/**
 * Generate a QR code data URL for a verification ID
 * 
 * @param verificationId - The certificate verification ID (e.g., TM-XXXX-XXXX-XXXX)
 * @param size - QR code size in pixels (default: 100)
 * @returns Promise<string> - Data URL of the QR code image
 * @throws Error if verification ID is invalid or QR generation fails
 */
export async function generateVerificationQRCode(
  verificationId: string,
  size: number = 100
): Promise<string> {
  // Validate inputs
  if (!verificationId || typeof verificationId !== 'string') {
    throw new Error('Invalid verification ID: must be a non-empty string');
  }

  if (size < 50 || size > 500) {
    console.warn(`QR code size ${size} outside recommended range (50-500), may affect scannability`);
  }

  const verificationUrl = getVerificationUrl(verificationId);

  try {
    return await QRCode.toDataURL(verificationUrl, {
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M', // Medium error correction - good balance of size and reliability
    });
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    throw new Error('QR code generation failed');
  }
}

/**
 * Generate a QR code on a canvas at a specific position
 * 
 * @param ctx - Canvas 2D rendering context
 * @param verificationId - The certificate verification ID
 * @param x - X position for QR code center
 * @param y - Y position for QR code center
 * @param size - QR code size in pixels
 * @param backgroundColor - Optional background color (default: white)
 */
export async function drawQRCodeOnCanvas(
  ctx: CanvasRenderingContext2D,
  verificationId: string,
  x: number,
  y: number,
  size: number,
  backgroundColor: string = '#ffffff'
): Promise<void> {
  const qrDataUrl = await generateVerificationQRCode(verificationId, size);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Draw white background
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(x - size / 2 - 4, y - size / 2 - 4, size + 8, size + 8);

      // Draw QR code
      ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
      resolve();
    };
    img.onerror = reject;
    img.src = qrDataUrl;
  });
}

/**
 * Get the verification URL for a certificate
 * 
 * @param verificationId - The certificate verification ID
 * @returns Full verification URL
 */
export function getVerificationUrl(verificationId: string): string {
  // Use the current origin for certificates (works for both dev and prod)
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://typemasterai.com';

  return `${baseUrl}/verify/${verificationId}`;
}

/**
 * Validate a verification ID format
 * Accepts both old format (TM-XXXX-XXXX) and new format (TM-XXXX-XXXX-XXXX)
 * 
 * @param verificationId - ID to validate
 * @returns true if format is valid
 */
export function isValidVerificationId(verificationId: string): boolean {
  if (!verificationId || typeof verificationId !== 'string') {
    return false;
  }

  const id = verificationId.toUpperCase().trim();

  // New format: TM-XXXX-XXXX-XXXX (3 groups)
  const newPattern = /^TM-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

  // Legacy format: TM-XXXX-XXXX (2 groups)
  const legacyPattern = /^TM-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

  return newPattern.test(id) || legacyPattern.test(id);
}


