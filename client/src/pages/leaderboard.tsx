import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Globe } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const LEADERBOARD_DATA = Array.from({ length: 20 }).map((_, i) => ({
  rank: i + 1,
  username: `User_${Math.floor(Math.random() * 10000)}`,
  wpm: Math.floor(150 - i * 2.5 + Math.random() * 10),
  accuracy: (99 - i * 0.1).toFixed(1),
  time: "60s",
  date: "2h ago"
}));

export default function Leaderboard() {
  return (
    <Layout>
       <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold">Global Leaderboard</h1>
          <p className="text-muted-foreground">Top typists this week</p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 p-4 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-5">User</div>
                <div className="col-span-2 text-right">WPM</div>
                <div className="col-span-2 text-right">Accuracy</div>
                <div className="col-span-2 text-right">Date</div>
              </div>

              {/* Rows */}
              {LEADERBOARD_DATA.map((entry) => (
                <div key={entry.rank} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors">
                  <div className="col-span-1 flex justify-center">
                    {entry.rank === 1 && <Medal className="w-5 h-5 text-yellow-500" />}
                    {entry.rank === 2 && <Medal className="w-5 h-5 text-gray-400" />}
                    {entry.rank === 3 && <Medal className="w-5 h-5 text-amber-600" />}
                    {entry.rank > 3 && <span className="font-mono text-muted-foreground">{entry.rank}</span>}
                  </div>
                  <div className="col-span-5 flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.username}`} />
                      <AvatarFallback>{entry.username[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{entry.username}</span>
                  </div>
                  <div className="col-span-2 text-right font-mono font-bold text-primary">
                    {entry.wpm}
                  </div>
                  <div className="col-span-2 text-right font-mono text-muted-foreground">
                    {entry.accuracy}%
                  </div>
                   <div className="col-span-2 text-right text-sm text-muted-foreground">
                    {entry.date}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
       </div>
    </Layout>
  );
}
