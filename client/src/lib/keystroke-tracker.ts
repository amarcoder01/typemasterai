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

interface AntiCheatValidation {
  isSuspicious: boolean;
  suspiciousFlags: string[] | null;
  validationScore: number;
  minKeystrokeInterval: number | null;
  keystrokeVariance: number | null;
  syntheticInputDetected: boolean;
}

const ANTICHEAT_THRESHOLDS = {
  MIN_KEYSTROKE_INTERVAL_MS: 10,
  SUSPECT_INTERVAL_MS: 25,
  MAX_WPM_WITHOUT_FLAG: 200,
  MAX_CONSISTENT_VARIANCE: 5,
  MIN_KEYSTROKES_FOR_ANALYSIS: 20,
  BURST_WINDOW_SIZE: 10,
  BURST_THRESHOLD_RATIO: 0.8,
  PERFECT_RHYTHM_THRESHOLD: 0.95,
  SUSPICIOUS_FLAG_THRESHOLD: 2,
} as const;

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
  consistencyRating: number | null; // Rhythm rating based on timing consistency (0-100)
  rollingAccuracy: number[] | null; // Accuracy across 5 chunks for trend analysis
  topDigraphs: DigraphTiming[] | null; // Top 5 fastest digraphs with timing
  bottomDigraphs: DigraphTiming[] | null; // Top 5 slowest digraphs with timing
  typingRhythm: number | null; // Rhythm score based on timing variance (0-100)
  peakPerformanceWindow: { startPos: number; endPos: number; wpm: number } | null;
  fatigueIndicator: number | null; // Speed drop from first half to second half (%)
  errorBurstCount: number | null; // Number of consecutive error sequences
  
  // Anti-Cheat Validation
  isSuspicious: boolean;
  suspiciousFlags: string[] | null;
  validationScore: number | null;
  minKeystrokeInterval: number | null;
  keystrokeVariance: number | null;
  syntheticInputDetected: boolean;
}

const CODE_FINGER_MAP: Record<string, { finger: string; hand: string }> = {
  // Left hand - Number row
  'Backquote': { finger: 'Left Pinky', hand: 'left' },
  'Digit1': { finger: 'Left Pinky', hand: 'left' },
  'Digit2': { finger: 'Left Ring', hand: 'left' },
  'Digit3': { finger: 'Left Middle', hand: 'left' },
  'Digit4': { finger: 'Left Index', hand: 'left' },
  'Digit5': { finger: 'Left Index', hand: 'left' },
  // Left hand - Top row
  'KeyQ': { finger: 'Left Pinky', hand: 'left' },
  'KeyW': { finger: 'Left Ring', hand: 'left' },
  'KeyE': { finger: 'Left Middle', hand: 'left' },
  'KeyR': { finger: 'Left Index', hand: 'left' },
  'KeyT': { finger: 'Left Index', hand: 'left' },
  // Left hand - Home row
  'KeyA': { finger: 'Left Pinky', hand: 'left' },
  'KeyS': { finger: 'Left Ring', hand: 'left' },
  'KeyD': { finger: 'Left Middle', hand: 'left' },
  'KeyF': { finger: 'Left Index', hand: 'left' },
  'KeyG': { finger: 'Left Index', hand: 'left' },
  // Left hand - Bottom row
  'KeyZ': { finger: 'Left Pinky', hand: 'left' },
  'KeyX': { finger: 'Left Ring', hand: 'left' },
  'KeyC': { finger: 'Left Middle', hand: 'left' },
  'KeyV': { finger: 'Left Index', hand: 'left' },
  'KeyB': { finger: 'Left Index', hand: 'left' },
  // Left hand - Control keys
  'Tab': { finger: 'Left Pinky', hand: 'left' },
  'CapsLock': { finger: 'Left Pinky', hand: 'left' },
  'ShiftLeft': { finger: 'Left Pinky', hand: 'left' },
  'ControlLeft': { finger: 'Left Pinky', hand: 'left' },
  'AltLeft': { finger: 'Left Thumb', hand: 'left' },
  'MetaLeft': { finger: 'Left Thumb', hand: 'left' },
  'Escape': { finger: 'Left Pinky', hand: 'left' },
  
  // Right hand - Number row
  'Digit6': { finger: 'Right Index', hand: 'right' },
  'Digit7': { finger: 'Right Index', hand: 'right' },
  'Digit8': { finger: 'Right Middle', hand: 'right' },
  'Digit9': { finger: 'Right Ring', hand: 'right' },
  'Digit0': { finger: 'Right Pinky', hand: 'right' },
  'Minus': { finger: 'Right Pinky', hand: 'right' },
  'Equal': { finger: 'Right Pinky', hand: 'right' },
  'Backspace': { finger: 'Right Pinky', hand: 'right' },
  // Right hand - Top row
  'KeyY': { finger: 'Right Index', hand: 'right' },
  'KeyU': { finger: 'Right Index', hand: 'right' },
  'KeyI': { finger: 'Right Middle', hand: 'right' },
  'KeyO': { finger: 'Right Ring', hand: 'right' },
  'KeyP': { finger: 'Right Pinky', hand: 'right' },
  'BracketLeft': { finger: 'Right Pinky', hand: 'right' },
  'BracketRight': { finger: 'Right Pinky', hand: 'right' },
  'Backslash': { finger: 'Right Pinky', hand: 'right' },
  // Right hand - Home row
  'KeyH': { finger: 'Right Index', hand: 'right' },
  'KeyJ': { finger: 'Right Index', hand: 'right' },
  'KeyK': { finger: 'Right Middle', hand: 'right' },
  'KeyL': { finger: 'Right Ring', hand: 'right' },
  'Semicolon': { finger: 'Right Pinky', hand: 'right' },
  'Quote': { finger: 'Right Pinky', hand: 'right' },
  'Enter': { finger: 'Right Pinky', hand: 'right' },
  // Right hand - Bottom row
  'KeyN': { finger: 'Right Index', hand: 'right' },
  'KeyM': { finger: 'Right Index', hand: 'right' },
  'Comma': { finger: 'Right Middle', hand: 'right' },
  'Period': { finger: 'Right Ring', hand: 'right' },
  'Slash': { finger: 'Right Pinky', hand: 'right' },
  'ShiftRight': { finger: 'Right Pinky', hand: 'right' },
  // Right hand - Control keys
  'ControlRight': { finger: 'Right Pinky', hand: 'right' },
  'AltRight': { finger: 'Right Thumb', hand: 'right' },
  'MetaRight': { finger: 'Right Thumb', hand: 'right' },
  'ArrowUp': { finger: 'Right Index', hand: 'right' },
  'ArrowDown': { finger: 'Right Index', hand: 'right' },
  'ArrowLeft': { finger: 'Right Index', hand: 'right' },
  'ArrowRight': { finger: 'Right Index', hand: 'right' },
  
  // Space bar - Thumbs (counted as both hands for balance)
  'Space': { finger: 'Thumbs', hand: 'both' },
};

