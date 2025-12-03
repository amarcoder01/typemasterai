import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useNetworkStatus, NetworkStatus, checkServerReachability } from '@/hooks/useNetworkStatus';

interface NetworkContextType extends NetworkStatus {
  isServerReachable: boolean;
  isCheckingServer: boolean;
  checkConnection: () => Promise<boolean>;
  pendingActions: PendingAction[];
  addPendingAction: (action: PendingAction) => void;
  clearPendingActions: () => void;
  retryPendingActions: () => Promise<void>;
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

export function NetworkProvider({ children }: { children: ReactNode }) {
  const networkStatus = useNetworkStatus();
  const [isServerReachable, setIsServerReachable] = useState(true);
  const [isCheckingServer, setIsCheckingServer] = useState(false);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>(() => {
    try {
      const stored = localStorage.getItem(PENDING_ACTIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(pendingActions));
    } catch {
    }
  }, [pendingActions]);

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

  useEffect(() => {
    if (networkStatus.isOnline && networkStatus.wasOffline) {
      checkConnection();
    }
  }, [networkStatus.isOnline, networkStatus.wasOffline, checkConnection]);

  useEffect(() => {
    if (!networkStatus.isOnline) {
      setIsServerReachable(false);
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

  const clearPendingActions = useCallback(() => {
    setPendingActions([]);
  }, []);

  const retryPendingActions = useCallback(async () => {
    if (!networkStatus.isOnline || pendingActions.length === 0) return;

    const actionsToRetry = [...pendingActions];
    
    for (const action of actionsToRetry) {
      try {
        let endpoint = '';
        let method = 'POST';
        
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
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(action.data),
          });

          if (response.ok) {
            setPendingActions(prev => prev.filter(a => a.id !== action.id));
          } else if (action.retryCount >= 3) {
            setPendingActions(prev => prev.filter(a => a.id !== action.id));
          } else {
            setPendingActions(prev => 
              prev.map(a => a.id === action.id 
                ? { ...a, retryCount: a.retryCount + 1 } 
                : a
              )
            );
          }
        }
      } catch {
        if (action.retryCount >= 3) {
          setPendingActions(prev => prev.filter(a => a.id !== action.id));
        }
      }
    }
  }, [networkStatus.isOnline, pendingActions]);

  useEffect(() => {
    if (networkStatus.isOnline && networkStatus.wasOffline && pendingActions.length > 0) {
      const timer = setTimeout(() => {
        retryPendingActions();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [networkStatus.isOnline, networkStatus.wasOffline, pendingActions.length, retryPendingActions]);

  return (
    <NetworkContext.Provider
      value={{
        ...networkStatus,
        isServerReachable,
        isCheckingServer,
        checkConnection,
        pendingActions,
        addPendingAction,
        clearPendingActions,
        retryPendingActions,
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
  const { isOnline, addPendingAction } = useNetwork();

  return useCallback(
    async <T,>(
      actionFn: () => Promise<T>,
      pendingAction: Omit<PendingAction, 'timestamp' | 'retryCount'>
    ): Promise<T | null> => {
      if (!isOnline) {
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
    [isOnline, addPendingAction]
  );
}
