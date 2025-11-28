import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareCardProps {
  wpm: number;
  accuracy: number;
  mode: number;
  language: string;
  username?: string;
  onClose?: () => void;
  onShareTracked?: (platform: string) => void;
}

export function ShareCard({ wpm, accuracy, mode, language, username, onClose, onShareTracked }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const getPerformanceRating = () => {
    if (wpm >= 100 && accuracy >= 98) return { emoji: "🏆", title: "Legendary Typist", badge: "Diamond", color: "#b9f2ff", bgGradient: ["#0f172a", "#1e3a5f", "#0f172a"] };
    if (wpm >= 80 && accuracy >= 95) return { emoji: "⚡", title: "Speed Demon", badge: "Platinum", color: "#e5e4e2", bgGradient: ["#0f172a", "#2d3748", "#0f172a"] };
    if (wpm >= 60 && accuracy >= 90) return { emoji: "🔥", title: "Fast & Accurate", badge: "Gold", color: "#ffd700", bgGradient: ["#0f172a", "#3d2914", "#0f172a"] };
    if (wpm >= 40 && accuracy >= 85) return { emoji: "💪", title: "Solid Performer", badge: "Silver", color: "#c0c0c0", bgGradient: ["#0f172a", "#374151", "#0f172a"] };
    return { emoji: "🎯", title: "Rising Star", badge: "Bronze", color: "#cd7f32", bgGradient: ["#0f172a", "#3d2a1a", "#0f172a"] };
  };

  useEffect(() => {
    generateCard();
  }, [wpm, accuracy, mode, language, username]);

  const generateCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rating = getPerformanceRating();
    const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)}min` : `${mode}s`;

    canvas.width = 600;
    canvas.height = 400;

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, rating.bgGradient[0]);
    gradient.addColorStop(0.5, rating.bgGradient[1]);
    gradient.addColorStop(1, rating.bgGradient[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

    ctx.strokeStyle = rating.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(25, 25, canvas.width - 50, canvas.height - 50);

    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 16px 'DM Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("TypeMasterAI", 40, 55);

    ctx.fillStyle = rating.color;
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${rating.emoji} ${rating.badge}`, canvas.width - 40, 55);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 72px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${wpm}`, canvas.width / 2, 150);

    ctx.fillStyle = "#00ffff";
    ctx.font = "24px 'DM Sans', sans-serif";
    ctx.fillText("WPM", canvas.width / 2, 180);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "18px 'DM Sans', sans-serif";
    ctx.fillText(rating.title, canvas.width / 2, 215);

    const statsY = 260;
    ctx.fillStyle = "rgba(30, 41, 59, 0.8)";
    ctx.fillRect(40, statsY - 25, canvas.width - 80, 60);
    ctx.strokeStyle = rating.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(40, statsY - 25, canvas.width - 80, 60);

    ctx.font = "bold 20px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#22c55e";
    ctx.textAlign = "center";
    ctx.fillText(`${accuracy}%`, 140, statsY + 8);
    ctx.fillStyle = "#64748b";
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.fillText("Accuracy", 140, statsY + 25);

    ctx.font = "bold 20px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#a855f7";
    ctx.fillText(modeDisplay, canvas.width / 2, statsY + 8);
    ctx.fillStyle = "#64748b";
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.fillText("Duration", canvas.width / 2, statsY + 25);

    ctx.font = "bold 20px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#f59e0b";
    ctx.fillText(language.toUpperCase(), canvas.width - 140, statsY + 8);
    ctx.fillStyle = "#64748b";
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.fillText("Language", canvas.width - 140, statsY + 25);

    if (username) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px 'DM Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`@${username}`, canvas.width / 2, 340);
    }

    ctx.fillStyle = "#a855f7";
    ctx.font = "bold 14px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("typemasterai.com", canvas.width / 2, 375);

    ctx.fillStyle = "#64748b";
    ctx.font = "10px 'DM Sans', sans-serif";
    ctx.fillText("Can you beat my score? 🎯", canvas.width / 2, 390);
  };

  const downloadCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `TypeMasterAI_${wpm}WPM_${accuracy}acc.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    
    onShareTracked?.('visual_card_download');
    
    toast({
      title: "Card Downloaded!",
      description: "Share it on social media to challenge your friends!",
    });
  };

  const shareCard = async () => {
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

      const file = new File([blob], `TypeMasterAI_${wpm}WPM.png`, { type: "image/png" });
      const rating = getPerformanceRating();
      const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;

      if ('share' in navigator && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `TypeMasterAI - ${wpm} WPM`,
          text: `${rating.emoji} I scored ${wpm} WPM with ${accuracy}% accuracy on TypeMasterAI!\n\n🏅 ${rating.title} - ${rating.badge} Badge\n⏱️ ${modeDisplay} test\n\nCan you beat my score?\n\n🔗 typemasterai.com`,
          files: [file],
        });
        onShareTracked?.('visual_card_native');
        toast({
          title: "Shared Successfully!",
          description: "Your achievement is on its way to inspire others!",
        });
      } else {
        downloadCard();
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        downloadCard();
      }
    } finally {
      setIsSharing(false);
    }
  };

  const copyShareText = () => {
    const rating = getPerformanceRating();
    const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
    const text = `${rating.emoji} I just scored ${wpm} WPM with ${accuracy}% accuracy on TypeMasterAI!

⌨️ ${wpm} WPM | ✨ ${accuracy}% Accuracy
🏅 ${rating.title} - ${rating.badge} Badge
⏱️ ${modeDisplay} typing test

Think you can beat my score? Try it now! 🎯

🔗 https://typemasterai.com

#TypingTest #TypeMasterAI #WPM`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShareTracked?.('visual_card_copy');
    toast({
      title: "Copied!",
      description: "Share text copied to clipboard.",
    });
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        className="rounded-xl shadow-2xl max-w-full h-auto border border-primary/20"
        style={{ maxWidth: "100%", height: "auto" }}
      />
      
      <div className="flex flex-wrap gap-3 justify-center w-full">
        <Button
          onClick={downloadCard}
          variant="outline"
          className="gap-2"
          data-testid="button-download-card"
        >
          <Download className="w-4 h-4" />
          Download
        </Button>
        
        <Button
          onClick={shareCard}
          disabled={isSharing}
          className="gap-2"
          data-testid="button-share-card"
        >
          <Share2 className="w-4 h-4" />
          {isSharing ? "Sharing..." : "Share Image"}
        </Button>
        
        <Button
          onClick={copyShareText}
          variant="secondary"
          className="gap-2"
          data-testid="button-copy-share-text"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          Copy Text
        </Button>
      </div>
    </div>
  );
}
