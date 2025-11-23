import Layout from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

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

  return (
    <Layout>
       <div className="max-w-4xl mx-auto">
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
                  <div className="col-span-5">User</div>
                  <div className="col-span-2 text-right">WPM</div>
                  <div className="col-span-2 text-right">Accuracy</div>
                  <div className="col-span-2 text-right">Date</div>
                </div>

                {leaderboard.map((entry: any, index: number) => {
                  const rank = index + 1;
                  return (
                    <div key={entry.userId + entry.createdAt} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors">
                      <div className="col-span-1 flex justify-center">
                        {rank === 1 && <Medal className="w-5 h-5 text-yellow-500" />}
                        {rank === 2 && <Medal className="w-5 h-5 text-gray-400" />}
                        {rank === 3 && <Medal className="w-5 h-5 text-amber-600" />}
                        {rank > 3 && <span className="font-mono text-muted-foreground">{rank}</span>}
                      </div>
                      <div className="col-span-5 flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {entry.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{entry.username}</span>
                      </div>
                      <div className="col-span-2 text-right font-mono font-bold text-primary">
                        {entry.wpm}
                      </div>
                      <div className="col-span-2 text-right font-mono text-muted-foreground">
                        {entry.accuracy.toFixed(1)}%
                      </div>
                       <div className="col-span-2 text-right text-sm text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
       </div>
    </Layout>
  );
}
