import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, Twitter, Facebook, Linkedin, MessageCircle, Check, Copy } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jsPDF } from "jspdf";
import { useToast } from "@/hooks/use-toast";

interface CertificateProps {
  username: string;
  wpm: number;
  accuracy: number;
  mode: number;
  date: Date;
}

type DownloadFormat = "png" | "pdf" | "jpeg";

export function CertificateGenerator({ username, wpm, accuracy, mode, date }: CertificateProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedFormat, setSelectedFormat] = useState<DownloadFormat>("png");
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  const getPerformanceRating = () => {
    if (wpm >= 100 && accuracy >= 98) return { emoji: "🏆", title: "Legendary Typist", badge: "Diamond" };
    if (wpm >= 80 && accuracy >= 95) return { emoji: "⚡", title: "Speed Demon", badge: "Platinum" };
    if (wpm >= 60 && accuracy >= 90) return { emoji: "🔥", title: "Fast & Accurate", badge: "Gold" };
    if (wpm >= 40 && accuracy >= 85) return { emoji: "💪", title: "Solid Performance", badge: "Silver" };
    return { emoji: "🎯", title: "Rising Star", badge: "Bronze" };
  };

  useEffect(() => {
    generateCertificate();
  }, [username, wpm, accuracy, mode, date]);

  const generateCertificate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size for higher quality
    canvas.width = 1200;
    canvas.height = 800;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(0.5, "#1e293b");
    gradient.addColorStop(1, "#0f172a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative border
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 8;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    // Inner border
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);

    // Corner decorations
    const cornerSize = 40;
    ctx.fillStyle = "#00ffff";
    // Top-left
    ctx.fillRect(40, 40, cornerSize, 8);
    ctx.fillRect(40, 40, 8, cornerSize);
    // Top-right
    ctx.fillRect(canvas.width - 80, 40, cornerSize, 8);
    ctx.fillRect(canvas.width - 48, 40, 8, cornerSize);
    // Bottom-left
    ctx.fillRect(40, canvas.height - 48, cornerSize, 8);
    ctx.fillRect(40, canvas.height - 80, 8, cornerSize);
    // Bottom-right
    ctx.fillRect(canvas.width - 80, canvas.height - 48, cornerSize, 8);
    ctx.fillRect(canvas.width - 48, canvas.height - 80, 8, cornerSize);

    // Logo/Seal (top-left corner)
    ctx.beginPath();
    ctx.arc(140, 140, 45, 0, Math.PI * 2);
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 30px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TM", 140, 148);

    // Title
    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 48px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CERTIFICATE OF ACHIEVEMENT", canvas.width / 2, 150);

    // Subtitle
    ctx.fillStyle = "#94a3b8";
    ctx.font = "24px 'DM Sans', sans-serif";
    ctx.fillText("This certifies that", canvas.width / 2, 220);

    // User name
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 56px 'DM Sans', sans-serif";
    ctx.fillText(username, canvas.width / 2, 300);

    // Achievement text
    ctx.fillStyle = "#94a3b8";
    ctx.font = "24px 'DM Sans', sans-serif";
    ctx.fillText("has successfully completed a typing test with", canvas.width / 2, 360);

    // Stats box
    const boxY = 400;
    const boxHeight = 140;
    ctx.fillStyle = "rgba(30, 41, 59, 0.7)";
    ctx.fillRect(200, boxY, canvas.width - 400, boxHeight);
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2;
    ctx.strokeRect(200, boxY, canvas.width - 400, boxHeight);

    // WPM stat
    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 64px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${wpm}`, 400, boxY + 70);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "18px 'DM Sans', sans-serif";
    ctx.fillText("Words Per Minute", 400, boxY + 105);

    // Accuracy stat
    ctx.fillStyle = "#a855f7";
    ctx.font = "bold 64px 'JetBrains Mono', monospace";
    ctx.fillText(`${accuracy}%`, canvas.width / 2, boxY + 70);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "18px 'DM Sans', sans-serif";
    ctx.fillText("Accuracy", canvas.width / 2, boxY + 105);

    // Mode stat
    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 64px 'JetBrains Mono', monospace";
    const modeText = mode >= 60 ? `${Math.floor(mode / 60)}min` : `${mode}s`;
    ctx.fillText(modeText, 800, boxY + 70);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "18px 'DM Sans', sans-serif";
    ctx.fillText("Test Duration", 800, boxY + 105);

    // Date
    ctx.fillStyle = "#64748b";
    ctx.font = "18px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    const formattedDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    ctx.fillText(`Completed on ${formattedDate}`, canvas.width / 2, 600);

    // TypeMasterAI branding
    ctx.textAlign = "center";
    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 36px 'DM Sans', sans-serif";
    ctx.fillText("TypeMasterAI", canvas.width / 2, 670);
    
    ctx.fillStyle = "#64748b";
    ctx.font = "16px 'DM Sans', sans-serif";
    ctx.fillText("Master Your Typing with AI", canvas.width / 2, 700);
    
    // Website URL
    ctx.fillStyle = "#a855f7";
    ctx.font = "bold 18px 'DM Sans', sans-serif";
    ctx.fillText("typemasterai.com", canvas.width / 2, 730);

    // Signature line (bottom right)
    const signatureX = canvas.width - 280;
    const signatureY = 750;
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(signatureX, signatureY);
    ctx.lineTo(signatureX + 200, signatureY);
    ctx.stroke();
    ctx.fillStyle = "#64748b";
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Certified by TypeMasterAI", signatureX + 100, signatureY + 15);
  };

  const downloadCertificate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const filename = `TypeMasterAI_Certificate_${username}_${wpm}WPM`;

    switch (selectedFormat) {
      case "png":
        downloadPNG(canvas, filename);
        break;
      case "jpeg":
        downloadJPEG(canvas, filename);
        break;
      case "pdf":
        downloadPDF(canvas, filename);
        break;
    }
  };

  const downloadPNG = (canvas: HTMLCanvasElement, filename: string) => {
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const downloadJPEG = (canvas: HTMLCanvasElement, filename: string) => {
    const link = document.createElement("a");
    link.download = `${filename}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
  };

  const downloadPDF = (canvas: HTMLCanvasElement, filename: string) => {
    const imgData = canvas.toDataURL("image/png");
    
    // Create PDF with landscape orientation
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // A4 landscape dimensions: 297mm x 210mm
    const pdfWidth = 297;
    const pdfHeight = 210;
    
    // Calculate aspect ratio
    const canvasAspectRatio = canvas.width / canvas.height;
    const pdfAspectRatio = pdfWidth / pdfHeight;
    
    let imgWidth = pdfWidth;
    let imgHeight = pdfHeight;
    
    // Fit image to PDF while maintaining aspect ratio
    if (canvasAspectRatio > pdfAspectRatio) {
      imgHeight = pdfWidth / canvasAspectRatio;
    } else {
      imgWidth = pdfHeight * canvasAspectRatio;
    }
    
    // Center the image
    const xOffset = (pdfWidth - imgWidth) / 2;
    const yOffset = (pdfHeight - imgHeight) / 2;
    
    pdf.addImage(imgData, "PNG", xOffset, yOffset, imgWidth, imgHeight);
    pdf.save(`${filename}.pdf`);
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

      const file = new File([blob], `TypeMasterAI_Certificate_${username}_${wpm}WPM.png`, {
        type: "image/png",
      });

      const rating = getPerformanceRating();
      const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;

      if ('share' in navigator && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `TypeMasterAI Certificate - ${wpm} WPM`,
          text: `${rating.emoji} I earned a ${rating.badge} badge on TypeMasterAI! ${wpm} WPM with ${accuracy}% accuracy in a ${modeDisplay} test. Can you beat my score?`,
          files: [file],
        });
        toast({
          title: "Certificate Shared!",
          description: "Your achievement has been shared successfully.",
        });
      } else {
        downloadPNG(canvas, `TypeMasterAI_Certificate_${username}_${wpm}WPM`);
        toast({
          title: "Certificate Downloaded",
          description: "Your device doesn't support direct sharing. Certificate has been downloaded instead.",
        });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Share error:", error);
        toast({
          title: "Share Failed",
          description: "Could not share certificate. Try downloading it instead.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSharing(false);
    }
  };

  const shareCertificateToSocial = (platform: string) => {
    const rating = getPerformanceRating();
    const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
    const siteUrl = "https://typemasterai.com";
    
    const shareTexts: Record<string, string> = {
      twitter: `${rating.emoji} Just earned my TypeMasterAI Certificate!

⌨️ ${wpm} WPM | ${accuracy}% Accuracy
🏅 ${rating.title} - ${rating.badge} Badge
⏱️ ${modeDisplay} typing test

Get your certificate too! 🎓

#TypingTest #TypeMasterAI #Certificate`,
      
      facebook: `${rating.emoji} I just earned my official TypeMasterAI Certificate of Achievement!

🏆 ${wpm} Words Per Minute
✨ ${accuracy}% Accuracy
🏅 ${rating.title} - ${rating.badge} Badge
⏱️ ${modeDisplay} test

Test your typing skills and get certified! 🎓`,
      
      linkedin: `Proud to share my TypeMasterAI Certificate of Achievement! ${rating.emoji}

📜 Certification Details:
• Typing Speed: ${wpm} Words Per Minute
• Accuracy: ${accuracy}%
• Performance Rating: ${rating.title} (${rating.badge})
• Test Duration: ${modeDisplay}

Continuous skill development is key to professional growth. This certification validates my typing proficiency.

#Certificate #ProfessionalDevelopment #TypingSkills #TypeMasterAI`,
      
      whatsapp: `${rating.emoji} Check out my TypeMasterAI Certificate!

📜 *Certificate of Achievement*
⌨️ *${wpm} WPM* | *${accuracy}% Accuracy*
🏅 ${rating.title} - ${rating.badge} Badge
⏱️ ${modeDisplay} test

Get your certificate: `,
    };
    
    const shareText = shareTexts[platform] || shareTexts.twitter;
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(siteUrl);
    
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedText}${encodedUrl}`,
    };
    
    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <canvas
        ref={canvasRef}
        className="border-2 border-border rounded-lg shadow-2xl max-w-full h-auto"
        style={{ maxHeight: "500px" }}
      />
      
      {/* Download Section */}
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-lg">
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <label className="text-sm text-muted-foreground font-medium">
            Download Format
          </label>
          <Select
            value={selectedFormat}
            onValueChange={(value) => setSelectedFormat(value as DownloadFormat)}
          >
            <SelectTrigger 
              className="w-full sm:w-[180px]"
              data-testid="select-certificate-format"
            >
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png" data-testid="format-png">
                PNG (High Quality)
              </SelectItem>
              <SelectItem value="jpeg" data-testid="format-jpeg">
                JPEG (Compressed)
              </SelectItem>
              <SelectItem value="pdf" data-testid="format-pdf">
                PDF (Printable)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={downloadCertificate}
          size="lg"
          className="gap-2 w-full sm:w-auto sm:mt-7"
          data-testid="button-download-certificate"
        >
          <Download className="w-5 h-5" />
          Download {selectedFormat.toUpperCase()}
        </Button>

        <Button
          onClick={shareCertificate}
          disabled={isSharing}
          size="lg"
          variant="secondary"
          className="gap-2 w-full sm:w-auto sm:mt-7"
          data-testid="button-share-certificate"
        >
          <Share2 className="w-5 h-5" />
          {isSharing ? "Sharing..." : "Share"}
        </Button>
      </div>

      {/* Share to Social Media */}
      <div className="w-full max-w-lg">
        <button
          onClick={() => setShowShareOptions(!showShareOptions)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-toggle-share-options"
        >
          <Share2 className="w-4 h-4" />
          {showShareOptions ? "Hide Share Options" : "Share Certificate on Social Media"}
        </button>
        
        {showShareOptions && (
          <div className="mt-4 p-4 bg-muted/30 rounded-xl border space-y-4">
            <p className="text-sm font-medium text-center text-muted-foreground">
              Share your achievement on social media
            </p>
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={() => shareCertificateToSocial('twitter')}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 transition-colors group"
                data-testid="button-share-cert-twitter"
              >
                <Twitter className="w-6 h-6 text-[#1DA1F2]" />
                <span className="text-xs text-muted-foreground group-hover:text-foreground">Twitter</span>
              </button>
              <button
                onClick={() => shareCertificateToSocial('facebook')}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-[#1877F2]/10 hover:bg-[#1877F2]/20 transition-colors group"
                data-testid="button-share-cert-facebook"
              >
                <Facebook className="w-6 h-6 text-[#1877F2]" />
                <span className="text-xs text-muted-foreground group-hover:text-foreground">Facebook</span>
              </button>
              <button
                onClick={() => shareCertificateToSocial('linkedin')}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 transition-colors group"
                data-testid="button-share-cert-linkedin"
              >
                <Linkedin className="w-6 h-6 text-[#0A66C2]" />
                <span className="text-xs text-muted-foreground group-hover:text-foreground">LinkedIn</span>
              </button>
              <button
                onClick={() => shareCertificateToSocial('whatsapp')}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors group"
                data-testid="button-share-cert-whatsapp"
              >
                <MessageCircle className="w-6 h-6 text-[#25D366]" />
                <span className="text-xs text-muted-foreground group-hover:text-foreground">WhatsApp</span>
              </button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Download your certificate first, then attach it to your post for the best results!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
