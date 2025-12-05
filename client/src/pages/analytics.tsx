import { useEffect, useState, useMemo, useCallback, Component, ReactNode, ErrorInfo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, TrendingDown, Target, Keyboard, Calendar, Sparkles, Brain, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format, parseISO, isValid } from "date-fns";

// ============================================================================
// ANALYTICS CONFIGURATION - Centralized, production-ready settings
// ============================================================================

const ANALYTICS_CONFIG = {
  // Time range options (in days) - sorted ascending
  timeRangeOptions: [7, 14, 30, 60, 90] as const,
  defaultTimeRange: 30,
  
  // AI Configuration
  ai: {
    timeoutMs: 30000,
    maxRetries: 2,
  },
  
  // Display limits - how many items to show in various contexts
  limits: {
    insightsDisplay: 8,
    mistakeKeysInPrompt: 5,
    mistakeKeysInFallback: 5,
    mistakeKeysInWeeklyFallback: 3,
    commonMistakesInPrompt: 5,
    dailyExercises: 3,
    weeklyGoals: 3,
    keystrokeAnalyticsDepth: 10,
  },
  
  // Query caching
  cache: {
    staleTimeMs: 30000,
    retryCount: 2,
  },
  
  // Skill level thresholds (WPM) - configurable speed tiers
  // These can be adjusted based on target audience or research data
  skillThresholds: {
    beginner: 30,       // Below this = beginner
    developing: 40,     // 30-40 WPM
    intermediate: 50,   // 40-50 WPM
    advanced: 70,       // 50-70 WPM
    expert: 90,         // 70+ WPM = expert
  },
  
  // Skill level profiles with improvement rates and descriptions
  skillProfiles: {
    beginner: {
      level: "Beginner",
      description: "Focus on accuracy and proper technique",
      improvementRates: { week1: 8, week2: 12, week3: 15 },
    },
    developing: {
      level: "Developing",
      description: "Building muscle memory and speed",
      improvementRates: { week1: 6, week2: 10, week3: 12 },
    },
    intermediate: {
      level: "Intermediate",
      description: "Refining skills and consistency",
      improvementRates: { week1: 5, week2: 8, week3: 10 },
    },
    advanced: {
      level: "Advanced",
      description: "Optimizing for peak performance",
      improvementRates: { week1: 4, week2: 6, week3: 8 },
    },
    expert: {
      level: "Expert",
      description: "Maintaining excellence and precision",
      improvementRates: { week1: 2, week2: 4, week3: 5 },
    },
  },
  
  // Consistency thresholds
  consistency: {
    coefficientOfVariationThreshold: 15, // CV% above this = inconsistent
    minStdDevFactor: 0.2, // stdDev > avgWpm * this factor = inconsistent
    minStdDevAbsolute: 10, // Minimum absolute std dev threshold
    excellentCV: 10, // CV% below this = excellent consistency
  },
} as const;

// Dynamic thresholds calculator - derives all thresholds from config and user data
const calculateDynamicThresholds = (analytics: AnalyticsData) => {
  const avgWpm = analytics.consistency.avgWpm;
  const stdDev = analytics.consistency.stdDeviation;
  const wpmRange = analytics.consistency.maxWpm - analytics.consistency.minWpm;
  
  // Use configurable thresholds and profiles from config
  const { skillThresholds, skillProfiles, consistency: consistencyConfig } = ANALYTICS_CONFIG;
  
  // Consistency calculation using config thresholds
  const coefficientOfVariation = avgWpm > 0 ? (stdDev / avgWpm) * 100 : 0;
  const isInconsistent = coefficientOfVariation > consistencyConfig.coefficientOfVariationThreshold 
    || stdDev > Math.max(consistencyConfig.minStdDevAbsolute, avgWpm * consistencyConfig.minStdDevFactor);
  
  // Determine skill profile key based on WPM thresholds
  const getSkillProfileKey = (): keyof typeof skillProfiles => {
    if (avgWpm < skillThresholds.beginner) return 'beginner';
    if (avgWpm < skillThresholds.developing) return 'developing';
    if (avgWpm < skillThresholds.intermediate) return 'intermediate';
    if (avgWpm < skillThresholds.advanced) return 'advanced';
    return 'expert';
  };
  
  const profileKey = getSkillProfileKey();
  const currentProfile = skillProfiles[profileKey];
  
  return {
    speedThresholds: skillThresholds,
    isInconsistent,
    coefficientOfVariation,
    improvementRates: currentProfile.improvementRates,
    skillLevel: { level: currentProfile.level, description: currentProfile.description },
    wpmRange,
    // Dynamic accuracy threshold - lower WPM users should focus more on accuracy
    accuracyFocus: avgWpm < skillThresholds.intermediate,
  };
};

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

interface DailyExercise {
  title: string;
  description: string;
  duration: string;
}

interface WeeklyGoal {
  week: string;
  title: string;
  tasks: string[];
  target: string;
  status: "current" | "next" | "later";
}

const formatChartDate = (dateStr: string): string => {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, 'MMM d');
  } catch {
    return dateStr;
  }
};

const formatTooltipDate = (dateStr: string): string => {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, 'MMMM d, yyyy');
  } catch {
    return dateStr;
  }
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color?: string }>;
  label?: string;
}

const WPMTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-white mb-1">{formatTooltipDate(label || '')}</p>
      {payload.map((entry, idx) => (
        <p key={idx} className="text-sm" style={{ color: entry.color || '#00ffff' }}>
          {entry.name === 'wpm' ? 'WPM' : entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
        </p>
      ))}
    </div>
  );
};

const AccuracyTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-white mb-1">{formatTooltipDate(label || '')}</p>
      {payload.map((entry, idx) => (
        <p key={idx} className="text-sm" style={{ color: entry.color || '#a855f7' }}>
          Accuracy: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}%
        </p>
      ))}
    </div>
  );
};

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AnalyticsErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Analytics Error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <Alert variant="destructive" className="m-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription className="flex items-center gap-4">
            <span>Failed to load analytics. Please try again.</span>
            <Button variant="outline" size="sm" onClick={this.handleRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

const validateAnalyticsData = (data: AnalyticsData | undefined): data is AnalyticsData => {
  if (!data) return false;
  if (!Array.isArray(data.wpmOverTime)) return false;
  if (!Array.isArray(data.mistakesHeatmap)) return false;
  if (!Array.isArray(data.commonMistakes)) return false;
  if (!data.consistency || typeof data.consistency.avgWpm !== 'number') return false;
  return true;
};

const safeNumber = (value: unknown, fallback: number = 0): number => {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }
  return fallback;
};

const EmptyDataState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-state">
    <Target className="w-12 h-12 text-muted-foreground mb-4" />
    <h3 className="text-lg font-medium text-muted-foreground mb-2">No Data Available</h3>
    <p className="text-sm text-muted-foreground max-w-md">{message}</p>
  </div>
);

