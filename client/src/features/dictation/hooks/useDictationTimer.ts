import { useState, useEffect, useRef, useCallback } from 'react';

interface UseDictationTimerOptions {
  onTick?: (elapsed: number) => void;
  autoStart?: boolean;
}

interface UseDictationTimerReturn {
  elapsedTime: number;
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
  restart: () => void;
}

/**
 * Hook for managing elapsed time with proper cleanup
 * Prevents memory leaks by clearing interval on unmount
 */
export function useDictationTimer(options: UseDictationTimerOptions = {}): UseDictationTimerReturn {
  const { onTick, autoStart = false } = options;
  
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(autoStart);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const onTickRef = useRef(onTick);
  
  // Update callback ref
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);
  
  // Clear interval helper
  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  // Start timer
  const start = useCallback(() => {
    if (!isMountedRef.current) return;
    
    clearTimerInterval();
    setIsRunning(true);
    
    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        setElapsedTime(prev => {
          const newValue = prev + 1;
          onTickRef.current?.(newValue);
          return newValue;
        });
      }
    }, 1000);
  }, [clearTimerInterval]);
  
  // Stop timer
  const stop = useCallback(() => {
    clearTimerInterval();
    setIsRunning(false);
  }, [clearTimerInterval]);
  
  // Reset timer
  const reset = useCallback(() => {
    clearTimerInterval();
    setElapsedTime(0);
    setIsRunning(false);
  }, [clearTimerInterval]);
  
  // Restart timer
  const restart = useCallback(() => {
    reset();
    // Use setTimeout to ensure state is updated before starting
    setTimeout(() => {
      if (isMountedRef.current) {
        start();
      }
    }, 0);
  }, [reset, start]);
  
  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      clearTimerInterval();
    };
  }, [clearTimerInterval]);
  
  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && isMountedRef.current) {
      start();
    }
  }, [autoStart, start]);
  
  return {
    elapsedTime,
    isRunning,
    start,
    stop,
    reset,
    restart,
  };
}

/**
 * Hook for countdown timer (for auto-advance)
 */
interface UseCountdownOptions {
  initialValue: number;
  onComplete?: () => void;
  autoStart?: boolean;
}

interface UseCountdownReturn {
  countdown: number | null;
  isRunning: boolean;
  start: (value?: number) => void;
  stop: () => void;
  reset: () => void;
}

export function useCountdown(options: UseCountdownOptions): UseCountdownReturn {
  const { initialValue, onComplete, autoStart = false } = options;
  
  const [countdown, setCountdown] = useState<number | null>(autoStart ? initialValue : null);
  const [isRunning, setIsRunning] = useState(autoStart);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const onCompleteRef = useRef(onComplete);
  
  // Update callback ref
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  
  // Clear interval helper
  const clearCountdownInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  // Start countdown
  const start = useCallback((value?: number) => {
    if (!isMountedRef.current) return;
    
    clearCountdownInterval();
    setCountdown(value ?? initialValue);
    setIsRunning(true);
    
    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearCountdownInterval();
            setIsRunning(false);
            // Call onComplete after state update
            setTimeout(() => {
              if (isMountedRef.current) {
                onCompleteRef.current?.();
              }
            }, 0);
            return null;
          }
          return prev - 1;
        });
      }
    }, 1000);
  }, [initialValue, clearCountdownInterval]);
  
  // Stop countdown
  const stop = useCallback(() => {
    clearCountdownInterval();
    setIsRunning(false);
  }, [clearCountdownInterval]);
  
  // Reset countdown
  const reset = useCallback(() => {
    clearCountdownInterval();
    setCountdown(null);
    setIsRunning(false);
  }, [clearCountdownInterval]);
  
  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      clearCountdownInterval();
    };
  }, [clearCountdownInterval]);
  
  return {
    countdown,
    isRunning,
    start,
    stop,
    reset,
  };
}
