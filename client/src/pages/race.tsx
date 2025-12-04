import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useNetwork } from "@/lib/network-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trophy, Copy, Check, Loader2, Home, RotateCcw, ArrowLeft, WifiOff, RefreshCw, Info, Gauge, Target, Bot, User, Users, Share2, Play, Flag, AlertTriangle, Wifi, XCircle, Timer, Sparkles } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { calculateWPM, calculateAccuracy } from "@/lib/typing-utils";

// Error types for better error handling
type ErrorType = "network" | "race_not_found" | "race_full" | "race_started" | "websocket" | "unknown";

interface ErrorState {
  type: ErrorType;
  message: string;
  canRetry: boolean;
  retryAction?: () => void;
}

// Error display component with retry functionality
function RaceErrorDisplay({ 
  error, 
  onRetry, 
  onGoBack 
}: { 
  error: ErrorState; 
  onRetry?: () => void; 
  onGoBack: () => void;
}) {
  const getErrorIcon = () => {
    switch (error.type) {
      case "network":
      case "websocket":
        return <WifiOff className="h-12 w-12 text-yellow-500" />;
      case "race_not_found":
        return <XCircle className="h-12 w-12 text-red-500" />;
      case "race_full":
        return <Users className="h-12 w-12 text-orange-500" />;
      case "race_started":
        return <Timer className="h-12 w-12 text-orange-500" />;
      default:
        return <AlertTriangle className="h-12 w-12 text-red-500" />;
    }
  };

  const getErrorTitle = () => {
    switch (error.type) {
      case "network": return "Connection Problem";
      case "websocket": return "Live Connection Lost";
      case "race_not_found": return "Race Not Found";
      case "race_full": return "Race is Full";
      case "race_started": return "Race Already Started";
      default: return "Something Went Wrong";
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                {getErrorIcon()}
              </div>
              <div>
                <h2 className="text-xl font-bold">{getErrorTitle()}</h2>
                <p className="text-muted-foreground mt-2">{error.message}</p>
              </div>
              <div className="flex flex-col gap-2 pt-4">
                {error.canRetry && onRetry && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={onRetry} className="w-full" data-testid="button-retry">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">Retry</p>
                      <p className="text-zinc-400">Attempt to reconnect or reload the race</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={onGoBack} className="w-full" data-testid="button-go-back">
                      <Home className="h-4 w-4 mr-2" />
                      Back to Multiplayer
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Return to the multiplayer lobby</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

// Loading component with descriptive state
function RaceLoadingDisplay({ message, subMessage }: { message: string; subMessage?: string }) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Loading race data from server</p>
            </TooltipContent>
          </Tooltip>
          <div>
            <p className="text-lg font-medium">{message}</p>
            {subMessage && (
              <p className="text-sm text-muted-foreground mt-1">{subMessage}</p>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// Network status banner component
function NetworkStatusBanner({ 
  isConnected, 
  isReconnecting, 
  reconnectAttempt, 
  maxAttempts,
  onManualRetry 
}: { 
  isConnected: boolean; 
  isReconnecting: boolean;
  reconnectAttempt: number;
  maxAttempts: number;
  onManualRetry: () => void;
}) {
  if (isConnected) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <Alert variant="destructive" className="mb-4 border-yellow-500/50 bg-yellow-500/10">
        <WifiOff className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          {isReconnecting ? "Reconnecting..." : "Connection Lost"}
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-medium">WebSocket Disconnected</p>
              <p className="text-zinc-400">Your live connection to the race server was interrupted. We're trying to reconnect automatically.</p>
            </TooltipContent>
          </Tooltip>
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            {isReconnecting 
              ? `Attempt ${reconnectAttempt} of ${maxAttempts}...` 
              : "Your progress is saved. Click retry to reconnect."}
          </span>
          {!isReconnecting && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={onManualRetry} data-testid="button-manual-reconnect">
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Retry
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Manually attempt to reconnect</p>
              </TooltipContent>
            </Tooltip>
          )}
        </AlertDescription>
      </Alert>
    </TooltipProvider>
  );
}

interface Race {
  id: number;
  roomCode: string;
  status: string;
  paragraphContent: string;
  maxPlayers: number;
  isPrivate: number;
}

interface Participant {
  id: number;
  raceId: number;
  username: string;
  avatarColor: string | null;
  isBot?: number;
  progress: number;
  wpm: number;
  accuracy: number;
  errors: number;
  isFinished: number;
  finishPosition: number | null;
}

export default function RacePage() {
  const [, params] = useRoute("/race/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { isOnline, wasOffline } = useNetwork();
  
  const [race, setRace] = useState<Race | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myParticipant, setMyParticipant] = useState<Participant | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRacing, setIsRacing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errors, setErrors] = useState(0);
  const [charStates, setCharStates] = useState<('pending' | 'correct' | 'incorrect')[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveAccuracy, setLiveAccuracy] = useState(100);
  const [elapsedTime, setElapsedTime] = useState(0);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Loading race...");
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const currentIndexRef = useRef(0);
  const errorsRef = useRef(0);
  const isComposingRef = useRef(false);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const pendingMessagesRef = useRef<string[]>([]);
  const seenParticipantJoinsRef = useRef<Set<number>>(new Set());
  const hasJoinedRef = useRef(false);
  const lastJoinedRaceIdRef = useRef<number | null>(null);
  const extensionRequestedRef = useRef(false);
  const extensionThreshold = 0.85;

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    errorsRef.current = errors;
  }, [errors]);

  useEffect(() => {
    if (!params?.id) return;

    const roomCodeOrId = params.id;
    const savedParticipant = localStorage.getItem(`race_${roomCodeOrId}_participant`);
    
    if (savedParticipant) {
      const participant = JSON.parse(savedParticipant);
      setMyParticipant(participant);
    }

    fetchRaceData();
    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [params?.id]);

  useEffect(() => {
    if (ws && myParticipant && race && ws.readyState === WebSocket.OPEN) {
      if (hasJoinedRef.current && lastJoinedRaceIdRef.current === race.id) {
        return;
      }
      
      hasJoinedRef.current = true;
      lastJoinedRaceIdRef.current = race.id;
      
      sendWsMessage({
        type: "join",
        raceId: race.id,
        participantId: myParticipant.id,
        username: myParticipant.username,
      });
    }
  }, [ws, myParticipant, race]);

  useEffect(() => {
    if (isRacing && hiddenInputRef.current) {
      hiddenInputRef.current.focus();
      setIsFocused(true);
    }
  }, [isRacing]);

  useEffect(() => {
    if (!isRacing || !startTime) return;
    
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setElapsedTime(elapsed);
      
      const idx = currentIndexRef.current;
      const errs = errorsRef.current;
      const correctChars = Math.max(0, idx - errs);
      const wpm = elapsed > 0 ? Math.round((correctChars / 5) / (elapsed / 60)) : 0;
      const accuracy = idx > 0 ? Math.round(((idx - errs) / idx) * 100) : 100;
      
      setLiveWpm(wpm);
      setLiveAccuracy(Math.max(0, accuracy));
    }, 100);
    
    return () => clearInterval(interval);
  }, [isRacing, startTime]);

  useEffect(() => {
    if (caretRef.current && textContainerRef.current) {
      const caret = caretRef.current;
      const container = textContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const caretRect = caret.getBoundingClientRect();
      
      const caretRelativeTop = caretRect.top - containerRect.top + container.scrollTop;
      const visibleTop = container.scrollTop;
      const visibleBottom = visibleTop + container.clientHeight;
      
      if (caretRelativeTop < visibleTop + 50) {
        container.scrollTo({ top: caretRelativeTop - 50, behavior: 'smooth' });
      } else if (caretRelativeTop > visibleBottom - 50) {
        container.scrollTo({ top: caretRelativeTop - container.clientHeight + 50, behavior: 'smooth' });
      }
    }
  }, [currentIndex]);

  function handleFocus() {
    setIsFocused(true);
  }

  function handleBlur() {
    setIsFocused(false);
  }

  function handleCompositionStart() {
    isComposingRef.current = true;
  }

  function handleCompositionEnd(e: React.CompositionEvent<HTMLInputElement>) {
    isComposingRef.current = false;
    if (e.data) {
      processInput(e.data);
    }
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = '';
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    toast.error("Paste disabled - Please type manually for accurate results");
  }

  function handleCut(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
  }

  function handleTyping(e: React.FormEvent<HTMLInputElement>) {
    if (!isRacing || !race || isComposingRef.current) return;

    const input = e.currentTarget;
    const value = input.value;

    if (value.length === 0) return;

    processInput(value);
    input.value = '';
  }

  function processInput(value: string) {
    if (!race) return;

    let localIndex = currentIndexRef.current;
    let localErrors = errorsRef.current;
    const newCharStates = [...charStates];

    for (let i = 0; i < value.length; i++) {
      if (localIndex >= race.paragraphContent.length) {
        break;
      }

      const typedChar = value[i];
      const expectedChar = race.paragraphContent[localIndex];

      if (typedChar === expectedChar) {
        newCharStates[localIndex] = 'correct';
      } else {
        newCharStates[localIndex] = 'incorrect';
        localErrors++;
      }

      localIndex++;
    }

    currentIndexRef.current = localIndex;
    errorsRef.current = localErrors;
    setCurrentIndex(localIndex);
    setErrors(localErrors);
    setCharStates(newCharStates);
    updateProgress(localIndex, localErrors);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isRacing) return;

    if (e.key === 'Backspace' && currentIndexRef.current > 0) {
      e.preventDefault();
      const newIndex = currentIndexRef.current - 1;
      currentIndexRef.current = newIndex;
      
      const newCharStates = [...charStates];
      if (newCharStates[newIndex] === 'incorrect') {
        errorsRef.current = Math.max(0, errorsRef.current - 1);
        setErrors(errorsRef.current);
      }
      newCharStates[newIndex] = 'pending';
      setCharStates(newCharStates);
      
      setCurrentIndex(newIndex);
      updateProgress(newIndex, errorsRef.current);
    }
  }

  useEffect(() => {
    if (race && race.paragraphContent && charStates.length !== race.paragraphContent.length) {
      setCharStates(new Array(race.paragraphContent.length).fill('pending'));
    }
  }, [race?.paragraphContent]);

  useEffect(() => {
    if (!race || !myParticipant || myParticipant.isFinished) return;
    
    const progress = currentIndex / race.paragraphContent.length;
    
    if (progress >= extensionThreshold && !extensionRequestedRef.current) {
      extensionRequestedRef.current = true;
      sendWsMessage({
        type: "extend_paragraph",
        raceId: race.id,
        participantId: myParticipant.id,
      });
    }
    
    if (currentIndex >= race.paragraphContent.length) {
      finishRace();
    }
  }, [currentIndex, race, myParticipant]);

  async function fetchRaceData() {
    setLoadingMessage("Loading race...");
    setErrorState(null);
    
    try {
      const response = await fetch(`/api/races/${params?.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setRace(data.race);
        setParticipants(data.participants);
        setErrorState(null);
        
        if (myParticipant) {
          const updatedParticipant = data.participants.find((p: Participant) => p.id === myParticipant.id);
          if (updatedParticipant) {
            setMyParticipant(updatedParticipant);
          }
        }
      } else if (response.status === 404) {
        setErrorState({
          type: "race_not_found",
          message: "This race doesn't exist or has ended. The room code may have expired.",
          canRetry: false,
        });
      } else if (response.status === 409) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.code === "RACE_FULL") {
          setErrorState({
            type: "race_full",
            message: "This race room is full. Try joining another race or create a new one.",
            canRetry: false,
          });
        } else if (errorData.code === "RACE_STARTED") {
          setErrorState({
            type: "race_started",
            message: "This race has already started. You can join the next one.",
            canRetry: false,
          });
        } else {
          setErrorState({
            type: "unknown",
            message: errorData.message || "Unable to join this race.",
            canRetry: true,
          });
        }
      } else {
        setErrorState({
          type: "unknown",
          message: "Something went wrong while loading the race. Please try again.",
          canRetry: true,
        });
      }
    } catch (error) {
      if (!isOnline) {
        setErrorState({
          type: "network",
          message: "You appear to be offline. Please check your internet connection and try again.",
          canRetry: true,
        });
      } else {
        setErrorState({
          type: "network",
          message: "Unable to connect to the server. Please check your connection and try again.",
          canRetry: true,
        });
      }
    }
  }

  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      setIsReconnecting(false);
      toast.error("Unable to reconnect. Please refresh the page.", {
        duration: 10000,
        action: {
          label: "Refresh",
          onClick: () => window.location.reload(),
        },
      });
      return;
    }

    if (!isOnline) {
      setIsReconnecting(false);
      return;
    }

    setIsReconnecting(true);
    reconnectAttempts.current += 1;
    
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current - 1), 10000);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(`Reconnection attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
      connectWebSocket();
    }, delay);
  }, [isOnline]);

  // Manual reconnect with reset
  const manualReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectAttempts.current = 0;
    setIsReconnecting(true);
    connectWebSocket();
  }, []);

  function connectWebSocket() {
    if (!isOnline) {
      console.log("Cannot connect WebSocket: offline");
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/race`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected");
      setWs(socket);
      setWsConnected(true);
      setIsReconnecting(false);
      reconnectAttempts.current = 0;
      
      while (pendingMessagesRef.current.length > 0) {
        const message = pendingMessagesRef.current.shift();
        if (message) {
          socket.send(message);
        }
      }
      
      if (wasOffline) {
        toast.success("Reconnected to race server");
      }
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setWsConnected(false);
    };

    socket.onclose = (event) => {
      console.log("WebSocket disconnected", event.code, event.reason);
      setWsConnected(false);
      setWs(null);
      hasJoinedRef.current = false;
      
      if (event.code !== 1000 && race?.status !== "finished") {
        attemptReconnect();
      }
    };
  }

  function sendWsMessage(message: object) {
    const messageStr = JSON.stringify(message);
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    } else if (isOnline) {
      pendingMessagesRef.current.push(messageStr);
      if (!isReconnecting && ws?.readyState !== WebSocket.CONNECTING) {
        attemptReconnect();
      }
    } else {
      pendingMessagesRef.current.push(messageStr);
    }
  }

  useEffect(() => {
    if (isOnline && wasOffline && !wsConnected && !isReconnecting) {
      reconnectAttempts.current = 0;
      connectWebSocket();
    }
  }, [isOnline, wasOffline, wsConnected, isReconnecting]);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  function handleWebSocketMessage(message: any) {
    switch (message.type) {
      case "joined":
        setRace(message.race);
        setParticipants(message.participants);
        if (message.participants) {
          message.participants.forEach((p: Participant) => {
            seenParticipantJoinsRef.current.add(p.id);
          });
        }
        break;
      case "participant_joined":
        setParticipants(message.participants);
        if (message.participant && !seenParticipantJoinsRef.current.has(message.participant.id)) {
          seenParticipantJoinsRef.current.add(message.participant.id);
          toast.success(`${message.participant.username} joined the race!`);
        }
        break;
      case "participants_sync":
        setParticipants(message.participants);
        break;
      case "bots_added":
        fetchRaceData();
        toast.info("AI racers joined to fill the lobby!", { duration: 2000 });
        break;
      case "countdown_start":
        setCountdown(message.countdown);
        if (message.participants) {
          setParticipants(message.participants);
        }
        break;
      case "countdown":
        setCountdown(message.countdown);
        break;
      case "race_start":
        setCountdown(null);
        setIsRacing(true);
        setStartTime(Date.now());
        setCurrentIndex(0);
        setErrors(0);
        currentIndexRef.current = 0;
        errorsRef.current = 0;
        if (race) {
          setRace({ ...race, status: "racing" });
          setCharStates(new Array(race.paragraphContent.length).fill('pending'));
        }
        toast.success("Race started! Type as fast as you can!");
        break;
      case "paragraph_extended":
        if (race) {
          const newContent = race.paragraphContent + " " + message.additionalContent;
          setRace({ ...race, paragraphContent: newContent });
          setCharStates(prev => {
            const newStates = [...prev];
            for (let i = prev.length; i < newContent.length; i++) {
              newStates[i] = 'pending';
            }
            return newStates;
          });
          toast.info("More text added! Keep typing!", { duration: 2000 });
          extensionRequestedRef.current = false;
        }
        break;
      case "progress_update":
        setParticipants(prev => prev.map(p => 
          p.id === message.participantId 
            ? { ...p, progress: message.progress, wpm: message.wpm, accuracy: message.accuracy, errors: message.errors }
            : p
        ));
        break;
      case "participant_finished":
        setParticipants(prev => prev.map(p => 
          p.id === message.participantId 
            ? { ...p, isFinished: 1, finishPosition: message.position }
            : p
        ));
        break;
      case "race_finished":
        setIsRacing(false);
        setParticipants(message.results);
        if (race) {
          setRace({ ...race, status: "finished" });
        }
        const myResult = message.results.find((p: Participant) => p.id === myParticipant?.id);
        if (myResult?.finishPosition === 1) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
          toast.success("🏆 Congratulations! You won the race!", {
            duration: 5000,
          });
        } else if (myResult?.finishPosition) {
          toast.success(`Race complete! You finished #${myResult.finishPosition}`, {
            duration: 4000,
          });
        } else {
          toast.info("Race complete! Check the results.", {
            duration: 3000,
          });
        }
        break;
      case "participant_left":
        setParticipants(prev => prev.filter(p => p.id !== message.participantId));
        break;
    }
  }


  function updateProgress(progress: number, errorCount = errors) {
    if (!myParticipant || !startTime || !race) return;

    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const correctChars = Math.max(0, progress - errorCount);
    const wpm = calculateWPM(correctChars, elapsedSeconds);
    const accuracy = calculateAccuracy(correctChars, progress);

    sendWsMessage({
      type: "progress",
      participantId: myParticipant.id,
      progress,
      wpm: wpm || 0,
      accuracy,
      errors: errorCount,
    });

    setMyParticipant(prev => prev ? { ...prev, progress, wpm: wpm || 0, accuracy, errors: errorCount } : null);
  }

  function finishRace() {
    if (!myParticipant) return;

    setIsRacing(false);
    sendWsMessage({
      type: "finish",
      raceId: race?.id,
      participantId: myParticipant.id,
    });

    setMyParticipant(prev => prev ? { ...prev, isFinished: 1 } : null);
  }

  function copyRoomCode() {
    if (race) {
      navigator.clipboard.writeText(race.roomCode);
      setCopied(true);
      toast.success("Room code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function startRace() {
    if (!participants.length) return;
    
    sendWsMessage({
      type: "ready",
      raceId: race?.id,
    });
  }

  function leaveRace() {
    if (myParticipant && race) {
      sendWsMessage({
        type: "leave",
        raceId: race.id,
        participantId: myParticipant.id,
      });
    }
    
    if (race && myParticipant) {
      localStorage.removeItem(`race_${race.id}_participant`);
      localStorage.removeItem(`race_${race.roomCode}_participant`);
    }
    
    setLocation("/multiplayer");
  }

  // Handle error state
  if (errorState) {
    return (
      <RaceErrorDisplay
        error={errorState}
        onRetry={errorState.canRetry ? fetchRaceData : undefined}
        onGoBack={() => setLocation("/multiplayer")}
      />
    );
  }

  // Handle loading state
  if (!race) {
    return (
      <RaceLoadingDisplay 
        message={loadingMessage}
        subMessage="Connecting to race server..."
      />
    );
  }

  if (race.status === "waiting") {
    return (
      <TooltipProvider delayDuration={300}>
        <div className="min-h-screen bg-background">
          <div className="container max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={leaveRace}
                    data-testid="button-leave-race"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Lobby
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Leave the race and return to multiplayer lobby</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Waiting for Players
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p className="font-medium">Waiting Room</p>
                          <p className="text-zinc-400">Share your room code with friends. AI racers may join to fill empty slots when you start.</p>
                        </TooltipContent>
                      </Tooltip>
                    </CardTitle>
                    <CardDescription>Share the room code with friends</CardDescription>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={copyRoomCode}
                        data-testid="button-copy-code"
                        className="font-mono"
                      >
                        {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Share2 className="h-4 w-4 mr-2" />}
                        {race.roomCode}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="font-medium">{copied ? "Copied!" : "Click to copy room code"}</p>
                      <p className="text-zinc-400">Share this code with friends to let them join</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-medium">
                      Players ({participants.length}/{race.maxPlayers})
                    </h3>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{race.maxPlayers - participants.length} slot{race.maxPlayers - participants.length !== 1 ? 's' : ''} available</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="grid gap-2">
                    {participants.map((p) => (
                      <Tooltip key={p.id}>
                        <TooltipTrigger asChild>
                          <div
                            className="flex items-center gap-3 p-3 border rounded-lg hover:border-primary/50 transition-colors cursor-default"
                            data-testid={`participant-${p.id}`}
                          >
                            <div className={`h-10 w-10 rounded-full ${p.avatarColor || 'bg-primary'} flex items-center justify-center text-white font-medium relative`}>
                              {p.username[0].toUpperCase()}
                              {p.isBot === 1 && (
                                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                                  <Bot className="h-3 w-3 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium flex items-center gap-2">
                                {p.username}
                                {p.isBot === 1 && (
                                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">AI</span>
                                )}
                              </div>
                              {p.id === myParticipant?.id && (
                                <div className="text-xs text-primary flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  You
                                </div>
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p className="font-medium">{p.username}</p>
                          <p className="text-zinc-400">
                            {p.isBot === 1 ? "AI Racer" : p.id === myParticipant?.id ? "Your profile" : "Human player"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={startRace}
                      disabled={participants.length < 1}
                      size="lg"
                      className="w-full"
                      data-testid="button-start-race"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Race
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="font-medium">Begin the race</p>
                    <p className="text-zinc-400">A countdown will start and the race begins!</p>
                  </TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  if (countdown !== null) {
    return (
      <TooltipProvider delayDuration={300}>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-6">
            {/* Preparation tip with tooltip */}
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-help bg-muted/30 px-4 py-2 rounded-full">
                    <Info className="h-4 w-4" />
                    <span className="text-sm">Get ready to type!</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-medium">Preparation Tips</p>
                  <ul className="text-zinc-400 text-sm list-disc list-inside mt-1">
                    <li>Position your fingers on the home row</li>
                    <li>Focus on the first few words</li>
                    <li>Race begins automatically when timer hits zero</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </div>
            
            {/* Countdown number */}
            <div className="text-9xl font-bold text-primary animate-pulse" data-testid="countdown-number">
              {countdown === 0 ? "GO!" : countdown}
            </div>
            
            {/* Dynamic instruction */}
            {countdown > 0 ? (
              <p className="text-muted-foreground text-lg flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5" />
                Position your fingers on the keyboard!
              </p>
            ) : (
              <p className="text-green-500 text-lg font-medium flex items-center justify-center gap-2">
                <Play className="h-5 w-5" />
                Start typing now!
              </p>
            )}
          </div>
        </div>
      </TooltipProvider>
    );
  }

  if (race.status === "racing" || isRacing) {
    return (
      <TooltipProvider delayDuration={300}>
        <div className="min-h-screen bg-background">
          <div className="container max-w-6xl mx-auto px-4 py-8">
            {/* Network status banner */}
            <NetworkStatusBanner
              isConnected={wsConnected}
              isReconnecting={isReconnecting}
              reconnectAttempt={reconnectAttempts.current}
              maxAttempts={maxReconnectAttempts}
              onManualRetry={manualReconnect}
            />
            
            <div className="flex items-center justify-between mb-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={leaveRace}
                    data-testid="button-forfeit-race"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Forfeit Race
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-medium text-red-400">Forfeit Race</p>
                  <p className="text-zinc-400">Leave the race. You will not be ranked.</p>
                </TooltipContent>
              </Tooltip>
              
              {/* Connection status indicator in header */}
              {wsConnected && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 text-green-500 text-sm cursor-help">
                      <Wifi className="h-4 w-4" />
                      <span>Live</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="font-medium">Connected</p>
                    <p className="text-zinc-400">Real-time updates are active</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="h-5 w-5 text-primary" />
                    Live Race Progress
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="font-medium">Real-time Leaderboard</p>
                        <p className="text-zinc-400">Track all racers' progress, speed, and accuracy as they type</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {participants
                      .sort((a, b) => b.progress - a.progress)
                      .map((p) => {
                        const progressPercent = (p.progress / race.paragraphContent.length) * 100;
                        return (
                          <div key={p.id} className="space-y-2" data-testid={`progress-${p.id}`}>
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={`h-6 w-6 rounded-full ${p.avatarColor || 'bg-primary'} flex items-center justify-center text-white text-xs cursor-help relative`}>
                                      {p.username[0].toUpperCase()}
                                      {p.isBot === 1 && (
                                        <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5">
                                          <Bot className="h-2.5 w-2.5 text-muted-foreground" />
                                        </div>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    <p className="font-medium">{p.username}</p>
                                    <p className="text-zinc-400">{p.isBot === 1 ? "AI Racer" : "Human player"}</p>
                                  </TooltipContent>
                                </Tooltip>
                                <span className="font-medium">{p.username}</span>
                                {p.id === myParticipant?.id && (
                                  <span className="text-xs text-primary">(You)</span>
                                )}
                                {p.isFinished === 1 && p.finishPosition && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-xs font-semibold text-yellow-500 cursor-help" data-testid={`text-position-${p.id}`}>
                                        {p.finishPosition === 1 ? '🥇 1st' : p.finishPosition === 2 ? '🥈 2nd' : p.finishPosition === 3 ? '🥉 3rd' : `#${p.finishPosition}`}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                      <p className="font-medium">Finished #{p.finishPosition}</p>
                                      <p className="text-zinc-400">{p.username} completed the race!</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="flex items-center gap-1 cursor-help">
                                      <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                                      {p.wpm} WPM
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">
                                    <p className="font-medium">Words Per Minute</p>
                                    <p className="text-zinc-400">Typing speed measured in words per minute</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="flex items-center gap-1 cursor-help">
                                      <Target className="h-3.5 w-3.5 text-muted-foreground" />
                                      {p.accuracy}%
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">
                                    <p className="font-medium">Accuracy</p>
                                    <p className="text-zinc-400">Percentage of characters typed correctly</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-help">
                                  <Progress value={progressPercent} className="h-3" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p className="font-medium">{Math.round(progressPercent)}% complete</p>
                                <p className="text-zinc-400">{p.progress} of {race.paragraphContent.length} characters</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              <div 
                className={`cursor-text transition-all duration-200 rounded-lg ${
                  isFocused 
                    ? 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background' 
                    : ''
                }`}
                onClick={() => hiddenInputRef.current?.focus()}
                role="application"
                aria-label="Typing test area"
              >
                {!isFocused && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground animate-pulse py-3">
                    <Info className="h-4 w-4" />
                    <span className="text-sm">Click here or press any key to focus</span>
                  </div>
                )}
                
                <div>
                  <div 
                    ref={textContainerRef}
                    className="text-xl leading-[2] font-mono select-none max-h-[280px] overflow-y-auto scroll-smooth p-8 bg-zinc-900 rounded-lg whitespace-pre-wrap break-words" 
                    data-testid="text-paragraph"
                    role="textbox"
                    aria-readonly="true"
                    aria-label="Text to type"
                    aria-describedby="typing-instructions"
                  >
                    {(() => {
                      const text = race.paragraphContent;
                      const words = text.split(/(\s+)/);
                      let charIndex = 0;
                      
                      const findCurrentWordBounds = () => {
                        let start = 0;
                        for (const word of words) {
                          const end = start + word.length;
                          if (currentIndex >= start && currentIndex < end) {
                            return { start, end };
                          }
                          start = end;
                        }
                        return { start: 0, end: text.length };
                      };
                      
                      const currentWordBounds = findCurrentWordBounds();
                      
                      return words.map((word, wordIdx) => {
                        const wordStartIdx = charIndex;
                        const isCurrentWord = currentIndex >= wordStartIdx && currentIndex < wordStartIdx + word.length;
                        const isCompletedWord = currentIndex >= wordStartIdx + word.length;
                        const isPureSpace = /^\s+$/.test(word);
                        
                        const renderedChars = word.split('').map((char, charIdx) => {
                          const idx = charIndex;
                          charIndex++;
                          
                          const state = charStates[idx] || 'pending';
                          const isCurrent = idx === currentIndex;
                          const isSpace = char === ' ';
                          
                          let className = 'transition-colors duration-75 ';
                          
                          if (state === 'correct') {
                            className += 'text-zinc-100';
                          } else if (state === 'incorrect') {
                            className += 'text-red-500 bg-red-500/20 rounded-sm';
                            if (isSpace) {
                              className += ' border-b-2 border-red-500';
                            }
                          } else if (isCurrent) {
                            className += 'text-zinc-500';
                          } else if (isCurrentWord && !isPureSpace) {
                            className += 'text-zinc-500';
                          } else {
                            className += 'text-zinc-600';
                          }
                          
                          if (isCurrent) {
                            return (
                              <span 
                                key={idx} 
                                ref={caretRef}
                                className={`${className} relative`}
                              >
                                <span 
                                  className={`absolute left-0 top-0 w-[2px] h-full bg-yellow-400 transition-all duration-100 ${
                                    isFocused ? 'animate-caret-smooth' : 'opacity-50'
                                  }`}
                                />
                                {isSpace ? '\u00A0' : char}
                              </span>
                            );
                          }
                          
                          return (
                            <span 
                              key={idx} 
                              className={className}
                            >
                              {isSpace ? '\u00A0' : char}
                            </span>
                          );
                        });
                        
                        if (isPureSpace) {
                          return <span key={`word-${wordIdx}`}>{renderedChars}</span>;
                        }
                        
                        return (
                          <span key={`word-${wordIdx}`}>
                            {renderedChars}
                          </span>
                        );
                      });
                    })()}
                  </div>
                  
                  <div id="typing-instructions" className="sr-only">
                    Type the text shown above. Use backspace to correct mistakes. Your progress is tracked in real-time.
                  </div>
                  
                  <input
                    ref={hiddenInputRef}
                    type="text"
                    onInput={handleTyping}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={handleCompositionEnd}
                    onPaste={handlePaste}
                    onCut={handleCut}
                    className="absolute opacity-0 pointer-events-none"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    data-testid="input-typing"
                    aria-label="Typing input for race"
                    aria-describedby="typing-instructions"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  if (race.status === "finished") {
    const sortedParticipants = [...participants].sort((a, b) => (a.finishPosition || 999) - (b.finishPosition || 999));
    const myResult = sortedParticipants.find(p => p.id === myParticipant?.id);
    const myPosition = myResult ? sortedParticipants.indexOf(myResult) + 1 : null;

    return (
      <TooltipProvider delayDuration={300}>
        <div className="min-h-screen bg-background">
          <div className="container max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation("/multiplayer")}
                    data-testid="button-back-to-lobby"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Lobby
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Return to multiplayer lobby</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                  Race Results
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="font-medium">Final Standings</p>
                      <p className="text-zinc-400">
                        {myPosition === 1 
                          ? "Congratulations! You won the race!" 
                          : myPosition 
                            ? `You finished in position #${myPosition}` 
                            : "Race complete - see final standings below"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {sortedParticipants.map((p, idx) => (
                    <Tooltip key={p.id}>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex items-center gap-4 p-4 border rounded-lg cursor-default transition-colors hover:border-primary/30 ${
                            p.id === myParticipant?.id ? 'border-primary bg-primary/5' : ''
                          }`}
                          data-testid={`result-${p.id}`}
                        >
                          <div className="text-2xl font-bold w-12 text-center">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                          </div>
                          <div className={`h-12 w-12 rounded-full ${p.avatarColor || 'bg-primary'} flex items-center justify-center text-white font-medium relative`}>
                            {p.username[0].toUpperCase()}
                            {p.isBot === 1 && (
                              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                                <Bot className="h-3 w-3 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium flex items-center gap-2">
                              {p.username}
                              {p.isBot === 1 && (
                                <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">AI</span>
                              )}
                            </div>
                            {p.id === myParticipant?.id && (
                              <div className="text-xs text-primary flex items-center gap-1">
                                <User className="h-3 w-3" />
                                You
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold flex items-center justify-end gap-1">
                              <Gauge className="h-4 w-4 text-muted-foreground" />
                              {p.wpm} WPM
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center justify-end gap-1">
                              <Target className="h-3 w-3" />
                              {p.accuracy}% Accuracy
                            </div>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium">{p.username} - #{idx + 1}</p>
                          <p className="text-zinc-400">
                            {p.isBot === 1 ? "AI Racer" : p.id === myParticipant?.id ? "Your result" : "Human player"}
                          </p>
                          <div className="pt-1 border-t border-zinc-700 mt-1">
                            <p className="text-zinc-300">Speed: {p.wpm} words per minute</p>
                            <p className="text-zinc-300">Accuracy: {p.accuracy}% correct</p>
                            {p.errors > 0 && <p className="text-zinc-400">Errors: {p.errors}</p>}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() => setLocation("/multiplayer")}
                        className="flex-1"
                        data-testid="button-back"
                      >
                        <Home className="h-4 w-4 mr-2" />
                        Back to Lobby
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Return to multiplayer lobby to find more races</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => window.location.reload()}
                        className="flex-1"
                        data-testid="button-rematch"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        New Race
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="font-medium">Start a new race</p>
                      <p className="text-zinc-400">Race again with similar players and text</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return null;
}
