import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, TrendingDown, Target, Keyboard, Calendar, Sparkles, Brain, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AnalyticsData {
  wpmOverTime: Array<{ date: string; wpm: number; accuracy: number; testCount: number }>;
  mistakesHeatmap: Array<{ key: string; errorCount: number; totalCount: number; errorRate: number }>;
  consistency: {
    avgWpm: number;
    stdDeviation: number;
    minWpm: number;
    maxWpm: number;
  };
  commonMistakes: Array<{ expectedKey: string; typedKey: string; count: number }>;
}

interface AIInsight {
  type: "improvement" | "strength" | "practice";
  message: string;
  priority: "high" | "medium" | "low";
}

export default function Analytics() {
  const [selectedDays, setSelectedDays] = useState(30);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const { data: analyticsData, isLoading, refetch } = useQuery<{ analytics: AnalyticsData }>({
    queryKey: [`/api/analytics?days=${selectedDays}`],
  });

  const analytics = analyticsData?.analytics;

  const generateAIInsights = async () => {
    if (!analytics) return;

    setLoadingInsights(true);
    try {
      const response = await fetch("/api/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          conversationId: null,
          message: `Analyze my typing performance data and provide actionable insights:

Performance Metrics:
- Average WPM: ${analytics.consistency.avgWpm.toFixed(1)}
- WPM Range: ${analytics.consistency.minWpm} - ${analytics.consistency.maxWpm}
- Consistency (Std Dev): ${analytics.consistency.stdDeviation.toFixed(1)}

Top Mistake Keys: ${analytics.mistakesHeatmap.slice(0, 5).map(m => `${m.key} (${m.errorRate.toFixed(1)}% error rate)`).join(", ")}

Common Typing Errors: ${analytics.commonMistakes.slice(0, 5).map(m => `"${m.expectedKey}" typed as "${m.typedKey}" (${m.count}x)`).join(", ")}

Please provide:
1. 3 specific areas for improvement based on my mistakes
2. 2 strengths or positive patterns
3. 3 targeted practice recommendations

Format each insight as a single concise sentence. Focus on actionable advice.`,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate insights");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullResponse += parsed.content;
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }

      // Parse insights from response
      const insights: AIInsight[] = [];
      const lines = fullResponse.split("\n").filter(l => l.trim());
      
      for (const line of lines) {
        if (line.includes("improvement") || line.includes("practice") || line.includes("focus on")) {
          insights.push({
            type: "improvement",
            message: line.replace(/^[-*•]\s*/, "").trim(),
            priority: "high",
          });
        } else if (line.includes("strength") || line.includes("good") || line.includes("excellent")) {
          insights.push({
            type: "strength",
            message: line.replace(/^[-*•]\s*/, "").trim(),
            priority: "medium",
          });
        } else if (line.includes("practice") || line.includes("exercise") || line.includes("drill")) {
          insights.push({
            type: "practice",
            message: line.replace(/^[-*•]\s*/, "").trim(),
            priority: "medium",
          });
        }
      }

      if (insights.length === 0) {
        // Fallback insights based on data
        insights.push({
          type: "improvement",
          message: `Focus on keys with high error rates: ${analytics.mistakesHeatmap.slice(0, 3).map(m => m.key).join(", ")}`,
          priority: "high",
        });
        
        if (analytics.consistency.stdDeviation > 10) {
          insights.push({
            type: "improvement",
            message: "Work on consistency - your WPM varies significantly between tests",
            priority: "high",
          });
        }
        
        if (analytics.consistency.avgWpm < 40) {
          insights.push({
            type: "practice",
            message: "Practice daily for 15 minutes to build muscle memory and increase speed",
            priority: "medium",
          });
        }
      }

      setAiInsights(insights);
      toast.success("AI insights generated successfully!");
    } catch (error) {
      console.error("AI insights error:", error);
      toast.error("Failed to generate AI insights");
    } finally {
      setLoadingInsights(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analytics || analytics.wpmOverTime.length === 0) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-center py-12">
          <Keyboard className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">No Analytics Data Yet</h2>
          <p className="text-muted-foreground mb-4">
            Complete some typing tests to see your progress and insights
          </p>
          <Button onClick={() => (window.location.href = "/")} data-testid="button-start-test">
            Start Your First Test
          </Button>
        </div>
      </div>
    );
  }

  const wpmTrend = analytics.wpmOverTime.length >= 2
    ? analytics.wpmOverTime[analytics.wpmOverTime.length - 1].wpm - analytics.wpmOverTime[0].wpm
    : 0;

  const accuracyTrend = analytics.wpmOverTime.length >= 2
    ? analytics.wpmOverTime[analytics.wpmOverTime.length - 1].accuracy - analytics.wpmOverTime[0].accuracy
    : 0;

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-analytics">Progress Analytics</h1>
          <p className="text-muted-foreground">Track your typing improvement over time</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedDays === 7 ? "default" : "outline"}
            onClick={() => { setSelectedDays(7); refetch(); }}
            data-testid="button-timeframe-7"
          >
            7 Days
          </Button>
          <Button
            variant={selectedDays === 30 ? "default" : "outline"}
            onClick={() => { setSelectedDays(30); refetch(); }}
            data-testid="button-timeframe-30"
          >
            30 Days
          </Button>
          <Button
            variant={selectedDays === 90 ? "default" : "outline"}
            onClick={() => { setSelectedDays(90); refetch(); }}
            data-testid="button-timeframe-90"
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average WPM</CardDescription>
            <CardTitle className="text-3xl" data-testid="stat-avg-wpm">
              {analytics.consistency.avgWpm.toFixed(1)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm">
              {wpmTrend >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={wpmTrend >= 0 ? "text-green-500" : "text-red-500"}>
                {wpmTrend >= 0 ? "+" : ""}{wpmTrend.toFixed(1)} WPM
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Consistency</CardDescription>
            <CardTitle className="text-3xl" data-testid="stat-consistency">
              {analytics.consistency.stdDeviation < 5 ? "Excellent" : analytics.consistency.stdDeviation < 10 ? "Good" : "Variable"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              ±{analytics.consistency.stdDeviation.toFixed(1)} WPM deviation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Best WPM</CardDescription>
            <CardTitle className="text-3xl" data-testid="stat-best-wpm">
              {analytics.consistency.maxWpm}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Personal record
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tests</CardDescription>
            <CardTitle className="text-3xl" data-testid="stat-total-tests">
              {analytics.wpmOverTime.reduce((sum, d) => sum + d.testCount, 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              In last {selectedDays} days
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
          <TabsTrigger value="mistakes" data-testid="tab-mistakes">Mistakes</TabsTrigger>
          <TabsTrigger value="insights" data-testid="tab-insights">AI Insights</TabsTrigger>
          <TabsTrigger value="practice" data-testid="tab-practice">Practice Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WPM Progress</CardTitle>
              <CardDescription>Your typing speed over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.wpmOverTime}>
                  <defs>
                    <linearGradient id="colorWpm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ffff" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00ffff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
                  <Area type="monotone" dataKey="wpm" stroke="#00ffff" fillOpacity={1} fill="url(#colorWpm)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Accuracy Trend</CardTitle>
                <CardDescription>How accurate you've been typing</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={analytics.wpmOverTime}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="date" stroke="#888" />
                    <YAxis stroke="#888" domain={[90, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
                    <Line type="monotone" dataKey="accuracy" stroke="#a855f7" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Consistency Metrics</CardTitle>
                <CardDescription>WPM distribution and stability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Average WPM</span>
                  <Badge variant="outline" data-testid="badge-avg-wpm">{analytics.consistency.avgWpm.toFixed(1)}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Standard Deviation</span>
                  <Badge variant="outline" data-testid="badge-std-dev">±{analytics.consistency.stdDeviation.toFixed(1)}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Min WPM</span>
                  <Badge variant="outline" data-testid="badge-min-wpm">{analytics.consistency.minWpm}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Max WPM</span>
                  <Badge variant="outline" data-testid="badge-max-wpm">{analytics.consistency.maxWpm}</Badge>
                </div>
                <Separator />
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground">
                    {analytics.consistency.stdDeviation < 5 
                      ? "🎯 Excellent consistency! Your typing speed is very stable." 
                      : analytics.consistency.stdDeviation < 10
                      ? "👍 Good consistency. Minor variations in speed."
                      : "⚡ Variable performance. Focus on maintaining steady speed."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mistakes" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Mistake Heatmap</CardTitle>
                <CardDescription>Keys with highest error rates</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.mistakesHeatmap.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="key" stroke="#888" />
                    <YAxis stroke="#888" label={{ value: 'Error Rate (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
                    <Bar dataKey="errorRate" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Common Typing Errors</CardTitle>
                <CardDescription>Most frequent mistakes you make</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {analytics.commonMistakes.slice(0, 15).map((mistake, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                        data-testid={`mistake-${idx}`}
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="destructive" className="font-mono">
                            {mistake.expectedKey}
                          </Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge variant="outline" className="font-mono">
                            {mistake.typedKey}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">{mistake.count}x</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Error Analysis</CardTitle>
              <CardDescription>Keys sorted by total errors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {analytics.mistakesHeatmap.slice(0, 24).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-center p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                    data-testid={`heatmap-key-${item.key}`}
                  >
                    <div className="text-2xl font-mono font-bold mb-2">{item.key}</div>
                    <div className="text-xs text-destructive font-semibold">{item.errorRate.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">{item.errorCount} errors</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    AI-Powered Insights
                  </CardTitle>
                  <CardDescription>Personalized recommendations based on your performance</CardDescription>
                </div>
                <Button
                  onClick={generateAIInsights}
                  disabled={loadingInsights}
                  data-testid="button-generate-insights"
                >
                  {loadingInsights ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Insights
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {aiInsights.length > 0 ? (
                <div className="space-y-3">
                  {aiInsights.map((insight, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border ${
                        insight.type === "improvement"
                          ? "border-orange-500/50 bg-orange-500/10"
                          : insight.type === "strength"
                          ? "border-green-500/50 bg-green-500/10"
                          : "border-blue-500/50 bg-blue-500/10"
                      }`}
                      data-testid={`insight-${idx}`}
                    >
                      <div className="flex items-start gap-3">
                        <Badge
                          variant={insight.type === "improvement" ? "destructive" : insight.type === "strength" ? "default" : "secondary"}
                        >
                          {insight.type === "improvement" ? "🎯 Improve" : insight.type === "strength" ? "✨ Strength" : "📚 Practice"}
                        </Badge>
                        <p className="flex-1 text-sm">{insight.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Click "Generate Insights" to get AI-powered recommendations</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="practice" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Daily Practice Plan
                </CardTitle>
                <CardDescription>Recommended exercises for today</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Focus Keys Practice (10 min)</h4>
                      <p className="text-sm text-muted-foreground">
                        Practice these problematic keys: {analytics.mistakesHeatmap.slice(0, 5).map(m => m.key).join(", ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Speed Test (5 min)</h4>
                      <p className="text-sm text-muted-foreground">
                        Take 2-3 short tests (30s each) to maintain your current speed
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Accuracy Drills (5 min)</h4>
                      <p className="text-sm text-muted-foreground">
                        Type slowly and focus on 100% accuracy to build muscle memory
                      </p>
                    </div>
                  </div>
                </div>

                <Button className="w-full" onClick={() => (window.location.href = "/")} data-testid="button-start-practice">
                  <Target className="w-4 h-4 mr-2" />
                  Start Practice Session
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Weekly Improvement Plan
                </CardTitle>
                <CardDescription>Long-term goals and milestones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Week 1: Foundation</h4>
                      <Badge variant="outline">Current</Badge>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Practice 15 min daily</li>
                      <li>Focus on accuracy over speed</li>
                      <li>Target: {Math.ceil(analytics.consistency.avgWpm + 5)} WPM</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg border border-border opacity-60">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Week 2: Speed Building</h4>
                      <Badge variant="secondary">Next</Badge>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Increase session to 20 min</li>
                      <li>Add timed challenges</li>
                      <li>Target: {Math.ceil(analytics.consistency.avgWpm + 10)} WPM</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg border border-border opacity-60">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Week 3-4: Mastery</h4>
                      <Badge variant="secondary">Later</Badge>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Combine speed and accuracy</li>
                      <li>Test different paragraph modes</li>
                      <li>Target: {Math.ceil(analytics.consistency.avgWpm + 15)} WPM</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
