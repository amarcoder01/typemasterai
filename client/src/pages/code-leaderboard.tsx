import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Code, Zap, Target, Medal } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

const PROGRAMMING_LANGUAGES = {
  all: "All Languages",
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  go: "Go",
  rust: "Rust",
  csharp: "C#",
};

export default function CodeLeaderboard() {
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ["codeLeaderboard", selectedLanguage, offset, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (selectedLanguage !== "all") params.set("language", selectedLanguage);
      const response = await fetch(`/api/code/leaderboard?${params}`);
      if (!response.ok) throw new Error("Failed to fetch code leaderboard");
      return response.json();
    },
  });

  const leaderboard = leaderboardData?.entries || [];
  const pagination = leaderboardData?.pagination || { total: 0, hasMore: false };

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    setOffset(0);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Trophy className="w-10 h-10 text-yellow-500" />
          <h1 className="text-4xl font-bold">Code Typing Leaderboard</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Top developers ranked by code typing speed and accuracy
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Developer Rankings
            </CardTitle>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Filter by Language:</label>
              <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[180px]" data-testid="select-language-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROGRAMMING_LANGUAGES).map(([key, name]) => (
                    <SelectItem key={key} value={key}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <CardDescription>
            Global rankings for code typing performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading leaderboard...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Code className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No code typing tests recorded yet for this language.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Be the first to set a record!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry: any, index: number) => (
                <div
                  key={`${entry.userId}-${index}`}
                  className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                    index === 0
                      ? "bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border-2 border-yellow-500/30"
                      : index === 1
                      ? "bg-gradient-to-r from-gray-400/10 to-gray-500/10 border-2 border-gray-400/30"
                      : index === 2
                      ? "bg-gradient-to-r from-orange-600/10 to-orange-700/10 border-2 border-orange-600/30"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                  data-testid={`leaderboard-entry-${index}`}
                >
                  <div className="flex-shrink-0 w-12 text-center">
                    {index === 0 && <Medal className="w-8 h-8 text-yellow-500 mx-auto" />}
                    {index === 1 && <Medal className="w-8 h-8 text-gray-400 mx-auto" />}
                    {index === 2 && <Medal className="w-8 h-8 text-orange-600 mx-auto" />}
                    {index > 2 && <span className="text-2xl font-bold text-muted-foreground">#{index + 1}</span>}
                  </div>

                  <Avatar className={`w-12 h-12 flex items-center justify-center ${entry.avatarColor || "bg-primary"}`}>
                    <span className="text-xl font-bold text-white">
                      {entry.username.charAt(0).toUpperCase()}
                    </span>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate" data-testid={`username-${index}`}>
                      {entry.username}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-4 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Code className="w-3 h-3" />
                        {entry.programmingLanguage}
                        {entry.framework && ` (${entry.framework})`}
                      </span>
                      <span>{entry.totalTests} tests</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                        <Zap className="w-4 h-4" /> WPM
                      </div>
                      <div className="text-2xl font-bold text-primary" data-testid={`wpm-${index}`}>
                        {entry.wpm}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                        <Target className="w-4 h-4" /> Accuracy
                      </div>
                      <div className="text-2xl font-bold" data-testid={`accuracy-${index}`}>
                        {entry.accuracy}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="font-semibold mb-2">Want to join the leaderboard?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Practice your code typing skills and compete with developers worldwide!
            </p>
            <a
              href="/code-mode"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
              data-testid="button-start-typing"
            >
              <Code className="w-4 h-4" />
              Start Code Typing
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
