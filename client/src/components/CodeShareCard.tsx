import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, Check, Clipboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  getCodePerformanceRating, 
  getLanguageIcon, 
  drawCardBackground,
  triggerCelebration,
  CARD_DIMENSIONS 
} from "@/lib/share-utils";

interface CodeShareCardProps {
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
  onShareTracked?: (platform: string) => void;
}

export function CodeShareCard({ 
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
  onShareTracked 
}: CodeShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const { toast } = useToast();

  const rating = getCodePerformanceRating(wpm, accuracy);
  const langIcon = getLanguageIcon(language);

  useEffect(() => {
    generateCard();
  }, [wpm, rawWpm, accuracy, consistency, language, languageName, difficulty, characters, errors, time, username]);

  const generateCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dims = CARD_DIMENSIONS.code;
    canvas.width = dims.width;
    canvas.height = dims.height;

    drawCardBackground(ctx, canvas, rating);

    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 16px 'DM Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("TypeMasterAI - Code Mode", 40, 55);

    ctx.fillStyle = rating.color;
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${rating.emoji} ${rating.badge}`, canvas.width - 40, 55);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 72px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${wpm}`, canvas.width / 2, 140);

    ctx.fillStyle = "#00ffff";
    ctx.font = "24px 'DM Sans', sans-serif";
    ctx.fillText("WPM", canvas.width / 2, 170);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "18px 'DM Sans', sans-serif";
    ctx.fillText(rating.title, canvas.width / 2, 200);

    const statsY = 250;
    ctx.fillStyle = "rgba(30, 41, 59, 0.8)";
    ctx.fillRect(40, statsY - 25, canvas.width - 80, 60);
    ctx.strokeStyle = rating.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(40, statsY - 25, canvas.width - 80, 60);

    const statPositions = [90, 180, 280, 380, 480];
    
    ctx.font = "bold 18px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#22c55e";
    ctx.textAlign = "center";
    ctx.fillText(`${accuracy}%`, statPositions[0], statsY + 8);
    ctx.fillStyle = "#64748b";
    ctx.font = "10px 'DM Sans', sans-serif";
    ctx.fillText("Accuracy", statPositions[0], statsY + 22);

    ctx.font = "bold 18px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#a855f7";
    ctx.fillText(`${rawWpm}`, statPositions[1], statsY + 8);
    ctx.fillStyle = "#64748b";
    ctx.font = "10px 'DM Sans', sans-serif";
    ctx.fillText("Raw WPM", statPositions[1], statsY + 22);

    ctx.font = "bold 18px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#22c55e";
    ctx.fillText(`${consistency}%`, statPositions[2], statsY + 8);
    ctx.fillStyle = "#64748b";
    ctx.font = "10px 'DM Sans', sans-serif";
    ctx.fillText("Consistency", statPositions[2], statsY + 22);

    ctx.font = "bold 18px 'JetBrains Mono', monospace";
    ctx.fillStyle = errors > 0 ? "#ef4444" : "#22c55e";
    ctx.fillText(`${errors}`, statPositions[3], statsY + 8);
    ctx.fillStyle = "#64748b";
    ctx.font = "10px 'DM Sans', sans-serif";
    ctx.fillText("Errors", statPositions[3], statsY + 22);

    ctx.font = "bold 18px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#3b82f6";
    ctx.fillText(`${characters}`, statPositions[4], statsY + 8);
    ctx.fillStyle = "#64748b";
    ctx.font = "10px 'DM Sans', sans-serif";
    ctx.fillText("Chars", statPositions[4], statsY + 22);

    const langY = 340;
    ctx.fillStyle = "rgba(30, 41, 59, 0.6)";
    ctx.fillRect(130, langY - 20, 340, 40);
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 1;
    ctx.strokeRect(130, langY - 20, 340, 40);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${langIcon} ${languageName}`, canvas.width / 2 - 50, langY + 6);
    
    ctx.fillStyle = "#64748b";
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.fillText(`• ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} • ${time}`, canvas.width / 2 + 80, langY + 6);

    if (username) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px 'DM Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`@${username}`, canvas.width / 2, 390);
    }

    ctx.fillStyle = "#a855f7";
    ctx.font = "bold 14px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("typemasterai.com/code-mode", canvas.width / 2, 420);

    ctx.fillStyle = "#64748b";
    ctx.font = "10px 'DM Sans', sans-serif";
    ctx.fillText("Can you type code faster? 🚀", canvas.width / 2, 435);
  };

  const downloadCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `TypeMasterAI_Code_${languageName}_${wpm}WPM.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    
    triggerCelebration('small');
    onShareTracked?.('code_card_download');
    
    toast({
      title: "Card Downloaded!",
      description: "Share it on social media to challenge other coders!",
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

      const file = new File([blob], `TypeMasterAI_Code_${wpm}WPM.png`, { type: "image/png" });

      if ('share' in navigator && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `TypeMasterAI Code Mode - ${wpm} WPM`,
          text: `${rating.emoji} I typed ${languageName} code at ${wpm} WPM with ${accuracy}% accuracy on TypeMasterAI!\n\n🏅 ${rating.title} - ${rating.badge} Badge\n💻 ${characters} characters\n\nCan you code faster?\n\n🔗 typemasterai.com/code-mode`,
          files: [file],
        });
        triggerCelebration('medium');
        onShareTracked?.('code_card_native');
        toast({
          title: "Shared Successfully!",
          description: "Your code typing achievement is on its way!",
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
      onShareTracked?.('code_card_copy_image');
      toast({
        title: "Image Copied!",
        description: "Paste directly into Twitter, Discord, or any app!",
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
      <canvas
        ref={canvasRef}
        className="rounded-xl shadow-2xl max-w-full h-auto border border-primary/20"
        style={{ maxWidth: "100%", height: "auto" }}
      />
      
      <div className="w-full space-y-3">
        <div className="p-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
          <p className="text-xs text-center text-blue-300 font-medium mb-2">Share This Image</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={copyImageToClipboard}
              variant="outline"
              className="gap-2 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
              data-testid="button-copy-code-image"
            >
              {imageCopied ? <Check className="w-4 h-4 text-green-500" /> : <Clipboard className="w-4 h-4 text-blue-400" />}
              {imageCopied ? "Copied!" : "Copy Image"}
            </Button>
            <Button
              onClick={downloadCard}
              variant="outline"
              className="gap-2 bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20"
              data-testid="button-download-code-card"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              Download
            </Button>
          </div>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            Copy image and paste directly into Twitter, Discord, or any social app
          </p>
        </div>

        {'share' in navigator && (
          <Button
            onClick={shareCard}
            disabled={isSharing}
            className="w-full gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            data-testid="button-share-code-card"
          >
            <Share2 className="w-4 h-4" />
            {isSharing ? "Sharing..." : "Share Image (Mobile/Desktop Apps)"}
          </Button>
        )}
      </div>
    </div>
  );
}
