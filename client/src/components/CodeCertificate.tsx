import { useRef, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, Check, Clipboard, Award, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCodePerformanceRating, getLanguageIcon, triggerCelebration } from "@/lib/share-utils";
import { generateVerificationQRCode } from "@/lib/qr-code-utils";

interface CodeCertificateProps {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  language: string;
  languageName: string;
  difficulty: string;
  characters: number;
  errors: number;
  time: string;
  username?: string;
  date?: Date;
  verificationId?: string; // Server-generated verification ID
}

interface TierVisuals {
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  borderGradient: [string, string, string];
  sealColor: string;
}

const TIER_VISUALS: Record<string, TierVisuals> = {
  Diamond: {
    primaryColor: "#00d4ff",
    secondaryColor: "#9be7ff",
    glowColor: "rgba(0, 212, 255, 0.5)",
    borderGradient: ["#00d4ff", "#9be7ff", "#00d4ff"],
    sealColor: "#00d4ff",
  },
  Platinum: {
    primaryColor: "#c0c0c0",
    secondaryColor: "#e8e8e8",
    glowColor: "rgba(192, 192, 192, 0.5)",
    borderGradient: ["#a0a0a0", "#e8e8e8", "#a0a0a0"],
    sealColor: "#c0c0c0",
  },
  Gold: {
    primaryColor: "#ffd700",
    secondaryColor: "#ffed4a",
    glowColor: "rgba(255, 215, 0, 0.5)",
    borderGradient: ["#b8860b", "#ffd700", "#b8860b"],
    sealColor: "#ffd700",
  },
  Silver: {
    primaryColor: "#a8a8a8",
    secondaryColor: "#d4d4d4",
    glowColor: "rgba(168, 168, 168, 0.5)",
    borderGradient: ["#808080", "#d4d4d4", "#808080"],
    sealColor: "#a8a8a8",
  },
  Bronze: {
    primaryColor: "#cd7f32",
    secondaryColor: "#daa06d",
    glowColor: "rgba(205, 127, 50, 0.5)",
    borderGradient: ["#8b4513", "#cd7f32", "#8b4513"],
    sealColor: "#cd7f32",
  },
};

