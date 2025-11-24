import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Clock, Target } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Leaderboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const response = await fetch("/api/leaderboard?limit=20");
      if (!response.ok) throw new Error("Failed to fetch leaderboard");
      return response.json();
    },
  });

  const leaderboard = data?.leaderboard || [];

  const formatTestMode = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  return (
    <TooltipProvider>
       <div className="max-w-5xl mx-auto">
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold">Global Leaderboard</h1>
          <p className="text-muted-foreground">Top typists worldwide</p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No test results yet.</p>
                <p className="text-sm mt-2">Be the first to set a record!</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                <div className="grid grid-cols-12 gap-4 p-4 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-4">User</div>
                  <div className="col-span-2 text-center">WPM</div>
                  <div className="col-span-2 text-center">Accuracy</div>
                  <div className="col-span-2 text-center">Test Mode</div>
                  <div className="col-span-1 text-center">Tests</div>
                </div>

                {leaderboard.map((entry: any, index: number) => {
                  const rank = index + 1;
                  return (
                    <div key={entry.userId + entry.createdAt} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors">
                      <div className="col-span-1 flex justify-center">
                        {rank === 1 && <Medal className="w-5 h-5 text-yellow-500" data-testid={`medal-rank-${rank}`} />}
                        {rank === 2 && <Medal className="w-5 h-5 text-gray-400" data-testid={`medal-rank-${rank}`} />}
                        {rank === 3 && <Medal className="w-5 h-5 text-amber-600" data-testid={`medal-rank-${rank}`} />}
                        {rank > 3 && <span className="font-mono text-muted-foreground" data-testid={`rank-${rank}`}>{rank}</span>}
                      </div>
                      <div className="col-span-4 flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarFallback className={entry.avatarColor || "bg-primary/20"} style={{ color: "white" }}>
                            {entry.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium" data-testid={`username-${entry.username}`}>{entry.username}</span>
                          <span className="text-xs text-muted-foreground">{entry.totalTests} test{entry.totalTests !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <div className="font-mono font-bold text-primary text-lg" data-testid={`wpm-${entry.userId}`}>
                          {entry.wpm}
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <div className="font-mono text-muted-foreground" data-testid={`accuracy-${entry.userId}`}>
                          {entry.accuracy.toFixed(1)}%
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="gap-1 cursor-help" data-testid={`mode-${entry.userId}`}>
                              <Clock className="w-3 h-3" />
                              {formatTestMode(entry.mode)}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Test duration: {formatTestMode(entry.mode)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="col-span-1 text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="gap-1 cursor-help" data-testid={`total-tests-${entry.userId}`}>
                              <Target className="w-3 h-3" />
                              {entry.totalTests}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Total tests completed</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
       </div>
    </TooltipProvider>
  );
}
