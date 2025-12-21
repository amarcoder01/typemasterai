import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, Check, Clipboard, Twitter, MessageCircle, Linkedin, Copy, Facebook, Send, Mail } from "lucide-react";
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
  const [textCopied, setTextCopied] = useState(false);
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

    // Header
    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 16px 'DM Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("TypeMasterAI", 40, 60);

    // Badge
    ctx.fillStyle = rating.color;
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${rating.emoji} ${rating.badge}`, canvas.width - 40, 60);

    // Main Score (WPM)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 84px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${wpm}`, canvas.width / 2, 160);

    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 24px 'DM Sans', sans-serif";
    ctx.fillText("WPM", canvas.width / 2, 195);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 20px 'DM Sans', sans-serif";
    ctx.fillText(rating.title, canvas.width / 2, 230);

    // Stats Section - 4 stats like standard card (fixed positions)
    const statsY = 260;
    const statsBoxMargin = 40;
    const statsBoxWidth = canvas.width - (statsBoxMargin * 2);
    const statsBoxHeight = 60;

    // Stats Box Background
    ctx.fillStyle = "rgba(30, 41, 59, 0.8)";
    ctx.fillRect(statsBoxMargin, statsY - 25, statsBoxWidth, statsBoxHeight);
    ctx.strokeStyle = rating.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(statsBoxMargin, statsY - 25, statsBoxWidth, statsBoxHeight);

    // 4 stats with fixed positions (like standard card)
    const stats = [
      { label: "Accuracy", value: `${accuracy}%`, color: accuracy >= 95 ? "#22c55e" : accuracy >= 85 ? "#eab308" : "#ef4444", x: 110 },
      { label: "Consistency", value: `${consistency}%`, color: consistency >= 70 ? "#22c55e" : consistency >= 50 ? "#eab308" : "#ef4444", x: 230 },
      { label: "Errors", value: `${errors}`, color: errors === 0 ? "#22c55e" : "#ef4444", x: 370 },
      { label: "Chars", value: `${characters}`, color: "#3b82f6", x: 490 }
    ];

    stats.forEach((stat) => {
      // Value
      ctx.font = "bold 20px 'JetBrains Mono', monospace";
      ctx.fillStyle = stat.color;
      ctx.textAlign = "center";
      ctx.fillText(stat.value, stat.x, statsY + 8);

      // Label
      ctx.font = "12px 'DM Sans', sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText(stat.label, stat.x, statsY + 25);
    });

    // Language, Difficulty & Time - Simple centered text (like standard card footer area)
    const metaY = 325;

    // Format text parts
    const difficultyCapitalized = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

    // Draw as centered single line
    ctx.textAlign = "center";
    ctx.font = "bold 16px 'DM Sans', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${langIcon} ${languageName}`, canvas.width / 2, metaY);

    ctx.font = "13px 'DM Sans', sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`${difficultyCapitalized}  •  ${time}`, canvas.width / 2, metaY + 22);

    // User Footer (like standard card)
    if (username) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "13px 'DM Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`@${username}`, canvas.width / 2, 380);
    }

    // Website footer
    const footerY = username ? 395 : 380;
    ctx.fillStyle = "#a855f7";
    ctx.font = "bold 11px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("typemasterai.com/code-mode", canvas.width / 2, footerY + 18);
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

  const copyShareText = () => {
    const text = `${rating.emoji} I scored ${wpm} WPM with ${accuracy}% accuracy in Code Mode on TypeMasterAI!
    
💻 Language: ${languageName}
🏅 ${rating.title} - ${rating.badge} Badge
⌨️ ${wpm} WPM | ✨ ${accuracy}% Accuracy
⏱️ ${time} | 📈 ${consistency}% Consistency

Think you can code faster? Try it now! 🚀

🔗 https://typemasterai.com/code-mode

#CodeTyping #TypeMasterAI #${languageName.replace(/\s+/g, '')} #Programming`;

    navigator.clipboard.writeText(text);
    setTextCopied(true);
    setTimeout(() => setTextCopied(false), 2000);
    onShareTracked?.('code_card_copy_text');
    toast({
      title: "Copied!",
      description: "Share text copied to clipboard.",
    });
  };

  const getBriefShareText = () => {
    return `${rating.emoji} Just hit ${wpm} WPM in ${languageName} code mode! ${rating.badge} Badge earned 🎯 Can you beat this?\n\n#TypeMasterAI #CodeTyping`;
  };

  const shareWebComposer = (platform: string, composerUrl: string) => {
    window.open(composerUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
    onShareTracked?.(`code_card_${platform}_web`);
  };

  const getFacebookText = () => {
    return `${rating.emoji} Just crushed my code typing test!

Hit ${wpm} WPM with ${accuracy}% accuracy typing ${languageName} code! 

✨ What I achieved:
• ${rating.title} performance level  
• ${rating.badge} Badge earned
• ${time} of pure coding flow

Think you can code faster? I dare you to try! 😏🚀`;
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://typemasterai.com/code-mode')}&quote=${encodeURIComponent(getFacebookText())}`;
    shareWebComposer('facebook', url);
  };

  const shareToReddit = () => {
    const title = encodeURIComponent(`I scored ${wpm} WPM typing ${languageName} code on TypeMasterAI!`);
    const url = `https://www.reddit.com/submit?url=${encodeURIComponent('https://typemasterai.com/code-mode')}&title=${title}`;
    shareWebComposer('reddit', url);
  };

  const shareToTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent('https://typemasterai.com/code-mode')}&text=${encodeURIComponent(getBriefShareText())}`;
    shareWebComposer('telegram', url);
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`I scored ${wpm} WPM typing ${languageName} code on TypeMasterAI!`);
    const body = encodeURIComponent(`${getBriefShareText()}\n\nTry it yourself: https://typemasterai.com/code-mode`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
    onShareTracked?.('code_card_email');
  };

  const socialLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(getBriefShareText())}&url=${encodeURIComponent('https://typemasterai.com/code-mode')}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(getBriefShareText() + "\n\nhttps://typemasterai.com/code-mode")}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://typemasterai.com/code-mode')}`
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        className="rounded-xl shadow-2xl max-w-full h-auto border border-primary/20"
        style={{ maxWidth: "100%", height: "auto" }}
      />

      <div className="w-full space-y-3">
        {/* Image Sharing Section (like standard card) */}
        <div className="p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
          <p className="text-xs text-center text-purple-300 font-medium mb-2">Share This Image</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={copyImageToClipboard}
              variant="outline"
              className="gap-2 bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20"
              data-testid="button-copy-code-image"
            >
              {imageCopied ? <Check className="w-4 h-4 text-green-500" /> : <Clipboard className="w-4 h-4 text-purple-400" />}
              {imageCopied ? "Copied!" : "Copy Image"}
            </Button>
            <Button
              onClick={downloadCard}
              variant="outline"
              className="gap-2 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
              data-testid="button-download-code-card"
            >
              <Download className="w-4 h-4 text-blue-400" />
              Download
            </Button>
          </div>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            Copy image and paste directly into Twitter, Discord, or any social app
          </p>
        </div>

        {/* Native Share (Mobile) - like standard card */}
        {'share' in navigator && (
          <Button
            onClick={shareCard}
            disabled={isSharing}
            className="w-full gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            data-testid="button-share-code-card"
          >
            <Share2 className="w-4 h-4" />
            {isSharing ? "Sharing..." : "Share Image (Mobile/Desktop Apps)"}
          </Button>
        )}

        {/* Quick Text Share Section (like standard card) */}
        <div className="w-full space-y-2">
          <p className="text-xs text-center text-muted-foreground uppercase tracking-wide">Or Share with Text + Link</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => shareWebComposer('twitter', socialLinks.twitter)}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/25 border border-[#1DA1F2]/20 transition-all"
            >
              <Twitter className="w-4 h-4 text-[#1DA1F2]" />
              <span className="text-xs font-medium">X (Twitter)</span>
            </button>
            <button
              onClick={shareToFacebook}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/25 border border-[#1877F2]/20 transition-all"
            >
              <Facebook className="w-4 h-4 text-[#1877F2]" />
              <span className="text-xs font-medium">Facebook</span>
            </button>
            <button
              onClick={() => shareWebComposer('linkedin', socialLinks.linkedin)}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0A66C2]/10 hover:bg-[#0A66C2]/25 border border-[#0A66C2]/20 transition-all"
            >
              <Linkedin className="w-4 h-4 text-[#0A66C2]" />
              <span className="text-xs font-medium">LinkedIn</span>
            </button>
            <button
              onClick={() => shareWebComposer('whatsapp', socialLinks.whatsapp)}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/25 border border-[#25D366]/20 transition-all"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <span className="text-xs font-medium">WhatsApp</span>
            </button>
            <button
              onClick={shareToReddit}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#FF4500]/10 hover:bg-[#FF4500]/25 border border-[#FF4500]/20 transition-all"
            >
              <svg className="w-4 h-4 text-[#FF4500]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
              </svg>
              <span className="text-xs font-medium">Reddit</span>
            </button>
            <button
              onClick={shareToTelegram}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/25 border border-[#0088cc]/20 transition-all"
            >
              <Send className="w-4 h-4 text-[#0088cc]" />
              <span className="text-xs font-medium">Telegram</span>
            </button>
            <button
              onClick={shareViaEmail}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-500/10 hover:bg-gray-500/25 border border-gray-500/20 transition-all"
            >
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium">Email</span>
            </button>
          </div>

          {/* Copy Text Button (like standard card) */}
          <button
            onClick={copyShareText}
            className="w-full py-2 mt-2 bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-lg text-sm flex items-center justify-center gap-2 transition-all"
            data-testid="button-copy-share-text"
          >
            {textCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {textCopied ? "Text Copied!" : "Copy Share Text"}
          </button>
        </div>

        {/* Sharing Tips (like standard typing test) */}
        <div className="space-y-2">
          <div className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
            <p className="text-xs text-center text-muted-foreground">
              📱 <span className="font-medium text-foreground">Mobile:</span> Use "Share Image" to attach the card directly to any app!
            </p>
          </div>
          <div className="p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
            <p className="text-xs text-center text-muted-foreground">
              💻 <span className="font-medium text-foreground">Desktop:</span> Use "Copy Image" then paste directly into Twitter, Discord, or any social media!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