export function CodeCertificate({
  wpm,
  rawWpm,
  accuracy,
  consistency,
  language,
  languageName,
  difficulty,
  characters,
  errors,
  time,
  username,
  date = new Date(),
  verificationId: serverVerificationId,
}: CodeCertificateProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState<HTMLImageElement | null>(null);
  const { toast } = useToast();

  const rating = getCodePerformanceRating(wpm, accuracy);
  const tierVisuals = TIER_VISUALS[rating.badge] || TIER_VISUALS.Bronze;

  // Use server-generated ID if available, otherwise generate a fallback
  const certificateId = useMemo(() => {
    if (serverVerificationId) {
      return serverVerificationId;
    }
    // Fallback: Generate client-side hash with proper 3-group format
    const data = `${wpm}-${accuracy}-${consistency}-${language}-${characters}-${errors}-${time}`;
    let hash1 = 0;
    let hash2 = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash1 = ((hash1 << 5) - hash1) + char;
      hash1 = hash1 & hash1;
      hash2 = ((hash2 << 3) + hash2) ^ char;
      hash2 = hash2 & hash2;
    }
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const absHash1 = Math.abs(hash1);
    const absHash2 = Math.abs(hash2);
    let id = "TM-";
    for (let i = 0; i < 4; i++) {
      id += chars[(absHash1 >> (i * 4)) % chars.length];
    }
    id += "-";
    for (let i = 0; i < 4; i++) {
      id += chars[(absHash1 >> ((i + 4) * 4)) % chars.length];
    }
    id += "-";
    for (let i = 0; i < 4; i++) {
      id += chars[(absHash2 >> (i * 4)) % chars.length];
    }
    return id;
  }, [serverVerificationId, wpm, accuracy, consistency, language, characters, errors, time]);

  // Load QR code image for any verification ID
  useEffect(() => {
    if (certificateId) {
      generateVerificationQRCode(certificateId, 80)
        .then(dataUrl => {
          const img = new Image();
          img.onload = () => setQrCodeImage(img);
          img.onerror = () => console.error('Failed to load QR code image');
          img.src = dataUrl;
        })
        .catch(err => console.error('Failed to generate QR code:', err));
    }
  }, [certificateId]);

  useEffect(() => {
    generateCertificate();
  }, [wpm, rawWpm, accuracy, consistency, language, languageName, difficulty, characters, errors, time, username, qrCodeImage, serverVerificationId]);

  const generateCertificate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const langIcon = getLanguageIcon(language);
    const displayName = username || "Code Enthusiast";

    canvas.width = 1200;
    canvas.height = 675;

    // Premium dark gradient background
    const bgGradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, canvas.width * 0.7
    );
    bgGradient.addColorStop(0, "#1a1a2e");
    bgGradient.addColorStop(0.5, "#16213e");
    bgGradient.addColorStop(1, "#0f0f23");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle pattern overlay
    ctx.globalAlpha = 0.02;
    for (let i = 0; i < canvas.width; i += 40) {
      for (let j = 0; j < canvas.height; j += 40) {
        if ((i + j) % 80 === 0) {
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(i, j, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;

    // Elegant outer border with tier color
    const borderWidth = 6;
    const borderGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    borderGradient.addColorStop(0, tierVisuals.borderGradient[0]);
    borderGradient.addColorStop(0.5, tierVisuals.borderGradient[1]);
    borderGradient.addColorStop(1, tierVisuals.borderGradient[2]);

    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(borderWidth / 2, borderWidth / 2, canvas.width - borderWidth, canvas.height - borderWidth);

    // Inner decorative border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // Corner decorations
    const cornerSize = 35;
    const cornerOffset = 15;
    ctx.strokeStyle = tierVisuals.primaryColor;
    ctx.lineWidth = 2;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(cornerOffset, cornerOffset + cornerSize);
    ctx.lineTo(cornerOffset, cornerOffset);
    ctx.lineTo(cornerOffset + cornerSize, cornerOffset);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(canvas.width - cornerOffset - cornerSize, cornerOffset);
    ctx.lineTo(canvas.width - cornerOffset, cornerOffset);
    ctx.lineTo(canvas.width - cornerOffset, cornerOffset + cornerSize);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(cornerOffset, canvas.height - cornerOffset - cornerSize);
    ctx.lineTo(cornerOffset, canvas.height - cornerOffset);
    ctx.lineTo(cornerOffset + cornerSize, canvas.height - cornerOffset);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(canvas.width - cornerOffset - cornerSize, canvas.height - cornerOffset);
    ctx.lineTo(canvas.width - cornerOffset, canvas.height - cornerOffset);
    ctx.lineTo(canvas.width - cornerOffset, canvas.height - cornerOffset - cornerSize);
    ctx.stroke();

    // Header: </> CODE TYPING CERTIFICATE
    ctx.fillStyle = tierVisuals.primaryColor;
    ctx.font = "bold 16px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("</>", canvas.width / 2 - 180, 65);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("CODE TYPING CERTIFICATE", canvas.width / 2 + 20, 68);

    // Decorative line under header
    const lineWidth = 500;
    const lineY = 90;
    const lineGradient = ctx.createLinearGradient(
      canvas.width / 2 - lineWidth / 2, lineY,
      canvas.width / 2 + lineWidth / 2, lineY
    );
    lineGradient.addColorStop(0, "transparent");
    lineGradient.addColorStop(0.2, tierVisuals.primaryColor);
    lineGradient.addColorStop(0.5, tierVisuals.secondaryColor);
    lineGradient.addColorStop(0.8, tierVisuals.primaryColor);
    lineGradient.addColorStop(1, "transparent");

    ctx.strokeStyle = lineGradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - lineWidth / 2, lineY);
    ctx.lineTo(canvas.width / 2 + lineWidth / 2, lineY);
    ctx.stroke();

    // "This certifies that"
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "italic 20px 'DM Sans', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("This certifies that", canvas.width / 2, 140);

    // User Name - Large and prominent with glow
    ctx.save();
    ctx.shadowColor = tierVisuals.glowColor;
    ctx.shadowBlur = 30;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 48px 'DM Sans', system-ui, sans-serif";
    ctx.fillText(displayName, canvas.width / 2, 195);
    ctx.restore();

    // "has successfully completed a Code Mode test"
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "italic 18px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("has successfully completed a Code Mode test", canvas.width / 2, 235);

    // Language info
    ctx.fillStyle = tierVisuals.primaryColor;
    ctx.font = "600 16px 'DM Sans', system-ui, sans-serif";
    ctx.fillText(`${langIcon} ${languageName} Programming  •  ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Difficulty`, canvas.width / 2, 265);

    // "with the following results:"
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "16px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("with the following results:", canvas.width / 2, 300);

    // Performance tier badge (TOP RIGHT corner - positioned before stats)
    const badgeX = canvas.width - 100;
    const badgeY = 80;
    const badgeRadius = 40;

    ctx.save();
    ctx.shadowColor = tierVisuals.glowColor;
    ctx.shadowBlur = 20;

    const badgeGradient = ctx.createRadialGradient(badgeX, badgeY, 0, badgeX, badgeY, badgeRadius);
    badgeGradient.addColorStop(0, tierVisuals.secondaryColor);
    badgeGradient.addColorStop(0.7, tierVisuals.primaryColor);
    badgeGradient.addColorStop(1, tierVisuals.borderGradient[0]);

    ctx.fillStyle = badgeGradient;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1a1a2e";
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeRadius - 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = tierVisuals.primaryColor;
    ctx.font = "bold 14px 'DM Sans', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(rating.badge.toUpperCase(), badgeX, badgeY + 2);
    ctx.fillStyle = "#ffffff";
    ctx.font = "10px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("TIER", badgeX, badgeY + 16);

    // Stats box background - properly sized for 4 columns with clearance from tier badge
    const statsBoxX = 150;  // Centered with margins
    const statsBoxY = 320;
    const statsBoxWidth = 900;  // Reduced to prevent overlap with tier badge
    const statsBoxHeight = 100;

    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.beginPath();
    ctx.roundRect(statsBoxX, statsBoxY, statsBoxWidth, statsBoxHeight, 12);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(statsBoxX, statsBoxY, statsBoxWidth, statsBoxHeight, 12);
    ctx.stroke();

    // Stats Row - 4 evenly spaced columns
    const row1Y = statsBoxY + 40;
    const columnWidth = statsBoxWidth / 4;
    const col1X = statsBoxX + columnWidth / 2;
    const col2X = statsBoxX + columnWidth + columnWidth / 2;
    const col3X = statsBoxX + columnWidth * 2 + columnWidth / 2;
    const col4X = statsBoxX + columnWidth * 3 + columnWidth / 2;

    // Column 1: WPM
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${wpm}`, col1X, row1Y);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "12px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("WPM", col1X, row1Y + 22);

    // Vertical divider 1
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(statsBoxX + columnWidth, statsBoxY + 20);
    ctx.lineTo(statsBoxX + columnWidth, statsBoxY + statsBoxHeight - 20);
    ctx.stroke();

    // Column 2: Accuracy
    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 36px 'JetBrains Mono', monospace";
    ctx.fillText(`${accuracy}%`, col2X, row1Y);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "12px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("ACCURACY", col2X, row1Y + 22);

    // Vertical divider 2
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.beginPath();
    ctx.moveTo(statsBoxX + columnWidth * 2, statsBoxY + 20);
    ctx.lineTo(statsBoxX + columnWidth * 2, statsBoxY + statsBoxHeight - 20);
    ctx.stroke();

    // Column 3: Raw WPM
    ctx.fillStyle = "#c084fc";
    ctx.font = "bold 36px 'JetBrains Mono', monospace";
    ctx.fillText(`${rawWpm}`, col3X, row1Y);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "12px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("RAW WPM", col3X, row1Y + 22);

    // Vertical divider 3
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.beginPath();
    ctx.moveTo(statsBoxX + columnWidth * 3, statsBoxY + 20);
    ctx.lineTo(statsBoxX + columnWidth * 3, statsBoxY + statsBoxHeight - 20);
    ctx.stroke();

    // Column 4: Time
    ctx.fillStyle = "#22d3ee";
    ctx.font = "bold 36px 'JetBrains Mono', monospace";
    ctx.fillText(time, col4X, row1Y);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "12px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("TIME", col4X, row1Y + 22);

    // Earned on date
    const formattedDate = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "16px 'DM Sans', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Earned on: ${formattedDate}`, canvas.width / 2, 465);

    // Motivational quote
    ctx.fillStyle = tierVisuals.primaryColor;
    ctx.font = "italic 22px 'DM Sans', system-ui, sans-serif";
    ctx.fillText(`"${rating.title}"`, canvas.width / 2, 510);

    // Additional stats line
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "13px 'DM Sans', system-ui, sans-serif";
    ctx.fillText(`${characters} characters  •  ${errors} error${errors !== 1 ? 's' : ''}  •  ${consistency}% consistency`, canvas.width / 2, 545);

    // Signature section
    const sigY = 595;

    // Signature line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 150, sigY);
    ctx.lineTo(canvas.width / 2 + 150, sigY);
    ctx.stroke();

    // AI Coach signature
    ctx.fillStyle = tierVisuals.primaryColor;
    ctx.font = "italic 18px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("TypeMasterAI Coach", canvas.width / 2, sigY - 10);

    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "11px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("AI Typing Coach & Certification Authority", canvas.width / 2, sigY + 18);

    // Footer with certificate ID, QR code, and URL
    const footerY = canvas.height - 25;

    // Draw QR code if available (positioned on the left)
    if (qrCodeImage) {
      const qrSize = 50;
      const qrX = 50;
      const qrY = footerY - qrSize - 5;

      // QR code background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6);

      // Draw QR code
      ctx.drawImage(qrCodeImage, qrX, qrY, qrSize, qrSize);

      // Certificate ID next to QR
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`ID: ${certificateId}`, qrX + qrSize + 10, footerY);
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`ID: ${certificateId}`, 50, footerY);
    }

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText(serverVerificationId ? "typemasterai.com/verify" : "typemasterai.com/code-mode", canvas.width / 2, footerY);

    ctx.textAlign = "right";
    ctx.fillStyle = tierVisuals.primaryColor;
    ctx.font = "bold 10px 'JetBrains Mono', monospace";
    ctx.fillText(`${rating.emoji} ${rating.badge} CERTIFIED`, canvas.width - 50, footerY);
  };

  const downloadCertificate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `TypeMasterAI_Certificate_${languageName}_${wpm}WPM_${certificateId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    triggerCelebration('medium');

    toast({
      title: "Certificate Downloaded!",
      description: "Share your achievement on social media!",
    });
  };

  const shareCertificate = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSharing(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob"));
        }, "image/png");
      });

      const file = new File([blob], `TypeMasterAI_Certificate_${wpm}WPM.png`, { type: "image/png" });

      if ('share' in navigator && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `TypeMasterAI Code Typing Certificate - ${wpm} WPM`,
          text: `${rating.emoji} I earned a ${rating.badge} Certificate typing ${languageName} code at ${wpm} WPM with ${accuracy}% accuracy!\n\n🏅 ${rating.title}\n📜 Certificate: ${certificateId}\n\nCan you beat my score?\n\n🔗 typemasterai.com/code-mode`,
          files: [file],
        });
        triggerCelebration('medium');
        toast({
          title: "Certificate Shared!",
          description: "Your achievement is on its way!",
        });
      } else {
        downloadCertificate();
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        downloadCertificate();
      }
    } finally {
      setIsSharing(false);
    }
  };

  const copyImageToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob"));
        }, "image/png");
      });

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob })
      ]);

      setImageCopied(true);
      setTimeout(() => setImageCopied(false), 2000);
      triggerCelebration('small');

      toast({
        title: "Certificate Copied!",
        description: "Paste directly into Twitter, Discord, or LinkedIn!",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Your browser doesn't support image copying. Please download instead.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full overflow-hidden rounded-xl shadow-2xl" data-testid="certificate-container" style={{ boxShadow: `0 25px 50px -12px ${tierVisuals.glowColor}` }}>
        <canvas
          ref={canvasRef}
          className="w-full h-auto"
          style={{ maxWidth: "100%" }}
          data-testid="certificate-canvas"
        />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 rounded-full backdrop-blur-sm border border-white/10">
          <Award className="w-3.5 h-3.5" style={{ color: tierVisuals.primaryColor }} />
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: tierVisuals.primaryColor }}>
            {rating.badge} Tier
          </span>
        </div>
      </div>

      <div className="w-full space-y-3">
        <div className="p-4 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 rounded-xl border border-zinc-700">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" style={{ color: tierVisuals.primaryColor }} />
            <p className="text-sm font-medium" style={{ color: tierVisuals.primaryColor }}>Share Your Achievement</p>
            <Sparkles className="w-4 h-4" style={{ color: tierVisuals.primaryColor }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={copyImageToClipboard}
              variant="outline"
              className="gap-2 h-10 bg-zinc-800/50 border-zinc-600 hover:bg-zinc-700/50 hover:border-zinc-500"
              data-testid="button-copy-certificate"
            >
              {imageCopied ? <Check className="w-4 h-4 text-green-500" /> : <Clipboard className="w-4 h-4" style={{ color: tierVisuals.primaryColor }} />}
              <span className="text-zinc-200">{imageCopied ? "Copied!" : "Copy Image"}</span>
            </Button>
            <Button
              onClick={downloadCertificate}
              variant="outline"
              className="gap-2 h-10 bg-zinc-800/50 border-zinc-600 hover:bg-zinc-700/50 hover:border-zinc-500"
              data-testid="button-download-certificate"
            >
              <Download className="w-4 h-4 text-purple-400" />
              <span className="text-zinc-200">Download</span>
            </Button>
          </div>
        </div>

        {'share' in navigator && (
          <Button
            onClick={shareCertificate}
            disabled={isSharing}
            className="w-full gap-2 h-11 text-white font-semibold"
            style={{
              background: `linear-gradient(135deg, ${tierVisuals.borderGradient[0]}, ${tierVisuals.primaryColor}, ${tierVisuals.borderGradient[2]})`,
            }}
            data-testid="button-share-certificate"
          >
            <Share2 className="w-4 h-4" />
            {isSharing ? "Sharing..." : "Share Certificate"}
          </Button>
        )}

        <p className="text-[10px] text-center text-zinc-500" data-testid="text-certificate-id">
          Certificate ID: <span className="font-mono" style={{ color: tierVisuals.primaryColor }}>{certificateId}</span>
        </p>
      </div>
    </div>
  );
}
