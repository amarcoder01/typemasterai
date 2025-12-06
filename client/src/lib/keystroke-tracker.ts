interface KeystrokeEvent {
  key: string;
  keyCode: string;
  pressTime: number;
  releaseTime: number | null;
  dwellTime: number | null;
  flightTime: number | null;
  isCorrect: boolean;
  expectedKey: string | null;
  position: number;
  finger: string | null;
  hand: string | null;
}

interface DigraphTiming {
  digraph: string;
  avgTime: number;
  count: number;
}

interface TypingAnalytics {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number | null;
  avgDwellTime: number | null;
  avgFlightTime: number | null;
  stdDevFlightTime: number | null;
  fastestDigraph: string | null;
  slowestDigraph: string | null;
  fingerUsage: Record<string, number> | null;
  handBalance: number | null;
  totalErrors: number;
  errorsByType: Record<string, number> | null;
  errorKeys: string[] | null;
  wpmByPosition: number[] | null;
  slowestWords: string[] | null;
  keyHeatmap: Record<string, number> | null;
  testResultId: number | null;
  
  // Enhanced industry-standard metrics
  burstWpm: number | null; // Peak 5-second WPM (like Monkeytype)
  adjustedWpm: number | null; // WPM with error penalty (industry standard)
  consistencyPercentile: number | null; // Estimated percentile (0-100)
  rollingAccuracy: number[] | null; // Accuracy across 5 chunks for trend analysis
  topDigraphs: DigraphTiming[] | null; // Top 5 fastest digraphs with timing
  bottomDigraphs: DigraphTiming[] | null; // Top 5 slowest digraphs with timing
  typingRhythm: number | null; // Rhythm score based on timing variance (0-100)
  peakPerformanceWindow: { startPos: number; endPos: number; wpm: number } | null;
  fatigueIndicator: number | null; // Speed drop from first half to second half (%)
  errorBurstCount: number | null; // Number of consecutive error sequences
}

const FINGER_MAP: Record<string, { finger: string; hand: string }> = {
  // Left hand
  '`': { finger: 'Left Pinky', hand: 'left' },
  '1': { finger: 'Left Pinky', hand: 'left' },
  '2': { finger: 'Left Ring', hand: 'left' },
  '3': { finger: 'Left Middle', hand: 'left' },
  '4': { finger: 'Left Index', hand: 'left' },
  '5': { finger: 'Left Index', hand: 'left' },
  'Q': { finger: 'Left Pinky', hand: 'left' },
  'W': { finger: 'Left Ring', hand: 'left' },
  'E': { finger: 'Left Middle', hand: 'left' },
  'R': { finger: 'Left Index', hand: 'left' },
  'T': { finger: 'Left Index', hand: 'left' },
  'A': { finger: 'Left Pinky', hand: 'left' },
  'S': { finger: 'Left Ring', hand: 'left' },
  'D': { finger: 'Left Middle', hand: 'left' },
  'F': { finger: 'Left Index', hand: 'left' },
  'G': { finger: 'Left Index', hand: 'left' },
  'Z': { finger: 'Left Pinky', hand: 'left' },
  'X': { finger: 'Left Ring', hand: 'left' },
  'C': { finger: 'Left Middle', hand: 'left' },
  'V': { finger: 'Left Index', hand: 'left' },
  'B': { finger: 'Left Index', hand: 'left' },
  
  // Right hand
  '6': { finger: 'Right Index', hand: 'right' },
  '7': { finger: 'Right Index', hand: 'right' },
  '8': { finger: 'Right Middle', hand: 'right' },
  '9': { finger: 'Right Ring', hand: 'right' },
  '0': { finger: 'Right Pinky', hand: 'right' },
  '-': { finger: 'Right Pinky', hand: 'right' },
  '=': { finger: 'Right Pinky', hand: 'right' },
  'Y': { finger: 'Right Index', hand: 'right' },
  'U': { finger: 'Right Index', hand: 'right' },
  'I': { finger: 'Right Middle', hand: 'right' },
  'O': { finger: 'Right Ring', hand: 'right' },
  'P': { finger: 'Right Pinky', hand: 'right' },
  '[': { finger: 'Right Pinky', hand: 'right' },
  ']': { finger: 'Right Pinky', hand: 'right' },
  '\\': { finger: 'Right Pinky', hand: 'right' },
  'H': { finger: 'Right Index', hand: 'right' },
  'J': { finger: 'Right Index', hand: 'right' },
  'K': { finger: 'Right Middle', hand: 'right' },
  'L': { finger: 'Right Ring', hand: 'right' },
  ';': { finger: 'Right Pinky', hand: 'right' },
  '\'': { finger: 'Right Pinky', hand: 'right' },
  'N': { finger: 'Right Index', hand: 'right' },
  'M': { finger: 'Right Index', hand: 'right' },
  ',': { finger: 'Right Middle', hand: 'right' },
  '.': { finger: 'Right Ring', hand: 'right' },
  '/': { finger: 'Right Pinky', hand: 'right' },
  ' ': { finger: 'Thumbs', hand: 'both' },
};

