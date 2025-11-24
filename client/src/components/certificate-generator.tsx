import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface CertificateProps {
  username: string;
  wpm: number;
  accuracy: number;
  mode: number;
  date: Date;
}

export function CertificateGenerator({ username, wpm, accuracy, mode, date }: CertificateProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    generateCertificate();
  }, [username, wpm, accuracy, mode, date]);

  const generateCertificate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
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
    const boxY = 420;
    const boxHeight = 180;
    ctx.fillStyle = "rgba(30, 41, 59, 0.7)";
    ctx.fillRect(200, boxY, canvas.width - 400, boxHeight);
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2;
    ctx.strokeRect(200, boxY, canvas.width - 400, boxHeight);

    // WPM stat
    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 64px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${wpm}`, 400, boxY + 80);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "20px 'DM Sans', sans-serif";
    ctx.fillText("Words Per Minute", 400, boxY + 120);

    // Accuracy stat
    ctx.fillStyle = "#a855f7";
    ctx.font = "bold 64px 'JetBrains Mono', monospace";
    ctx.fillText(`${accuracy}%`, canvas.width / 2, boxY + 80);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "20px 'DM Sans', sans-serif";
    ctx.fillText("Accuracy", canvas.width / 2, boxY + 120);

    // Mode stat
    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 64px 'JetBrains Mono', monospace";
    const modeText = mode >= 60 ? `${Math.floor(mode / 60)}min` : `${mode}s`;
    ctx.fillText(modeText, 800, boxY + 80);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "20px 'DM Sans', sans-serif";
    ctx.fillText("Test Duration", 800, boxY + 120);

    // Date
    ctx.fillStyle = "#64748b";
    ctx.font = "18px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    const formattedDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    ctx.fillText(`Completed on ${formattedDate}`, canvas.width / 2, 680);

    // Logo/Seal placeholder (decorative circle)
    ctx.beginPath();
    ctx.arc(100, 100, 50, 0, Math.PI * 2);
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 32px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TM", 100, 110);

    // TypeMasterAI branding
    ctx.textAlign = "center";
    ctx.fillStyle = "#00ffff";
    ctx.font = "bold 36px 'DM Sans', sans-serif";
    ctx.fillText("TypeMasterAI", canvas.width / 2, 730);
    
    ctx.fillStyle = "#64748b";
    ctx.font = "18px 'DM Sans', sans-serif";
    ctx.fillText("Master Your Typing with AI", canvas.width / 2, 760);

    // Signature line
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(canvas.width - 350, 750);
    ctx.lineTo(canvas.width - 150, 750);
    ctx.stroke();
    ctx.fillStyle = "#64748b";
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.fillText("Certified by TypeMasterAI", canvas.width - 250, 765);
  };

  const downloadCertificate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `TypeMasterAI_Certificate_${username}_${wpm}WPM.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        className="border-2 border-border rounded-lg shadow-2xl max-w-full h-auto"
        style={{ maxHeight: "500px" }}
      />
      <Button
        onClick={downloadCertificate}
        size="lg"
        className="gap-2"
        data-testid="button-download-certificate"
      >
        <Download className="w-5 h-5" />
        Download Certificate
      </Button>
    </div>
  );
}
