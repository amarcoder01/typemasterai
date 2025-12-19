import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, Copy, Check, Twitter, Facebook, MessageCircle, Mail, Send, Clipboard, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type Badge as BadgeType } from "@shared/badges";

interface BadgeShareCardProps {
  badge: BadgeType;
  username?: string;
  unlockedAt?: string;
  isOpen: boolean;
  onClose: () => void;
  onShareTracked?: (platform: string) => void;
}

const tierColors = {
  bronze: { primary: "#CD7F32", secondary: "#B87333", accent: "#FFE4B5", glow: "rgba(205, 127, 50, 0.4)" },
  silver: { primary: "#C0C0C0", secondary: "#A9A9A9", accent: "#F5F5F5", glow: "rgba(192, 192, 192, 0.4)" },
  gold: { primary: "#FFD700", secondary: "#DAA520", accent: "#FFFACD", glow: "rgba(255, 215, 0, 0.4)" },
  platinum: { primary: "#00CED1", secondary: "#20B2AA", accent: "#E0FFFF", glow: "rgba(0, 206, 209, 0.4)" },
  diamond: { primary: "#9B59B6", secondary: "#E91E63", accent: "#F8BBD9", glow: "rgba(155, 89, 182, 0.4)" },
};

const tierEmojis = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "💎",
  diamond: "👑",
};

const categoryEmojis: Record<string, string> = {
  speed: "⚡",
  accuracy: "🎯",
  consistency: "📈",
  streak: "🔥",
  special: "⭐",
  secret: "🔮",
};