const CHAR_FINGER_MAP: Record<string, { finger: string; hand: string }> = {
  // Left hand characters (including shifted)
  '`': { finger: 'Left Pinky', hand: 'left' },
  '~': { finger: 'Left Pinky', hand: 'left' },
  '1': { finger: 'Left Pinky', hand: 'left' },
  '!': { finger: 'Left Pinky', hand: 'left' },
  '2': { finger: 'Left Ring', hand: 'left' },
  '@': { finger: 'Left Ring', hand: 'left' },
  '3': { finger: 'Left Middle', hand: 'left' },
  '#': { finger: 'Left Middle', hand: 'left' },
  '4': { finger: 'Left Index', hand: 'left' },
  '$': { finger: 'Left Index', hand: 'left' },
  '5': { finger: 'Left Index', hand: 'left' },
  '%': { finger: 'Left Index', hand: 'left' },
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
  
  // Right hand characters (including shifted)
  '6': { finger: 'Right Index', hand: 'right' },
  '^': { finger: 'Right Index', hand: 'right' },
  '7': { finger: 'Right Index', hand: 'right' },
  '&': { finger: 'Right Index', hand: 'right' },
  '8': { finger: 'Right Middle', hand: 'right' },
  '*': { finger: 'Right Middle', hand: 'right' },
  '9': { finger: 'Right Ring', hand: 'right' },
  '(': { finger: 'Right Ring', hand: 'right' },
  '0': { finger: 'Right Pinky', hand: 'right' },
  ')': { finger: 'Right Pinky', hand: 'right' },
  '-': { finger: 'Right Pinky', hand: 'right' },
  '_': { finger: 'Right Pinky', hand: 'right' },
  '=': { finger: 'Right Pinky', hand: 'right' },
  '+': { finger: 'Right Pinky', hand: 'right' },
  'Y': { finger: 'Right Index', hand: 'right' },
  'U': { finger: 'Right Index', hand: 'right' },
  'I': { finger: 'Right Middle', hand: 'right' },
  'O': { finger: 'Right Ring', hand: 'right' },
  'P': { finger: 'Right Pinky', hand: 'right' },
  '[': { finger: 'Right Pinky', hand: 'right' },
  '{': { finger: 'Right Pinky', hand: 'right' },
  ']': { finger: 'Right Pinky', hand: 'right' },
  '}': { finger: 'Right Pinky', hand: 'right' },
  '\\': { finger: 'Right Pinky', hand: 'right' },
  '|': { finger: 'Right Pinky', hand: 'right' },
  'H': { finger: 'Right Index', hand: 'right' },
  'J': { finger: 'Right Index', hand: 'right' },
  'K': { finger: 'Right Middle', hand: 'right' },
  'L': { finger: 'Right Ring', hand: 'right' },
  ';': { finger: 'Right Pinky', hand: 'right' },
  ':': { finger: 'Right Pinky', hand: 'right' },
  '\'': { finger: 'Right Pinky', hand: 'right' },
  '"': { finger: 'Right Pinky', hand: 'right' },
  'N': { finger: 'Right Index', hand: 'right' },
  'M': { finger: 'Right Index', hand: 'right' },
  ',': { finger: 'Right Middle', hand: 'right' },
  '<': { finger: 'Right Middle', hand: 'right' },
  '.': { finger: 'Right Ring', hand: 'right' },
  '>': { finger: 'Right Ring', hand: 'right' },
  '/': { finger: 'Right Pinky', hand: 'right' },
  '?': { finger: 'Right Pinky', hand: 'right' },
  
  // Space bar
  ' ': { finger: 'Thumbs', hand: 'both' },
};

