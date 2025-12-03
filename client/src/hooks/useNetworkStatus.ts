import { useState, useEffect, useCallback, useRef } from 'react';

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnlineAt: Date | null;
  lastOfflineAt: Date | null;
  connectionType: string | null;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  connectionState: ConnectionState;
  connectionQuality: ConnectionQuality;
  consecutiveFailures: number;
  lastHealthCheck: Date | null;
}

interface NetworkInformation extends EventTarget {
  effectiveType: string;
  downlink: number;
  rtt: number;
  type: string;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

function getConnection(): NetworkInformation | null {
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
}

function determineConnectionQuality(
  isOnline: boolean,
  effectiveType: string | null,
  rtt: number | null,
  downlink: number | null
): ConnectionQuality {
  if (!isOnline) return 'offline';
  
  if (effectiveType) {
    switch (effectiveType) {
      case '4g':
        if (rtt && rtt < 50) return 'excellent';
        if (rtt && rtt < 100) return 'good';
        return 'fair';
      case '3g':
        return 'fair';
      case '2g':
      case 'slow-2g':
        return 'poor';
    }
  }
  
  if (rtt !== null) {
    if (rtt < 50) return 'excellent';
    if (rtt < 100) return 'good';
    if (rtt < 300) return 'fair';
    return 'poor';
  }
  
  if (downlink !== null) {
    if (downlink >= 10) return 'excellent';
    if (downlink >= 5) return 'good';
    if (downlink >= 1) return 'fair';
    return 'poor';
  }
  
  return 'good';
}

const HEALTH_CHECK_INTERVAL = 30000;
const HEALTH_CHECK_TIMEOUT = 5000;
const MAX_CONSECUTIVE_FAILURES = 3;

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    lastOnlineAt: typeof navigator !== 'undefined' && navigator.onLine ? new Date() : null,
    lastOfflineAt: null,
    connectionType: null,
    effectiveType: null,
    downlink: null,
    rtt: null,
    connectionState: typeof navigator !== 'undefined' && navigator.onLine ? 'connected' : 'disconnected',
    connectionQuality: 'good',
    consecutiveFailures: 0,
    lastHealthCheck: null,
  }));

  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  const updateNetworkInfo = useCallback(() => {
    const connection = getConnection();
    if (connection) {
      const effectiveType = connection.effectiveType || null;
      const rtt = connection.rtt || null;
      const downlink = connection.downlink || null;
      
      setStatus(prev => ({
        ...prev,
        connectionType: connection.type || null,
        effectiveType,
        downlink,
        rtt,
        connectionQuality: determineConnectionQuality(prev.isOnline, effectiveType, rtt, downlink),
      }));
    }
  }, []);

  const performHealthCheck = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const isReachable = await checkServerReachability(HEALTH_CHECK_TIMEOUT);
      
      setStatus(prev => {
        if (isReachable) {
          return {
            ...prev,
            isOnline: true,
            connectionState: 'connected',
            consecutiveFailures: 0,
            lastHealthCheck: new Date(),
            wasOffline: prev.connectionState === 'disconnected' || prev.connectionState === 'reconnecting',
          };
        } else {
          const newFailures = prev.consecutiveFailures + 1;
          const isDisconnected = newFailures >= MAX_CONSECUTIVE_FAILURES;
          
          return {
            ...prev,
            consecutiveFailures: newFailures,
            connectionState: isDisconnected ? 'disconnected' : 'reconnecting',
            lastHealthCheck: new Date(),
            connectionQuality: isDisconnected ? 'offline' : 'poor',
          };
        }
      });
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  const handleOnline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOnline: true,
      wasOffline: true,
      connectionState: 'reconnecting',
      lastOnlineAt: new Date(),
    }));
    updateNetworkInfo();
    performHealthCheck();
  }, [updateNetworkInfo, performHealthCheck]);

  const handleOffline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOnline: false,
      connectionState: 'disconnected',
      connectionQuality: 'offline',
      lastOfflineAt: new Date(),
      consecutiveFailures: MAX_CONSECUTIVE_FAILURES,
    }));
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = getConnection();
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
      updateNetworkInfo();
    }

    if (status.isOnline) {
      performHealthCheck();
    }

    healthCheckIntervalRef.current = setInterval(() => {
      if (navigator.onLine) {
        performHealthCheck();
      }
    }, HEALTH_CHECK_INTERVAL);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      const conn = getConnection();
      if (conn) {
        conn.removeEventListener('change', updateNetworkInfo);
      }

      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [handleOnline, handleOffline, updateNetworkInfo, performHealthCheck]);

  return status;
}

export function useIsOnline(): boolean {
  const { isOnline, connectionState } = useNetworkStatus();
  return isOnline && connectionState === 'connected';
}

export async function checkServerReachability(timeout = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const startTime = performance.now();
    const response = await fetch('/api/health', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    });
    const endTime = performance.now();
    
    clearTimeout(timeoutId);
    
    const responseTime = endTime - startTime;
    if (responseTime > timeout * 0.8) {
      console.warn(`[Network] Health check slow: ${responseTime.toFixed(0)}ms`);
    }
    
    return response.ok;
  } catch {
    return false;
  }
}

export async function measureLatency(): Promise<number | null> {
  try {
    const startTime = performance.now();
    await fetch('/api/health', {
      method: 'HEAD',
      cache: 'no-store',
    });
    return performance.now() - startTime;
  } catch {
    return null;
  }
}