export class KeystrokeTracker {
  private events: KeystrokeEvent[] = [];
  private pressedKeys: Map<string, number> = new Map();
  private lastReleaseTime: number | null = null;
  public expectedText: string = '';
  public currentPosition: number = 0;

  constructor(expectedText: string) {
    this.expectedText = expectedText;
  }

  onKeyDown(key: string, keyCode: string, timestamp: number) {
    if (!this.pressedKeys.has(key)) {
      this.pressedKeys.set(key, timestamp);
    }
  }

  onKeyUp(key: string, keyCode: string, timestamp: number, isCorrect: boolean) {
    const pressTime = this.pressedKeys.get(key);
    if (!pressTime) return;

    const dwellTime = timestamp - pressTime;
    const flightTime = this.lastReleaseTime ? pressTime - this.lastReleaseTime : null;
    const expectedKey = this.expectedText[this.currentPosition] || null;
    
    const fingerInfo = FINGER_MAP[key.toUpperCase()] || { finger: null, hand: null };

    const event: KeystrokeEvent = {
      key,
      keyCode,
      pressTime,
      releaseTime: timestamp,
      dwellTime,
      flightTime,
      isCorrect,
      expectedKey,
      position: this.currentPosition,
      ...fingerInfo,
    };

    this.events.push(event);
    this.pressedKeys.delete(key);
    this.lastReleaseTime = timestamp;
    
    // Don't auto-increment position - let the component manage it
    // based on actual input state
  }