function AnalyticsContent() {
  const [selectedDays, setSelectedDays] = useState<number>(ANALYTICS_CONFIG.defaultTimeRange);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [dailyPlan, setDailyPlan] = useState<DailyExercise[]>([]);
  const [loadingDailyPlan, setLoadingDailyPlan] = useState(false);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyGoal[]>([]);
  const [loadingWeeklyPlan, setLoadingWeeklyPlan] = useState(false);

  const { data: analyticsData, isLoading, isError, error, refetch } = useQuery<{ analytics: AnalyticsData }>({
    queryKey: [`/api/analytics?days=${selectedDays}`],
    retry: ANALYTICS_CONFIG.cache.retryCount,
    staleTime: ANALYTICS_CONFIG.cache.staleTimeMs,
  });

  const analytics = analyticsData?.analytics;
  const isDataValid = validateAnalyticsData(analytics);
  
  // Calculate dynamic thresholds based on user's actual data
  const dynamicThresholds = useMemo(() => {
    if (!isDataValid || !analytics) return null;
    return calculateDynamicThresholds(analytics);
  }, [analytics, isDataValid]);

  // Fetch latest keystroke analytics for detailed analysis
  const { data: keystrokeData } = useQuery({
    queryKey: [`/api/analytics/user?limit=${ANALYTICS_CONFIG.limits.keystrokeAnalyticsDepth}`],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/user?limit=${ANALYTICS_CONFIG.limits.keystrokeAnalyticsDepth}`, {
        credentials: "include",
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.analytics && data.analytics.length > 0 ? { analytics: data.analytics } : null;
    },
  });
  
  const sanitizeText = (text: string): string => {
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/[^\x20-\x7E\n]/g, '')
      .trim();
  };

  const deduplicateInsights = (insights: AIInsight[]): AIInsight[] => {
    const seen = new Set<string>();
    return insights.filter(insight => {
      const normalized = insight.message.toLowerCase().slice(0, 50);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  };

  const parseInsightsFromText = useCallback((text: string, analytics: AnalyticsData): AIInsight[] => {
    const insights: AIInsight[] = [];
    const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 10);
    const thresholds = calculateDynamicThresholds(analytics);
    
    const improvementKeywords = ['improve', 'focus', 'work on', 'reduce', 'avoid', 'weakness'];
    const strengthKeywords = ['strength', 'good', 'excellent', 'strong', 'well', 'consistent'];
    const practiceKeywords = ['practice', 'exercise', 'drill', 'try', 'recommend', 'suggest'];
    
    for (const line of lines) {
      const cleanLine = sanitizeText(line.replace(/^[\d.)\-*•]+\s*/, ''));
      if (cleanLine.length < 15) continue;
      
      const lowerLine = cleanLine.toLowerCase();
      
      if (improvementKeywords.some(kw => lowerLine.includes(kw))) {
        insights.push({ type: "improvement", message: cleanLine, priority: "high" });
      } else if (strengthKeywords.some(kw => lowerLine.includes(kw))) {
        insights.push({ type: "strength", message: cleanLine, priority: "medium" });
      } else if (practiceKeywords.some(kw => lowerLine.includes(kw))) {
        insights.push({ type: "practice", message: cleanLine, priority: "medium" });
      }
    }
    
    // Generate contextual fallback insights based on dynamic thresholds
    if (insights.length === 0) {
      const topMistakeKeys = analytics.mistakesHeatmap
        .slice(0, ANALYTICS_CONFIG.limits.mistakeKeysInFallback)
        .map(m => m.key);
      
      if (topMistakeKeys.length > 0) {
        insights.push({
          type: "improvement",
          message: `Focus on keys with high error rates: ${topMistakeKeys.join(", ")}`,
          priority: "high",
        });
      }
      
      // Use dynamic consistency threshold instead of hardcoded value
      if (thresholds.isInconsistent) {
        insights.push({
          type: "improvement",
          message: `Work on consistency - your WPM varies by ${thresholds.coefficientOfVariation.toFixed(0)}% between tests`,
          priority: "high",
        });
      }
      
      // Use skill level for contextual advice instead of hardcoded WPM thresholds
      const { skillLevel } = thresholds;
      if (skillLevel.level === "Beginner" || skillLevel.level === "Developing") {
        insights.push({
          type: "practice",
          message: `${skillLevel.description}. Practice daily for 15-20 minutes to build muscle memory`,
          priority: "medium",
        });
      } else if (skillLevel.level === "Advanced" || skillLevel.level === "Expert") {
        insights.push({
          type: "strength",
          message: `${skillLevel.description}. Your typing speed is excellent - maintain quality with focused practice`,
          priority: "medium",
        });
      } else {
        insights.push({
          type: "practice",
          message: `${skillLevel.description}. Continue regular practice to improve both speed and accuracy`,
          priority: "medium",
        });
      }
    }
    
    return deduplicateInsights(insights).slice(0, ANALYTICS_CONFIG.limits.insightsDisplay);
  }, []);

  const generateAIInsights = async () => {
    if (!analytics || !dynamicThresholds) return;

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), ANALYTICS_CONFIG.ai.timeoutMs);
    const { skillLevel, isInconsistent, coefficientOfVariation, accuracyFocus } = dynamicThresholds;
    
    // Build contextual prompt based on user's skill level and data
    const topMistakeKeys = analytics.mistakesHeatmap
      .slice(0, ANALYTICS_CONFIG.limits.mistakeKeysInPrompt)
      .map(m => `${sanitizeText(m.key)} (${safeNumber(m.errorRate).toFixed(1)}% error rate)`)
      .join(", ");
    
    const commonMistakes = analytics.commonMistakes
      .slice(0, ANALYTICS_CONFIG.limits.commonMistakesInPrompt)
      .map(m => `"${sanitizeText(m.expectedKey)}" typed as "${sanitizeText(m.typedKey)}" (${m.count}x)`)
      .join(", ");
    
    setLoadingInsights(true);
    try {
      const response = await fetch("/api/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: abortController.signal,
        body: JSON.stringify({
          conversationId: null,
          message: `Analyze my typing performance and provide personalized insights.

User Profile:
- Skill Level: ${skillLevel.level} (${skillLevel.description})
- Focus Area: ${accuracyFocus ? "Accuracy improvement" : "Speed optimization"}

Performance Metrics:
- Average WPM: ${safeNumber(analytics.consistency.avgWpm).toFixed(1)}
- WPM Range: ${safeNumber(analytics.consistency.minWpm)} - ${safeNumber(analytics.consistency.maxWpm)}
- Consistency: ${isInconsistent ? `Needs work (${coefficientOfVariation.toFixed(0)}% variation)` : "Good consistency"}
- Tests in period: ${analytics.wpmOverTime.length}

Problem Areas:
- Top Mistake Keys: ${topMistakeKeys || "None identified"}
- Common Errors: ${commonMistakes || "None identified"}

Provide insights tailored to my ${skillLevel.level.toLowerCase()} skill level:
1. ${ANALYTICS_CONFIG.limits.dailyExercises} specific improvement areas based on my mistakes
2. 2 strengths or positive patterns in my typing
3. ${ANALYTICS_CONFIG.limits.dailyExercises} practice recommendations appropriate for ${skillLevel.level.toLowerCase()} level

Format each insight as a single concise sentence. Focus on actionable, level-appropriate advice.`,
        }),
      });

      clearTimeout(timeoutId);
      
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
              } catch {
                // Ignore parse errors for malformed chunks
              }
            }
          }
        }
      }

      const insights = parseInsightsFromText(fullResponse, analytics);
      setAiInsights(insights);
      toast.success("AI insights generated successfully!");
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error("AI request timed out. Please try again.");
      } else {
        console.error("AI insights error:", error);
        toast.error("Failed to generate AI insights");
      }
      
      const fallbackInsights = parseInsightsFromText("", analytics);
      if (fallbackInsights.length > 0) {
        setAiInsights(fallbackInsights);
      }
    } finally {
      clearTimeout(timeoutId);
      setLoadingInsights(false);
    }
  };

  const generateFallbackDailyPlan = useCallback((analytics: AnalyticsData): DailyExercise[] => {
    const thresholds = calculateDynamicThresholds(analytics);
    const { skillLevel, accuracyFocus, isInconsistent } = thresholds;
    const topMistakeKeys = analytics.mistakesHeatmap
      .slice(0, ANALYTICS_CONFIG.limits.mistakeKeysInFallback)
      .map(m => m.key)
      .join(", ");
    
    // Generate exercises based on skill level and problem areas
    const exercises: DailyExercise[] = [];
    
    // Exercise 1: Always address problem keys if they exist
    if (topMistakeKeys) {
      exercises.push({
        title: "Problem Keys Practice",
        description: `Focus on keys with high error rates: ${topMistakeKeys}`,
        duration: skillLevel.level === "Beginner" ? "15 min" : "10 min",
      });
    } else {
      exercises.push({
        title: "Finger Strength Building",
        description: "Practice common letter combinations to build muscle memory",
        duration: "10 min",
      });
    }
    
    // Exercise 2: Based on whether user needs accuracy or speed focus
    if (accuracyFocus || isInconsistent) {
      exercises.push({
        title: "Accuracy Drills",
        description: "Type at 70% of your normal speed focusing on 100% accuracy",
        duration: skillLevel.level === "Beginner" ? "10 min" : "5 min",
      });
    } else {
      exercises.push({
        title: "Speed Bursts",
        description: "Complete 5 short tests (30s each) pushing for maximum speed",
        duration: "5 min",
      });
    }
    
    // Exercise 3: Skill-level appropriate challenge
    if (skillLevel.level === "Beginner" || skillLevel.level === "Developing") {
      exercises.push({
        title: "Consistent Rhythm Practice",
        description: "Focus on maintaining a steady typing rhythm without rushing",
        duration: "5 min",
      });
    } else {
      exercises.push({
        title: "Endurance Challenge",
        description: "Complete one 2-minute test to build typing stamina",
        duration: "5 min",
      });
    }
    
    return exercises.slice(0, ANALYTICS_CONFIG.limits.dailyExercises);
  }, []);

  const generateDailyPlan = async () => {
    if (!analytics || !dynamicThresholds) return;

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), ANALYTICS_CONFIG.ai.timeoutMs);
    const { skillLevel, accuracyFocus, isInconsistent } = dynamicThresholds;
    
    // Build contextual data for the prompt
    const topMistakeKeys = analytics.mistakesHeatmap
      .slice(0, ANALYTICS_CONFIG.limits.mistakeKeysInPrompt)
      .map(m => sanitizeText(m.key))
      .join(", ");
    
    const commonMistakes = analytics.commonMistakes
      .slice(0, ANALYTICS_CONFIG.limits.commonMistakesInPrompt)
      .map(m => `${sanitizeText(m.expectedKey)}→${sanitizeText(m.typedKey)}`)
      .join(", ");
    
    const latestAccuracy = analytics.wpmOverTime.length > 0 
      ? safeNumber(analytics.wpmOverTime[analytics.wpmOverTime.length - 1].accuracy) 
      : 95;
    
    setLoadingDailyPlan(true);
    try {
      const response = await fetch("/api/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: abortController.signal,
        body: JSON.stringify({
          conversationId: null,
          message: `Create a personalized daily practice plan for a ${skillLevel.level.toLowerCase()} typist.

User Profile:
- Skill Level: ${skillLevel.level} (${skillLevel.description})
- Primary Focus: ${accuracyFocus ? "Improving accuracy" : "Building speed"}
- Consistency: ${isInconsistent ? "Needs improvement" : "Good"}

Performance Data:
- Average WPM: ${safeNumber(analytics.consistency.avgWpm).toFixed(1)}
- Latest Accuracy: ${latestAccuracy.toFixed(1)}%
- Problem Keys: ${topMistakeKeys || "None identified"}
- Common Mistakes: ${commonMistakes || "None identified"}

Create exactly ${ANALYTICS_CONFIG.limits.dailyExercises} exercises in this format:
Exercise 1: [Title] | [Description] | [Duration]
Exercise 2: [Title] | [Description] | [Duration]
Exercise 3: [Title] | [Description] | [Duration]

Tailor exercises to ${skillLevel.level.toLowerCase()} level - ${accuracyFocus ? "prioritize accuracy drills" : "include speed challenges"}. Each should have a clear title, actionable description, and appropriate duration.`,
        }),
      });

      clearTimeout(timeoutId);
      if (!response.ok) throw new Error("Failed to generate daily plan");

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
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }

      const exercises: DailyExercise[] = [];
      const exerciseLines = fullResponse.split("\n").filter(l => l.includes("Exercise") || l.match(/^\d+[.:)]/));
      
      for (const line of exerciseLines) {
        const parts = line.split("|").map(p => sanitizeText(p));
        if (parts.length >= 3) {
          exercises.push({
            title: parts[0].replace(/^Exercise \d+:\s*/, "").replace(/^\d+[.:)]\s*/, "").trim(),
            description: parts[1].trim(),
            duration: parts[2].trim(),
          });
        }
      }

      setDailyPlan(exercises.length > 0 ? exercises.slice(0, ANALYTICS_CONFIG.limits.dailyExercises) : generateFallbackDailyPlan(analytics));
      toast.success("Daily practice plan generated!");
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error("AI request timed out. Using default plan.");
      } else {
        console.error("Daily plan error:", error);
        toast.error("Failed to generate daily plan");
      }
      setDailyPlan(generateFallbackDailyPlan(analytics));
    } finally {
      clearTimeout(timeoutId);
      setLoadingDailyPlan(false);
    }
  };

  const generateFallbackWeeklyPlan = useCallback((analytics: AnalyticsData): WeeklyGoal[] => {
    const thresholds = calculateDynamicThresholds(analytics);
    const { skillLevel, improvementRates, accuracyFocus, isInconsistent } = thresholds;
    const avgWpm = analytics.consistency.avgWpm;
    const topMistakeKeys = analytics.mistakesHeatmap
      .slice(0, ANALYTICS_CONFIG.limits.mistakeKeysInWeeklyFallback)
      .map(m => m.key)
      .join(", ");
    
    // Build skill-level appropriate weekly goals with dynamic targets
    const goals: WeeklyGoal[] = [];
    
    // Week 1: Foundation based on skill level
    if (skillLevel.level === "Beginner" || skillLevel.level === "Developing") {
      goals.push({
        week: "Week 1",
        title: "Building Foundation",
        tasks: [
          "Practice 15-20 min daily",
          accuracyFocus ? "Focus on 95%+ accuracy before speed" : "Maintain current accuracy",
          topMistakeKeys ? `Target problem keys: ${topMistakeKeys}` : "Work on proper finger placement"
        ],
        target: `${Math.ceil(avgWpm + improvementRates.week1)} WPM`,
        status: "current",
      });
    } else {
      goals.push({
        week: "Week 1",
        title: "Precision Tuning",
        tasks: [
          "10-15 min focused practice daily",
          isInconsistent ? "Work on reducing WPM variance" : "Maintain consistency",
          topMistakeKeys ? `Eliminate errors on: ${topMistakeKeys}` : "Fine-tune problem areas"
        ],
        target: `${Math.ceil(avgWpm + improvementRates.week1)} WPM`,
        status: "current",
      });
    }
    
    // Week 2: Progressive improvement
    goals.push({
      week: "Week 2",
      title: skillLevel.level === "Expert" ? "Peak Performance" : "Speed Development",
      tasks: [
        skillLevel.level === "Beginner" ? "Increase to 20 min sessions" : "Add speed burst exercises",
        "Complete 3-5 timed challenges daily",
        accuracyFocus ? "Target 97%+ accuracy" : "Push speed limits safely"
      ],
      target: `${Math.ceil(avgWpm + improvementRates.week2)} WPM`,
      status: "next",
    });
    
    // Week 3-4: Consolidation
    goals.push({
      week: "Week 3-4",
      title: skillLevel.level === "Expert" ? "Excellence Maintenance" : "Skill Integration",
      tasks: [
        "Balance speed and accuracy practice",
        "Test across different content types",
        "Build and maintain consistent rhythm"
      ],
      target: `${Math.ceil(avgWpm + improvementRates.week3)} WPM`,
      status: "later",
    });
    
    return goals.slice(0, ANALYTICS_CONFIG.limits.weeklyGoals);
  }, []);

  const generateWeeklyPlan = async () => {
    if (!analytics || !dynamicThresholds) return;

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), ANALYTICS_CONFIG.ai.timeoutMs);
    const { skillLevel, improvementRates, isInconsistent, accuracyFocus } = dynamicThresholds;
    
    // Build contextual data for the prompt
    const topMistakeKeys = analytics.mistakesHeatmap
      .slice(0, ANALYTICS_CONFIG.limits.mistakeKeysInPrompt)
      .map(m => sanitizeText(m.key))
      .join(", ");
    
    setLoadingWeeklyPlan(true);
    try {
      const response = await fetch("/api/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: abortController.signal,
        body: JSON.stringify({
          conversationId: null,
          message: `Create a personalized 4-week improvement roadmap for a ${skillLevel.level.toLowerCase()} typist.

User Profile:
- Skill Level: ${skillLevel.level} (${skillLevel.description})
- Primary Focus: ${accuracyFocus ? "Accuracy improvement" : "Speed optimization"}
- Consistency: ${isInconsistent ? "Needs improvement" : "Good"}

Current Performance:
- Average WPM: ${safeNumber(analytics.consistency.avgWpm).toFixed(1)}
- WPM Range: ${safeNumber(analytics.consistency.minWpm)} - ${safeNumber(analytics.consistency.maxWpm)}
- Problem Keys: ${topMistakeKeys || "None identified"}

Recommended Improvement Targets (based on skill level):
- Week 1: +${improvementRates.week1} WPM (${Math.ceil(analytics.consistency.avgWpm + improvementRates.week1)} WPM)
- Week 2: +${improvementRates.week2} WPM (${Math.ceil(analytics.consistency.avgWpm + improvementRates.week2)} WPM)
- Week 3-4: +${improvementRates.week3} WPM (${Math.ceil(analytics.consistency.avgWpm + improvementRates.week3)} WPM)

Create exactly ${ANALYTICS_CONFIG.limits.weeklyGoals} weekly goals in this format:
Week 1: [Title] | [Task 1, Task 2, Task 3] | [Target WPM]
Week 2: [Title] | [Task 1, Task 2, Task 3] | [Target WPM]
Week 3-4: [Title] | [Task 1, Task 2, Task 3] | [Target WPM]

Make goals progressive and appropriate for ${skillLevel.level.toLowerCase()} level. Use the recommended targets.`,
        }),
      });

      clearTimeout(timeoutId);
      if (!response.ok) throw new Error("Failed to generate weekly plan");

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
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }

      const goals: WeeklyGoal[] = [];
      const goalLines = fullResponse.split("\n").filter(l => l.includes("Week"));
      
      for (let i = 0; i < goalLines.length && i < ANALYTICS_CONFIG.limits.weeklyGoals; i++) {
        const line = goalLines[i];
        const parts = line.split("|").map(p => sanitizeText(p));
        if (parts.length >= 3) {
          const weekPart = parts[0];
          const week = weekPart.match(/Week\s+[\d-]+/)?.[0] || `Week ${i + 1}`;
          const title = weekPart.replace(/Week\s+[\d-]+:\s*/, "").trim();
          const tasks = parts[1].split(",").map(t => t.trim()).filter(t => t.length > 0);
          const target = parts[2].trim();
          
          goals.push({
            week,
            title,
            tasks: tasks.length > 0 ? tasks : ["Practice daily", "Focus on accuracy", "Build consistency"],
            target,
            status: i === 0 ? "current" : i === 1 ? "next" : "later",
          });
        }
      }

      setWeeklyPlan(goals.length > 0 ? goals : generateFallbackWeeklyPlan(analytics));
      toast.success("Weekly improvement plan generated!");
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error("AI request timed out. Using default plan.");
      } else {
        console.error("Weekly plan error:", error);
        toast.error("Failed to generate weekly plan");
      }
      setWeeklyPlan(generateFallbackWeeklyPlan(analytics));
    } finally {
      clearTimeout(timeoutId);
      setLoadingWeeklyPlan(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Alert variant="destructive" data-testid="error-alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to Load Analytics</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
            <span>
              {error instanceof Error ? error.message : 'Unable to load your analytics data. Please try again.'}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              data-testid="button-retry"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const wpmTrend = useMemo(() => {
    if (!analytics || analytics.wpmOverTime.length < 2) return 0;
    return analytics.wpmOverTime[analytics.wpmOverTime.length - 1].wpm - analytics.wpmOverTime[0].wpm;
  }, [analytics]);

  const accuracyTrend = useMemo(() => {
    if (!analytics || analytics.wpmOverTime.length < 2) return 0;
    return analytics.wpmOverTime[analytics.wpmOverTime.length - 1].accuracy - analytics.wpmOverTime[0].accuracy;
  }, [analytics]);

  const totalTests = useMemo(() => {
    if (!analytics) return 0;
    return analytics.wpmOverTime.reduce((sum, d) => sum + safeNumber(d.testCount), 0);
  }, [analytics]);

  const formattedChartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.wpmOverTime.map(d => ({
      ...d,
      formattedDate: formatChartDate(d.date),
    }));
  }, [analytics]);

  if (!isDataValid || !analytics || analytics.wpmOverTime.length === 0) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-center py-12" data-testid="empty-analytics">
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

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-analytics">Progress Analytics</h1>
          <p className="text-muted-foreground">Track your typing improvement over time</p>
        </div>
        <div className="flex gap-2">
          {ANALYTICS_CONFIG.timeRangeOptions.map(days => (
            <Button
              key={days}
              variant={selectedDays === days ? "default" : "outline"}
              onClick={() => { setSelectedDays(days); refetch(); }}
              data-testid={`button-timeframe-${days}`}
            >
              {days} Days
            </Button>
          ))}
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
              {dynamicThresholds ? (
                dynamicThresholds.isInconsistent ? "Needs Work" : 
                dynamicThresholds.coefficientOfVariation < ANALYTICS_CONFIG.consistency.excellentCV ? "Excellent" : "Good"
              ) : "Loading..."}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              ±{analytics.consistency.stdDeviation.toFixed(1)} WPM ({dynamicThresholds?.coefficientOfVariation.toFixed(0) || 0}% variation)
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
              {totalTests}
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
          <TabsTrigger value="keystroke" data-testid="tab-keystroke">Keystroke Analysis</TabsTrigger>
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
                <AreaChart data={analytics.wpmOverTime} aria-label="WPM Progress Chart">
                  <defs>
                    <linearGradient id="colorWpm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ffff" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00ffff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#888" 
                    tickFormatter={formatChartDate}
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#888" domain={['dataMin - 5', 'dataMax + 5']} />
                  <Tooltip content={<WPMTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="wpm" 
                    stroke="#00ffff" 
                    fillOpacity={1} 
                    fill="url(#colorWpm)"
                    name="WPM"
                  />
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
                  <LineChart data={analytics.wpmOverTime} aria-label="Accuracy Trend Chart">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#888" 
                      tickFormatter={formatChartDate}
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      stroke="#888" 
                      domain={[
                        (dataMin: number) => Math.max(0, Math.floor(dataMin - 5)),
                        (dataMax: number) => Math.min(100, Math.ceil(dataMax + 2))
                      ]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip content={<AccuracyTooltip />} />
                    <Line type="monotone" dataKey="accuracy" stroke="#a855f7" strokeWidth={2} dot={{ r: 4 }} name="Accuracy" />
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
                    {dynamicThresholds ? (
                      dynamicThresholds.coefficientOfVariation < ANALYTICS_CONFIG.consistency.excellentCV
                        ? "Excellent consistency! Your typing speed is very stable." 
                        : !dynamicThresholds.isInconsistent
                        ? "Good consistency. Minor variations in speed."
                        : "Variable performance. Focus on maintaining steady speed."
                    ) : "Loading consistency analysis..."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="keystroke" className="space-y-4">
          {!keystrokeData?.analytics ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Keyboard className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Keystroke Data Available</h3>
                  <p className="text-muted-foreground mb-4">
                    Complete a typing test with keystroke tracking enabled to see detailed analytics
                  </p>
                  <Button onClick={() => (window.location.href = "/")} data-testid="button-start-test-keystroke">
                    Start a Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Timing Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Average Dwell Time</CardDescription>
                    <CardTitle className="text-3xl" data-testid="stat-avg-dwell">
                      {keystrokeData.analytics.avgDwellTime?.toFixed(0) || 'N/A'} ms
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Time keys are held down
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Average Flight Time</CardDescription>
                    <CardTitle className="text-3xl" data-testid="stat-avg-flight">
                      {keystrokeData.analytics.avgFlightTime?.toFixed(0) || 'N/A'} ms
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Time between keystrokes
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Consistency Score</CardDescription>
                    <CardTitle className="text-3xl" data-testid="stat-consistency-score">
                      {keystrokeData.analytics.consistency?.toFixed(1) || 'N/A'}%
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Typing rhythm stability
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Finger Usage and Hand Balance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Finger Usage Distribution</CardTitle>
                    <CardDescription>Keystrokes per finger</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {keystrokeData.analytics.fingerUsage ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={Object.entries(keystrokeData.analytics.fingerUsage).map(([finger, count]) => ({
                          finger: finger.replace('Left ', 'L ').replace('Right ', 'R '),
                          count: count
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="finger" stroke="#888" angle={-45} textAnchor="end" height={80} />
                          <YAxis stroke="#888" />
                          <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
                          <Bar dataKey="count" fill="#00ffff" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center py-12 text-muted-foreground">No finger usage data available</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Hand Balance</CardTitle>
                    <CardDescription>Left vs Right hand usage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {keystrokeData.analytics.handBalance !== null && keystrokeData.analytics.handBalance !== undefined ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Left Hand</span>
                          <Badge variant="outline" className="text-lg">{keystrokeData.analytics.handBalance.toFixed(1)}%</Badge>
                        </div>
                        <div className="w-full h-8 bg-secondary rounded-full overflow-hidden flex">
                          <div 
                            className="bg-blue-500 transition-all duration-500"
                            style={{ width: `${keystrokeData.analytics.handBalance}%` }}
                          />
                          <div 
                            className="bg-purple-500 transition-all duration-500"
                            style={{ width: `${100 - keystrokeData.analytics.handBalance}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Right Hand</span>
                          <Badge variant="outline" className="text-lg">{(100 - keystrokeData.analytics.handBalance).toFixed(1)}%</Badge>
                        </div>
                        <Separator />
                        <p className="text-sm text-muted-foreground text-center">
                          {Math.abs(keystrokeData.analytics.handBalance - 50) < 10 
                            ? "🎯 Well balanced hand usage" 
                            : "⚡ Consider practicing with your weaker hand"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-center py-12 text-muted-foreground">No hand balance data available</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Keyboard Heatmap */}
              <Card>
                <CardHeader>
                  <CardTitle>Keyboard Heatmap</CardTitle>
                  <CardDescription>Visual representation of key usage frequency</CardDescription>
                </CardHeader>
                <CardContent>
                  {keystrokeData.analytics.keyHeatmap ? (
                    <div className="overflow-x-auto">
                      <div className="min-w-[600px] space-y-1">
                        {/* Number row */}
                        <div className="flex gap-1 justify-center">
                          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(key => {
                            const count = keystrokeData.analytics.keyHeatmap?.[key] || 0;
                            const maxCount = Math.max(...(Object.values(keystrokeData.analytics.keyHeatmap || {}) as number[]));
                            const intensity = maxCount > 0 ? (count / maxCount) * 100 : 0;
                            return (
                              <div
                                key={key}
                                className="w-12 h-12 rounded border border-border flex items-center justify-center font-mono text-sm transition-all hover:scale-110"
                                style={{
                                  backgroundColor: `rgba(0, 255, 255, ${intensity / 100 * 0.5})`,
                                  boxShadow: intensity > 50 ? '0 0 10px rgba(0, 255, 255, 0.3)' : 'none'
                                }}
                                title={`${key}: ${count} times`}
                              >
                                {key}
                              </div>
                            );
                          })}
                        </div>
                        {/* QWERTY row */}
                        <div className="flex gap-1 justify-center">
                          {['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'].map(key => {
                            const count = keystrokeData.analytics.keyHeatmap?.[key.toLowerCase()] || keystrokeData.analytics.keyHeatmap?.[key] || 0;
                            const maxCount = Math.max(...(Object.values(keystrokeData.analytics.keyHeatmap || {}) as number[]));
                            const intensity = maxCount > 0 ? (count / maxCount) * 100 : 0;
                            return (
                              <div
                                key={key}
                                className="w-12 h-12 rounded border border-border flex items-center justify-center font-mono text-sm transition-all hover:scale-110"
                                style={{
                                  backgroundColor: `rgba(0, 255, 255, ${intensity / 100 * 0.5})`,
                                  boxShadow: intensity > 50 ? '0 0 10px rgba(0, 255, 255, 0.3)' : 'none'
                                }}
                                title={`${key}: ${count} times`}
                              >
                                {key}
                              </div>
                            );
                          })}
                        </div>
                        {/* ASDF row */}
                        <div className="flex gap-1 justify-center ml-6">
                          {['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'].map(key => {
                            const count = keystrokeData.analytics.keyHeatmap?.[key.toLowerCase()] || keystrokeData.analytics.keyHeatmap?.[key] || 0;
                            const maxCount = Math.max(...(Object.values(keystrokeData.analytics.keyHeatmap || {}) as number[]));
                            const intensity = maxCount > 0 ? (count / maxCount) * 100 : 0;
                            return (
                              <div
                                key={key}
                                className="w-12 h-12 rounded border border-border flex items-center justify-center font-mono text-sm transition-all hover:scale-110"
                                style={{
                                  backgroundColor: `rgba(0, 255, 255, ${intensity / 100 * 0.5})`,
                                  boxShadow: intensity > 50 ? '0 0 10px rgba(0, 255, 255, 0.3)' : 'none'
                                }}
                                title={`${key}: ${count} times`}
                              >
                                {key}
                              </div>
                            );
                          })}
                        </div>
                        {/* ZXCV row */}
                        <div className="flex gap-1 justify-center ml-12">
                          {['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map(key => {
                            const count = keystrokeData.analytics.keyHeatmap?.[key.toLowerCase()] || keystrokeData.analytics.keyHeatmap?.[key] || 0;
                            const maxCount = Math.max(...(Object.values(keystrokeData.analytics.keyHeatmap || {}) as number[]));
                            const intensity = maxCount > 0 ? (count / maxCount) * 100 : 0;
                            return (
                              <div
                                key={key}
                                className="w-12 h-12 rounded border border-border flex items-center justify-center font-mono text-sm transition-all hover:scale-110"
                                style={{
                                  backgroundColor: `rgba(0, 255, 255, ${intensity / 100 * 0.5})`,
                                  boxShadow: intensity > 50 ? '0 0 10px rgba(0, 255, 255, 0.3)' : 'none'
                                }}
                                title={`${key}: ${count} times`}
                              >
                                {key}
                              </div>
                            );
                          })}
                        </div>
                        {/* Spacebar */}
                        <div className="flex gap-1 justify-center mt-1">
                          <div className="w-64 h-12 rounded border border-border flex items-center justify-center font-mono text-sm transition-all hover:scale-105"
                            style={{
                              backgroundColor: `rgba(0, 255, 255, ${((keystrokeData.analytics.keyHeatmap?.[' '] || 0) / Math.max(...(Object.values(keystrokeData.analytics.keyHeatmap || {}) as number[]))) * 0.5})`,
                            }}
                            title={`SPACE: ${keystrokeData.analytics.keyHeatmap?.[' '] || 0} times`}
                          >
                            SPACE
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
                          <span>Less Used</span>
                          <div className="flex gap-1">
                            <div className="w-8 h-4 rounded" style={{ backgroundColor: 'rgba(0, 255, 255, 0.1)' }} />
                            <div className="w-8 h-4 rounded" style={{ backgroundColor: 'rgba(0, 255, 255, 0.25)' }} />
                            <div className="w-8 h-4 rounded" style={{ backgroundColor: 'rgba(0, 255, 255, 0.5)' }} />
                          </div>
                          <span>Most Used</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center py-12 text-muted-foreground">No keyboard heatmap data available</p>
                  )}
                </CardContent>
              </Card>

              {/* WPM by Position & Slowest Words */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {keystrokeData.analytics.wpmByPosition && (
                  <Card>
                    <CardHeader>
                      <CardTitle>WPM Throughout Test</CardTitle>
                      <CardDescription>Speed consistency over text position</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={keystrokeData.analytics.wpmByPosition.map((wpm: number, idx: number) => ({
                          position: `${idx * 10}%`,
                          wpm
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="position" stroke="#888" />
                          <YAxis stroke="#888" />
                          <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
                          <Line type="monotone" dataKey="wpm" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {keystrokeData.analytics.slowestWords && keystrokeData.analytics.slowestWords.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Slowest Words</CardTitle>
                      <CardDescription>Words that slow you down</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[250px]">
                        <div className="space-y-2">
                          {keystrokeData.analytics.slowestWords.slice(0, 10).map((item: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                              data-testid={`slow-word-${idx}`}
                            >
                              <span className="font-mono font-medium">{item.word}</span>
                              <Badge variant="outline">{item.avgTime?.toFixed(0)} ms</Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Digraph Analysis */}
              {keystrokeData.analytics.fastestDigraph && keystrokeData.analytics.slowestDigraph && (
                <Card>
                  <CardHeader>
                    <CardTitle>Digraph Analysis</CardTitle>
                    <CardDescription>Fastest and slowest two-key combinations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-semibold mb-3 text-green-500">Fastest Digraphs</h4>
                        <div className="space-y-2">
                          {keystrokeData.analytics.fastestDigraph.slice(0, 5).map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded bg-green-500/10 border border-green-500/20">
                              <span className="font-mono">{item.digraph}</span>
                              <Badge variant="outline" className="bg-green-500/20">{item.avgTime?.toFixed(0)} ms</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold mb-3 text-red-500">Slowest Digraphs</h4>
                        <div className="space-y-2">
                          {keystrokeData.analytics.slowestDigraph.slice(0, 5).map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded bg-red-500/10 border border-red-500/20">
                              <span className="font-mono">{item.digraph}</span>
                              <Badge variant="outline" className="bg-red-500/20">{item.avgTime?.toFixed(0)} ms</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Daily Practice Plan
                    </CardTitle>
                    <CardDescription>AI-powered personalized exercises</CardDescription>
                  </div>
                  <Button
                    onClick={generateDailyPlan}
                    disabled={loadingDailyPlan}
                    size="sm"
                    variant="outline"
                    data-testid="button-generate-daily"
                  >
                    {loadingDailyPlan ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Plan
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {dailyPlan.length > 0 ? (
                  <div className="space-y-3">
                    {dailyPlan.map((exercise, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50" data-testid={`exercise-${idx}`}>
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold">{exercise.title}</h4>
                            <Badge variant="outline" className="text-xs">{exercise.duration}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {exercise.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Click "Generate Plan" to get your personalized daily practice routine</p>
                  </div>
                )}

                {dailyPlan.length > 0 && (
                  <Button className="w-full" onClick={() => (window.location.href = "/")} data-testid="button-start-practice">
                    <Target className="w-4 h-4 mr-2" />
                    Start Practice Session
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Weekly Improvement Plan
                    </CardTitle>
                    <CardDescription>AI-generated progressive roadmap</CardDescription>
                  </div>
                  <Button
                    onClick={generateWeeklyPlan}
                    disabled={loadingWeeklyPlan}
                    size="sm"
                    variant="outline"
                    data-testid="button-generate-weekly"
                  >
                    {loadingWeeklyPlan ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Plan
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {weeklyPlan.length > 0 ? (
                  <div className="space-y-3">
                    {weeklyPlan.map((goal, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border border-border ${goal.status !== "current" ? "opacity-60" : ""}`}
                        data-testid={`weekly-goal-${idx}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{goal.week}: {goal.title}</h4>
                          <Badge variant={goal.status === "current" ? "outline" : "secondary"}>
                            {goal.status === "current" ? "Current" : goal.status === "next" ? "Next" : "Later"}
                          </Badge>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                          {goal.tasks.map((task, taskIdx) => (
                            <li key={taskIdx}>{task}</li>
                          ))}
                          <li className="font-semibold text-primary">Target: {goal.target}</li>
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Click "Generate Plan" to get your 4-week improvement roadmap</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Analytics() {
  return (
    <AnalyticsErrorBoundary>
      <AnalyticsContent />
    </AnalyticsErrorBoundary>
  );
}
