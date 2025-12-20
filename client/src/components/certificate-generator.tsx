import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jsPDF } from "jspdf";
import { generateVerificationQRCode, getVerificationUrl } from "@/lib/qr-code-utils";

interface CertificateProps {
  username: string;
  wpm: number;
  accuracy: number;
  mode: number;
  date: Date;
  freestyle?: boolean;
  characters?: number;
  words?: number;
  consistency?: number;
  verificationId?: string; // Server-generated verification ID
}

type DownloadFormat = "png" | "pdf" | "jpeg";

export function CertificateGenerator({ username, wpm, accuracy, mode, date, freestyle = false, characters = 0, words = 0, consistency = 100, verificationId: serverVerificationId }: CertificateProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedFormat, setSelectedFormat] = useState<DownloadFormat>("png");
  const [qrCodeImage, setQrCodeImage] = useState<HTMLImageElement | null>(null);

  // Generate a fallback verification ID based on test data (for backwards compatibility)
  // Format: TM-XXXX-XXXX-XXXX (12 alphanumeric characters in 3 groups)
  const generateFallbackVerificationId = useCallback(() => {
    const data = `${username}-${wpm}-${accuracy}-${mode}-${date.getTime()}`;
    let hash1 = 0;
    let hash2 = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash1 = ((hash1 << 5) - hash1) + char;
      hash1 = hash1 & hash1;
      hash2 = ((hash2 << 3) + hash2) ^ char;
      hash2 = hash2 & hash2;
    }
    const hexHash1 = Math.abs(hash1).toString(16).toUpperCase().padStart(8, '0');
    const hexHash2 = Math.abs(hash2).toString(16).toUpperCase().padStart(4, '0');
    return `TM-${hexHash1.slice(0, 4)}-${hexHash1.slice(4, 8)}-${hexHash2.slice(0, 4)}`;
  }, [username, wpm, accuracy, mode, date]);

  // Use server-generated ID if available, otherwise use fallback
  const verificationId = serverVerificationId || generateFallbackVerificationId();

  // Load QR code image for any verification ID (server or fallback)
  useEffect(() => {
    if (verificationId) {
      generateVerificationQRCode(verificationId, 200)
        .then(dataUrl => {
          const img = new Image();
          img.onload = () => setQrCodeImage(img);
          img.onerror = () => console.error('Failed to load QR code image');
          img.src = dataUrl;
        })
        .catch(err => console.error('Failed to generate QR code:', err));
    }
  }, [verificationId]);

  // Regenerate certificate when dependencies change
  useEffect(() => {
    generateCertificate();
  }, [username, wpm, accuracy, mode, date, freestyle, characters, words, consistency, verificationId, qrCodeImage]);

  const generateCertificate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size for higher quality
    canvas.width = 1200;
    canvas.height = 800;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(0.5, "#1e293b");
    gradient.addColorStop(1, "#0f172a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative border
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 8;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    // Inner border
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);

    // Corner decorations
    const cornerSize = 40;
    ctx.fillStyle = "#00ffff";
    // Top-left
    ctx.fillRect(40, 40, cornerSize, 8);
    ctx.fillRect(40, 40, 8, cornerSize);
    // Top-right
    ctx.fillRect(canvas.width - 80, 40, cornerSize, 8);
    ctx.fillRect(canvas.width - 48, 40, 8, cornerSize);
    // Bottom-left
    ctx.fillRect(40, canvas.height - 48, cornerSize, 8);
    ctx.fillRect(40, canvas.height - 80, 8, cornerSize);
    // Bottom-right
    ctx.fillRect(canvas.width - 80, canvas.height - 48, cornerSize, 8);
    ctx.fillRect(canvas.width - 48, canvas.height - 80, 8, cornerSize);

    // Logo/Seal (top-left corner) - Enhanced
    ctx.beginPath();
    ctx.arc(140, 140, 45, 0, Math.PI * 2);
    const logoGradient = ctx.createRadialGradient(140, 140, 0, 140, 140, 45);
    logoGradient.addColorStop(0, "rgba(0, 255, 255, 0.2)");
    logoGradient.addColorStop(1, "rgba(0, 255, 255, 0)");
    ctx.fillStyle = logoGradient;
    ctx.fill();
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 30px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TM", 140, 148);

    // Title
    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 48px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CERTIFICATE OF ACHIEVEMENT", canvas.width / 2, 150);

    // Subtitle
    ctx.fillStyle = "#94a3b8";
    ctx.font = "24px 'DM Sans', sans-serif";
    ctx.fillText("This certifies that", canvas.width / 2, 220);

    // User name
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 56px 'DM Sans', sans-serif";
    ctx.fillText(username, canvas.width / 2, 300);

    // Achievement text
    ctx.fillStyle = "#94a3b8";
    ctx.font = "24px 'DM Sans', sans-serif";
    // Achievements
    const achievementText = freestyle
      ? "has successfully completed a freestyle typing session with"
      : "has successfully completed a typing test with";
    ctx.fillText(achievementText, canvas.width / 2, 350); // Shifted up 10px

    // Stats box - Shifted up 20px
    const boxY = 380;
    const boxHeight = 140;
    ctx.fillStyle = "rgba(30, 41, 59, 0.7)";
    ctx.fillRect(200, boxY, canvas.width - 400, boxHeight);
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2;
    ctx.strokeRect(200, boxY, canvas.width - 400, boxHeight);

    if (freestyle) {
      // Freestyle mode
      ctx.fillStyle = "#00ffff";
      ctx.font = "bold 64px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${wpm}`, 400, boxY + 70);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "18px 'DM Sans', sans-serif";
      ctx.fillText("Words Per Minute", 400, boxY + 105);

      ctx.fillStyle = "#a855f7";
      ctx.font = "bold 64px 'JetBrains Mono', monospace";
      ctx.fillText(`${words}`, canvas.width / 2, boxY + 70);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "18px 'DM Sans', sans-serif";
      ctx.fillText("Words Typed", canvas.width / 2, boxY + 105);

      ctx.fillStyle = "#00ffff";
      ctx.font = "bold 64px 'JetBrains Mono', monospace";
      ctx.fillText(`${characters}`, 800, boxY + 70);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "18px 'DM Sans', sans-serif";
      ctx.fillText("Characters", 800, boxY + 105);
    } else {
      // Standard mode
      ctx.fillStyle = "#00ffff";
      ctx.font = "bold 64px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${wpm}`, 400, boxY + 70);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "18px 'DM Sans', sans-serif";
      ctx.fillText("Words Per Minute", 400, boxY + 105);

      ctx.fillStyle = "#a855f7";
      ctx.font = "bold 64px 'JetBrains Mono', monospace";
      ctx.fillText(`${accuracy}%`, canvas.width / 2, boxY + 70);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "18px 'DM Sans', sans-serif";
      ctx.fillText("Accuracy", canvas.width / 2, boxY + 105);

      ctx.fillStyle = "#00ffff";
      ctx.font = "bold 64px 'JetBrains Mono', monospace";
      const modeText = mode >= 60 ? `${Math.floor(mode / 60)}min` : `${mode}s`;
      ctx.fillText(modeText, 800, boxY + 70);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "18px 'DM Sans', sans-serif";
      ctx.fillText("Test Duration", 800, boxY + 105);
    }

    // Date - Shifted up
    ctx.fillStyle = "#64748b";
    ctx.font = "18px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    const formattedDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    ctx.fillText(`Completed on ${formattedDate}`, canvas.width / 2, 560);

    // ========== BRANDING - Shifted up ==========
    ctx.textAlign = "center";
    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 36px 'DM Sans', sans-serif";
    ctx.fillText("TypeMasterAI", canvas.width / 2, 610);

    ctx.fillStyle = "#64748b";
    ctx.font = "16px 'DM Sans', sans-serif";
    ctx.fillText("Master Your Typing with AI", canvas.width / 2, 635);

    // Website URL
    ctx.fillStyle = "#a855f7";
    ctx.font = "bold 16px 'DM Sans', sans-serif";
    ctx.fillText("typemasterai.com", canvas.width / 2, 665);

    // ========== VERIFICATION SECTION WITH QR CODE ==========
    const verifyY = 720; // Anchor for text line

    // Draw QR code if available (positioned on the right with safe padding)
    if (qrCodeImage) {
      const qrSize = 90; // Increased from 60
      const qrX = canvas.width - 190; // More inset from right to avoid border overlap
      const qrY = 600; // Slightly higher to leave room for text and border

      // QR code background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10);

      // Draw QR code
      ctx.drawImage(qrCodeImage, qrX, qrY, qrSize, qrSize);

      // "Scan to Verify" text under QR
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px 'DM Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Scan to Verify", qrX + qrSize / 2, qrY + qrSize + 18);
    }

    // Small checkmark circle - adjusted position (shifted right to balance QR on right)
    const checkX = qrCodeImage ? canvas.width / 2 - 160 : canvas.width / 2 - 260;
    ctx.beginPath();
    ctx.arc(checkX, verifyY, 6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(34, 197, 94, 0.2)";
    ctx.fill();
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Tiny checkmark
    ctx.save();
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(checkX - 2.5, verifyY);
    ctx.lineTo(checkX - 0.5, verifyY + 2.5);
    ctx.lineTo(checkX + 3, verifyY - 2);
    ctx.stroke();
    ctx.restore();

    // Verification text - single line
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Digitally Verified by TypeMasterAI", checkX + 12, verifyY + 4);

    // Separator dot
    ctx.fillStyle = "#64748b";
    ctx.fillText("•", checkX + 195, verifyY + 4);

    // Certificate ID
    ctx.fillStyle = "#a855f7";
    ctx.font = "bold 12px 'JetBrains Mono', monospace";
    ctx.fillText(verificationId, checkX + 210, verifyY + 4);

    // Verification URL hint - below QR with padding and centered to QR
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    const urlY = 600 + 90 + 36; // qrY + qrSize + padding
    ctx.fillText("typemasterai.com/verify", qrCodeImage ? (canvas.width - 190 + 90 / 2) : canvas.width / 2, urlY);
  };

  const downloadCertificate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const filename = `TypeMasterAI_Certificate_${username}_${wpm}WPM`;

    switch (selectedFormat) {
      case "png":
        downloadPNG(canvas, filename);
        break;
      case "jpeg":
        downloadJPEG(canvas, filename);
        break;
      case "pdf":
        downloadPDF(canvas, filename);
        break;
    }
  };

  const downloadPNG = (canvas: HTMLCanvasElement, filename: string) => {
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const downloadJPEG = (canvas: HTMLCanvasElement, filename: string) => {
    const link = document.createElement("a");
    link.download = `${filename}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
  };

  const downloadPDF = (canvas: HTMLCanvasElement, filename: string) => {
    const imgData = canvas.toDataURL("image/png");

    // Create PDF with landscape orientation
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // A4 landscape dimensions: 297mm x 210mm
    const pdfWidth = 297;
    const pdfHeight = 210;

    // Calculate aspect ratio
    const canvasAspectRatio = canvas.width / canvas.height;
    const pdfAspectRatio = pdfWidth / pdfHeight;

    let imgWidth = pdfWidth;
    let imgHeight = pdfHeight;

    // Fit image to PDF while maintaining aspect ratio
    if (canvasAspectRatio > pdfAspectRatio) {
      imgHeight = pdfWidth / canvasAspectRatio;
    } else {
      imgWidth = pdfHeight * canvasAspectRatio;
    }

    // Center the image
    const xOffset = (pdfWidth - imgWidth) / 2;
    const yOffset = (pdfHeight - imgHeight) / 2;

    pdf.addImage(imgData, "PNG", xOffset, yOffset, imgWidth, imgHeight);
    pdf.save(`${filename}.pdf`);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <canvas
        ref={canvasRef}
        className="border-2 border-border rounded-lg shadow-2xl max-w-full h-auto"
        style={{ maxHeight: "500px" }}
      />

      {/* Download Section */}
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <label className="text-sm text-muted-foreground font-medium">
            Download Format
          </label>
          <Select
            value={selectedFormat}
            onValueChange={(value) => setSelectedFormat(value as DownloadFormat)}
          >
            <SelectTrigger
              className="w-full sm:w-[180px]"
              data-testid="select-certificate-format"
            >
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png" data-testid="format-png">
                PNG (High Quality)
              </SelectItem>
              <SelectItem value="jpeg" data-testid="format-jpeg">
                JPEG (Compressed)
              </SelectItem>
              <SelectItem value="pdf" data-testid="format-pdf">
                PDF (Printable)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={downloadCertificate}
          size="lg"
          className="gap-2 w-full sm:w-auto sm:mt-7"
          data-testid="button-download-certificate"
        >
          <Download className="w-5 h-5" />
          Download {selectedFormat.toUpperCase()}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Use the Share button after completing a test to share your certificate on social media
      </p>
    </div>
  );
}