const getFingerInfo = (key: string, keyCode: string): { finger: string | null; hand: string | null } => {
  if (CODE_FINGER_MAP[keyCode]) {
    return CODE_FINGER_MAP[keyCode];
  }
  if (CHAR_FINGER_MAP[key.toUpperCase()]) {
    return CHAR_FINGER_MAP[key.toUpperCase()];
  }
  if (CHAR_FINGER_MAP[key]) {
    return CHAR_FINGER_MAP[key];
  }
  return { finger: null, hand: null };
};

const FINGER_MAP: Record<string, { finger: string; hand: string }> = CHAR_FINGER_MAP;

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

  onKeyUp(
    key: string,
    keyCode: string,
    timestamp: number,
    isCorrect: boolean,
    expectedKeyOverride?: string | null,
    positionOverride?: number
  ) {
    const pressTime = this.pressedKeys.get(key);
    if (!pressTime) return;

    const dwellTime = timestamp - pressTime;
    const flightTime = this.lastReleaseTime ? pressTime - this.lastReleaseTime : null;
    const expectedKey = (typeof expectedKeyOverride !== 'undefined')
      ? (expectedKeyOverride === null ? null : expectedKeyOverride)
      : (this.expectedText[this.currentPosition] || null);
    
    const fingerInfo = getFingerInfo(key, keyCode);

    const event: KeystrokeEvent = {
      key,
      keyCode,
      pressTime,
      releaseTime: timestamp,
      dwellTime,
      flightTime,
      isCorrect,
      expectedKey,
      position: typeof positionOverride === 'number' ? positionOverride : this.currentPosition,
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
        consistencyRating: null,
        rollingAccuracy: null,
        topDigraphs: null,
        bottomDigraphs: null,
        typingRhythm: null,
        peakPerformanceWindow: null,
        fatigueIndicator: null,
        errorBurstCount: null,
        isSuspicious: false,
        suspiciousFlags: null,
        validationScore: null,
        minKeystrokeInterval: null,
        keystrokeVariance: null,
        syntheticInputDetected: false,
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
    // Filter out long pauses (> 1000ms) for a more accurate consistency score
    // Use dynamic threshold based on average speed - slower typists naturally have longer flight times
    let consistency: number | null = null;
    if (flightTimes.length >= 2) {
      // Use a generous 1000ms threshold first, then fall back to unfiltered if needed
      const outlierThreshold = 1000;
      let timesToUse = flightTimes.filter(t => t > 0 && t < outlierThreshold);
      
      // Fallback: if too few times remain after filtering, use all positive flight times
      if (timesToUse.length < 2) {
        timesToUse = flightTimes.filter(t => t > 0);
      }
      
      if (timesToUse.length >= 2) {
        const calcAvg = timesToUse.reduce((a, b) => a + b, 0) / timesToUse.length;
        const calcVariance = timesToUse.reduce((sum, t) => sum + Math.pow(t - calcAvg, 2), 0) / timesToUse.length;
        const calcStdDev = Math.sqrt(calcVariance);
        // Scale the coefficient of variation more gently - multiply by 50 instead of 100 for more realistic scores
        const cv = (calcStdDev / calcAvg);
        consistency = Math.max(0, Math.min(100, 100 - (cv * 50)));
      }
    }

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
    
    // 2. Adjusted WPM - Calculate from actual correct keystrokes and test duration
    // This is more accurate than applying a fixed penalty per error
    let adjustedWpm: number | null = null;
    if (this.events.length >= 2) {
      const firstEvent = this.events[0];
      const lastEvent = this.events[this.events.length - 1];
      if (firstEvent.pressTime && lastEvent.releaseTime) {
        const testDurationMs = lastEvent.releaseTime - firstEvent.pressTime;
        const testDurationMinutes = testDurationMs / 60000;
        if (testDurationMinutes > 0) {
          const correctChars = this.events.filter(e => e.isCorrect).length;
          // Standard WPM formula: (correct characters / 5) / minutes
          adjustedWpm = Math.round((correctChars / 5) / testDurationMinutes);
        }
      }
    }
    // Fallback: use the already-calculated net WPM (which is passed in as 'wpm')
    // This ensures we always use time-normalized calculations
    if (adjustedWpm === null) {
      adjustedWpm = Math.max(0, wpm);
    }
    
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
    
    // 9. Consistency/Rhythm Rating - Same as consistency score (0-100)
    // This measures how consistent the timing is between keystrokes
    const consistencyRating = consistency !== null 
      ? this.getConsistencyRating(consistency)
      : null;

    // === ANTI-CHEAT VALIDATION ===
    const antiCheatValidation = this.performAntiCheatValidation(wpm, flightTimes);

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
      consistencyRating,
      rollingAccuracy,
      topDigraphs,
      bottomDigraphs,
      typingRhythm,
      peakPerformanceWindow,
      fatigueIndicator,
      errorBurstCount,
      ...antiCheatValidation,
    };
  }
  
  // Calculate peak 5-second WPM (burst speed)
  private calculateBurstWpm(): number | null {
    if (this.events.length < 5) return null;
    
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
    if (this.events.length < 5) return null;
    
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
  // Uses same scaling as consistency for uniformity
  private calculateTypingRhythm(flightTimes: number[]): number | null {
    if (flightTimes.length < 3) return null;
    
    // Filter out extreme outliers (> 1000ms pauses are likely not typing rhythm)
    // Use a generous threshold that works for slow typists too
    let filteredTimes = flightTimes.filter(t => t > 0 && t < 1000);
    
    // Fallback: if too few times remain after filtering, use all positive flight times
    if (filteredTimes.length < 3) {
      filteredTimes = flightTimes.filter(t => t > 0);
    }
    if (filteredTimes.length < 3) return null;
    
    const mean = filteredTimes.reduce((a, b) => a + b, 0) / filteredTimes.length;
    const variance = filteredTimes.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / filteredTimes.length;
    const stdDev = Math.sqrt(variance);
    
    // Coefficient of variation (0-1 range) - lower is better rhythm
    const cv = stdDev / mean;
    
    // Convert to 0-100 score using same scaling as consistency formula
    // Flight times naturally have higher variance, so use gentler scaling (cv * 50)
    // This matches the consistency calculation for uniform metrics
    const rhythmScore = Math.max(0, Math.min(100, 100 - (cv * 50)));
    
    return Math.round(rhythmScore);
  }
  
  // Find the best performing 20% window of the test
  private calculatePeakPerformance(): { startPos: number; endPos: number; wpm: number } | null {
    if (this.events.length < 5) return null;
    
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
    if (this.events.length < 10) return null;
    
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
    if (this.events.length < 3) return null;
    
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
  
  // Get rhythm rating - simply returns the consistency score
  // Consistency score (0-100) directly measures typing rhythm stability
  // Higher scores indicate more consistent timing between keystrokes
  private getConsistencyRating(consistency: number): number {
    return Math.max(0, Math.min(100, Math.round(consistency)));
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

  private performAntiCheatValidation(wpm: number, flightTimes: number[]): AntiCheatValidation {
    const suspiciousFlags: string[] = [];
    let syntheticInputDetected = false;
    
    if (this.events.length < ANTICHEAT_THRESHOLDS.MIN_KEYSTROKES_FOR_ANALYSIS) {
      return {
        isSuspicious: false,
        suspiciousFlags: null,
        validationScore: 100,
        minKeystrokeInterval: null,
        keystrokeVariance: null,
        syntheticInputDetected: false,
      };
    }
    
    const intervals: number[] = [];
    for (let i = 1; i < this.events.length; i++) {
      const interval = this.events[i].pressTime - this.events[i - 1].pressTime;
      if (interval > 0) intervals.push(interval);
    }
    
    const minInterval = intervals.length > 0 ? Math.min(...intervals) : null;
    const avgInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
    const variance = intervals.length > 1 
      ? intervals.reduce((sum, t) => sum + Math.pow(t - avgInterval, 2), 0) / intervals.length
      : null;
    
    if (minInterval !== null && minInterval < ANTICHEAT_THRESHOLDS.MIN_KEYSTROKE_INTERVAL_MS) {
      suspiciousFlags.push('inhuman_speed');
      syntheticInputDetected = true;
    }
    
    if (wpm > ANTICHEAT_THRESHOLDS.MAX_WPM_WITHOUT_FLAG) {
      suspiciousFlags.push('impossible_wpm');
    }
    
    if (variance !== null && variance < ANTICHEAT_THRESHOLDS.MAX_CONSISTENT_VARIANCE && intervals.length > 20) {
      suspiciousFlags.push('programmatic_pattern');
      syntheticInputDetected = true;
    }
    
    if (this.detectSuspiciousBursts(intervals)) {
      suspiciousFlags.push('burst_typing');
    }
    
    if (this.detectPerfectRhythm(intervals)) {
      suspiciousFlags.push('perfect_rhythm');
      syntheticInputDetected = true;
    }
    
    // Flight time analysis - detect unnatural consistency in key-to-key transition times
    if (flightTimes.length > 20) {
      const filteredFlights = flightTimes.filter(t => t > 0 && t < 500);
      if (filteredFlights.length > 10) {
        const avgFlight = filteredFlights.reduce((a, b) => a + b, 0) / filteredFlights.length;
        const flightVariance = filteredFlights.reduce((sum, t) => sum + Math.pow(t - avgFlight, 2), 0) / filteredFlights.length;
        
        // Extremely low flight variance (< 5ms^2) indicates programmatic input
        if (flightVariance < ANTICHEAT_THRESHOLDS.MAX_CONSISTENT_VARIANCE) {
          if (!suspiciousFlags.includes('programmatic_pattern')) {
            suspiciousFlags.push('uniform_flight_times');
          }
          syntheticInputDetected = true;
        }
      }
    }
    
    let validationScore = 100;
    validationScore -= suspiciousFlags.length * 20;
    if (syntheticInputDetected) validationScore -= 30;
    validationScore = Math.max(0, validationScore);
    
    const isSuspicious = suspiciousFlags.length >= ANTICHEAT_THRESHOLDS.SUSPICIOUS_FLAG_THRESHOLD;
    
    return {
      isSuspicious,
      suspiciousFlags: suspiciousFlags.length > 0 ? suspiciousFlags : null,
      validationScore,
      minKeystrokeInterval: minInterval !== null ? Math.round(minInterval) : null,
      keystrokeVariance: variance !== null ? Math.round(variance * 100) / 100 : null,
      syntheticInputDetected,
    };
  }

  private detectSuspiciousBursts(intervals: number[]): boolean {
    if (intervals.length < ANTICHEAT_THRESHOLDS.BURST_WINDOW_SIZE * 2) return false;
    
    for (let i = 0; i <= intervals.length - ANTICHEAT_THRESHOLDS.BURST_WINDOW_SIZE; i++) {
      const window = intervals.slice(i, i + ANTICHEAT_THRESHOLDS.BURST_WINDOW_SIZE);
      const fastCount = window.filter(t => t < ANTICHEAT_THRESHOLDS.SUSPECT_INTERVAL_MS).length;
      if (fastCount / window.length >= ANTICHEAT_THRESHOLDS.BURST_THRESHOLD_RATIO) {
        return true;
      }
    }
    return false;
  }

  private detectPerfectRhythm(intervals: number[]): boolean {
    if (intervals.length < 20) return false;
    
    let consistentCount = 0;
    for (let i = 1; i < intervals.length; i++) {
      const diff = Math.abs(intervals[i] - intervals[i - 1]);
      if (diff < ANTICHEAT_THRESHOLDS.MAX_CONSISTENT_VARIANCE) {
        consistentCount++;
      }
    }
    
    return (consistentCount / intervals.length) > ANTICHEAT_THRESHOLDS.PERFECT_RHYTHM_THRESHOLD;
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
