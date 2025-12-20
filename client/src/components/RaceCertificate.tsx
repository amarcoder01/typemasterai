import { useRef, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, Check, Clipboard, Award, Sparkles, Trophy, Medal, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTypingPerformanceRating, triggerCelebration } from "@/lib/share-utils";
import { generateVerificationQRCode } from "@/lib/qr-code-utils";

interface RaceCertificateProps {
  wpm: number;
  accuracy: number;
  consistency: number;
  placement: number;
  totalParticipants: number;
  characters: number;
  errors: number;
  duration: number;
  username?: string;
  date?: Date;
  raceId?: string;
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

const PLACEMENT_VISUALS: Record<number, { emoji: string; text: string; color: string }> = {
  1: { emoji: "🥇", text: "1ST PLACE", color: "#ffd700" },
  2: { emoji: "🥈", text: "2ND PLACE", color: "#c0c0c0" },
  3: { emoji: "🥉", text: "3RD PLACE", color: "#cd7f32" },
};

export function RaceCertificate({
  wpm,
  accuracy,
  consistency,
  placement,
  totalParticipants,
  characters,
  errors,
  duration,
  username,
  date = new Date(),
  raceId,
  verificationId: serverVerificationId,
}: RaceCertificateProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState<HTMLImageElement | null>(null);
  const { toast } = useToast();

  const rating = getTypingPerformanceRating(wpm, accuracy);
  const tierVisuals = TIER_VISUALS[rating.badge] || TIER_VISUALS.Bronze;
  const placementVisuals = PLACEMENT_VISUALS[placement] || {
    emoji: "🏁",
    text: `${placement}${placement === 1 ? 'ST' : placement === 2 ? 'ND' : placement === 3 ? 'RD' : 'TH'} PLACE`,
    color: "#94a3b8"
  };

  // Generate certificate ID (server or fallback)
  const certificateId = useMemo(() => {
    if (serverVerificationId) return serverVerificationId;
    // Fallback: Generate client-side hash with proper 3-group format
    const data = `${wpm}-${accuracy}-${placement}-${totalParticipants}-${characters}-${duration}${raceId || ''}`;
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
  }, [serverVerificationId, wpm, accuracy, placement, totalParticipants, characters, duration, raceId]);

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
  }, [wpm, accuracy, consistency, placement, totalParticipants, characters, errors, duration, username, qrCodeImage, certificateId]);

  const generateCertificate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const displayName = username || "Racer";

    canvas.width = 1200;
    canvas.height = 675;

    // Dynamic background based on placement
    const bgGradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, canvas.width * 0.7
    );

    if (placement === 1) {
      bgGradient.addColorStop(0, "#2a1a1a");
      bgGradient.addColorStop(0.5, "#1e1a0e");
      bgGradient.addColorStop(1, "#0f0f23");
    } else if (placement === 2) {
      bgGradient.addColorStop(0, "#1a1a2a");
      bgGradient.addColorStop(0.5, "#1a1a1e");
      bgGradient.addColorStop(1, "#0f0f23");
    } else if (placement === 3) {
      bgGradient.addColorStop(0, "#2a1a1a");
      bgGradient.addColorStop(0.5, "#1e1616");
      bgGradient.addColorStop(1, "#0f0f23");
    } else {
      bgGradient.addColorStop(0, "#1a1a2e");
      bgGradient.addColorStop(0.5, "#16213e");
      bgGradient.addColorStop(1, "#0f0f23");
    }

    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Racing-themed pattern overlay
    ctx.globalAlpha = 0.02;
    for (let i = 0; i < canvas.width; i += 60) {
      for (let j = 0; j < canvas.height; j += 60) {
        if ((i + j) % 120 === 0) {
          ctx.fillStyle = placementVisuals.color;
          ctx.fillText("🏁", i, j);
        }
      }
    }
    ctx.globalAlpha = 1;

    // Elegant outer border with placement color
    const borderWidth = 6;
    const borderGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    borderGradient.addColorStop(0, placementVisuals.color);
    borderGradient.addColorStop(0.5, tierVisuals.primaryColor);
    borderGradient.addColorStop(1, placementVisuals.color);

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
    ctx.strokeStyle = placementVisuals.color;
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

    // Header: 🏁 MULTIPLAYER RACE CERTIFICATE
    ctx.fillStyle = placementVisuals.color;
    ctx.font = "bold 32px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("🏁", canvas.width / 2 - 220, 65);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("MULTIPLAYER RACE CERTIFICATE", canvas.width / 2 + 40, 68);

    // Decorative line under header
    const lineWidth = 500;
    const lineY = 90;
    const lineGradient = ctx.createLinearGradient(
      canvas.width / 2 - lineWidth / 2, lineY,
      canvas.width / 2 + lineWidth / 2, lineY
    );
    lineGradient.addColorStop(0, "transparent");
    lineGradient.addColorStop(0.2, placementVisuals.color);
    lineGradient.addColorStop(0.5, tierVisuals.primaryColor);
    lineGradient.addColorStop(0.8, placementVisuals.color);
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
    ctx.fillText("This certifies that", canvas.width / 2, 135);

    // User Name - Large and prominent with glow
    ctx.save();
    ctx.shadowColor = placement <= 3 ? placementVisuals.color : tierVisuals.glowColor;
    ctx.shadowBlur = 30;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 48px 'DM Sans', system-ui, sans-serif";
    ctx.fillText(displayName, canvas.width / 2, 185);
    ctx.restore();

    // Placement badge - HUGE and prominent
    ctx.save();
    ctx.shadowColor = placementVisuals.color;
    ctx.shadowBlur = 40;
    ctx.fillStyle = placementVisuals.color;
    ctx.font = "bold 64px 'JetBrains Mono', monospace";
    ctx.fillText(placementVisuals.emoji, canvas.width / 2 - 100, 255);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px 'DM Sans', system-ui, sans-serif";
    ctx.fillText(placementVisuals.text, canvas.width / 2 + 40, 255);
    ctx.restore();

    // "in a multiplayer race against"
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "italic 18px 'DM Sans', system-ui, sans-serif";
    ctx.fillText(`in a competitive race against ${totalParticipants - 1} other ${totalParticipants - 1 === 1 ? 'opponent' : 'opponents'}`, canvas.width / 2, 295);

    // Stats box background
    const statsBoxX = 150;
    const statsBoxY = 320;
    const statsBoxWidth = 900;
    const statsBoxHeight = 110;

    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.beginPath();
    ctx.roundRect(statsBoxX, statsBoxY, statsBoxWidth, statsBoxHeight, 12);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(statsBoxX, statsBoxY, statsBoxWidth, statsBoxHeight, 12);
    ctx.stroke();

    // Stats Row: WPM | Accuracy | Characters | Duration
    const rowY = statsBoxY + 45;
    const statsStartX = statsBoxX + 100;
    const statSpacing = 220;

    // WPM
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${wpm}`, statsStartX, rowY);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "12px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("WPM", statsStartX, rowY + 22);

    // Divider
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillText("|", statsStartX + statSpacing / 2, rowY);

    // Accuracy
    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 36px 'JetBrains Mono', monospace";
    ctx.fillText(`${accuracy}%`, statsStartX + statSpacing, rowY);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "12px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("ACCURACY", statsStartX + statSpacing, rowY + 22);

    // Divider
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillText("|", statsStartX + statSpacing * 1.5, rowY);

    // Characters
    ctx.fillStyle = "#c084fc";
    ctx.font = "bold 36px 'JetBrains Mono', monospace";
    ctx.fillText(`${characters}`, statsStartX + statSpacing * 2, rowY);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "12px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("CHARS", statsStartX + statSpacing * 2, rowY + 22);

    // Divider
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillText("|", statsStartX + statSpacing * 2.5, rowY);

    // Duration
    const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
    };
    ctx.fillStyle = "#22d3ee";
    ctx.font = "bold 32px 'JetBrains Mono', monospace";
    ctx.fillText(formatDuration(duration), statsStartX + statSpacing * 3, rowY);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "12px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("TIME", statsStartX + statSpacing * 3, rowY + 22);

    // Additional stats below
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "14px 'DM Sans', system-ui, sans-serif";
    ctx.fillText(`${errors} error${errors !== 1 ? 's' : ''}  •  ${consistency}% consistency  •  Victory against ${totalParticipants - 1} ${totalParticipants - 1 === 1 ? 'opponent' : 'opponents'}`, canvas.width / 2, statsBoxY + statsBoxHeight + 35);

    // Performance tier badge (on right side)
    const badgeX = canvas.width - 100;
    const badgeY = statsBoxY + statsBoxHeight / 2;
    const badgeRadius = 35;

    ctx.save();
    ctx.shadowColor = tierVisuals.glowColor;
    ctx.shadowBlur = 15;

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
    ctx.font = "bold 12px 'DM Sans', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(rating.badge.toUpperCase(), badgeX, badgeY - 2);
    ctx.fillStyle = "#ffffff";
    ctx.font = "9px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("TIER", badgeX, badgeY + 12);

    // Earned on date
    const formattedDate = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "16px 'DM Sans', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Completed on: ${formattedDate}`, canvas.width / 2, 520);

    // Victory message based on placement
    let victoryMessage = rating.title;
    if (placement === 1) victoryMessage = "Champion Performance";
    else if (placement === 2) victoryMessage = "Outstanding Runner-Up";
    else if (placement === 3) victoryMessage = "Strong Podium Finish";

    ctx.fillStyle = placementVisuals.color;
    ctx.font = "italic 22px 'DM Sans', system-ui, sans-serif";
    ctx.fillText(`"${victoryMessage}"`, canvas.width / 2, 560);

    // Signature section
    const sigY = 610;

    // Signature line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 150, sigY);
    ctx.lineTo(canvas.width / 2 + 150, sigY);
    ctx.stroke();

    // AI Coach signature
    ctx.fillStyle = placementVisuals.color;
    ctx.font = "italic 18px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("TypeMasterAI Race Official", canvas.width / 2, sigY - 10);

    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "11px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("Official Multiplayer Racing Authority", canvas.width / 2, sigY + 18);

    // Footer with certificate ID and URL
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`ID: ${certificateId}`, 50, canvas.height - 25);

    ctx.textAlign = "center";
    ctx.fillText("typemasterai.com/multiplayer", canvas.width / 2, canvas.height - 25);

    ctx.textAlign = "right";
    ctx.fillStyle = placementVisuals.color;
    ctx.font = "bold 10px 'JetBrains Mono', monospace";
    ctx.fillText(`${placementVisuals.emoji} ${placementVisuals.text}`, canvas.width - 50, canvas.height - 25);
  };

  const downloadCertificate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `TypeMasterAI_Race_Certificate_P${placement}_${wpm}WPM_${certificateId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    triggerCelebration(placement <= 3 ? 'large' : 'medium');

    toast({
      title: "Certificate Downloaded!",
      description: "Share your racing achievement!",
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

      const file = new File([blob], `TypeMasterAI_Race_Certificate_${wpm}WPM.png`, { type: "image/png" });

      if ('share' in navigator && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `TypeMasterAI Race Certificate - ${placementVisuals.text}`,
          text: `${placementVisuals.emoji} I finished ${placementVisuals.text} in a multiplayer race!\n\n⚡ ${wpm} WPM with ${accuracy}% accuracy\n🏁 Beat ${totalParticipants - 1} ${totalParticipants - 1 === 1 ? 'opponent' : 'opponents'}\n🏅 ${victoryMessage}\n📜 Certificate: ${certificateId}\n\nCan you beat my time?\n\n🔗 typemasterai.com/multiplayer`,
          files: [file],
        });
        triggerCelebration(placement <= 3 ? 'large' : 'medium');
        toast({
          title: "Certificate Shared!",
          description: "Your racing achievement is on its way!",
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
        description: "Paste directly into social media!",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Your browser doesn't support image copying. Please download instead.",
        variant: "destructive",
      });
    }
  };

  const victoryMessage = placement === 1 ? "Champion Performance" : placement === 2 ? "Outstanding Runner-Up" : placement === 3 ? "Strong Podium Finish" : rating.title;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full overflow-hidden rounded-xl shadow-2xl" data-testid="race-certificate-container" style={{ boxShadow: `0 25px 50px -12px ${placementVisuals.color}40` }}>
        <canvas
          ref={canvasRef}
          className="w-full h-auto"
          style={{ maxWidth: "100%" }}
          data-testid="race-certificate-canvas"
        />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 rounded-full backdrop-blur-sm border border-white/10">
          <Trophy className="w-3.5 h-3.5" style={{ color: placementVisuals.color }} />
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: placementVisuals.color }}>
            {placementVisuals.text}
          </span>
        </div>
      </div>

      <div className="w-full space-y-3">
        <div className="p-4 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 rounded-xl border border-zinc-700">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" style={{ color: placementVisuals.color }} />
            <p className="text-sm font-medium" style={{ color: placementVisuals.color }}>Share Your Racing Victory</p>
            <Sparkles className="w-4 h-4" style={{ color: placementVisuals.color }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={copyImageToClipboard}
              variant="outline"
              className="gap-2 h-10 bg-zinc-800/50 border-zinc-600 hover:bg-zinc-700/50 hover:border-zinc-500"
              data-testid="button-copy-race-certificate"
            >
              {imageCopied ? <Check className="w-4 h-4 text-green-500" /> : <Clipboard className="w-4 h-4" style={{ color: placementVisuals.color }} />}
              <span className="text-zinc-200">{imageCopied ? "Copied!" : "Copy Image"}</span>
            </Button>
            <Button
              onClick={downloadCertificate}
              variant="outline"
              className="gap-2 h-10 bg-zinc-800/50 border-zinc-600 hover:bg-zinc-700/50 hover:border-zinc-500"
              data-testid="button-download-race-certificate"
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
              background: `linear-gradient(135deg, ${placement <= 3 ? placementVisuals.color : tierVisuals.borderGradient[0]}, ${tierVisuals.primaryColor}, ${placement <= 3 ? placementVisuals.color : tierVisuals.borderGradient[2]})`,
            }}
            data-testid="button-share-race-certificate"
          >
            <Share2 className="w-4 h-4" />
            {isSharing ? "Sharing..." : "Share Certificate"}
          </Button>
        )}

        <p className="text-[10px] text-center text-zinc-500" data-testid="text-race-certificate-id">
          Certificate ID: <span className="font-mono" style={{ color: placementVisuals.color }}>{certificateId}</span>
        </p>
      </div>
    </div>
  );
}
