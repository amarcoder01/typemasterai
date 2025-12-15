import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Target, Clock, AlertCircle, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SharedResult {
  id: number;
  shareToken: string;
  username: string | null;
  mode: string;
  wpm: number;
  accuracy: number;
  errors: number;
  duration: number | null;
  characters: number | null;
  metadata: any;
  freestyle: boolean;
  isAnonymous: boolean;
  viewCount: number;
  createdAt: string;
}

export default function Result() {
  const [, params] = useRoute("/result/:shareToken");
  const shareToken = params?.shareToken;
  const { toast } = useToast();
  
  const [result, setResult] = useState<SharedResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedResult = async () => {
      if (!shareToken) {
        setError("Invalid share link");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/share/${shareToken}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("This shared result was not found. It may have been deleted.");
          } else {
            setError("Failed to load shared result");
          }
          setIsLoading(false);
          return;
        }
        
        const data = await response.json();
        setResult(data.result);
      } catch (err) {
        console.error("Error fetching shared result:", err);
        setError("Failed to load shared result");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedResult();
  }, [shareToken]);

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getModeLabel = (mode: string): string => {
    const labels: Record<string, string> = {
      normal: "Normal Mode",
      timed: "Timed Mode",
      practice: "Practice Mode",
      challenge: "Challenge Mode",
      typing: "Typing Test",
      dictation: "Dictation Mode",
    };
    return labels[mode] || mode;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading shared result...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h2 className="text-2xl font-bold mb-2">Result Not Found</h2>
          <p className="text-muted-foreground mb-6">
            {error || "The shared result you're looking for doesn't exist or has been removed."}
          </p>
          <Button onClick={() => window.location.href = '/'} data-testid="button-go-home">
            <TrendingUp className="w-4 h-4 mr-2" />
            Go to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">
            Typing Test Result
          </h1>
          {!result.isAnonymous && result.username && (
            <p className="text-muted-foreground">
              Shared by <span className="font-semibold text-primary" data-testid="text-username">{result.username}</span>
            </p>
          )}
          {result.isAnonymous && (
            <p className="text-muted-foreground">Shared anonymously</p>
          )}
        </div>

        <Card className="p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center" data-testid="stat-wpm">
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-2">
                <Zap className="w-5 h-5" /> WPM
              </div>
              <div className="text-5xl font-bold text-primary">{result.wpm}</div>
            </div>
            <div className="text-center" data-testid="stat-accuracy">
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-2">
                <Target className="w-5 h-5" /> Accuracy
              </div>
              <div className="text-5xl font-bold">{result.accuracy.toFixed(1)}%</div>
            </div>
            <div className="text-center" data-testid="stat-errors">
              <div className="text-muted-foreground text-sm mb-2">Errors</div>
              <div className="text-5xl font-bold text-red-500">{result.errors}</div>
            </div>
            <div className="text-center" data-testid="stat-duration">
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-2">
                <Clock className="w-5 h-5" /> Duration
              </div>
              <div className="text-5xl font-bold">{formatDuration(result.duration)}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Test Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div data-testid="detail-mode">
              <div className="text-sm text-muted-foreground mb-1">Mode</div>
              <div className="font-semibold">{getModeLabel(result.mode)}</div>
            </div>
            {result.characters && (
              <div data-testid="detail-characters">
                <div className="text-sm text-muted-foreground mb-1">Characters</div>
                <div className="font-semibold">{result.characters}</div>
              </div>
            )}
            {result.freestyle && (
              <div data-testid="detail-freestyle">
                <div className="text-sm text-muted-foreground mb-1">Type</div>
                <div className="font-semibold">Freestyle</div>
              </div>
            )}
            <div data-testid="detail-views">
              <div className="text-sm text-muted-foreground mb-1">Views</div>
              <div className="font-semibold">{result.viewCount}</div>
            </div>
          </div>
        </Card>

        <div className="flex gap-4 justify-center flex-wrap">
          <Button onClick={() => window.location.href = '/'} data-testid="button-try-yourself">
            <TrendingUp className="w-4 h-4 mr-2" />
            Try This Yourself
          </Button>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Want to improve your typing speed?</p>
          <a href="/register" className="text-primary hover:underline font-semibold">
            Create a free account
          </a>
        </div>
      </div>
    </div>
  );
}