  computeAnalytics(wpm: number, rawWpm: number, accuracy: number, totalErrors: number, testResultId: number | null = null): TypingAnalytics {
    if (this.events.length === 0) {
      return {
        wpm,
        rawWpm,
        accuracy,
        consistency: null,
        avgDwellTime: null,
        avgFlightTime: null,
        stdDevFlightTime: null,
        fastestDigraph: null,
        slowestDigraph: null,
        fingerUsage: null,
        handBalance: null,
        totalErrors,
        errorsByType: null,
        errorKeys: null,
        wpmByPosition: null,
        slowestWords: null,
        keyHeatmap: null,
        testResultId,
        burstWpm: null,
        adjustedWpm: null,
        consistencyPercentile: null,
        rollingAccuracy: null,
        topDigraphs: null,
        bottomDigraphs: null,
        typingRhythm: null,
        peakPerformanceWindow: null,
        fatigueIndicator: null,
        errorBurstCount: null,
      };
    }

    // Calculate dwell and flight times
    const dwellTimes = this.events.filter(e => e.dwellTime !== null).map(e => e.dwellTime!);
    const flightTimes = this.events.filter(e => e.flightTime !== null).map(e => e.flightTime!);
    
    const avgDwellTime = dwellTimes.length > 0 ? dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length : null;
    const avgFlightTime = flightTimes.length > 0 ? flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length : null;
    
    // Calculate std dev of flight times for consistency
    let stdDevFlightTime = null;
    if (flightTimes.length > 1 && avgFlightTime !== null) {
      const variance = flightTimes.reduce((sum, time) => sum + Math.pow(time - avgFlightTime, 2), 0) / flightTimes.length;
      stdDevFlightTime = Math.sqrt(variance);
    }

    // Consistency score (inverse coefficient of variation, 0-100)
    const consistency = avgFlightTime && stdDevFlightTime 
      ? Math.max(0, Math.min(100, 100 - (stdDevFlightTime / avgFlightTime) * 100))
      : null;

    // Build keyboard heatmap
    const keyHeatmap: Record<string, number> = {};
    this.events.forEach(event => {
      const upperKey = event.key.toUpperCase();
      keyHeatmap[upperKey] = (keyHeatmap[upperKey] || 0) + 1;
    });

    // Finger usage
    const fingerUsage: Record<string, number> = {};
    this.events.forEach(event => {
      if (event.finger) {
        fingerUsage[event.finger] = (fingerUsage[event.finger] || 0) + 1;
      }
    });

    // Hand balance
    const leftCount = this.events.filter(e => e.hand === 'left').length;
    const rightCount = this.events.filter(e => e.hand === 'right').length;
    const totalHands = leftCount + rightCount;
    const handBalance = totalHands > 0 ? (leftCount / totalHands) * 100 : null;

    // Error analysis
    const errors = this.events.filter(e => !e.isCorrect);
    const errorKeysSet = new Set(errors.map(e => e.expectedKey).filter(k => k !== null));
    const errorKeys = Array.from(errorKeysSet) as string[];
    
    const errorsByType: Record<string, number> = {
      substitution: 0,
      adjacent: 0,
      doublet: 0,
      other: 0,
    };

    errors.forEach(event => {
      if (!event.expectedKey) {
        errorsByType.other++;
        return;
      }
      
      // Simple error classification
      if (event.key === event.expectedKey) {
        errorsByType.doublet++;
      } else {
        errorsByType.substitution++;
      }
    });

    // Digraph analysis (two-key combinations)
    const digraphs: Map<string, number[]> = new Map();
    for (let i = 1; i < this.events.length; i++) {
      const prev = this.events[i - 1];
      const curr = this.events[i];
      if (prev.releaseTime && curr.pressTime) {
        const digraph = prev.key + curr.key;
        const time = curr.pressTime - prev.releaseTime;
        if (!digraphs.has(digraph)) {
          digraphs.set(digraph, []);
        }
        digraphs.get(digraph)!.push(time);
      }
    }

    let fastestDigraph = null;
    let slowestDigraph = null;
    let minTime = Infinity;
    let maxTime = -Infinity;

    digraphs.forEach((times, digraph) => {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      if (avgTime < minTime) {
        minTime = avgTime;
        fastestDigraph = digraph;
      }
      if (avgTime > maxTime) {
        maxTime = avgTime;
        slowestDigraph = digraph;
      }
    });

    // Calculate WPM by position (divide text into 10 chunks)
    const wpmByPosition = this.calculateWpmByPosition();

    // Identify slowest words
    const slowestWords = this.calculateSlowestWords();

    // === ENHANCED INDUSTRY-STANDARD METRICS ===
    
    // 1. Burst WPM - Peak 5-second performance window (like Monkeytype)
    const burstWpm = this.calculateBurstWpm();
    
    // 2. Adjusted WPM - Industry standard: (raw WPM - errors) or (correct chars / 5) / minutes
    // More accurate than simple net WPM as it penalizes errors more heavily
    const adjustedWpm = Math.max(0, Math.round(rawWpm - (totalErrors * 0.5)));
    
    // 3. Rolling Accuracy - Accuracy across 5 chunks for trend analysis
    const rollingAccuracy = this.calculateRollingAccuracy();
    
    // 4. Enhanced Digraph Analysis - Top 5 fastest and slowest with timings
    const digraphAnalysis = this.calculateEnhancedDigraphs(digraphs);
    const topDigraphs = digraphAnalysis.top;
    const bottomDigraphs = digraphAnalysis.bottom;
    
    // 5. Typing Rhythm Score - Based on interkey timing variance (0-100)
    // Lower variance = better rhythm = higher score
    const typingRhythm = this.calculateTypingRhythm(flightTimes);
    
    // 6. Peak Performance Window - Best consecutive 20% of the test
    const peakPerformanceWindow = this.calculatePeakPerformance();
    
    // 7. Fatigue Indicator - Speed drop from first half to second half (%)
    const fatigueIndicator = this.calculateFatigueIndicator();
    
    // 8. Error Burst Count - Consecutive error sequences (indicates struggle points)
    const errorBurstCount = this.calculateErrorBurstCount();
    
    // 9. Consistency Percentile - Estimated ranking based on consistency score
    // Based on typical distribution: 90+ = top 10%, 80-90 = top 25%, etc.
    const consistencyPercentile = consistency !== null 
      ? this.estimateConsistencyPercentile(consistency)
      : null;

    return {
      wpm,
      rawWpm,
      accuracy,
      consistency,
      avgDwellTime,
      avgFlightTime,
      stdDevFlightTime,
      fastestDigraph,
      slowestDigraph,
      fingerUsage,
      handBalance,
      totalErrors,
      errorsByType,
      errorKeys,
      wpmByPosition,
      slowestWords,
      keyHeatmap,
      testResultId,
      burstWpm,
      adjustedWpm,
      consistencyPercentile,
      rollingAccuracy,
      topDigraphs,
      bottomDigraphs,
      typingRhythm,
      peakPerformanceWindow,
      fatigueIndicator,
      errorBurstCount,
    };
  }
  
