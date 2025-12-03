import { useEffect, useState, useCallback } from 'react';
import { useNetwork } from '@/lib/network-context';
import { WifiOff, Wifi, RefreshCw, AlertTriangle, CheckCircle, Cloud, CloudOff, Signal, SignalLow, SignalMedium, SignalHigh } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ConnectionQuality } from '@/hooks/useNetworkStatus';

function getQualityIcon(quality: ConnectionQuality) {
  switch (quality) {
    case 'excellent':
      return <SignalHigh className="w-4 h-4" />;
    case 'good':
      return <SignalMedium className="w-4 h-4" />;
    case 'fair':
      return <SignalLow className="w-4 h-4" />;
    case 'poor':
      return <Signal className="w-4 h-4" />;
    case 'offline':
      return <WifiOff className="w-4 h-4" />;
  }
}

export function NetworkStatusBanner() {
  const { 
    isOnline, 
    wasOffline, 
    connectionState,
    connectionQuality,
    isServerReachable, 
    isCheckingServer,
    checkConnection,
    pendingActions,
    retryPendingActions,
    nextRetryIn,
    retryCount,
  } = useNetwork();
  
  const [showReconnected, setShowReconnected] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [dismissedOffline, setDismissedOffline] = useState(false);

  useEffect(() => {
    if (connectionState === 'connected' && wasOffline) {
      setShowReconnected(true);
      setDismissedOffline(false);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [connectionState, wasOffline]);

  useEffect(() => {
    if (connectionState === 'disconnected') {
      setDismissedOffline(false);
    }
  }, [connectionState]);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      const connected = await checkConnection();
      if (connected && pendingActions.length > 0) {
        await retryPendingActions();
      }
    } finally {
      setIsRetrying(false);
    }
  }, [checkConnection, pendingActions.length, retryPendingActions]);

  const isDisconnected = connectionState === 'disconnected' || !isOnline;
  const isReconnecting = connectionState === 'reconnecting';
  const isConnected = connectionState === 'connected' && isOnline && isServerReachable;

  if (isDisconnected && !dismissedOffline) {
    return (
      <div 
        className="fixed top-0 left-0 right-0 z-[9999] animate-in slide-in-from-top duration-300"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div className="bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 shrink-0">
                  <WifiOff className="w-5 h-5 animate-pulse" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-base">No Internet Connection</p>
                  <p className="text-sm text-white/90 truncate">
                    Check your connection. Your progress is saved locally and will sync when you're back online.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRetry}
                  disabled={isRetrying || isCheckingServer}
                  className="bg-white text-red-600 hover:bg-white/90 font-medium"
                  data-testid="button-retry-connection"
                  aria-label="Retry connection"
                >
                  <RefreshCw 
                    className={cn("w-4 h-4 mr-2", (isRetrying || isCheckingServer) && "animate-spin")} 
                    aria-hidden="true" 
                  />
                  Try Again
                </Button>
              </div>
            </div>
            {pendingActions.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/20 flex items-center gap-2 text-sm text-white/80">
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{pendingActions.length} unsaved action{pendingActions.length > 1 ? 's' : ''} waiting to sync</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isOnline && !isServerReachable && !isCheckingServer && !isReconnecting) {
    return (
      <div 
        className="fixed top-0 left-0 right-0 z-[9999] animate-in slide-in-from-top duration-300"
        role="alert"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-amber-950 shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/30 shrink-0">
                  <CloudOff className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-base">Server Unreachable</p>
                  <p className="text-sm opacity-90 truncate">
                    You're online but we can't reach our servers. Some features may not work.
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying || isCheckingServer}
                className="bg-white/90 text-amber-700 hover:bg-white font-medium shrink-0"
                data-testid="button-retry-server"
                aria-label="Retry server connection"
              >
                <RefreshCw 
                  className={cn("w-4 h-4 mr-2", (isRetrying || isCheckingServer) && "animate-spin")} 
                  aria-hidden="true" 
                />
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isReconnecting) {
    return (
      <div 
        className="fixed top-0 left-0 right-0 z-[9999] animate-in slide-in-from-top duration-300"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 shrink-0">
                <RefreshCw className="w-5 h-5 animate-spin" aria-hidden="true" />
              </div>
              <div>
                <p className="font-semibold text-base">Reconnecting...</p>
                <p className="text-sm text-white/90">
                  Attempting to restore your connection
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showReconnected && isConnected) {
    return (
      <div 
        className="fixed top-0 left-0 right-0 z-[9999] animate-in slide-in-from-top duration-300"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 shrink-0">
                  <CheckCircle className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-base">You're Back Online!</p>
                  {pendingActions.length > 0 ? (
                    <p className="text-sm text-white/90">
                      Syncing {pendingActions.length} pending action{pendingActions.length > 1 ? 's' : ''}...
                    </p>
                  ) : (
                    <p className="text-sm text-white/90">Your connection has been restored.</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Wifi className="w-5 h-5" aria-hidden="true" />
                <Cloud className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pendingActions.length > 0 && isConnected) {
    return (
      <div 
        className="fixed top-0 left-0 right-0 z-[9999] animate-in slide-in-from-top duration-300"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 shrink-0">
                  <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-base">Pending Actions</p>
                  <p className="text-sm text-white/90">
                    {pendingActions.length} action{pendingActions.length > 1 ? 's' : ''} waiting to sync
                    {nextRetryIn !== null && ` • Auto-retry in ${nextRetryIn}s`}
                    {retryCount > 0 && retryCount < 5 && ` (attempt ${retryCount + 1}/5)`}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying}
                className="bg-white text-blue-600 hover:bg-white/90 font-medium shrink-0"
                data-testid="button-sync-pending"
                aria-label="Sync pending actions now"
              >
                <RefreshCw 
                  className={cn("w-4 h-4 mr-2", isRetrying && "animate-spin")} 
                  aria-hidden="true" 
                />
                Sync Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export function OfflineIndicator({ className }: { className?: string }) {
  const { isOnline, connectionState } = useNetwork();

  if (isOnline && connectionState === 'connected') return null;

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-medium",
        className
      )}
      role="status"
      aria-label="Offline"
    >
      <WifiOff className="w-3 h-3" aria-hidden="true" />
      {connectionState === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
    </div>
  );
}

export function ConnectionQualityIndicator({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const { connectionQuality, isOnline, connectionState } = useNetwork();

  if (!isOnline || connectionState !== 'connected') return null;

  const qualityConfig: Record<ConnectionQuality, { label: string; color: string }> = {
    excellent: { label: 'Excellent', color: 'text-green-500' },
    good: { label: 'Good', color: 'text-emerald-500' },
    fair: { label: 'Fair', color: 'text-yellow-500' },
    poor: { label: 'Poor', color: 'text-orange-500' },
    offline: { label: 'Offline', color: 'text-red-500' },
  };

  const config = qualityConfig[connectionQuality];

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1.5",
        config.color,
        className
      )}
      role="status"
      aria-label={`Connection quality: ${config.label}`}
    >
      {getQualityIcon(connectionQuality)}
      {showLabel && <span className="text-xs font-medium">{config.label}</span>}
    </div>
  );
}
