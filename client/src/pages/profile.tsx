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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const MOCK_HISTORY = [
  { date: "Mon", wpm: 65, acc: 92 },
  { date: "Tue", wpm: 68, acc: 94 },
  { date: "Wed", wpm: 72, acc: 95 },
  { date: "Thu", wpm: 70, acc: 93 },
  { date: "Fri", wpm: 75, acc: 96 },
  { date: "Sat", wpm: 82, acc: 97 },
  { date: "Sun", wpm: 85, acc: 98 },
];

const LAST_10_TESTS = Array.from({ length: 10 }).map((_, i) => ({
  id: i,
  wpm: Math.floor(Math.random() * 40) + 60,
  acc: Math.floor(Math.random() * 10) + 90,
  mode: "30s",
  date: "Just now"
}));

export default function Profile() {
  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Profile Header */}
        <div className="flex items-center gap-6 p-6 rounded-2xl bg-card border border-border">
          <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>USR</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">TypingMaster_99</h1>
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/20">PRO</Badge>
            </div>
            <p className="text-muted-foreground">Joined November 2025 • 1,243 Tests Completed</p>
          </div>
          <div className="ml-auto flex gap-8 text-center">
            <div>
              <div className="text-3xl font-bold font-mono">85</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Avg WPM</div>
            </div>
            <div>
              <div className="text-3xl font-bold font-mono text-primary">112</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Best WPM</div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>WPM History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={MOCK_HISTORY}>
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
                  <BarChart data={MOCK_HISTORY}>
                    <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} domain={[80, 100]} />
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

        {/* Recent Tests Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {LAST_10_TESTS.map((test) => (
                <div key={test.id} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span className="font-mono font-medium">{test.wpm} wpm</span>
                  </div>
                  <div className="flex items-center gap-8 text-sm text-muted-foreground">
                    <span>{test.acc}% acc</span>
                    <span>{test.mode}</span>
                    <span>{test.date}</span>
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
