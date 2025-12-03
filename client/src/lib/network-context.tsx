import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
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
    if (!networkStatus.isOnline) return;
    
    const reachable = await checkServerReachability();
    if (!reachable) {
      setIsServerReachable(false);
      return;
    }
    setIsServerReachable(true);

    setPendingActions(currentActions => {
      if (currentActions.length === 0) return currentActions;
      
      const processActions = async () => {
        const actionsSnapshot = [...currentActions];
        const processedIds: string[] = [];
        const failedUpdates: { id: string; retryCount: number }[] = [];
        
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
              } else if (action.retryCount >= 5) {
                processedIds.push(action.id);
              } else {
                failedUpdates.push({ id: action.id, retryCount: action.retryCount + 1 });
              }
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch {
            if (action.retryCount >= 5) {
              processedIds.push(action.id);
            } else {
              failedUpdates.push({ id: action.id, retryCount: action.retryCount + 1 });
            }
          }
        }
        
        setPendingActions(prev => {
          let updated = prev.filter(a => !processedIds.includes(a.id));
          for (const fail of failedUpdates) {
            updated = updated.map(a => 
              a.id === fail.id ? { ...a, retryCount: fail.retryCount } : a
            );
          }
          return updated;
        });
      };
      
      processActions();
      return currentActions;
    });
  }, [networkStatus.isOnline]);

  const [retryAttempt, setRetryAttempt] = useState(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (networkStatus.isOnline && networkStatus.wasOffline && pendingActions.length > 0) {
      setRetryAttempt(0);
      const timer = setTimeout(() => {
        retryPendingActions();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [networkStatus.isOnline, networkStatus.wasOffline]);

  useEffect(() => {
    if (networkStatus.isOnline && pendingActions.length > 0 && retryAttempt > 0) {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      const delay = Math.min(5000 * Math.pow(2, retryAttempt - 1), 60000);
      
      retryTimeoutRef.current = setTimeout(async () => {
        const reachable = await checkServerReachability();
        if (reachable) {
          retryPendingActions();
        } else {
          setRetryAttempt(prev => Math.min(prev + 1, 5));
        }
      }, delay);
      
      return () => {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
      };
    }
  }, [networkStatus.isOnline, pendingActions.length, retryAttempt, retryPendingActions]);

  useEffect(() => {
    if (pendingActions.length > 0 && retryAttempt === 0 && networkStatus.isOnline) {
      setRetryAttempt(1);
    } else if (pendingActions.length === 0) {
      setRetryAttempt(0);
    }
  }, [pendingActions.length, networkStatus.isOnline]);

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
