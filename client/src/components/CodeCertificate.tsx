import { useRef, useEffect, useMemo } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, Check, Clipboard, Award, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCodePerformanceRating, getLanguageIcon, triggerCelebration } from "@/lib/share-utils";

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
}: CodeCertificateProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const { toast } = useToast();

  const rating = getCodePerformanceRating(wpm, accuracy);
  const tierVisuals = TIER_VISUALS[rating.badge] || TIER_VISUALS.Bronze;

  const certificateId = useMemo(() => {
    const data = `${wpm}-${accuracy}-${consistency}-${language}-${characters}-${errors}-${time}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let id = "TM-";
    const absHash = Math.abs(hash);
    for (let i = 0; i < 8; i++) {
      id += chars[(absHash >> (i * 4)) % chars.length];
    }
    return id;
  }, [wpm, accuracy, consistency, language, characters, errors, time]);

  useEffect(() => {
    generateCertificate();
  }, [wpm, rawWpm, accuracy, consistency, language, languageName, difficulty, characters, errors, time, username]);

  const generateCertificate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const langIcon = getLanguageIcon(language);

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
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < canvas.width; i += 30) {
      for (let j = 0; j < canvas.height; j += 30) {
        if ((i + j) % 60 === 0) {
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(i, j, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;

    // Elegant outer border with tier color
    const borderWidth = 8;
    const borderGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    borderGradient.addColorStop(0, tierVisuals.borderGradient[0]);
    borderGradient.addColorStop(0.5, tierVisuals.borderGradient[1]);
    borderGradient.addColorStop(1, tierVisuals.borderGradient[2]);
    
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(borderWidth / 2, borderWidth / 2, canvas.width - borderWidth, canvas.height - borderWidth);

    // Inner decorative border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(25, 25, canvas.width - 50, canvas.height - 50);

    // Corner decorations
    const cornerSize = 40;
    const cornerOffset = 20;
    ctx.strokeStyle = tierVisuals.primaryColor;
    ctx.lineWidth = 2;
    
    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(cornerOffset, cornerOffset + cornerSize);
    ctx.lineTo(cornerOffset, cornerOffset);
    ctx.lineTo(cornerOffset + cornerSize, cornerOffset);
    ctx.stroke();
    
    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(canvas.width - cornerOffset - cornerSize, cornerOffset);
    ctx.lineTo(canvas.width - cornerOffset, cornerOffset);
    ctx.lineTo(canvas.width - cornerOffset, cornerOffset + cornerSize);
    ctx.stroke();
    
    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(cornerOffset, canvas.height - cornerOffset - cornerSize);
    ctx.lineTo(cornerOffset, canvas.height - cornerOffset);
    ctx.lineTo(cornerOffset + cornerSize, canvas.height - cornerOffset);
    ctx.stroke();
    
    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(canvas.width - cornerOffset - cornerSize, canvas.height - cornerOffset);
    ctx.lineTo(canvas.width - cornerOffset, canvas.height - cornerOffset);
    ctx.lineTo(canvas.width - cornerOffset, canvas.height - cornerOffset - cornerSize);
    ctx.stroke();

    // Header section with elegant line
    ctx.fillStyle = tierVisuals.primaryColor;
    ctx.font = "600 14px 'DM Sans', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.letterSpacing = "8px";
    ctx.fillText("CERTIFICATE OF ACHIEVEMENT", canvas.width / 2, 70);

    // Decorative line under header
    const lineWidth = 300;
    const lineY = 85;
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

    // Main title - Code Typing Mastery
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px 'DM Sans', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Code Typing Excellence", canvas.width / 2, 135);

    // Subtitle with language
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "400 18px 'DM Sans', system-ui, sans-serif";
    ctx.fillText(`${langIcon} ${languageName} Programming`, canvas.width / 2, 165);

    // Central WPM display with glow effect
    ctx.save();
    ctx.shadowColor = tierVisuals.glowColor;
    ctx.shadowBlur = 40;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 140px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${wpm}`, canvas.width / 2, 290);
    ctx.restore();

    // WPM label
    ctx.fillStyle = tierVisuals.primaryColor;
    ctx.font = "bold 24px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("WORDS PER MINUTE", canvas.width / 2, 325);

    // Performance badge/seal
    const sealX = canvas.width / 2;
    const sealY = 385;
    const sealRadius = 45;
    
    // Seal outer ring
    ctx.save();
    ctx.shadowColor = tierVisuals.glowColor;
    ctx.shadowBlur = 20;
    
    const sealGradient = ctx.createRadialGradient(sealX, sealY, 0, sealX, sealY, sealRadius);
    sealGradient.addColorStop(0, tierVisuals.secondaryColor);
    sealGradient.addColorStop(0.7, tierVisuals.primaryColor);
    sealGradient.addColorStop(1, tierVisuals.borderGradient[0]);
    
    ctx.fillStyle = sealGradient;
    ctx.beginPath();
    ctx.arc(sealX, sealY, sealRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Seal inner circle
    ctx.fillStyle = "#1a1a2e";
    ctx.beginPath();
    ctx.arc(sealX, sealY, sealRadius - 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // Badge text inside seal
    ctx.fillStyle = tierVisuals.primaryColor;
    ctx.font = "bold 16px 'DM Sans', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(rating.badge.toUpperCase(), sealX, sealY - 5);
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("TIER", sealX, sealY + 12);

    // Rating title below seal
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "italic 20px 'DM Sans', system-ui, sans-serif";
    ctx.fillText(`"${rating.title}"`, canvas.width / 2, 455);

    // Stats section with elegant cards
    const statsY = 490;
    const statCardWidth = 140;
    const statCardHeight = 65;
    const statsGap = 20;
    const totalStatsWidth = (statCardWidth * 6) + (statsGap * 5);
    const statsStartX = (canvas.width - totalStatsWidth) / 2;

    const stats = [
      { label: "ACCURACY", value: `${accuracy}%`, color: "#4ade80" },
      { label: "RAW WPM", value: `${rawWpm}`, color: "#c084fc" },
      { label: "CONSISTENCY", value: `${consistency}%`, color: "#60a5fa" },
      { label: "ERRORS", value: `${errors}`, color: errors > 0 ? "#f87171" : "#4ade80" },
      { label: "CHARACTERS", value: `${characters}`, color: "#fbbf24" },
      { label: "TIME", value: time, color: "#22d3ee" },
    ];

    stats.forEach((stat, i) => {
      const x = statsStartX + (i * (statCardWidth + statsGap));
      
      // Card background
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.beginPath();
      ctx.roundRect(x, statsY, statCardWidth, statCardHeight, 8);
      ctx.fill();
      
      // Card border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, statsY, statCardWidth, statCardHeight, 8);
      ctx.stroke();
      
      // Stat value
      ctx.fillStyle = stat.color;
      ctx.font = "bold 24px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(stat.value, x + statCardWidth / 2, statsY + 30);
      
      // Stat label
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "10px 'DM Sans', system-ui, sans-serif";
      ctx.fillText(stat.label, x + statCardWidth / 2, statsY + 50);
    });

    // Footer section
    const footerY = canvas.height - 55;
    
    // Decorative line above footer
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, footerY - 10);
    ctx.lineTo(canvas.width - 60, footerY - 10);
    ctx.stroke();

    // Left side - Brand
    ctx.fillStyle = tierVisuals.primaryColor;
    ctx.font = "bold 16px 'DM Sans', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("TypeMasterAI", 60, footerY + 15);
    
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "12px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("typemasterai.com/code-mode", 60, footerY + 35);

    // Center - Certificate details
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "11px 'JetBrains Mono', monospace";
    
    const difficultyText = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    ctx.fillText(`${difficultyText} Difficulty  •  ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, canvas.width / 2, footerY + 15);
    
    ctx.fillStyle = tierVisuals.primaryColor;
    ctx.font = "bold 12px 'JetBrains Mono', monospace";
    ctx.fillText(`ID: ${certificateId}`, canvas.width / 2, footerY + 35);

    // Right side - Username or challenge text
    ctx.textAlign = "right";
    if (username) {
      ctx.fillStyle = tierVisuals.primaryColor;
      ctx.font = "bold 14px 'DM Sans', system-ui, sans-serif";
      ctx.fillText(`@${username}`, canvas.width - 60, footerY + 15);
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "11px 'DM Sans', system-ui, sans-serif";
      ctx.fillText("Certified Developer", canvas.width - 60, footerY + 35);
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "12px 'DM Sans', system-ui, sans-serif";
      ctx.fillText("Can you type faster?", canvas.width - 60, footerY + 25);
    }
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
