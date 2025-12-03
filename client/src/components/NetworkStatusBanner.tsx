import { useEffect, useState } from 'react';
import { useNetwork } from '@/lib/network-context';
import { WifiOff, Wifi, RefreshCw, AlertTriangle, CheckCircle, Cloud, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function NetworkStatusBanner() {
  const { 
    isOnline, 
    wasOffline, 
    isServerReachable, 
    isCheckingServer,
    checkConnection,
    pendingActions,
    retryPendingActions,
  } = useNetwork();
  
  const [showReconnected, setShowReconnected] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  const handleRetry = async () => {
    setIsRetrying(true);
    await checkConnection();
    if (pendingActions.length > 0) {
      await retryPendingActions();
    }
    setIsRetrying(false);
  };

  if (!isOnline) {
    return (
      <div 
        className="fixed top-0 left-0 right-0 z-[200] bg-destructive text-destructive-foreground px-4 py-3 shadow-lg animate-in slide-in-from-top duration-300"
        role="alert"
        aria-live="assertive"
      >
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5 animate-pulse" />
            <div>
              <p className="font-semibold">You're offline</p>
              <p className="text-sm opacity-90">
                Check your internet connection. Your progress will be saved when you reconnect.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying || isCheckingServer}
            className="shrink-0"
            data-testid="button-retry-connection"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", (isRetrying || isCheckingServer) && "animate-spin")} />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (isOnline && !isServerReachable && !isCheckingServer) {
    return (
      <div 
        className="fixed top-0 left-0 right-0 z-[200] bg-amber-500 text-amber-950 px-4 py-3 shadow-lg animate-in slide-in-from-top duration-300"
        role="alert"
        aria-live="polite"
      >
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CloudOff className="w-5 h-5" />
            <div>
              <p className="font-semibold">Server unreachable</p>
              <p className="text-sm opacity-90">
                You're online but we can't reach our servers. Some features may not work.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying || isCheckingServer}
            className="shrink-0"
            data-testid="button-retry-server"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", (isRetrying || isCheckingServer) && "animate-spin")} />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div 
        className="fixed top-0 left-0 right-0 z-[200] bg-green-500 text-white px-4 py-3 shadow-lg animate-in slide-in-from-top duration-300"
        role="status"
        aria-live="polite"
      >
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5" />
            <div>
              <p className="font-semibold">You're back online!</p>
              {pendingActions.length > 0 ? (
                <p className="text-sm opacity-90">
                  Syncing {pendingActions.length} pending action{pendingActions.length > 1 ? 's' : ''}...
                </p>
              ) : (
                <p className="text-sm opacity-90">Your connection has been restored.</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            <Cloud className="w-5 h-5" />
          </div>
        </div>
      </div>
    );
  }

  if (pendingActions.length > 0 && isOnline) {
    return (
      <div 
        className="fixed top-0 left-0 right-0 z-[200] bg-blue-500 text-white px-4 py-3 shadow-lg animate-in slide-in-from-top duration-300"
        role="status"
        aria-live="polite"
      >
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <p className="font-semibold">Pending actions</p>
              <p className="text-sm opacity-90">
                {pendingActions.length} action{pendingActions.length > 1 ? 's' : ''} waiting to sync
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            className="shrink-0"
            data-testid="button-sync-pending"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isRetrying && "animate-spin")} />
            Sync Now
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

export function OfflineIndicator({ className }: { className?: string }) {
  const { isOnline } = useNetwork();

  if (isOnline) return null;

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-medium",
        className
      )}
      role="status"
      aria-label="Offline"
    >
      <WifiOff className="w-3 h-3" />
      Offline
    </div>
  );
}