export function BadgeShareCard({ badge, username, unlockedAt, isOpen, onClose, onShareTracked }: BadgeShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const { toast } = useToast();

  const colors = tierColors[badge.tier] || tierColors.bronze;
  const tierEmoji = tierEmojis[badge.tier] || "🏆";
  const categoryEmoji = categoryEmojis[badge.category] || "🏆";

  useEffect(() => {
    if (isOpen) {
      setIsCanvasReady(false);
      const timer = setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            generateCard();
            setIsCanvasReady(true);
          });
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, badge, username]);

  const generateCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 600;
    canvas.height = 400;

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(0.3, "#1e293b");
    gradient.addColorStop(0.7, "#1e293b");
    gradient.addColorStop(1, "#0f172a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = 1;
    ctx.strokeRect(25, 25, canvas.width - 50, canvas.height - 50);

    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 16px 'DM Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("TypeMasterAI", 40, 55);

    ctx.fillStyle = "#a855f7";
    ctx.font = "10px 'DM Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("ACHIEVEMENT UNLOCKED", 40, 70);

    ctx.fillStyle = colors.primary;
    ctx.font = "bold 14px 'DM Sans', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${tierEmoji} ${badge.tier.toUpperCase()}`, canvas.width - 40, 55);

    ctx.fillStyle = "#64748b";
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.fillText(`+${badge.points} XP`, canvas.width - 40, 70);

    const centerX = canvas.width / 2;
    const badgeY = 145;
    const badgeRadius = 50;

    ctx.save();
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(centerX, badgeY, badgeRadius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    const badgeGradient = ctx.createRadialGradient(
      centerX, badgeY - 20, 0,
      centerX, badgeY, badgeRadius
    );
    badgeGradient.addColorStop(0, colors.accent);
    badgeGradient.addColorStop(0.5, colors.primary);
    badgeGradient.addColorStop(1, colors.secondary);

    ctx.beginPath();
    ctx.arc(centerX, badgeY, badgeRadius, 0, Math.PI * 2);
    ctx.fillStyle = badgeGradient;
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(categoryEmoji, centerX, badgeY);

    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(badge.name, centerX, 230);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "16px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    
    const maxWidth = 500;
    const words = badge.description.split(' ');
    let line = '';
    let y = 260;
    
    for (let word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line.trim(), centerX, y);
        line = word + ' ';
        y += 22;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), centerX, y);

    if (username) {
      ctx.fillStyle = "#64748b";
      ctx.font = "14px 'DM Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Unlocked by @${username}`, centerX, 320);
    }

    if (unlockedAt) {
      const date = new Date(unlockedAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      ctx.fillStyle = "#475569";
      ctx.font = "12px 'DM Sans', sans-serif";
      ctx.fillText(date, centerX, 340);
    }

    ctx.fillStyle = "#a855f7";
    ctx.font = "bold 14px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("typemasterai.com", centerX, 375);

    ctx.fillStyle = "#64748b";
    ctx.font = "10px 'DM Sans', sans-serif";
    ctx.fillText("Can you unlock this badge too? 🎯", centerX, 390);
  };

  const downloadCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `TypeMasterAI_Badge_${badge.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    
    onShareTracked?.('badge_card_download');
    
    toast({
      title: "Badge Card Downloaded!",
      description: "Share it on social media to show off your achievement!",
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

      const file = new File([blob], `TypeMasterAI_Badge_${badge.id}.png`, { type: "image/png" });

      if ('share' in navigator && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${badge.name} - TypeMasterAI Achievement`,
          text: getShareText(),
          files: [file],
        });
        onShareTracked?.('badge_card_native');
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
      onShareTracked?.('badge_card_copy_image');
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

  const getShareText = () => {
    return `${tierEmoji} Just unlocked "${badge.name}" badge! +${badge.points} XP 🎯\n\nCan you unlock it too?\n\n#TypeMasterAI #Badge`;
  };

  const getFacebookText = () => {
    return `${tierEmoji} Achievement Unlocked!\n\nI just earned the "${badge.name}" badge on TypeMasterAI! This feels so rewarding! 🎯\n\n${categoryEmoji} What it means:\n${badge.description}\n\n🏅 Badge Details:\n• Tier: ${badge.tier.charAt(0).toUpperCase() + badge.tier.slice(1)}\n• XP Earned: +${badge.points}\n\nHonestly, I didn't think I'd get this one! If you're into typing challenges and unlocking achievements, you should check this out.\n\nThink you can earn this badge too? 😏🚀`;
  };

  const copyShareText = () => {
    const text = getShareText() + '\n\n🔗 https://typemasterai.com';

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShareTracked?.('badge_card_copy_text');
    toast({
      title: "Copied!",
      description: "Share text copied to clipboard.",
    });
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent('https://typemasterai.com')}`, '_blank', 'width=600,height=400');
    onShareTracked?.('badge_twitter');
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://typemasterai.com')}&quote=${encodeURIComponent(getFacebookText())}`, '_blank', 'width=600,height=400');
    onShareTracked?.('badge_facebook');
  };

  const shareToWhatsApp = () => {
    const fullText = `*TypeMasterAI Badge*\n\nBadge: *${badge.name}*\nTier: *${badge.tier.charAt(0).toUpperCase() + badge.tier.slice(1)}*\nXP: +${badge.points}\n\nTry it: https://typemasterai.com`;
    window.open(`https://wa.me/?text=${encodeURIComponent(fullText)}`, '_blank', 'width=600,height=400');
    onShareTracked?.('badge_whatsapp');
  };

  const shareToReddit = () => {
    const title = encodeURIComponent(`I unlocked the "${badge.name}" badge on TypeMasterAI!`);
    window.open(`https://www.reddit.com/submit?url=${encodeURIComponent('https://typemasterai.com')}&title=${title}`, '_blank', 'width=600,height=600');
    onShareTracked?.('badge_reddit');
  };

  const shareToTelegram = () => {
    const text = getShareText();
    window.open(`https://t.me/share/url?url=${encodeURIComponent('https://typemasterai.com')}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
    onShareTracked?.('badge_telegram');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`I unlocked the "${badge.name}" badge on TypeMasterAI!`);
    const body = encodeURIComponent(`${getShareText()}\n\nTry it yourself: https://typemasterai.com`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
    onShareTracked?.('badge_email');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Your Achievement
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={600}
              height={400}
              className="rounded-xl shadow-2xl max-w-full h-auto border border-primary/20"
              style={{ maxWidth: "100%", height: "auto" }}
              data-testid="badge-share-canvas"
            />
            {!isCanvasReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Generating card...</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="w-full space-y-3">
            <div className="p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
              <p className="text-xs text-center text-purple-300 font-medium mb-2">Share This Image</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={copyImageToClipboard}
                  variant="outline"
                  className="gap-2 bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20"
                  disabled={!isCanvasReady}
                  data-testid="button-badge-copy-image"
                >
                  {imageCopied ? <Check className="w-4 h-4 text-green-500" /> : <Clipboard className="w-4 h-4 text-purple-400" />}
                  {imageCopied ? "Copied!" : "Copy Image"}
                </Button>
                <Button
                  onClick={downloadCard}
                  variant="outline"
                  className="gap-2 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
                  disabled={!isCanvasReady}
                  data-testid="button-badge-download"
                >
                  <Download className="w-4 h-4 text-blue-400" />
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
                disabled={isSharing || !isCanvasReady}
                className="w-full gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                data-testid="button-badge-share-native"
              >
                <Share2 className="w-4 h-4" />
                {isSharing ? "Sharing..." : "Share Image (Mobile/Desktop Apps)"}
              </Button>
            )}
          </div>

          <div className="w-full space-y-2">
            <p className="text-xs text-center text-muted-foreground uppercase tracking-wide">Or Share with Text + Link</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={shareToTwitter}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/25 border border-[#1DA1F2]/20 transition-all"
                data-testid="button-badge-share-twitter"
              >
                <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                <span className="text-xs font-medium">Twitter</span>
              </button>
              <button
                onClick={shareToFacebook}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/25 border border-[#1877F2]/20 transition-all"
                data-testid="button-badge-share-facebook"
              >
                <Facebook className="w-4 h-4 text-[#1877F2]" />
                <span className="text-xs font-medium">Facebook</span>
              </button>
              <button
                onClick={shareToWhatsApp}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/25 border border-[#25D366]/20 transition-all"
                data-testid="button-badge-share-whatsapp"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                <span className="text-xs font-medium">WhatsApp</span>
              </button>
              <button
                onClick={shareToReddit}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#FF4500]/10 hover:bg-[#FF4500]/25 border border-[#FF4500]/20 transition-all"
                data-testid="button-badge-share-reddit"
              >
                <svg className="w-4 h-4 text-[#FF4500]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                </svg>
                <span className="text-xs font-medium">Reddit</span>
              </button>
              <button
                onClick={shareToTelegram}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/25 border border-[#0088cc]/20 transition-all"
                data-testid="button-badge-share-telegram"
              >
                <Send className="w-4 h-4 text-[#0088cc]" />
                <span className="text-xs font-medium">Telegram</span>
              </button>
              <button
                onClick={shareViaEmail}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-500/10 hover:bg-gray-500/25 border border-gray-500/20 transition-all"
                data-testid="button-badge-share-email"
              >
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-medium">Email</span>
              </button>
            </div>
            
            <button
              onClick={copyShareText}
              className="w-full py-2 mt-2 bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-lg text-sm flex items-center justify-center gap-2 transition-all"
              data-testid="button-badge-copy-text"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Text Copied!" : "Copy Share Text"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