  // Calculate peak 5-second WPM (burst speed)
  private calculateBurstWpm(): number | null {
    if (this.events.length < 20) return null;
    
    const windowMs = 5000; // 5 seconds
    let maxBurstWpm = 0;
    
    for (let i = 0; i < this.events.length; i++) {
      const windowStart = this.events[i].pressTime;
      let windowEnd = windowStart + windowMs;
      let charsInWindow = 0;
      
      for (let j = i; j < this.events.length; j++) {
        if (this.events[j].pressTime > windowEnd) break;
        if (this.events[j].isCorrect) charsInWindow++;
      }
      
      // WPM = (chars / 5) / (minutes)
      const burstWpm = Math.round((charsInWindow / 5) / (windowMs / 60000));
      if (burstWpm > maxBurstWpm) maxBurstWpm = burstWpm;
    }
    
    return maxBurstWpm > 0 ? Math.min(maxBurstWpm, 300) : null; // Cap at 300 WPM
  }
  
  // Calculate accuracy across 5 chunks for trend analysis
  private calculateRollingAccuracy(): number[] | null {
    if (this.events.length < 10) return null;
    
    const numChunks = 5;
    const chunkSize = Math.ceil(this.events.length / numChunks);
    const rollingAccuracy: number[] = [];
    
    for (let i = 0; i < numChunks; i++) {
      const startIdx = i * chunkSize;
      const endIdx = Math.min((i + 1) * chunkSize, this.events.length);
      const chunkEvents = this.events.slice(startIdx, endIdx);
      
      if (chunkEvents.length === 0) {
        rollingAccuracy.push(0);
        continue;
      }
      
      const correct = chunkEvents.filter(e => e.isCorrect).length;
      const acc = Math.round((correct / chunkEvents.length) * 100);
      rollingAccuracy.push(acc);
    }
    
    return rollingAccuracy;
  }
  
  // Enhanced digraph analysis with top 5 fastest and slowest
  private calculateEnhancedDigraphs(digraphs: Map<string, number[]>): { top: DigraphTiming[] | null; bottom: DigraphTiming[] | null } {
    if (digraphs.size < 5) return { top: null, bottom: null };
    
    const digraphStats: DigraphTiming[] = [];
    
    digraphs.forEach((times, digraph) => {
      if (times.length >= 2) { // Only consider digraphs with multiple occurrences
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        digraphStats.push({ digraph, avgTime: Math.round(avgTime), count: times.length });
      }
    });
    
    if (digraphStats.length < 5) return { top: null, bottom: null };
    
    // Sort by average time
    digraphStats.sort((a, b) => a.avgTime - b.avgTime);
    
    const top = digraphStats.slice(0, 5);
    const bottom = digraphStats.slice(-5).reverse();
    
    return { top, bottom };
  }
  
