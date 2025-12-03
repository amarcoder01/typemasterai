import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { useNetworkStatus, NetworkStatus, checkServerReachability, ConnectionState, ConnectionQuality } from '@/hooks/useNetworkStatus';
import { useToast } from '@/hooks/use-toast';

interface NetworkContextType extends NetworkStatus {
  isServerReachable: boolean;
  isCheckingServer: boolean;
  checkConnection: () => Promise<boolean>;
  pendingActions: PendingAction[];
  addPendingAction: (action: PendingAction) => void;
  removePendingAction: (id: string) => void;
  clearPendingActions: () => void;
  retryPendingActions: () => Promise<void>;
  nextRetryIn: number | null;
  retryCount: number;
}

export interface PendingAction {
  id: string;
  type: 'save_result' | 'save_stress_test' | 'update_progress' | 'send_message';
  data: unknown;
  timestamp: Date;
  retryCount: number;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

const PENDING_ACTIONS_KEY = 'typemasterai_pending_actions';
const MAX_RETRIES = 5;
const BASE_RETRY_DELAY = 3000;
const MAX_RETRY_DELAY = 60000;

function calculateRetryDelay(attempt: number): number {
  const delay = Math.min(BASE_RETRY_DELAY * Math.pow(2, attempt), MAX_RETRY_DELAY);
  const jitter = delay * 0.2 * Math.random();
  return delay + jitter;
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const networkStatus = useNetworkStatus();
  const { toast } = useToast();
  const [isServerReachable, setIsServerReachable] = useState(true);
  const [isCheckingServer, setIsCheckingServer] = useState(false);
  const [nextRetryIn, setNextRetryIn] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>(() => {
    try {
      const stored = localStorage.getItem(PENDING_ACTIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((action: PendingAction) => ({
          ...action,
          timestamp: new Date(action.timestamp),
        }));
      }
      return [];
    } catch {
      return [];
    }
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousStateRef = useRef<ConnectionState>(networkStatus.connectionState);
  const toastShownRef = useRef<{ offline: boolean; reconnected: boolean }>({
    offline: false,
    reconnected: false,
  });

  useEffect(() => {
    try {
      localStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(pendingActions));
    } catch {
    }
  }, [pendingActions]);

  useEffect(() => {
    const prevState = previousStateRef.current;
    const currentState = networkStatus.connectionState;
    
    if (prevState !== currentState) {
      if (currentState === 'disconnected' && !toastShownRef.current.offline) {
        toastShownRef.current.offline = true;
        toastShownRef.current.reconnected = false;
        toast({
          variant: 'destructive',
          title: "You're offline",
          description: "Your internet connection was lost. Don't worry, your progress is saved locally.",
          duration: 10000,
        });
      } else if (currentState === 'connected' && prevState === 'disconnected' && !toastShownRef.current.reconnected) {
        toastShownRef.current.reconnected = true;
        toastShownRef.current.offline = false;
        toast({
          title: "You're back online!",
          description: pendingActions.length > 0 
            ? `Syncing ${pendingActions.length} pending action${pendingActions.length > 1 ? 's' : ''}...`
            : "Your connection has been restored.",
          duration: 5000,
        });
      } else if (currentState === 'reconnecting') {
        toastShownRef.current.offline = false;
      }
      
      previousStateRef.current = currentState;
    }
  }, [networkStatus.connectionState, pendingActions.length, toast]);

  useEffect(() => {
    if (networkStatus.connectionState === 'disconnected' || networkStatus.connectionState === 'reconnecting') {
      setIsServerReachable(false);
    } else if (networkStatus.connectionState === 'connected') {
      setIsServerReachable(true);
    }
  }, [networkStatus.connectionState]);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!networkStatus.isOnline) {
      setIsServerReachable(false);
      return false;
    }

    setIsCheckingServer(true);
    try {
      const reachable = await checkServerReachability();
      setIsServerReachable(reachable);
      return reachable;
    } finally {
      setIsCheckingServer(false);
    }
  }, [networkStatus.isOnline]);

  const addPendingAction = useCallback((action: PendingAction) => {
    setPendingActions(prev => {
      const existing = prev.find(a => a.id === action.id);
      if (existing) {
        return prev.map(a => a.id === action.id ? action : a);
      }
      return [...prev, action];
    });
  }, []);

  const removePendingAction = useCallback((id: string) => {
    setPendingActions(prev => prev.filter(a => a.id !== id));
  }, []);

  const clearPendingActions = useCallback(() => {
    setPendingActions([]);
    setRetryCount(0);
    setNextRetryIn(null);
  }, []);

  const retryPendingActions = useCallback(async () => {
    if (!networkStatus.isOnline || pendingActions.length === 0) return;
    
    const reachable = await checkServerReachability();
    if (!reachable) {
      setIsServerReachable(false);
      return;
    }
    setIsServerReachable(true);

    const actionsSnapshot = [...pendingActions];
    const processedIds: string[] = [];
    const failedActions: PendingAction[] = [];

    for (const action of actionsSnapshot) {
      try {
        let endpoint = '';
        
        switch (action.type) {
          case 'save_result':
            endpoint = '/api/results';
            break;
          case 'save_stress_test':
            endpoint = '/api/stress-test';
            break;
          case 'update_progress':
            endpoint = '/api/progress';
            break;
          case 'send_message':
            endpoint = '/api/messages';
            break;
        }

        if (endpoint) {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(action.data),
          });

          if (response.ok) {
            processedIds.push(action.id);
          } else if (response.status === 401) {
            processedIds.push(action.id);
            toast({
              variant: 'destructive',
              title: 'Session expired',
              description: 'Please log in again to save your results.',
              duration: 5000,
            });
          } else if (action.retryCount >= MAX_RETRIES) {
            processedIds.push(action.id);
            toast({
              variant: 'destructive',
              title: 'Failed to sync',
              description: 'Some data could not be saved after multiple attempts.',
              duration: 5000,
            });
          } else {
            failedActions.push({ ...action, retryCount: action.retryCount + 1 });
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch {
        if (action.retryCount >= MAX_RETRIES) {
          processedIds.push(action.id);
        } else {
          failedActions.push({ ...action, retryCount: action.retryCount + 1 });
        }
      }
    }

    setPendingActions(prev => {
      const remaining = prev.filter(a => !processedIds.includes(a.id));
      return remaining.map(a => {
        const failed = failedActions.find(f => f.id === a.id);
        return failed || a;
      });
    });

    if (processedIds.length > 0 && processedIds.length === actionsSnapshot.length) {
      toast({
        title: 'All synced!',
        description: 'Your pending data has been saved successfully.',
        duration: 3000,
      });
      setRetryCount(0);
    } else if (failedActions.length > 0) {
      setRetryCount(prev => prev + 1);
    }
  }, [networkStatus.isOnline, pendingActions, toast]);

  useEffect(() => {
    if (networkStatus.connectionState === 'connected' && networkStatus.wasOffline && pendingActions.length > 0) {
      setRetryCount(0);
      const timer = setTimeout(() => {
        retryPendingActions();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [networkStatus.connectionState, networkStatus.wasOffline]);

  useEffect(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (networkStatus.isOnline && pendingActions.length > 0 && retryCount > 0 && retryCount < MAX_RETRIES) {
      const delay = calculateRetryDelay(retryCount);
      let remaining = Math.ceil(delay / 1000);
      setNextRetryIn(remaining);

      countdownIntervalRef.current = setInterval(() => {
        remaining -= 1;
        setNextRetryIn(remaining > 0 ? remaining : null);
      }, 1000);

      retryTimeoutRef.current = setTimeout(async () => {
        const reachable = await checkServerReachability();
        if (reachable) {
          retryPendingActions();
        } else {
          setRetryCount(prev => prev + 1);
        }
      }, delay);
    } else {
      setNextRetryIn(null);
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [networkStatus.isOnline, pendingActions.length, retryCount, retryPendingActions]);

  useEffect(() => {
    if (pendingActions.length === 0) {
      setRetryCount(0);
      setNextRetryIn(null);
    }
  }, [pendingActions.length]);

  return (
    <NetworkContext.Provider
      value={{
        ...networkStatus,
        isServerReachable,
        isCheckingServer,
        checkConnection,
        pendingActions,
        addPendingAction,
        removePendingAction,
        clearPendingActions,
        retryPendingActions,
        nextRetryIn,
        retryCount,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextType {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}

export function useOfflineAwareAction() {
  const { isOnline, connectionState, addPendingAction } = useNetwork();

  return useCallback(
    async <T,>(
      actionFn: () => Promise<T>,
      pendingAction: Omit<PendingAction, 'timestamp' | 'retryCount'>
    ): Promise<T | null> => {
      if (!isOnline || connectionState === 'disconnected') {
        addPendingAction({
          ...pendingAction,
          timestamp: new Date(),
          retryCount: 0,
        });
        return null;
      }

      try {
        return await actionFn();
      } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
          addPendingAction({
            ...pendingAction,
            timestamp: new Date(),
            retryCount: 0,
          });
          return null;
        }
        throw error;
      }
    },
    [isOnline, connectionState, addPendingAction]
  );
}
