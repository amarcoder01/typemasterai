import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, Copy, Check, Twitter, Facebook, MessageCircle, Mail, Send, Image, Clipboard } from "lucide-react";
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

  const [imageCopied, setImageCopied] = useState(false);

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
      onShareTracked?.('visual_card_copy_image');
      toast({
        title: "Image Copied!",
        description: "Paste directly into Twitter, Discord, or any app that supports images!",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Your browser doesn't support image copying. Please download instead.",
        variant: "destructive",
      });
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

  const getShareText = () => {
    const rating = getPerformanceRating();
    const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
    return `${rating.emoji} I scored ${wpm} WPM with ${accuracy}% accuracy on TypeMasterAI! ${rating.badge} Badge - ${modeDisplay} test. Can you beat me?`;
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent('https://typemasterai.com')}`, '_blank', 'width=600,height=400');
    onShareTracked?.('visual_card_twitter');
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://typemasterai.com')}&quote=${encodeURIComponent(getShareText())}`, '_blank', 'width=600,height=400');
    onShareTracked?.('visual_card_facebook');
  };

  const shareToWhatsApp = () => {
    const fullText = getShareText() + '\n\n🔗 https://typemasterai.com';
    window.open(`https://wa.me/?text=${encodeURIComponent(fullText)}`, '_blank', 'width=600,height=400');
    onShareTracked?.('visual_card_whatsapp');
  };

  const shareToReddit = () => {
    const title = encodeURIComponent(`I scored ${wpm} WPM on TypeMasterAI!`);
    window.open(`https://www.reddit.com/submit?url=${encodeURIComponent('https://typemasterai.com')}&title=${title}`, '_blank', 'width=600,height=600');
    onShareTracked?.('visual_card_reddit');
  };

  const shareToTelegram = () => {
    const text = getShareText();
    window.open(`https://t.me/share/url?url=${encodeURIComponent('https://typemasterai.com')}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
    onShareTracked?.('visual_card_telegram');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`I scored ${wpm} WPM on TypeMasterAI!`);
    const body = encodeURIComponent(`${getShareText()}\n\nTry it yourself: https://typemasterai.com`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
    onShareTracked?.('visual_card_email');
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        className="rounded-xl shadow-2xl max-w-full h-auto border border-primary/20"
        style={{ maxWidth: "100%", height: "auto" }}
      />
      
      {/* Image Sharing Section */}
      <div className="w-full space-y-3">
        <div className="p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
          <p className="text-xs text-center text-purple-300 font-medium mb-2">Share This Image</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={copyImageToClipboard}
              variant="outline"
              className="gap-2 bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20"
              data-testid="button-copy-image"
            >
              {imageCopied ? <Check className="w-4 h-4 text-green-500" /> : <Clipboard className="w-4 h-4 text-purple-400" />}
              {imageCopied ? "Copied!" : "Copy Image"}
            </Button>
            <Button
              onClick={downloadCard}
              variant="outline"
              className="gap-2 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
              data-testid="button-download-card"
            >
              <Download className="w-4 h-4 text-blue-400" />
              Download
            </Button>
          </div>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            Copy image and paste directly into Twitter, Discord, or any social app
          </p>
        </div>

        {/* Native Share (Mobile) */}
        {'share' in navigator && (
          <Button
            onClick={shareCard}
            disabled={isSharing}
            className="w-full gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            data-testid="button-share-card"
          >
            <Share2 className="w-4 h-4" />
            {isSharing ? "Sharing..." : "Share Image (Mobile/Desktop Apps)"}
          </Button>
        )}
      </div>

      {/* Quick Text Share Section */}
      <div className="w-full space-y-2">
        <p className="text-xs text-center text-muted-foreground uppercase tracking-wide">Or Share with Text + Link</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={shareToTwitter}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/25 border border-[#1DA1F2]/20 transition-all"
            data-testid="button-visual-share-twitter"
          >
            <Twitter className="w-4 h-4 text-[#1DA1F2]" />
            <span className="text-xs font-medium">Twitter</span>
          </button>
          <button
            onClick={shareToFacebook}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/25 border border-[#1877F2]/20 transition-all"
            data-testid="button-visual-share-facebook"
          >
            <Facebook className="w-4 h-4 text-[#1877F2]" />
            <span className="text-xs font-medium">Facebook</span>
          </button>
          <button
            onClick={shareToWhatsApp}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/25 border border-[#25D366]/20 transition-all"
            data-testid="button-visual-share-whatsapp"
          >
            <MessageCircle className="w-4 h-4 text-[#25D366]" />
            <span className="text-xs font-medium">WhatsApp</span>
          </button>
          <button
            onClick={shareToReddit}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#FF4500]/10 hover:bg-[#FF4500]/25 border border-[#FF4500]/20 transition-all"
            data-testid="button-visual-share-reddit"
          >
            <svg className="w-4 h-4 text-[#FF4500]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
            </svg>
            <span className="text-xs font-medium">Reddit</span>
          </button>
          <button
            onClick={shareToTelegram}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/25 border border-[#0088cc]/20 transition-all"
            data-testid="button-visual-share-telegram"
          >
            <Send className="w-4 h-4 text-[#0088cc]" />
            <span className="text-xs font-medium">Telegram</span>
          </button>
          <button
            onClick={shareViaEmail}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-500/10 hover:bg-gray-500/25 border border-gray-500/20 transition-all"
            data-testid="button-visual-share-email"
          >
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium">Email</span>
          </button>
        </div>
        
        {/* Copy Text Button */}
        <button
          onClick={copyShareText}
          className="w-full py-2 mt-2 bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-lg text-sm flex items-center justify-center gap-2 transition-all"
          data-testid="button-copy-share-text"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          {copied ? "Text Copied!" : "Copy Share Text"}
        </button>
      </div>
    </div>
  );
}
