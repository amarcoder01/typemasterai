import { useEffect, useState, useMemo, useCallback, Component, ReactNode, ErrorInfo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, TrendingDown, Target, Keyboard, Calendar, Sparkles, Brain, Loader2, AlertTriangle, RefreshCw, LogIn, Info, WifiOff, Clock, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format, parseISO, isValid } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";

// ============================================================================
// ANALYTICS CONFIGURATION - Centralized, production-ready settings
// ============================================================================

const ANALYTICS_CONFIG = {
  // Time range options (in days) - sorted ascending
  timeRangeOptions: [7, 14, 30, 60, 90] as const,
  defaultTimeRange: 30,
  
  // AI Configuration
  ai: {
    timeoutMs: 45000,
    maxRetries: 2,
  },
  
  // Display limits - how many items to show in various contexts
  limits: {
    insightsDisplay: 10,
    mistakeKeysInPrompt: 8,
    mistakeKeysInFallback: 5,
    mistakeKeysInWeeklyFallback: 3,
    commonMistakesInPrompt: 8,
    dailyExercises: 4,
    weeklyGoals: 4,
    keystrokeAnalyticsDepth: 10,
    digraphsInPrompt: 5,
  },
  
  // Query caching
  cache: {
    staleTimeMs: 30000,
    retryCount: 2,
  },
  
  // Skill level thresholds (WPM) - configurable speed tiers
  // Based on industry research from typing.com, keybr.com, and Ratatype
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
  
  // Industry-standard benchmarks for professional-grade insights
  // Based on research from Typing.com, Monkeytype, and academic typing studies
  benchmarks: {
    // Average typist benchmarks (industry standard ranges)
    wpm: {
      average: 41,           // Average adult typing speed
      professional: 65,      // Professional typist minimum
      elite: 100,            // Top 1% typists
      worldClass: 150,       // Competitive speed typing
    },
    accuracy: {
      acceptable: 92,        // Minimum acceptable for work
      good: 96,              // Good professional standard
      excellent: 98,         // High accuracy target
      perfect: 99.5,         // Near-perfect typing
    },
    consistency: {
      excellent: 8,          // CV% - very consistent
      good: 12,              // CV% - consistent
      needsWork: 18,         // CV% - some variation
      poor: 25,              // CV% - significant variation
    },
    // Timing benchmarks (milliseconds)
    timing: {
      avgFlightTime: {
        fast: 80,            // Fast transition between keys
        average: 120,        // Normal typing rhythm
        slow: 180,           // Slow, deliberate typing
      },
      avgDwellTime: {
        quick: 70,           // Quick key press
        normal: 100,         // Normal key hold
        long: 150,           // Long key press (potential issue)
      },
    },
    // Fatigue indicators
    fatigue: {
      none: 0.05,            // <5% slowdown = no fatigue
      mild: 0.10,            // 5-10% slowdown = mild fatigue
      moderate: 0.20,        // 10-20% slowdown = moderate fatigue
      significant: 0.30,     // >30% slowdown = significant fatigue
    },
    // Hand balance (% left hand usage - 50% is perfect balance)
    handBalance: {
      balanced: { min: 45, max: 55 },
      slightImbalance: { min: 40, max: 60 },
      imbalanced: { min: 30, max: 70 },
    },
    // Typing rhythm (coefficient of variation in keystroke timing)
    rhythm: {
      excellent: 15,         // Very consistent rhythm
      good: 25,              // Consistent rhythm
      irregular: 40,         // Irregular rhythm
      erratic: 60,           // Very inconsistent
    },
  },
  
  // Finger names mapping for readable output
  fingerNames: {
    L_Pinky: "Left Pinky",
    L_Ring: "Left Ring",
    L_Middle: "Left Middle",
    L_Index: "Left Index",
    R_Index: "Right Index",
    R_Middle: "Right Middle",
    R_Ring: "Right Ring",
    R_Pinky: "Right Pinky",
    Thumb: "Thumb (Space)",
  } as Record<string, string>,
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
  type: "improvement" | "strength" | "practice" | "warning" | "milestone";
  category: "speed" | "accuracy" | "rhythm" | "ergonomics" | "technique" | "endurance" | "general";
  message: string;
  priority: "critical" | "high" | "medium" | "low";
  dataPoint?: string;
  benchmark?: string;
  actionItem?: string;
}

