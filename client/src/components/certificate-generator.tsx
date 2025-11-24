import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jsPDF } from "jspdf";

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
    ctx.arc(100, 100, 50, 0, Math.PI * 2);
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 32px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TM", 100, 110);

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
    ctx.fillText("TypeMasterAI", canvas.width / 2, 680);
    
    ctx.fillStyle = "#64748b";
    ctx.font = "16px 'DM Sans', sans-serif";
    ctx.fillText("Master Your Typing with AI", canvas.width / 2, 710);

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

  return (
    <div className="flex flex-col items-center gap-6">
      <canvas
        ref={canvasRef}
        className="border-2 border-border rounded-lg shadow-2xl max-w-full h-auto"
        style={{ maxHeight: "500px" }}
      />
      
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
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
      </div>
    </div>
  );
}
