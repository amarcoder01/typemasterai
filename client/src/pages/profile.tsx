import Layout from "@/components/layout";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: statsData } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const response = await fetch("/api/stats", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    enabled: !!user,
  });

  const { data: resultsData } = useQuery({
    queryKey: ["test-results"],
    queryFn: async () => {
      const response = await fetch("/api/test-results?limit=10", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch results");
      return response.json();
    },
    enabled: !!user,
  });

  if (!user) {
    setLocation("/login");
    return null;
  }

  const stats = statsData?.stats;
  const results = resultsData?.results || [];

  const chartData = results.slice(0, 7).reverse().map((result: any, index: number) => ({
    date: `Test ${index + 1}`,
    wpm: result.wpm,
    acc: result.accuracy,
  }));

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-6 p-6 rounded-2xl bg-card border border-border">
          <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
            <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
              {user.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{user.username}</h1>
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/20">
                PRO
              </Badge>
            </div>
            <p className="text-muted-foreground">{user.email}</p>
            {stats && (
              <p className="text-muted-foreground text-sm">
                {stats.totalTests} Tests Completed
              </p>
            )}
          </div>
          <div className="ml-auto flex gap-8 text-center">
            {stats ? (
              <>
                <div>
                  <div className="text-3xl font-bold font-mono">{stats.avgWpm || 0}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Avg WPM</div>
                </div>
                <div>
                  <div className="text-3xl font-bold font-mono text-primary">{stats.bestWpm || 0}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Best WPM</div>
                </div>
              </>
            ) : (
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>WPM History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <Line type="monotone" dataKey="wpm" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accuracy Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip 
                         cursor={{fill: 'hsl(var(--muted)/0.3)'}}
                         contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                         itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Bar dataKey="acc" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent Tests</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length > 0 ? (
              <div className="space-y-1">
                {results.map((test: any) => (
                  <div key={test.id} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <span className="font-mono font-medium">{test.wpm} wpm</span>
                    </div>
                    <div className="flex items-center gap-8 text-sm text-muted-foreground">
                      <span>{test.accuracy.toFixed(1)}% acc</span>
                      <span>{test.mode}s</span>
                      <span>{new Date(test.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No tests completed yet.</p>
                <p className="text-sm mt-2">Start typing to see your results here!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
