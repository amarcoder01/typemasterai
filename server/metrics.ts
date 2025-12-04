interface RollingMetric {
  values: number[];
  timestamps: number[];
  windowMs: number;
}

interface MetricsState {
  requestsPerSecond: RollingMetric;
  wsMessagesPerSecond: RollingMetric;
  dbQueriesPerSecond: RollingMetric;
  avgResponseTimeMs: RollingMetric;
  errorRate: RollingMetric;
  startTime: number;
  totalRequests: number;
  totalErrors: number;
  totalDbQueries: number;
}

const WINDOW_SIZE_MS = 60 * 1000;
const SAMPLE_INTERVAL_MS = 1000;

class MetricsCollector {
  private state: MetricsState;
  private sampleTimer: NodeJS.Timeout | null = null;
  private requestCount = 0;
  private wsMessageCount = 0;
  private dbQueryCount = 0;
  private errorCount = 0;
  private responseTimesMs: number[] = [];

  constructor() {
    this.state = {
      requestsPerSecond: this.createRollingMetric(),
      wsMessagesPerSecond: this.createRollingMetric(),
      dbQueriesPerSecond: this.createRollingMetric(),
      avgResponseTimeMs: this.createRollingMetric(),
      errorRate: this.createRollingMetric(),
      startTime: Date.now(),
      totalRequests: 0,
      totalErrors: 0,
      totalDbQueries: 0,
    };
  }

  private createRollingMetric(): RollingMetric {
    return {
      values: [],
      timestamps: [],
      windowMs: WINDOW_SIZE_MS,
    };
  }

  initialize(): void {
    if (this.sampleTimer) return;

    this.sampleTimer = setInterval(() => {
      this.sample();
    }, SAMPLE_INTERVAL_MS);

    console.log("[Metrics] Collector initialized");
  }

  private sample(): void {
    const now = Date.now();
    const cutoff = now - WINDOW_SIZE_MS;

    this.addSample(this.state.requestsPerSecond, this.requestCount, now, cutoff);
    this.addSample(this.state.wsMessagesPerSecond, this.wsMessageCount, now, cutoff);
    this.addSample(this.state.dbQueriesPerSecond, this.dbQueryCount, now, cutoff);
    this.addSample(this.state.errorRate, this.errorCount, now, cutoff);

    const avgResponseTime = this.responseTimesMs.length > 0
      ? this.responseTimesMs.reduce((a, b) => a + b, 0) / this.responseTimesMs.length
      : 0;
    this.addSample(this.state.avgResponseTimeMs, avgResponseTime, now, cutoff);

    this.state.totalRequests += this.requestCount;
    this.state.totalErrors += this.errorCount;
    this.state.totalDbQueries += this.dbQueryCount;

    this.requestCount = 0;
    this.wsMessageCount = 0;
    this.dbQueryCount = 0;
    this.errorCount = 0;
    this.responseTimesMs = [];
  }

  private addSample(metric: RollingMetric, value: number, now: number, cutoff: number): void {
    metric.values.push(value);
    metric.timestamps.push(now);

    while (metric.timestamps.length > 0 && metric.timestamps[0] < cutoff) {
      metric.timestamps.shift();
      metric.values.shift();
    }
  }

  recordRequest(): void {
    this.requestCount++;
  }

  recordWsMessage(): void {
    this.wsMessageCount++;
  }

  recordDbQuery(): void {
    this.dbQueryCount++;
  }

  recordError(): void {
    this.errorCount++;
  }

  recordResponseTime(ms: number): void {
    this.responseTimesMs.push(ms);
  }

  private getAverageFromMetric(metric: RollingMetric): number {
    if (metric.values.length === 0) return 0;
    return metric.values.reduce((a, b) => a + b, 0) / metric.values.length;
  }

  private getSumFromMetric(metric: RollingMetric): number {
    return metric.values.reduce((a, b) => a + b, 0);
  }

  getStats() {
    const uptimeMs = Date.now() - this.state.startTime;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);
    const uptimeDays = Math.floor(uptimeHours / 24);

    return {
      uptime: {
        ms: uptimeMs,
        formatted: `${uptimeDays}d ${uptimeHours % 24}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`,
      },
      rolling60s: {
        requestsPerSecond: this.getAverageFromMetric(this.state.requestsPerSecond),
        wsMessagesPerSecond: this.getAverageFromMetric(this.state.wsMessagesPerSecond),
        dbQueriesPerSecond: this.getAverageFromMetric(this.state.dbQueriesPerSecond),
        avgResponseTimeMs: this.getAverageFromMetric(this.state.avgResponseTimeMs),
        errorRate: this.getAverageFromMetric(this.state.errorRate),
        totalRequests: this.getSumFromMetric(this.state.requestsPerSecond),
        totalErrors: this.getSumFromMetric(this.state.errorRate),
      },
      lifetime: {
        totalRequests: this.state.totalRequests,
        totalErrors: this.state.totalErrors,
        totalDbQueries: this.state.totalDbQueries,
        errorPercentage: this.state.totalRequests > 0 
          ? (this.state.totalErrors / this.state.totalRequests) * 100 
          : 0,
      },
    };
  }

  shutdown(): void {
    if (this.sampleTimer) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
    console.log("[Metrics] Collector shutdown");
  }
}

export const metricsCollector = new MetricsCollector();
