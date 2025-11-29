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
  badgeGradient: [string, string];
}

const TIER_VISUALS: Record<string, TierVisuals> = {
  Diamond: {
    primaryColor: "#9be7ff", secondaryColor: "#00d4ff",
    glowColor: "rgba(155, 231, 255, 0.4)",
    badgeGradient: ["#00d4ff", "#9be7ff"],
  },
  Platinum: {
    primaryColor: "#e5e4e2", secondaryColor: "#b8b8b8",
    glowColor: "rgba(229, 228, 226, 0.4)",
    badgeGradient: ["#b8b8b8", "#e5e4e2"],
  },
  Gold: {
    primaryColor: "#ffd700", secondaryColor: "#ffb800",
    glowColor: "rgba(255, 215, 0, 0.4)",
    badgeGradient: ["#ffb800", "#ffd700"],
  },
  Silver: {
    primaryColor: "#c0c0c0", secondaryColor: "#a0a0a0",
    glowColor: "rgba(192, 192, 192, 0.4)",
    badgeGradient: ["#a0a0a0", "#c0c0c0"],
  },
  Bronze: {
    primaryColor: "#cd7f32", secondaryColor: "#b8722a",
    glowColor: "rgba(205, 127, 50, 0.4)",
    badgeGradient: ["#b8722a", "#cd7f32"],
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

    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGradient.addColorStop(0, "#050816");
    bgGradient.addColorStop(0.3, "#0a1628");
    bgGradient.addColorStop(0.7, "#111e3b");
    bgGradient.addColorStop(1, "#0a1225");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(0, 255, 224, 0.03)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(10, 20, 40, 0.7)";
    ctx.fillRect(0, 0, canvas.width, 80);
    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

    const headerGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    headerGradient.addColorStop(0, "rgba(0, 255, 224, 0.15)");
    headerGradient.addColorStop(0.5, "rgba(168, 85, 247, 0.1)");
    headerGradient.addColorStop(1, "rgba(0, 255, 224, 0.15)");
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 78, canvas.width, 2);

    ctx.fillStyle = "#00ffe0";
    ctx.font = "bold 22px 'DM Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("TypeMasterAI", 40, 50);

    ctx.fillStyle = "#64748b";
    ctx.font = "14px 'DM Sans', sans-serif";
    ctx.fillText("Code Typing Certification", 200, 50);

    ctx.fillStyle = tierVisuals.primaryColor;
    ctx.font = "bold 14px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${rating.emoji} ${rating.badge.toUpperCase()} TIER`, canvas.width - 40, 50);

    ctx.save();
    ctx.shadowColor = tierVisuals.glowColor;
    ctx.shadowBlur = 60;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 120px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${wpm}`, canvas.width / 2, 220);
    ctx.restore();

    ctx.fillStyle = "#00ffe0";
    ctx.font = "bold 28px 'DM Sans', sans-serif";
    ctx.fillText("WPM", canvas.width / 2, 260);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "18px 'DM Sans', sans-serif";
    ctx.fillText(`Certified ${rating.title}`, canvas.width / 2, 295);

    const badgeWidth = 180;
    const badgeHeight = 50;
    const badgeX = canvas.width / 2 - badgeWidth / 2;
    const badgeY = 310;
    
    const badgeGradient = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeWidth, badgeY + badgeHeight);
    badgeGradient.addColorStop(0, tierVisuals.badgeGradient[0]);
    badgeGradient.addColorStop(1, tierVisuals.badgeGradient[1]);
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.roundRect(badgeX + 2, badgeY + 2, badgeWidth, badgeHeight, 25);
    ctx.fill();
    
    ctx.fillStyle = badgeGradient;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 25);
    ctx.fill();
    
    ctx.fillStyle = "#000000";
    ctx.font = "bold 18px 'DM Sans', sans-serif";
    ctx.fillText(`${rating.emoji} ${rating.badge}`, canvas.width / 2, badgeY + 33);

    const statsY = 410;
    const statsRowHeight = 70;
    const statWidth = 160;
    const statsStartX = 80;
    const statsGap = 20;

    const stats = [
      { label: "Accuracy", value: `${accuracy}%`, color: "#22c55e" },
      { label: "Raw WPM", value: `${rawWpm}`, color: "#a855f7" },
      { label: "Consistency", value: `${consistency}%`, color: "#3b82f6" },
      { label: "Errors", value: `${errors}`, color: errors > 0 ? "#ef4444" : "#22c55e" },
      { label: "Characters", value: `${characters}`, color: "#f59e0b" },
      { label: "Time", value: time, color: "#06b6d4" },
    ];

    stats.forEach((stat, i) => {
      const x = statsStartX + (i * (statWidth + statsGap));
      
      ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
      ctx.beginPath();
      ctx.roundRect(x, statsY, statWidth, statsRowHeight, 12);
      ctx.fill();
      
      ctx.strokeStyle = "rgba(100, 116, 139, 0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, statsY, statWidth, statsRowHeight, 12);
      ctx.stroke();
      
      ctx.fillStyle = stat.color;
      ctx.font = "bold 28px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(stat.value, x + statWidth / 2, statsY + 35);
      
      ctx.fillStyle = "#64748b";
      ctx.font = "12px 'DM Sans', sans-serif";
      ctx.fillText(stat.label.toUpperCase(), x + statWidth / 2, statsY + 55);
    });

    const infoY = 510;
    const infoBoxWidth = 200;
    const infoBoxHeight = 55;
    const infoStartX = 80;
    const infoGap = 25;

    const infoItems = [
      { label: "Language", value: `${langIcon} ${languageName}`, icon: langIcon },
      { label: "Difficulty", value: difficulty.charAt(0).toUpperCase() + difficulty.slice(1) },
      { label: "Certificate ID", value: certificateId },
      { label: "Issued", value: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
    ];

    infoItems.forEach((item, i) => {
      const x = infoStartX + (i * (infoBoxWidth + infoGap));
      
      ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
      ctx.beginPath();
      ctx.roundRect(x, infoY, infoBoxWidth, infoBoxHeight, 10);
      ctx.fill();
      
      ctx.strokeStyle = "rgba(0, 255, 224, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, infoY, infoBoxWidth, infoBoxHeight, 10);
      ctx.stroke();
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px 'DM Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(item.value, x + infoBoxWidth / 2, infoY + 25);
      
      ctx.fillStyle = "#64748b";
      ctx.font = "10px 'DM Sans', sans-serif";
      ctx.fillText(item.label.toUpperCase(), x + infoBoxWidth / 2, infoY + 43);
    });

    if (username) {
      ctx.fillStyle = "#00ffe0";
      ctx.font = "bold 16px 'DM Sans', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`@${username}`, canvas.width - 40, infoY + 35);
    }

    ctx.fillStyle = "#a855f7";
    ctx.font = "bold 14px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("$ ", 40, canvas.height - 25);
    
    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px 'JetBrains Mono', monospace";
    ctx.fillText("typemasterai.com/code-mode", 60, canvas.height - 25);
    
    ctx.fillStyle = "#00ffe0";
    ctx.fillRect(260, canvas.height - 35, 2, 16);

    ctx.fillStyle = "#64748b";
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("Can you type code faster? Challenge me! 🚀", canvas.width - 40, canvas.height - 25);

    ctx.strokeStyle = tierVisuals.primaryColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;
    
    ctx.beginPath();
    ctx.moveTo(30, 100);
    ctx.lineTo(30, 130);
    ctx.lineTo(50, 130);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(canvas.width - 30, 100);
    ctx.lineTo(canvas.width - 30, 130);
    ctx.lineTo(canvas.width - 50, 130);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(30, canvas.height - 100);
    ctx.lineTo(30, canvas.height - 130);
    ctx.lineTo(50, canvas.height - 130);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(canvas.width - 30, canvas.height - 100);
    ctx.lineTo(canvas.width - 30, canvas.height - 130);
    ctx.lineTo(canvas.width - 50, canvas.height - 130);
    ctx.stroke();
    
    ctx.globalAlpha = 1;
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
      <div className="relative w-full overflow-hidden rounded-xl shadow-2xl border border-cyan-500/20" data-testid="certificate-container">
        <canvas
          ref={canvasRef}
          className="w-full h-auto"
          style={{ maxWidth: "100%" }}
          data-testid="certificate-canvas"
        />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-black/50 rounded-full backdrop-blur-sm">
          <Award className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] font-medium text-cyan-300">OFFICIAL CERTIFICATE</span>
        </div>
      </div>
      
      <div className="w-full space-y-3">
        <div className="p-3 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 rounded-xl border border-cyan-500/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <p className="text-xs text-center text-cyan-300 font-medium">Share Your Certificate</p>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={copyImageToClipboard}
              variant="outline"
              className="gap-2 bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20"
              data-testid="button-copy-certificate"
            >
              {imageCopied ? <Check className="w-4 h-4 text-green-500" /> : <Clipboard className="w-4 h-4 text-cyan-400" />}
              {imageCopied ? "Copied!" : "Copy Image"}
            </Button>
            <Button
              onClick={downloadCertificate}
              variant="outline"
              className="gap-2 bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20"
              data-testid="button-download-certificate"
            >
              <Download className="w-4 h-4 text-purple-400" />
              Download
            </Button>
          </div>
        </div>

        {'share' in navigator && (
          <Button
            onClick={shareCertificate}
            disabled={isSharing}
            className="w-full gap-2 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 hover:from-cyan-600 hover:via-purple-600 hover:to-cyan-600 text-white font-semibold"
            data-testid="button-share-certificate"
          >
            <Share2 className="w-4 h-4" />
            {isSharing ? "Sharing..." : "Share Certificate"}
          </Button>
        )}
        
        <p className="text-[10px] text-center text-muted-foreground" data-testid="text-certificate-id">
          Certificate ID: <span className="font-mono text-cyan-400">{certificateId}</span>
        </p>
      </div>
    </div>
  );
}
