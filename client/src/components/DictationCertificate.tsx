import { useRef, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, Check, Clipboard, Mic } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTypingPerformanceRating, triggerCelebration } from "@/lib/share-utils";
import { generateVerificationQRCode } from "@/lib/qr-code-utils";

interface DictationCertificateProps {
  wpm: number;
  accuracy: number;
  consistency: number;
  speedLevel: string;
  sentencesCompleted: number;
  totalWords: number;
  duration: number;
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

export function DictationCertificate({
  wpm,
  accuracy,
  consistency,
  speedLevel,
  sentencesCompleted,
  totalWords,
  duration,
  username,
  date = new Date(),
  verificationId: serverVerificationId,
}: DictationCertificateProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState<HTMLImageElement | null>(null);
  const { toast } = useToast();

  const rating = getTypingPerformanceRating(wpm, accuracy);
  const tierVisuals = TIER_VISUALS[rating.badge] || TIER_VISUALS.Bronze;

  // Generate certificate ID (server or fallback)
  const certificateId = useMemo(() => {
    if (serverVerificationId) return serverVerificationId;
    // Fallback: Generate client-side hash with proper 3-group format
    const data = `${wpm}-${accuracy}-${consistency}-${speedLevel}-${totalWords}-${duration}`;
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
  }, [serverVerificationId, wpm, accuracy, consistency, speedLevel, totalWords, duration]);

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
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawCertificate = () => {
      const width = 1200;
      const height = 900;

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, tierVisuals.borderGradient[0]);
      gradient.addColorStop(0.5, tierVisuals.borderGradient[1]);
      gradient.addColorStop(1, tierVisuals.borderGradient[2]);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 10;
      ctx.strokeRect(30, 30, width - 60, height - 60);

      ctx.strokeStyle = tierVisuals.primaryColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(40, 40, width - 80, height - 80);

      ctx.font = "bold 56px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = tierVisuals.primaryColor;
      ctx.textAlign = "center";
      ctx.fillText("CERTIFICATE OF ACHIEVEMENT", width / 2, 120);

      ctx.font = "italic 28px Georgia, serif";
      ctx.fillStyle = "#888";
      ctx.fillText("TypeMasterAI - Dictation Mode", width / 2, 160);

      const iconSize = 80;
      const iconX = (width - iconSize) / 2;
      const iconY = 190;

      ctx.save();
      ctx.translate(iconX + iconSize / 2, iconY + iconSize / 2);
      ctx.strokeStyle = tierVisuals.primaryColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, -15, 20, 0, Math.PI * 2);
      ctx.moveTo(0, 5);
      ctx.lineTo(-15, 40);
      ctx.lineTo(15, 40);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      ctx.font = "32px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#fff";
      ctx.fillText("This certifies that", width / 2, 320);

      ctx.font = "bold 52px Georgia, serif";
      ctx.fillStyle = tierVisuals.secondaryColor;
      ctx.fillText(username || "Typing Expert", width / 2, 390);

      ctx.font = "28px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#ccc";
      ctx.fillText("has successfully completed the Dictation Challenge", width / 2, 440);
      ctx.fillText(`with exceptional listening and typing mastery`, width / 2, 475);

      const metrics = [
        { label: "Speed", value: `${wpm} WPM`, x: 200 },
        { label: "Accuracy", value: `${accuracy.toFixed(1)}%`, x: 450 },
        { label: "Consistency", value: `${consistency}%`, x: 700 },
        { label: "Level", value: speedLevel, x: 950 },
      ];

      metrics.forEach(({ label, value, x }) => {
        ctx.font = "20px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#888";
        ctx.fillText(label, x, 560);

        ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = tierVisuals.primaryColor;
        ctx.fillText(value, x, 600);
      });

      ctx.font = "22px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#aaa";
      ctx.fillText(`${sentencesCompleted} Sentences • ${totalWords} Words • ${Math.floor(duration / 60)} Minutes`, width / 2, 670);

      ctx.beginPath();
      ctx.arc(width / 2, 760, 50, 0, Math.PI * 2);
      ctx.fillStyle = tierVisuals.sealColor + "40";
      ctx.fill();
      ctx.strokeStyle = tierVisuals.sealColor;
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = tierVisuals.primaryColor;
      ctx.fillText(rating.badge.toUpperCase(), width / 2, 768);

      ctx.font = "16px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#666";
      ctx.fillText(`Issued: ${date.toLocaleDateString()}`, 150, height - 50);
      ctx.textAlign = "right";
      ctx.fillText(`Certificate ID: ${certificateId}`, width - 150, height - 50);
    };

    drawCertificate();
  }, [wpm, accuracy, consistency, speedLevel, sentencesCompleted, totalWords, duration, username, date, rating.badge, tierVisuals, certificateId]);

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `typemaster-dictation-certificate-${certificateId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    toast({
      title: "Certificate Downloaded!",
      description: "Your dictation certificate has been saved.",
    });

    triggerCelebration();
  };

  const shareToSocial = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSharing(true);

    try {
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/png");
      });

      if (navigator.share && navigator.canShare({ files: [new File([blob], "certificate.png", { type: "image/png" })] })) {
        await navigator.share({
          title: "TypeMasterAI Dictation Certificate",
          text: `I achieved ${wpm} WPM with ${accuracy.toFixed(1)}% accuracy in Dictation Mode! 🎯`,
          files: [new File([blob], "certificate.png", { type: "image/png" })],
        });
      } else {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob,
          }),
        ]);
        setImageCopied(true);
        setTimeout(() => setImageCopied(false), 2000);
        toast({
          title: "Image Copied!",
          description: "Certificate image copied to clipboard. Paste it anywhere!",
        });
      }
    } catch (error) {
      console.error("Share error:", error);
      toast({
        title: "Share Failed",
        description: "Please try downloading instead.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        width={1200}
        height={900}
        className="w-full border-2 border-border rounded-lg shadow-2xl"
        style={{ maxWidth: "100%" }}
      />

      <div className="flex gap-2 justify-center">
        <Button onClick={downloadImage} className="gap-2" data-testid="button-download-certificate">
          <Download className="w-4 h-4" />
          Download Certificate
        </Button>

        <Button onClick={shareToSocial} variant="outline" className="gap-2" disabled={isSharing} data-testid="button-share-certificate">
          {imageCopied ? (
            <>
              <Check className="w-4 h-4" />
              Image Copied!
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              {isSharing ? "Sharing..." : "Share Certificate"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