  // Typing rhythm score based on interkey timing variance
  private calculateTypingRhythm(flightTimes: number[]): number | null {
    if (flightTimes.length < 10) return null;
    
    // Filter out outliers (> 500ms pauses are likely not typing rhythm)
    const filteredTimes = flightTimes.filter(t => t > 0 && t < 500);
    if (filteredTimes.length < 10) return null;
    
    const mean = filteredTimes.reduce((a, b) => a + b, 0) / filteredTimes.length;
    const variance = filteredTimes.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / filteredTimes.length;
    const stdDev = Math.sqrt(variance);
    
    // Coefficient of variation - lower is better rhythm
    const cv = (stdDev / mean) * 100;
    
    // Convert to 0-100 score where 100 is perfect rhythm
    // CV of 20% = 80 score, CV of 50% = 50 score, CV of 100% = 0 score
    const rhythmScore = Math.max(0, Math.min(100, 100 - cv));
    
    return Math.round(rhythmScore);
  }
  
  // Find the best performing 20% window of the test
  private calculatePeakPerformance(): { startPos: number; endPos: number; wpm: number } | null {
    if (this.events.length < 20) return null;
    
    const windowSize = Math.ceil(this.events.length * 0.2);
    let bestWindow = { startPos: 0, endPos: 0, wpm: 0 };
    
    for (let i = 0; i <= this.events.length - windowSize; i++) {
      const windowEvents = this.events.slice(i, i + windowSize);
      
      const firstEvent = windowEvents[0];
      const lastEvent = windowEvents[windowEvents.length - 1];
      
      if (!firstEvent.pressTime || !lastEvent.releaseTime) continue;
      
      const durationMs = lastEvent.releaseTime - firstEvent.pressTime;
      if (durationMs <= 0) continue;
      
      const correctChars = windowEvents.filter(e => e.isCorrect).length;
      const windowWpm = Math.round((correctChars / 5) / (durationMs / 60000));
      
      if (windowWpm > bestWindow.wpm) {
        bestWindow = {
          startPos: firstEvent.position,
          endPos: lastEvent.position,
          wpm: Math.min(windowWpm, 300)
        };
      }
    }
    
    return bestWindow.wpm > 0 ? bestWindow : null;
  }
  
  // Calculate speed drop from first half to second half (fatigue indicator)
  private calculateFatigueIndicator(): number | null {
    if (this.events.length < 20) return null;
    
    const midpoint = Math.floor(this.events.length / 2);
    const firstHalf = this.events.slice(0, midpoint);
    const secondHalf = this.events.slice(midpoint);
    
    const calculateHalfWpm = (events: KeystrokeEvent[]): number => {
      if (events.length < 5) return 0;
      const first = events[0];
      const last = events[events.length - 1];
      if (!first.pressTime || !last.releaseTime) return 0;
      const durationMs = last.releaseTime - first.pressTime;
      if (durationMs <= 0) return 0;
      const correctChars = events.filter(e => e.isCorrect).length;
      return (correctChars / 5) / (durationMs / 60000);
    };
    
    const firstHalfWpm = calculateHalfWpm(firstHalf);
    const secondHalfWpm = calculateHalfWpm(secondHalf);
    
    if (firstHalfWpm === 0) return null;
    
    // Positive = fatigue (slowed down), Negative = warmed up (sped up)
    const speedChange = ((firstHalfWpm - secondHalfWpm) / firstHalfWpm) * 100;
    
    return Math.round(speedChange);
  }
  
  // Count consecutive error sequences (error bursts)
  private calculateErrorBurstCount(): number | null {
    if (this.events.length < 10) return null;
    
    let burstCount = 0;
    let inBurst = false;
    
    for (const event of this.events) {
      if (!event.isCorrect) {
        if (!inBurst) {
          burstCount++;
          inBurst = true;
        }
      } else {
        inBurst = false;
      }
    }
    
    return burstCount;
  }
  