interface ComprehensiveAnalyticsPayload {
  userProfile: {
    skillLevel: string;
    skillDescription: string;
    focusArea: string;
  };
  coreMetrics: {
    avgWpm: number;
    wpmRange: { min: number; max: number };
    consistency: { isConsistent: boolean; cvPercent: number; rating: string };
    avgAccuracy: number;
    testCount: number;
  };
  advancedMetrics: {
    burstWpm: number | null;
    adjustedWpm: number | null;
    typingRhythm: { value: number | null; rating: string };
    timing: {
      avgDwellTime: { value: number | null; rating: string };
      avgFlightTime: { value: number | null; rating: string };
    };
    fatigue: { indicator: number | null; rating: string };
    errorBurstCount: number | null;
  };
  digraphAnalysis: {
    fastest: string | null;
    slowest: string | null;
    topDigraphs: Array<{ digraph: string; avgTime: number; count: number }>;
    bottomDigraphs: Array<{ digraph: string; avgTime: number; count: number }>;
  };
  ergonomics: {
    handBalance: { value: number | null; rating: string };
    fingerUsage: Record<string, { count: number; percentage: number }>;
    weakestFingers: string[];
    strongestFingers: string[];
  };
  problemAreas: {
    topMistakeKeys: Array<{ key: string; errorRate: number }>;
    commonMistakes: Array<{ expected: string; typed: string; count: number }>;
    slowestWords: Array<{ word: string; time: number }>;
  };
  benchmarkComparisons: {
    wpmVsAverage: { difference: number; percentile: string };
    wpmVsProfessional: { difference: number; percentile: string };
    accuracyRating: string;
    consistencyRating: string;
  };
  trends: {
    weekOverWeek: { wpm: number; accuracy: number };
    monthOverMonth: { wpm: number; accuracy: number };
    allTimeImprovement: number;
  } | null;
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

interface HistoricalTrends {
  weeklyAggregates: Array<{
    weekStart: string;
    weekEnd: string;
    avgWpm: number;
    avgAccuracy: number;
    testCount: number;
    bestWpm: number;
  }>;
  monthlyAggregates: Array<{
    month: string;
    avgWpm: number;
    avgAccuracy: number;
    testCount: number;
    bestWpm: number;
  }>;
  improvement: {
    weekOverWeek: { wpm: number; accuracy: number };
    monthOverMonth: { wpm: number; accuracy: number };
    allTime: { firstWpm: number; currentWpm: number; improvementPercent: number };
  };
  milestones: Array<{
    type: string;
    value: number;
    achievedAt: string;
  }>;
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

const safeString = (value: unknown, fallback: string = ''): string => {
  if (typeof value === 'string') {
    return value.trim();
  }
  return fallback;
};

const sanitizeWpmDataPoint = (point: Record<string, unknown>): { date: string; wpm: number; accuracy: number; testCount: number } => ({
  date: safeString(point?.date, new Date().toISOString()),
  wpm: safeNumber(point?.wpm, 0),
  accuracy: safeNumber(point?.accuracy, 0),
  testCount: safeNumber(point?.testCount, 1),
});

const sanitizeMistakeEntry = (entry: Record<string, unknown>): { key: string; errorCount: number; totalCount: number; errorRate: number } => ({
  key: safeString(entry?.key, '?'),
  errorCount: safeNumber(entry?.errorCount, 0),
  totalCount: safeNumber(entry?.totalCount, 1),
  errorRate: safeNumber(entry?.errorRate, 0),
});

const sanitizeAnalyticsData = (data: Partial<AnalyticsData> | undefined): AnalyticsData | null => {
  if (!data) return null;
  
  try {
    const wpmOverTime = Array.isArray(data.wpmOverTime) 
      ? data.wpmOverTime.map(p => sanitizeWpmDataPoint(p as Record<string, unknown>)).filter(p => p.wpm > 0)
      : [];
    
    const mistakesHeatmap = Array.isArray(data.mistakesHeatmap)
      ? data.mistakesHeatmap.map(m => sanitizeMistakeEntry(m as Record<string, unknown>))
      : [];
    
    const commonMistakes = Array.isArray(data.commonMistakes)
      ? data.commonMistakes.map(m => ({
          expectedKey: safeString((m as Record<string, unknown>)?.expectedKey, '?'),
          typedKey: safeString((m as Record<string, unknown>)?.typedKey, '?'),
          count: safeNumber((m as Record<string, unknown>)?.count, 0),
        }))
      : [];
    
    const consistency = {
      avgWpm: safeNumber(data.consistency?.avgWpm, 0),
      stdDeviation: safeNumber(data.consistency?.stdDeviation, 0),
      minWpm: safeNumber(data.consistency?.minWpm, 0),
      maxWpm: safeNumber(data.consistency?.maxWpm, 0),
    };
    
    return { wpmOverTime, mistakesHeatmap, commonMistakes, consistency };
  } catch {
    return null;
  }
};

interface PartialDataWarningProps {
  hasWpmData: boolean;
  hasMistakeData: boolean;
  hasCommonMistakes: boolean;
}

const PartialDataWarning = ({ hasWpmData, hasMistakeData, hasCommonMistakes }: PartialDataWarningProps) => {
  const missingParts: string[] = [];
  if (!hasWpmData) missingParts.push('WPM history');
  if (!hasMistakeData) missingParts.push('mistake patterns');
  if (!hasCommonMistakes) missingParts.push('common errors');
  
  if (missingParts.length === 0) return null;
  
  return (
    <Alert className="mb-4" data-testid="partial-data-warning">
      <Info className="h-4 w-4" />
      <AlertTitle>Partial Data Available</AlertTitle>
      <AlertDescription>
        Some analytics data is limited: {missingParts.join(', ')}. Complete more typing tests to see full insights.
      </AlertDescription>
    </Alert>
  );
};

const EmptyDataState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-state">
    <Target className="w-12 h-12 text-muted-foreground mb-4" />
    <h3 className="text-lg font-medium text-muted-foreground mb-2">No Data Available</h3>
    <p className="text-sm text-muted-foreground max-w-md">{message}</p>
  </div>
);

const buildComprehensiveAnalyticsPayload = (
  analytics: AnalyticsData,
  keystrokeData: {
    analytics: {
      avgDwellTime: number | null;
      avgFlightTime: number | null;
      consistency: number | null;
      fingerUsage: Record<string, number> | null;
      handBalance: number | null;
      burstWpm: number | null;
      adjustedWpm: number | null;
      typingRhythm: number | null;
      fatigueIndicator: number | null;
      errorBurstCount: number | null;
      fastestDigraph: string | null;
      slowestDigraph: string | null;
      topDigraphs: Array<{ digraph: string; avgTime: number; count: number }> | null;
      bottomDigraphs: Array<{ digraph: string; avgTime: number; count: number }> | null;
      slowestWords: Array<{ word: string; time: number }> | null;
    };
  } | null,
  dynamicThresholds: ReturnType<typeof calculateDynamicThresholds>,
  trendsData: { trends: HistoricalTrends } | undefined
): ComprehensiveAnalyticsPayload => {
  const { benchmarks, fingerNames, limits } = ANALYTICS_CONFIG;
  const ks = keystrokeData?.analytics;

  const getRhythmRating = (rhythm: number | null): string => {
    if (rhythm === null) return "Unknown";
    if (rhythm < benchmarks.rhythm.excellent) return "Excellent";
    if (rhythm < benchmarks.rhythm.good) return "Good";
    if (rhythm < benchmarks.rhythm.irregular) return "Irregular";
    return "Erratic";
  };

  const getDwellTimeRating = (dwell: number | null): string => {
    if (dwell === null) return "Unknown";
    if (dwell < benchmarks.timing.avgDwellTime.quick) return "Quick";
    if (dwell < benchmarks.timing.avgDwellTime.normal) return "Normal";
    return "Long";
  };

  const getFlightTimeRating = (flight: number | null): string => {
    if (flight === null) return "Unknown";
    if (flight < benchmarks.timing.avgFlightTime.fast) return "Fast";
    if (flight < benchmarks.timing.avgFlightTime.average) return "Average";
    return "Slow";
  };

  const getFatigueRating = (fatigue: number | null): string => {
    if (fatigue === null) return "Unknown";
    if (fatigue < benchmarks.fatigue.none) return "None";
    if (fatigue < benchmarks.fatigue.mild) return "Mild";
    if (fatigue < benchmarks.fatigue.moderate) return "Moderate";
    return "Significant";
  };

  const getHandBalanceRating = (balance: number | null): string => {
    if (balance === null) return "Unknown";
    const { balanced, slightImbalance } = benchmarks.handBalance;
    if (balance >= balanced.min && balance <= balanced.max) return "Balanced";
    if (balance >= slightImbalance.min && balance <= slightImbalance.max) return "Slight imbalance";
    return "Imbalanced";
  };

  const getConsistencyRating = (cv: number): string => {
    if (cv < benchmarks.consistency.excellent) return "Excellent";
    if (cv < benchmarks.consistency.good) return "Good";
    if (cv < benchmarks.consistency.needsWork) return "Needs work";
    return "Poor";
  };

  const getAccuracyRating = (accuracy: number): string => {
    if (accuracy >= benchmarks.accuracy.perfect) return "Near-perfect";
    if (accuracy >= benchmarks.accuracy.excellent) return "Excellent";
    if (accuracy >= benchmarks.accuracy.good) return "Good";
    if (accuracy >= benchmarks.accuracy.acceptable) return "Acceptable";
    return "Needs improvement";
  };

  const getWpmPercentile = (wpm: number): string => {
    if (wpm >= benchmarks.wpm.worldClass) return "Top 0.1%";
    if (wpm >= benchmarks.wpm.elite) return "Top 1%";
    if (wpm >= benchmarks.wpm.professional) return "Top 10%";
    if (wpm >= benchmarks.wpm.average) return "Above average";
    return "Below average";
  };

  const fingerUsageWithPercentages: Record<string, { count: number; percentage: number }> = {};
  let totalFingerUsage = 0;
  if (ks?.fingerUsage) {
    totalFingerUsage = Object.values(ks.fingerUsage).reduce((sum, count) => sum + count, 0);
    Object.entries(ks.fingerUsage).forEach(([finger, count]) => {
      fingerUsageWithPercentages[fingerNames[finger] || finger] = {
        count,
        percentage: totalFingerUsage > 0 ? (count / totalFingerUsage) * 100 : 0,
      };
    });
  }

  const sortedFingers = Object.entries(fingerUsageWithPercentages).sort((a, b) => a[1].percentage - b[1].percentage);
  const weakestFingers = sortedFingers.slice(0, 2).map(([finger]) => finger);
  const strongestFingers = sortedFingers.slice(-2).reverse().map(([finger]) => finger);

  const avgAccuracy = analytics.wpmOverTime.length > 0
    ? analytics.wpmOverTime.reduce((sum, d) => sum + d.accuracy, 0) / analytics.wpmOverTime.length
    : 95;

  return {
    userProfile: {
      skillLevel: dynamicThresholds.skillLevel.level,
      skillDescription: dynamicThresholds.skillLevel.description,
      focusArea: dynamicThresholds.accuracyFocus ? "Accuracy improvement" : "Speed optimization",
    },
    coreMetrics: {
      avgWpm: analytics.consistency.avgWpm,
      wpmRange: { min: analytics.consistency.minWpm, max: analytics.consistency.maxWpm },
      consistency: {
        isConsistent: !dynamicThresholds.isInconsistent,
        cvPercent: dynamicThresholds.coefficientOfVariation,
        rating: getConsistencyRating(dynamicThresholds.coefficientOfVariation),
      },
      avgAccuracy,
      testCount: analytics.wpmOverTime.length,
    },
    advancedMetrics: {
      burstWpm: ks?.burstWpm ?? null,
      adjustedWpm: ks?.adjustedWpm ?? null,
      typingRhythm: {
        value: ks?.typingRhythm ?? null,
        rating: getRhythmRating(ks?.typingRhythm ?? null),
      },
      timing: {
        avgDwellTime: {
          value: ks?.avgDwellTime ?? null,
          rating: getDwellTimeRating(ks?.avgDwellTime ?? null),
        },
        avgFlightTime: {
          value: ks?.avgFlightTime ?? null,
          rating: getFlightTimeRating(ks?.avgFlightTime ?? null),
        },
      },
      fatigue: {
        indicator: ks?.fatigueIndicator ?? null,
        rating: getFatigueRating(ks?.fatigueIndicator ?? null),
      },
      errorBurstCount: ks?.errorBurstCount ?? null,
    },
    digraphAnalysis: {
      fastest: ks?.fastestDigraph ?? null,
      slowest: ks?.slowestDigraph ?? null,
      topDigraphs: (ks?.topDigraphs ?? []).slice(0, limits.digraphsInPrompt),
      bottomDigraphs: (ks?.bottomDigraphs ?? []).slice(0, limits.digraphsInPrompt),
    },
    ergonomics: {
      handBalance: {
        value: ks?.handBalance ?? null,
        rating: getHandBalanceRating(ks?.handBalance ?? null),
      },
      fingerUsage: fingerUsageWithPercentages,
      weakestFingers,
      strongestFingers,
    },
    problemAreas: {
      topMistakeKeys: analytics.mistakesHeatmap
        .slice(0, limits.mistakeKeysInPrompt)
        .map(m => ({ key: m.key, errorRate: m.errorRate })),
      commonMistakes: analytics.commonMistakes
        .slice(0, limits.commonMistakesInPrompt)
        .map(m => ({ expected: m.expectedKey, typed: m.typedKey, count: m.count })),
      slowestWords: (ks?.slowestWords ?? []).slice(0, 5),
    },
    benchmarkComparisons: {
      wpmVsAverage: {
        difference: analytics.consistency.avgWpm - benchmarks.wpm.average,
        percentile: getWpmPercentile(analytics.consistency.avgWpm),
      },
      wpmVsProfessional: {
        difference: analytics.consistency.avgWpm - benchmarks.wpm.professional,
        percentile: analytics.consistency.avgWpm >= benchmarks.wpm.professional ? "Professional level" : "Below professional",
      },
      accuracyRating: getAccuracyRating(avgAccuracy),
      consistencyRating: getConsistencyRating(dynamicThresholds.coefficientOfVariation),
    },
    trends: trendsData?.trends ? {
      weekOverWeek: trendsData.trends.improvement.weekOverWeek,
      monthOverMonth: trendsData.trends.improvement.monthOverMonth,
      allTimeImprovement: trendsData.trends.improvement.allTime.improvementPercent,
    } : null,
  };
};

function AnalyticsContent() {
  const { user, isLoading: authLoading } = useAuth();
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
    enabled: !!user,
  });

  const { data: keystrokeData } = useQuery({
    queryKey: [`/api/analytics/user?limit=${ANALYTICS_CONFIG.limits.keystrokeAnalyticsDepth}`],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/user?limit=${ANALYTICS_CONFIG.limits.keystrokeAnalyticsDepth}`, {
        credentials: "include",
      });
      if (!response.ok) return null;
      const data = await response.json();
      
      if (!data.analytics || data.analytics.length === 0) return null;
      
      const analyticsArray = data.analytics as Array<{
        avgDwellTime: number | null;
        avgFlightTime: number | null;
        consistency: number | null;
        fingerUsage: Record<string, number> | null;
        handBalance: number | null;
        keyHeatmap: Record<string, number> | null;
        wpm: number;
        accuracy: number;
        totalErrors: number;
        fastestDigraph: string | null;
        slowestDigraph: string | null;
        wpmByPosition: Array<{position: number; wpm: number}> | null;
        slowestWords: Array<{word: string; time: number}> | null;
        burstWpm: number | null;
        adjustedWpm: number | null;
        consistencyRating: number | null;
        rollingAccuracy: number[] | null;
        topDigraphs: Array<{digraph: string; avgTime: number; count: number}> | null;
        bottomDigraphs: Array<{digraph: string; avgTime: number; count: number}> | null;
        typingRhythm: number | null;
        peakPerformanceWindow: {startPos: number; endPos: number; wpm: number} | null;
        fatigueIndicator: number | null;
        errorBurstCount: number | null;
      }>;
      
      // Use the latest record (first in array, sorted by createdAt DESC) for per-test metrics
      const latest = analyticsArray[0];
      
      // Aggregate finger usage across all tests for comprehensive view
      const aggregatedFingerUsage: Record<string, number> = {};
      analyticsArray.forEach(a => {
        if (a.fingerUsage) {
          Object.entries(a.fingerUsage).forEach(([finger, count]) => {
            aggregatedFingerUsage[finger] = (aggregatedFingerUsage[finger] || 0) + (count as number);
          });
        }
      });
      
      // Aggregate key heatmap across all tests for comprehensive view
      const aggregatedKeyHeatmap: Record<string, number> = {};
      analyticsArray.forEach(a => {
        if (a.keyHeatmap) {
          Object.entries(a.keyHeatmap).forEach(([key, count]) => {
            aggregatedKeyHeatmap[key] = (aggregatedKeyHeatmap[key] || 0) + (count as number);
          });
        }
      });
      
      // Use latest record metrics but aggregated heatmap/finger data
      return {
        analytics: {
          avgDwellTime: latest.avgDwellTime,
          avgFlightTime: latest.avgFlightTime,
          consistency: latest.consistency,
          handBalance: latest.handBalance,
          fingerUsage: Object.keys(aggregatedFingerUsage).length > 0 ? aggregatedFingerUsage : latest.fingerUsage,
          keyHeatmap: Object.keys(aggregatedKeyHeatmap).length > 0 ? aggregatedKeyHeatmap : latest.keyHeatmap,
          totalTests: analyticsArray.length,
          fastestDigraph: latest.fastestDigraph,
          slowestDigraph: latest.slowestDigraph,
          wpmByPosition: latest.wpmByPosition,
          slowestWords: latest.slowestWords,
          burstWpm: latest.burstWpm,
          adjustedWpm: latest.adjustedWpm,
          consistencyRating: latest.consistencyRating,
          rollingAccuracy: latest.rollingAccuracy,
          topDigraphs: latest.topDigraphs,
          bottomDigraphs: latest.bottomDigraphs,
          typingRhythm: latest.typingRhythm,
          peakPerformanceWindow: latest.peakPerformanceWindow,
          fatigueIndicator: latest.fatigueIndicator,
          errorBurstCount: latest.errorBurstCount,
        }
      };
    },
    enabled: !!user,
  });

  const { data: trendsData, isLoading: trendsLoading } = useQuery<{ trends: HistoricalTrends }>({
    queryKey: ['/api/analytics/trends'],
    retry: ANALYTICS_CONFIG.cache.retryCount,
    staleTime: ANALYTICS_CONFIG.cache.staleTimeMs * 2,
    enabled: !!user,
  });

  const rawAnalytics = analyticsData?.analytics;
  
  const analytics = useMemo(() => {
    if (!rawAnalytics) return undefined;
    return sanitizeAnalyticsData(rawAnalytics) ?? undefined;
  }, [rawAnalytics]);
  
  const isDataValid = validateAnalyticsData(analytics);
  
  const partialDataFlags = useMemo(() => ({
    hasWpmData: (analytics?.wpmOverTime?.length ?? 0) > 0,
    hasMistakeData: (analytics?.mistakesHeatmap?.length ?? 0) > 0,
    hasCommonMistakes: (analytics?.commonMistakes?.length ?? 0) > 0,
  }), [analytics]);
  
  const hasPartialData = useMemo(() => {
    const { hasWpmData, hasMistakeData, hasCommonMistakes } = partialDataFlags;
    return hasWpmData && (!hasMistakeData || !hasCommonMistakes);
  }, [partialDataFlags]);
  
  const dynamicThresholds = useMemo(() => {
    if (!isDataValid || !analytics) return null;
    return calculateDynamicThresholds(analytics);
  }, [analytics, isDataValid]);

  const sanitizeText = useCallback((text: string): string => {
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/[^\x20-\x7E\n]/g, '')
      .trim();
  }, []);

  const deduplicateInsights = useCallback((insights: AIInsight[]): AIInsight[] => {
    const seen = new Set<string>();
    return insights.filter(insight => {
      const normalized = insight.message.toLowerCase().slice(0, 50);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }, []);

  const parseInsightsFromText = useCallback((text: string, analyticsParam: AnalyticsData): AIInsight[] => {
    const insights: AIInsight[] = [];
    const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 10);
    const thresholds = calculateDynamicThresholds(analyticsParam);
    
    const structuredPattern = /\[(\w+)\|(\w+)\|(\w+)\]\s*(.+?)(?:\s*ACTION:\s*(.+))?$/i;
    const stripLeadingPattern = /^[\d.)\-*•\s]+/;
    
    const typeMap: Record<string, AIInsight["type"]> = {
      improvement: "improvement",
      strength: "strength",
      practice: "practice",
      warning: "warning",
      milestone: "milestone",
    };
    
    const categoryMap: Record<string, AIInsight["category"]> = {
      speed: "speed",
      accuracy: "accuracy",
      rhythm: "rhythm",
      ergonomics: "ergonomics",
      technique: "technique",
      endurance: "endurance",
      general: "general",
    };
    
    const priorityMap: Record<string, AIInsight["priority"]> = {
      critical: "critical",
      high: "high",
      medium: "medium",
      low: "low",
    };
    
    for (const line of lines) {
      const cleanedLine = line.replace(stripLeadingPattern, '');
      const structuredMatch = cleanedLine.match(structuredPattern);
      
      if (structuredMatch) {
        const [, typeRaw, categoryRaw, priorityRaw, messageRaw, actionRaw] = structuredMatch;
        const type = typeMap[typeRaw.toLowerCase()] || "practice";
        const category = categoryMap[categoryRaw.toLowerCase()] || "general";
        const priority = priorityMap[priorityRaw.toLowerCase()] || "medium";
        
        let message = sanitizeText(messageRaw);
        const actionItem = actionRaw ? sanitizeText(actionRaw) : undefined;
        
        const dataPointMatch = message.match(/\(([^)]+(?:WPM|%|ms|CV)[^)]*)\)/i);
        const dataPoint = dataPointMatch ? dataPointMatch[1] : undefined;
        
        const benchmarkMatch = message.match(/(?:vs|compared to|benchmark:?\s*)([^.]+)/i);
        const benchmark = benchmarkMatch ? benchmarkMatch[1].trim() : undefined;
        
        insights.push({ type, category, message, priority, dataPoint, benchmark, actionItem });
      } else {
        const cleanLine = sanitizeText(line.replace(/^[\d.)\-*•]+\s*/, ''));
        if (cleanLine.length < 15) continue;
        
        const lowerLine = cleanLine.toLowerCase();
        
        const warningKeywords = ['warning', 'caution', 'alert', 'critical', 'fatigue', 'strain'];
        const milestoneKeywords = ['milestone', 'achieved', 'reached', 'congratulations', 'breakthrough'];
        const improvementKeywords = ['improve', 'focus', 'work on', 'reduce', 'avoid', 'weakness', 'error', 'mistake'];
        const strengthKeywords = ['strength', 'good', 'excellent', 'strong', 'well', 'consistent', 'above average'];
        const practiceKeywords = ['practice', 'exercise', 'drill', 'try', 'recommend', 'suggest', 'action'];
        
        let type: AIInsight["type"] = "practice";
        let priority: AIInsight["priority"] = "medium";
        let category: AIInsight["category"] = "general";
        
        if (warningKeywords.some(kw => lowerLine.includes(kw))) {
          type = "warning";
          priority = "critical";
          category = "endurance";
        } else if (milestoneKeywords.some(kw => lowerLine.includes(kw))) {
          type = "milestone";
          priority = "low";
          category = "general";
        } else if (improvementKeywords.some(kw => lowerLine.includes(kw))) {
          type = "improvement";
          priority = "high";
          if (lowerLine.includes("accuracy") || lowerLine.includes("error")) category = "accuracy";
          else if (lowerLine.includes("speed") || lowerLine.includes("wpm")) category = "speed";
          else if (lowerLine.includes("rhythm") || lowerLine.includes("consistent")) category = "rhythm";
        } else if (strengthKeywords.some(kw => lowerLine.includes(kw))) {
          type = "strength";
          priority = "medium";
        } else if (practiceKeywords.some(kw => lowerLine.includes(kw))) {
          type = "practice";
          priority = "medium";
          category = "technique";
        }
        
        const actionMatch = cleanLine.match(/ACTION:\s*(.+)/i);
        const actionItem = actionMatch ? actionMatch[1].trim() : undefined;
        const message = actionMatch ? cleanLine.replace(/ACTION:\s*.+/i, '').trim() : cleanLine;
        
        insights.push({ type, category, message, priority, actionItem });
      }
    }
    
    if (insights.length === 0) {
      const topMistakeKeys = analyticsParam.mistakesHeatmap
        .slice(0, ANALYTICS_CONFIG.limits.mistakeKeysInFallback)
        .map(m => m.key);
      
      if (topMistakeKeys.length > 0) {
        insights.push({
          type: "improvement",
          category: "accuracy",
          message: `Focus on keys with high error rates: ${topMistakeKeys.join(", ")}`,
          priority: "high",
          actionItem: `Practice typing words containing ${topMistakeKeys[0]} for 5 minutes daily`,
        });
      }
      
      if (thresholds.isInconsistent) {
        insights.push({
          type: "improvement",
          category: "rhythm",
          message: `Work on consistency - your WPM varies by ${thresholds.coefficientOfVariation.toFixed(0)}% between tests`,
          priority: "high",
          dataPoint: `${thresholds.coefficientOfVariation.toFixed(0)}% CV`,
          actionItem: "Complete 5 tests at 80% of your max speed to build consistency",
        });
      }
      
      const { skillLevel } = thresholds;
      if (skillLevel.level === "Beginner" || skillLevel.level === "Developing") {
        insights.push({
          type: "practice",
          category: "technique",
          message: `${skillLevel.description}. Practice daily for 15-20 minutes to build muscle memory`,
          priority: "medium",
          actionItem: "Complete at least 3 typing tests daily, focusing on accuracy over speed",
        });
      } else if (skillLevel.level === "Advanced" || skillLevel.level === "Expert") {
        insights.push({
          type: "strength",
          category: "speed",
          message: `${skillLevel.description}. Your typing speed is excellent - maintain quality with focused practice`,
          priority: "medium",
          benchmark: `Professional: 65 WPM, Elite: 100 WPM`,
        });
      } else {
        insights.push({
          type: "practice",
          category: "general",
          message: `${skillLevel.description}. Continue regular practice to improve both speed and accuracy`,
          priority: "medium",
          actionItem: "Alternate between accuracy-focused and speed-focused practice sessions",
        });
      }
    }
    
    return deduplicateInsights(insights).slice(0, ANALYTICS_CONFIG.limits.insightsDisplay);
  }, []);

  const generateAIInsights = async () => {
    if (!analytics || !dynamicThresholds) return;

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), ANALYTICS_CONFIG.ai.timeoutMs);
    
    const payload = buildComprehensiveAnalyticsPayload(analytics, keystrokeData, dynamicThresholds, trendsData);
    const { benchmarks } = ANALYTICS_CONFIG;
    
    const formatDigraphs = (digraphs: Array<{ digraph: string; avgTime: number }>) =>
      digraphs.map(d => `"${d.digraph}" (${d.avgTime.toFixed(0)}ms)`).join(", ");
    
    const formatMistakeKeys = (keys: Array<{ key: string; errorRate: number }>) =>
      keys.map(k => `"${k.key}" (${k.errorRate.toFixed(1)}% error rate)`).join(", ");
    
    const formatCommonMistakes = (mistakes: Array<{ expected: string; typed: string; count: number }>) =>
      mistakes.map(m => `"${m.expected}"→"${m.typed}" (${m.count}x)`).join(", ");
    
    setLoadingInsights(true);
    try {
      const response = await fetch("/api/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: abortController.signal,
        body: JSON.stringify({
          conversationId: null,
          message: `You are an expert typing coach analyzing detailed keystroke analytics. Provide research-backed, actionable insights.

## USER PROFILE
- Skill Level: ${payload.userProfile.skillLevel} (${payload.userProfile.skillDescription})
- Focus Area: ${payload.userProfile.focusArea}
- Tests Completed: ${payload.coreMetrics.testCount}

## CORE METRICS
- Average WPM: ${payload.coreMetrics.avgWpm.toFixed(1)} (${payload.benchmarkComparisons.wpmVsAverage.percentile})
- WPM Range: ${payload.coreMetrics.wpmRange.min} - ${payload.coreMetrics.wpmRange.max}
- Average Accuracy: ${payload.coreMetrics.avgAccuracy.toFixed(1)}% (${payload.benchmarkComparisons.accuracyRating})
- Consistency: ${payload.coreMetrics.consistency.rating} (CV: ${payload.coreMetrics.consistency.cvPercent.toFixed(1)}%)

## ADVANCED METRICS
${payload.advancedMetrics.burstWpm ? `- Burst WPM: ${payload.advancedMetrics.burstWpm.toFixed(0)} (peak short-burst speed)` : ""}
${payload.advancedMetrics.adjustedWpm ? `- Adjusted WPM: ${payload.advancedMetrics.adjustedWpm.toFixed(1)} (accuracy-weighted)` : ""}
- Typing Rhythm: ${payload.advancedMetrics.typingRhythm.rating}${payload.advancedMetrics.typingRhythm.value ? ` (CV: ${payload.advancedMetrics.typingRhythm.value.toFixed(0)}%)` : ""}
- Key Transition Speed: ${payload.advancedMetrics.timing.avgFlightTime.rating}${payload.advancedMetrics.timing.avgFlightTime.value ? ` (${payload.advancedMetrics.timing.avgFlightTime.value.toFixed(0)}ms avg)` : ""}
- Fatigue: ${payload.advancedMetrics.fatigue.rating}${payload.advancedMetrics.fatigue.indicator ? ` (${(payload.advancedMetrics.fatigue.indicator * 100).toFixed(0)}% slowdown)` : ""}
${payload.advancedMetrics.errorBurstCount ? `- Error Bursts: ${payload.advancedMetrics.errorBurstCount} clusters of consecutive errors` : ""}

## DIGRAPH ANALYSIS (Two-Key Combinations)
${payload.digraphAnalysis.fastest ? `- Fastest: "${payload.digraphAnalysis.fastest}"` : ""}
${payload.digraphAnalysis.slowest ? `- Slowest: "${payload.digraphAnalysis.slowest}"` : ""}
${payload.digraphAnalysis.topDigraphs.length > 0 ? `- Best Digraphs: ${formatDigraphs(payload.digraphAnalysis.topDigraphs)}` : ""}
${payload.digraphAnalysis.bottomDigraphs.length > 0 ? `- Struggling Digraphs: ${formatDigraphs(payload.digraphAnalysis.bottomDigraphs)}` : ""}

## ERGONOMICS
- Hand Balance: ${payload.ergonomics.handBalance.rating}${payload.ergonomics.handBalance.value ? ` (${payload.ergonomics.handBalance.value.toFixed(0)}% left hand)` : ""}
${payload.ergonomics.weakestFingers.length > 0 ? `- Weaker Fingers: ${payload.ergonomics.weakestFingers.join(", ")}` : ""}
${payload.ergonomics.strongestFingers.length > 0 ? `- Stronger Fingers: ${payload.ergonomics.strongestFingers.join(", ")}` : ""}

## PROBLEM AREAS
${payload.problemAreas.topMistakeKeys.length > 0 ? `- Error-Prone Keys: ${formatMistakeKeys(payload.problemAreas.topMistakeKeys)}` : "- No significant error-prone keys identified"}
${payload.problemAreas.commonMistakes.length > 0 ? `- Common Substitutions: ${formatCommonMistakes(payload.problemAreas.commonMistakes)}` : ""}
${payload.problemAreas.slowestWords.length > 0 ? `- Slow Words: ${payload.problemAreas.slowestWords.map(w => `"${w.word}"`).join(", ")}` : ""}

## BENCHMARKS
- Industry Average: ${benchmarks.wpm.average} WPM | Professional: ${benchmarks.wpm.professional} WPM | Elite: ${benchmarks.wpm.elite} WPM
- Your Position: ${payload.benchmarkComparisons.wpmVsAverage.difference > 0 ? `+${payload.benchmarkComparisons.wpmVsAverage.difference.toFixed(0)}` : payload.benchmarkComparisons.wpmVsAverage.difference.toFixed(0)} WPM vs average
${payload.trends ? `
## PROGRESS TRENDS
- Week-over-week: ${payload.trends.weekOverWeek.wpm > 0 ? "+" : ""}${payload.trends.weekOverWeek.wpm.toFixed(1)} WPM
- Month-over-month: ${payload.trends.monthOverMonth.wpm > 0 ? "+" : ""}${payload.trends.monthOverMonth.wpm.toFixed(1)} WPM
- All-time improvement: ${payload.trends.allTimeImprovement.toFixed(0)}%` : ""}

---

Provide exactly 10 insights. Each insight MUST be on its own line using this EXACT format (do NOT number them):

[TYPE|CATEGORY|PRIORITY] Your insight message citing a specific metric. ACTION: A specific exercise or technique.

Valid TYPE values: IMPROVEMENT, STRENGTH, PRACTICE, WARNING, MILESTONE
Valid CATEGORY values: speed, accuracy, rhythm, ergonomics, technique, endurance, general
Valid PRIORITY values: critical, high, medium, low

DISTRIBUTION:
- 3-4 IMPROVEMENT insights targeting specific weaknesses (cite error rates, slow digraphs, or rhythm issues)
- 2-3 STRENGTH insights recognizing achievements (cite metrics that exceed benchmarks)
- 2-3 PRACTICE insights with specific drills (reference problematic keys/digraphs)
- 1 WARNING if fatigue or critical issues detected, otherwise 1 MILESTONE insight

RULES:
- Start each line directly with the bracket notation [TYPE|CATEGORY|PRIORITY]
- Do NOT use numbers, bullets, or any prefix before the brackets
- Each ACTION must be specific (e.g., "Practice 'th' digraph 50 times daily" not "practice more")
- Reference industry benchmarks where relevant
- Tailor advice to ${payload.userProfile.skillLevel.toLowerCase()} skill level

EXAMPLE OUTPUT:
[IMPROVEMENT|accuracy|high] Your "e" key has a 12.5% error rate, significantly above the 5% acceptable threshold. ACTION: Complete 3 sets of 20 words containing "e" at slow speed daily.
[STRENGTH|speed|medium] Your 65 WPM average exceeds the industry average of 41 WPM by 58%. ACTION: Maintain this level with 10-minute daily practice sessions.`,
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

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]" data-testid="analytics-loading">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="analytics-login-required">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <LogIn className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Login Required</CardTitle>
            <CardDescription>
              Sign in to view your personalized typing analytics and track your progress over time.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Link href="/login">
              <Button className="w-full" data-testid="button-login">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </Link>
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Create one
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
    const isNetworkError = error instanceof Error && (
      error.message.includes('network') || 
      error.message.includes('fetch') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError')
    );
    const isTimeoutError = error instanceof Error && (
      error.message.includes('timeout') ||
      error.message.includes('Timeout') ||
      error.message.includes('aborted')
    );
    const isAuthError = error instanceof Error && (
      error.message.includes('401') ||
      error.message.includes('unauthorized') ||
      error.message.includes('Unauthorized')
    );
    
    const getErrorIcon = () => {
      if (isNetworkError) return <WifiOff className="h-4 w-4" />;
      if (isTimeoutError) return <Clock className="h-4 w-4" />;
      return <AlertTriangle className="h-4 w-4" />;
    };
    
    const getErrorTitle = () => {
      if (isNetworkError) return "Connection Problem";
      if (isTimeoutError) return "Request Timed Out";
      if (isAuthError) return "Authentication Required";
      return "Failed to Load Analytics";
    };
    
    const getErrorMessage = () => {
      if (isNetworkError) {
        return "Unable to connect to the server. Please check your internet connection and try again.";
      }
      if (isTimeoutError) {
        return "The request took too long to complete. This might be due to a slow connection or server load.";
      }
      if (isAuthError) {
        return "Your session may have expired. Please log in again to view your analytics.";
      }
      return error instanceof Error ? error.message : 'Unable to load your analytics data. Please try again.';
    };
    
    const getErrorHelp = () => {
      if (isNetworkError) {
        return "Tip: Try refreshing the page or checking if other websites are loading.";
      }
      if (isTimeoutError) {
        return "Tip: Try selecting a shorter time range (7 or 14 days) for faster loading.";
      }
      return null;
    };
    
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Alert variant="destructive" data-testid="error-alert">
          {getErrorIcon()}
          <AlertTitle>{getErrorTitle()}</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 mt-2">
            <span>{getErrorMessage()}</span>
            {getErrorHelp() && (
              <span className="text-xs opacity-80 flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                {getErrorHelp()}
              </span>
            )}
            <div className="flex gap-2 mt-1">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                data-testid="button-retry"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              {isAuthError && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => (window.location.href = "/login")}
                  data-testid="button-login"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Log In
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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

      {/* Partial Data Warning */}
      {hasPartialData && (
        <PartialDataWarning
          hasWpmData={partialDataFlags.hasWpmData}
          hasMistakeData={partialDataFlags.hasMistakeData}
          hasCommonMistakes={partialDataFlags.hasCommonMistakes}
        />
      )}

      {/* Key Metrics */}
      <TooltipProvider>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                Average WPM
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p>Words Per Minute - measures your typing speed. The average is calculated from all tests in the selected time period.</p>
                  </TooltipContent>
                </Tooltip>
              </CardDescription>
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
              <CardDescription className="flex items-center gap-1">
                Consistency
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px]">
                    <p>How stable your typing speed is. Lower variation means more consistent performance. Excellent: &lt;10% variation, Good: 10-15%, Needs Work: &gt;15%.</p>
                  </TooltipContent>
                </Tooltip>
              </CardDescription>
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
              <CardDescription className="flex items-center gap-1">
                Best WPM
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p>Your highest typing speed achieved in a single test during this time period. This is your personal record to beat!</p>
                  </TooltipContent>
                </Tooltip>
              </CardDescription>
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
              <CardDescription className="flex items-center gap-1">
                Total Tests
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p>The number of typing tests you've completed. More tests give you more accurate analytics and help track your improvement.</p>
                  </TooltipContent>
                </Tooltip>
              </CardDescription>
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
      </TooltipProvider>

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
                  <ChartTooltip content={<WPMTooltip />} />
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
                    <ChartTooltip content={<AccuracyTooltip />} />
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

          {/* Historical Trends Section */}
          <Card data-testid="card-historical-trends">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Historical Trends
              </CardTitle>
              <CardDescription>Your improvement over weeks and months</CardDescription>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <div className="flex items-center justify-center py-8" data-testid="trends-loading">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading trends...</span>
                </div>
              ) : !trendsData?.trends || (trendsData.trends.weeklyAggregates?.length ?? 0) === 0 ? (
                <div className="text-center py-8" data-testid="trends-empty">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">Not Enough Data Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Complete more typing tests over several weeks to see your improvement trends.
                  </p>
                </div>
              ) : (
                <div className="space-y-6" data-testid="trends-content">
                  {/* Improvement Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700" data-testid="trend-card-wow">
                      <p className="text-sm text-muted-foreground mb-1">Week-over-Week</p>
                      <div className="flex items-center gap-2">
                        {(trendsData.trends.improvement?.weekOverWeek?.wpm ?? 0) >= 0 ? (
                          <TrendingUp className="w-5 h-5 text-green-400" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-400" />
                        )}
                        <span className={`text-2xl font-bold ${(trendsData.trends.improvement?.weekOverWeek?.wpm ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`} data-testid="trend-wow-wpm">
                          {(trendsData.trends.improvement?.weekOverWeek?.wpm ?? 0) >= 0 ? '+' : ''}{(trendsData.trends.improvement?.weekOverWeek?.wpm ?? 0).toFixed(1)} WPM
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1" data-testid="trend-wow-accuracy">
                        Accuracy: {(trendsData.trends.improvement?.weekOverWeek?.accuracy ?? 0) >= 0 ? '+' : ''}{(trendsData.trends.improvement?.weekOverWeek?.accuracy ?? 0).toFixed(1)}%
                      </p>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700" data-testid="trend-card-mom">
                      <p className="text-sm text-muted-foreground mb-1">Month-over-Month</p>
                      <div className="flex items-center gap-2">
                        {(trendsData.trends.improvement?.monthOverMonth?.wpm ?? 0) >= 0 ? (
                          <TrendingUp className="w-5 h-5 text-green-400" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-400" />
                        )}
                        <span className={`text-2xl font-bold ${(trendsData.trends.improvement?.monthOverMonth?.wpm ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`} data-testid="trend-mom-wpm">
                          {(trendsData.trends.improvement?.monthOverMonth?.wpm ?? 0) >= 0 ? '+' : ''}{(trendsData.trends.improvement?.monthOverMonth?.wpm ?? 0).toFixed(1)} WPM
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1" data-testid="trend-mom-accuracy">
                        Accuracy: {(trendsData.trends.improvement?.monthOverMonth?.accuracy ?? 0) >= 0 ? '+' : ''}{(trendsData.trends.improvement?.monthOverMonth?.accuracy ?? 0).toFixed(1)}%
                      </p>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700" data-testid="trend-card-alltime">
                      <p className="text-sm text-muted-foreground mb-1">All-Time Improvement</p>
                      <div className="flex items-center gap-2">
                        {(trendsData.trends.improvement?.allTime?.improvementPercent ?? 0) >= 0 ? (
                          <TrendingUp className="w-5 h-5 text-cyan-400" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-orange-400" />
                        )}
                        <span className={`text-2xl font-bold ${(trendsData.trends.improvement?.allTime?.improvementPercent ?? 0) >= 0 ? 'text-cyan-400' : 'text-orange-400'}`} data-testid="trend-alltime">
                          {(trendsData.trends.improvement?.allTime?.improvementPercent ?? 0) >= 0 ? '+' : ''}{(trendsData.trends.improvement?.allTime?.improvementPercent ?? 0).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1" data-testid="trend-alltime-range">
                        {(trendsData.trends.improvement?.allTime?.firstWpm ?? 0).toFixed(0)} → {(trendsData.trends.improvement?.allTime?.currentWpm ?? 0).toFixed(0)} WPM
                      </p>
                    </div>
                  </div>

                  {/* Weekly WPM Chart */}
                  {(trendsData.trends.weeklyAggregates?.length ?? 0) > 1 && (
                    <div data-testid="weekly-chart-container">
                      <h4 className="text-sm font-medium mb-3">Weekly Average WPM</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={trendsData.trends.weeklyAggregates} aria-label="Weekly WPM Chart">
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis 
                            dataKey="weekStart" 
                            stroke="#888" 
                            tickFormatter={(val) => {
                              try { return format(parseISO(val), 'MMM d'); } catch { return val; }
                            }}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis stroke="#888" domain={['dataMin - 5', 'dataMax + 5']} />
                          <ChartTooltip 
                            content={({ active, payload }) => {
                              if (!active || !payload || !payload.length) return null;
                              const data = payload[0].payload;
                              const weekStartStr = data?.weekStart ? (() => { try { return format(parseISO(data.weekStart), 'MMM d'); } catch { return data.weekStart; } })() : 'N/A';
                              const weekEndStr = data?.weekEnd ? (() => { try { return format(parseISO(data.weekEnd), 'MMM d'); } catch { return data.weekEnd; } })() : 'N/A';
                              return (
                                <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
                                  <p className="text-sm font-medium text-white mb-1">
                                    {weekStartStr} - {weekEndStr}
                                  </p>
                                  <p className="text-sm text-cyan-400">Avg WPM: {(data?.avgWpm ?? 0).toFixed(1)}</p>
                                  <p className="text-sm text-purple-400">Best WPM: {data?.bestWpm ?? 'N/A'}</p>
                                  <p className="text-sm text-muted-foreground">{data?.testCount ?? 0} tests</p>
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="avgWpm" fill="#00ffff" radius={[4, 4, 0, 0]} name="Avg WPM" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Monthly Summary */}
                  {(trendsData.trends.monthlyAggregates?.length ?? 0) > 0 && (
                    <div data-testid="monthly-summary-container">
                      <h4 className="text-sm font-medium mb-3">Monthly Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {trendsData.trends.monthlyAggregates.slice(0, 6).map((month, idx) => {
                          const monthLabel = month?.month ? (() => { try { return format(parseISO(month.month + '-01'), 'MMM yyyy'); } catch { return month.month; } })() : 'N/A';
                          return (
                            <div key={idx} className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50" data-testid={`monthly-card-${idx}`}>
                              <p className="text-xs text-muted-foreground">{monthLabel}</p>
                              <p className="text-lg font-bold text-cyan-400" data-testid={`monthly-wpm-${idx}`}>{(month?.avgWpm ?? 0).toFixed(0)}</p>
                              <p className="text-xs text-muted-foreground" data-testid={`monthly-tests-${idx}`}>{month?.testCount ?? 0} tests</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Milestones */}
                  {(trendsData.trends.milestones?.length ?? 0) > 0 && (
                    <div data-testid="milestones-container">
                      <h4 className="text-sm font-medium mb-3">Speed Milestones</h4>
                      <div className="flex flex-wrap gap-2">
                        {trendsData.trends.milestones.map((milestone, idx) => {
                          const dateStr = milestone?.achievedAt ? (() => { try { return format(parseISO(milestone.achievedAt), 'MMM d, yyyy'); } catch { return milestone.achievedAt; } })() : 'N/A';
                          return (
                            <Badge key={idx} variant="secondary" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30" data-testid={`milestone-${idx}`}>
                              {milestone?.value ?? 0} WPM ({dateStr})
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
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

              {/* Enhanced Industry Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1">
                      Burst WPM
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px]">
                          <p>Your peak typing speed over any 5-second window. This is your burst speed potential.</p>
                        </TooltipContent>
                      </Tooltip>
                    </CardDescription>
                    <CardTitle className="text-3xl text-cyan-400" data-testid="stat-burst-wpm">
                      {keystrokeData.analytics.burstWpm ?? 'N/A'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Peak 5-second speed</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1">
                      Adjusted WPM
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px]">
                          <p>Your WPM with error penalty applied. More accurate than raw WPM for skill assessment.</p>
                        </TooltipContent>
                      </Tooltip>
                    </CardDescription>
                    <CardTitle className="text-3xl text-purple-400" data-testid="stat-adjusted-wpm">
                      {keystrokeData.analytics.adjustedWpm ?? 'N/A'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Error-adjusted speed</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1">
                      Typing Rhythm
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px]">
                          <p>How consistent your keystroke timing is. Higher = more rhythmic typing like a pro.</p>
                        </TooltipContent>
                      </Tooltip>
                    </CardDescription>
                    <CardTitle className="text-3xl text-green-400" data-testid="stat-typing-rhythm">
                      {keystrokeData.analytics.typingRhythm?.toFixed(0) ?? 'N/A'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Rhythm score (0-100)</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1">
                      Fatigue
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px]">
                          <p>Speed change from first to second half. Positive = you slowed down, negative = you warmed up.</p>
                        </TooltipContent>
                      </Tooltip>
                    </CardDescription>
                    <CardTitle className={`text-3xl ${keystrokeData.analytics.fatigueIndicator !== null && keystrokeData.analytics.fatigueIndicator > 0 ? 'text-orange-400' : 'text-green-400'}`} data-testid="stat-fatigue">
                      {keystrokeData.analytics.fatigueIndicator !== null ? `${keystrokeData.analytics.fatigueIndicator > 0 ? '+' : ''}${keystrokeData.analytics.fatigueIndicator.toFixed(0)}%` : 'N/A'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {keystrokeData.analytics.fatigueIndicator !== null && keystrokeData.analytics.fatigueIndicator > 5 
                        ? 'Slowing down' 
                        : keystrokeData.analytics.fatigueIndicator !== null && keystrokeData.analytics.fatigueIndicator < -5 
                        ? 'Warming up' 
                        : 'Steady pace'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1">
                      Rhythm Rating
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px]">
                          <p>Your typing rhythm quality based on consistency. Higher = more consistent key timing.</p>
                        </TooltipContent>
                      </Tooltip>
                    </CardDescription>
                    <CardTitle className="text-2xl" data-testid="stat-rhythm-rating">
                      {keystrokeData.analytics.consistencyRating !== null 
                        ? `${keystrokeData.analytics.consistencyRating}/100` 
                        : 'N/A'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Based on timing variance</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Error Bursts</CardDescription>
                    <CardTitle className="text-2xl" data-testid="stat-error-bursts">
                      {keystrokeData.analytics.errorBurstCount ?? 'N/A'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Consecutive error sequences</p>
                  </CardContent>
                </Card>

                {keystrokeData.analytics.peakPerformanceWindow && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Peak Performance</CardDescription>
                      <CardTitle className="text-2xl text-cyan-400" data-testid="stat-peak-performance">
                        {keystrokeData.analytics.peakPerformanceWindow.wpm} WPM
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Best 20% window (pos {keystrokeData.analytics.peakPerformanceWindow.startPos}-{keystrokeData.analytics.peakPerformanceWindow.endPos})
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Rolling Accuracy Trend */}
              {keystrokeData.analytics.rollingAccuracy && keystrokeData.analytics.rollingAccuracy.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Accuracy Throughout Test</CardTitle>
                    <CardDescription>How your accuracy changed as you typed</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={keystrokeData.analytics.rollingAccuracy.map((acc, idx) => ({
                        chunk: `${(idx + 1) * 20}%`,
                        accuracy: acc
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="chunk" stroke="#888" />
                        <YAxis stroke="#888" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <ChartTooltip 
                          contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
                          formatter={(value: number) => [`${value}%`, 'Accuracy']}
                        />
                        <Bar dataKey="accuracy" fill="#a855f7" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Top & Bottom Digraphs */}
              {(keystrokeData.analytics.topDigraphs || keystrokeData.analytics.bottomDigraphs) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {keystrokeData.analytics.topDigraphs && keystrokeData.analytics.topDigraphs.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-green-400">Fastest Digraphs</CardTitle>
                        <CardDescription>Your top 5 fastest two-key combinations</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {keystrokeData.analytics.topDigraphs.map((d, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded bg-green-500/10 border border-green-500/20">
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                                <span className="font-mono text-lg">{d.digraph}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-green-500/20">{d.avgTime}ms</Badge>
                                <span className="text-xs text-muted-foreground">{d.count}x</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {keystrokeData.analytics.bottomDigraphs && keystrokeData.analytics.bottomDigraphs.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-red-400">Slowest Digraphs</CardTitle>
                        <CardDescription>Two-key combinations that need practice</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {keystrokeData.analytics.bottomDigraphs.map((d, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded bg-red-500/10 border border-red-500/20">
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                                <span className="font-mono text-lg">{d.digraph}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-red-500/20">{d.avgTime}ms</Badge>
                                <span className="text-xs text-muted-foreground">{d.count}x</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

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
                          <ChartTooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
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
                        <LineChart data={
                          Array.isArray(keystrokeData.analytics.wpmByPosition)
                            ? keystrokeData.analytics.wpmByPosition.map((item: {position: number; wpm: number} | number, idx: number) => ({
                                position: `${typeof item === 'object' ? item.position : idx * 10}%`,
                                wpm: typeof item === 'object' ? item.wpm : item
                              }))
                            : []
                        }>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="position" stroke="#888" />
                          <YAxis stroke="#888" />
                          <ChartTooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
                          <Line type="monotone" dataKey="wpm" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {keystrokeData.analytics.slowestWords && Array.isArray(keystrokeData.analytics.slowestWords) && keystrokeData.analytics.slowestWords.length > 0 && (
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
              {(keystrokeData.analytics.fastestDigraph || keystrokeData.analytics.slowestDigraph) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Digraph Analysis</CardTitle>
                    <CardDescription>Fastest and slowest two-key combinations from your latest test</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {keystrokeData.analytics.fastestDigraph && (
                        <div>
                          <h4 className="text-sm font-semibold mb-3 text-green-500">Fastest Digraph</h4>
                          <div className="flex items-center justify-between p-3 rounded bg-green-500/10 border border-green-500/20">
                            <span className="font-mono text-lg">{keystrokeData.analytics.fastestDigraph}</span>
                            <Badge variant="outline" className="bg-green-500/20">Your fastest combo</Badge>
                          </div>
                        </div>
                      )}
                      {keystrokeData.analytics.slowestDigraph && (
                        <div>
                          <h4 className="text-sm font-semibold mb-3 text-red-500">Slowest Digraph</h4>
                          <div className="flex items-center justify-between p-3 rounded bg-red-500/10 border border-red-500/20">
                            <span className="font-mono text-lg">{keystrokeData.analytics.slowestDigraph}</span>
                            <Badge variant="outline" className="bg-red-500/20">Needs practice</Badge>
                          </div>
                        </div>
                      )}
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
                    <ChartTooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
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
                  {aiInsights.map((insight, idx) => {
                    const typeStyles = {
                      improvement: "border-orange-500/50 bg-orange-500/10",
                      strength: "border-green-500/50 bg-green-500/10",
                      practice: "border-blue-500/50 bg-blue-500/10",
                      warning: "border-red-500/50 bg-red-500/10",
                      milestone: "border-purple-500/50 bg-purple-500/10",
                    };
                    const typeLabels = {
                      improvement: "Improve",
                      strength: "Strength",
                      practice: "Practice",
                      warning: "Warning",
                      milestone: "Milestone",
                    };
                    const typeIcons = {
                      improvement: "🎯",
                      strength: "✨",
                      practice: "📚",
                      warning: "⚠️",
                      milestone: "🏆",
                    };
                    const priorityColors = {
                      critical: "bg-red-500 text-white",
                      high: "bg-orange-500 text-white",
                      medium: "bg-yellow-500 text-black",
                      low: "bg-green-500 text-white",
                    };
                    const categoryIcons: Record<string, string> = {
                      speed: "⚡",
                      accuracy: "🎯",
                      rhythm: "🎵",
                      ergonomics: "🖐️",
                      technique: "🔧",
                      endurance: "💪",
                      general: "📊",
                    };
                    
                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border ${typeStyles[insight.type]}`}
                        data-testid={`insight-${idx}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={insight.type === "improvement" || insight.type === "warning" ? "destructive" : insight.type === "strength" || insight.type === "milestone" ? "default" : "secondary"}
                              className="whitespace-nowrap"
                            >
                              {typeIcons[insight.type]} {typeLabels[insight.type]}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] px-1.5 py-0 ${priorityColors[insight.priority]}`}
                            >
                              {insight.priority.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm opacity-70">{categoryIcons[insight.category]}</span>
                              <p className="text-sm font-medium">{insight.message}</p>
                            </div>
                            {(insight.dataPoint || insight.benchmark) && (
                              <div className="flex flex-wrap gap-2 text-xs">
                                {insight.dataPoint && (
                                  <span className="px-2 py-0.5 rounded bg-slate-700/50 text-cyan-300">
                                    📈 {insight.dataPoint}
                                  </span>
                                )}
                                {insight.benchmark && (
                                  <span className="px-2 py-0.5 rounded bg-slate-700/50 text-purple-300">
                                    📊 vs {insight.benchmark}
                                  </span>
                                )}
                              </div>
                            )}
                            {insight.actionItem && (
                              <div className="mt-2 p-2 rounded bg-slate-800/50 border border-slate-700/50">
                                <p className="text-xs text-muted-foreground mb-1">Action:</p>
                                <p className="text-sm text-cyan-400">{insight.actionItem}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Click "Generate Insights" to get AI-powered recommendations</p>
                  <p className="text-xs mt-2 text-muted-foreground/70">
                    Analyzes your speed, accuracy, rhythm, and technique with industry benchmarks
                  </p>
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
