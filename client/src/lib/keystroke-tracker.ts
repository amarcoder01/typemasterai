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
  private expectedText: string = '';
  private currentPosition: number = 0;

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
    
    if (isCorrect) {
      this.currentPosition++;
    }
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
      wpmByPosition: null, // TODO: Calculate WPM by text position
      slowestWords: null, // TODO: Identify slow words
      keyHeatmap,
      testResultId,
    };
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