  // Estimate consistency percentile based on typical distribution
  private estimateConsistencyPercentile(consistency: number): number {
    // Based on typical typing test data distribution
    if (consistency >= 95) return 99;
    if (consistency >= 90) return 95;
    if (consistency >= 85) return 85;
    if (consistency >= 80) return 75;
    if (consistency >= 75) return 60;
    if (consistency >= 70) return 50;
    if (consistency >= 60) return 35;
    if (consistency >= 50) return 20;
    return 10;
  }

  private calculateWpmByPosition(): number[] | null {
    if (this.events.length < 10) return null;

    const numChunks = 10;
    const chunkSize = Math.ceil(this.events.length / numChunks);
    const wpmByPosition: number[] = [];

    for (let i = 0; i < numChunks; i++) {
      const startIdx = i * chunkSize;
      const endIdx = Math.min((i + 1) * chunkSize, this.events.length);
      const chunkEvents = this.events.slice(startIdx, endIdx);

      if (chunkEvents.length < 2) {
        wpmByPosition.push(0);
        continue;
      }

      const firstEvent = chunkEvents[0];
      const lastEvent = chunkEvents[chunkEvents.length - 1];
      
      if (!firstEvent.pressTime || !lastEvent.releaseTime) {
        wpmByPosition.push(0);
        continue;
      }

      const chunkDuration = (lastEvent.releaseTime - firstEvent.pressTime) / 1000 / 60; // in minutes
      if (chunkDuration <= 0) {
        wpmByPosition.push(0);
        continue;
      }

      const correctChars = chunkEvents.filter(e => e.isCorrect).length;
      const chunkWpm = Math.round((correctChars / 5) / chunkDuration);
      wpmByPosition.push(Math.min(chunkWpm, 300)); // Cap at 300 WPM for sanity
    }

    return wpmByPosition.length > 0 ? wpmByPosition : null;
  }

  private calculateSlowestWords(): string[] | null {
    if (this.events.length < 5 || !this.expectedText) return null;

    // Split expected text into words
    const words = this.expectedText.split(/\s+/);
    if (words.length < 2) return null;

    // Map events to word boundaries
    const wordTimings: { word: string; startTime: number; endTime: number; duration: number }[] = [];
    let currentWordIndex = 0;
    let currentWordStart = 0;
    let charPosition = 0;

    // Find character positions for each word
    const wordPositions: { word: string; startPos: number; endPos: number }[] = [];
    let pos = 0;
    for (const word of words) {
      wordPositions.push({
        word,
        startPos: pos,
        endPos: pos + word.length - 1
      });
      pos += word.length + 1; // +1 for space
    }

    // Calculate timing for each word based on keystroke events
    for (const wp of wordPositions) {
      const wordEvents = this.events.filter(e => e.position >= wp.startPos && e.position <= wp.endPos);
      
      if (wordEvents.length < 2) continue;

      const startTime = wordEvents[0].pressTime;
      const lastEvent = wordEvents[wordEvents.length - 1];
      const endTime = lastEvent.releaseTime || lastEvent.pressTime;

      if (startTime && endTime && endTime > startTime) {
        wordTimings.push({
          word: wp.word,
          startTime,
          endTime,
          duration: endTime - startTime
        });
      }
    }

    if (wordTimings.length < 3) return null;

    // Calculate average word duration
    const avgDuration = wordTimings.reduce((sum, w) => sum + w.duration, 0) / wordTimings.length;

    // Find words slower than average (sorted by how much slower)
    const slowWords = wordTimings
      .filter(w => w.duration > avgDuration * 1.3) // 30% slower than average
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10) // Top 10 slowest
      .map(w => w.word);

    return slowWords.length > 0 ? slowWords : null;
  }

  getEvents(): KeystrokeEvent[] {
    return this.events;
  }

  reset() {
    this.events = [];
    this.pressedKeys.clear();
    this.lastReleaseTime = null;
    this.currentPosition = 0;
  }
}
