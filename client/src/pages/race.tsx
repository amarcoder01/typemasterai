import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useNetwork } from "@/lib/network-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trophy, Copy, Check, Loader2, Home, RotateCcw, ArrowLeft, WifiOff, RefreshCw, Info, Gauge, Target, Bot, User, Users, Share2, Play, Flag, AlertTriangle, Wifi, XCircle, Timer, Sparkles, MessageCircle, Send, TrendingUp, TrendingDown, Award, Eye, Film, Zap, LogOut, Lock, ExternalLink, Twitter, Facebook, Linkedin, Mail } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { calculateWPM, calculateAccuracy } from "@/lib/typing-utils";
import { RaceCertificate } from "@/components/RaceCertificate";
import { getTypingPerformanceRating } from "@/lib/share-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  raceType?: string;
  timeLimitSeconds?: number | null;
  startedAt?: string | null;
}

interface Participant {
  id: number;
  raceId: number;
  username: string;
  avatarColor: string | null;
  isBot?: number | boolean;
  progress: number;
  wpm: number;
  accuracy: number;
  errors: number;
  isFinished: number;
  finishPosition: number | null;
  rating?: number | null;
  tier?: string | null;
  tierInfo?: {
    name: string;
    color: string;
    minRating: number;
  } | null;
  ratingChange?: number | null;
  userId?: string | null;
}

interface ChatMessage {
  id: number;
  username: string;
  avatarColor: string | null;
  message: string;
  isSystem: boolean;
  createdAt: string;
}

interface RatingInfo {
  rating: number;
  tier: string;
  tierInfo?: {
    name: string;
    color: string;
    minRating: number;
  };
  ratingChange?: number;
}

const MAX_CHAT_LENGTH = 500;

function RaceChat({
  raceId,
  participantId,
  username,
  avatarColor,
  sendWsMessage,
  messages,
  isEnabled,
  isCompact = false,
  wsConnected = true
}: {
  raceId: number;
  participantId: number;
  username: string;
  avatarColor: string | null;
  sendWsMessage: (msg: any) => void;
  messages: ChatMessage[];
  isEnabled: boolean;
  isCompact?: boolean;
  wsConnected?: boolean;
}) {
  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CHAT_LENGTH) {
      setInput(value);
      if (sendError) setSendError(null);
    }
  };

  const sendMessage = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || !isEnabled) return;
    
    if (!wsConnected) {
      setSendError("Connection lost");
      toast.error("Cannot send message", { 
        description: "Connection lost. Reconnecting...",
        icon: <WifiOff className="h-4 w-4" />
      });
      return;
    }
    
    if (trimmedInput.length > MAX_CHAT_LENGTH) {
      setSendError("Message too long");
      toast.error("Message too long", { 
        description: `Maximum ${MAX_CHAT_LENGTH} characters allowed`,
        icon: <AlertTriangle className="h-4 w-4" />
      });
      return;
    }
    
    setSendError(null);
    
    try {
      sendWsMessage({
        type: "chat_message",
        raceId,
        participantId,
        content: trimmedInput,
      });
      setInput("");
    } catch (error) {
      setSendError("Failed to send");
      toast.error("Failed to send message", { 
        description: "Please check your connection and try again",
        icon: <XCircle className="h-4 w-4" />
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getDisabledReason = (): string => {
    if (!wsConnected) return "Reconnecting to server...";
    if (!isEnabled) return "Chat disabled during active typing";
    return "";
  };

  const isInputDisabled = !isEnabled || !wsConnected;

  if (isCompact) {
    return (
      <TooltipProvider delayDuration={300}>
        <div className="border rounded-lg p-2 bg-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help">
                  <MessageCircle className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium">Chat</span>
                  {!wsConnected && <WifiOff className="h-3 w-3 text-yellow-500" />}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="font-medium">Race Chat</p>
                <p className="text-zinc-400">
                  {wsConnected 
                    ? "Chat with other racers. Press Enter to send."
                    : "Reconnecting to chat server..."}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div 
            ref={scrollRef}
            className="h-20 overflow-y-auto mb-1 space-y-1"
          >
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-1">
                No messages
              </p>
            ) : (
              messages.slice(-10).map((msg, idx) => (
                <Tooltip key={msg.id || idx}>
                  <TooltipTrigger asChild>
                    <div className={`text-xs cursor-default ${msg.isSystem ? 'text-muted-foreground italic' : ''}`}>
                      {!msg.isSystem && (
                        <span className="font-medium text-primary">
                          {msg.username}:
                        </span>
                      )}{" "}
                      <span>{msg.message}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="text-xs">{msg.isSystem ? "System message" : `From ${msg.username}`}</p>
                  </TooltipContent>
                </Tooltip>
              ))
            )}
          </div>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-1">
                  <Input
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={isInputDisabled ? getDisabledReason() || "Disabled" : "Chat..."}
                    disabled={isInputDisabled}
                    maxLength={MAX_CHAT_LENGTH}
                    className={`text-xs h-6 ${sendError ? 'border-red-500' : ''}`}
                    data-testid="input-chat-compact"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{isInputDisabled ? getDisabledReason() : "Type your message here"}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={sendMessage}
                  disabled={isInputDisabled || !input.trim()}
                  className="h-6 px-2"
                  data-testid="button-send-chat-compact"
                >
                  <Send className="h-2.5 w-2.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Send message (Enter)</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Card className="h-64">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help">
                  <MessageCircle className="h-4 w-4" />
                  Race Chat
                  {!wsConnected && <WifiOff className="h-3 w-3 text-yellow-500" />}
                  <Info className="h-3 w-3 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="font-medium">Race Chat</p>
                <p className="text-zinc-400">
                  Chat with other participants before and after the race. 
                  Chat is disabled during active typing to prevent distraction.
                </p>
                <p className="text-zinc-400 mt-1">
                  <span className="text-primary">Tip:</span> Press Enter to send, max {MAX_CHAT_LENGTH} characters.
                </p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 h-[calc(100%-4rem)]">
          <div className="flex flex-col h-full">
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto pr-2 mb-2"
            >
              <div className="space-y-2">
                {messages.length === 0 ? (
                  <div className="text-center py-4">
                    <MessageCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      No messages yet. Say hi!
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <Tooltip key={msg.id || idx}>
                      <TooltipTrigger asChild>
                        <div className={`text-xs cursor-default hover:bg-muted/30 rounded px-1 py-0.5 transition-colors ${msg.isSystem ? 'text-muted-foreground italic' : ''}`}>
                          {!msg.isSystem && (
                            <span className="font-medium text-primary">
                              {msg.username}:
                            </span>
                          )}{" "}
                          <span>{msg.message}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p className="text-xs">
                          {msg.isSystem 
                            ? "System notification" 
                            : `Message from ${msg.username}`}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ))
                )}
              </div>
            </div>
            <div className="space-y-1">
              {sendError && (
                <div className="flex items-center gap-1 text-xs text-red-500">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{sendError}</span>
                </div>
              )}
              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex-1">
                      <Input
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={isInputDisabled ? getDisabledReason() || "Chat disabled during race" : "Type a message..."}
                        disabled={isInputDisabled}
                        maxLength={MAX_CHAT_LENGTH}
                        className={`text-xs h-7 ${sendError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        data-testid="input-chat"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="font-medium">
                      {isInputDisabled ? getDisabledReason() : "Message Input"}
                    </p>
                    {!isInputDisabled && (
                      <p className="text-zinc-400">Press Enter to send</p>
                    )}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={sendMessage}
                      disabled={isInputDisabled || !input.trim()}
                      className="h-7 px-2"
                      data-testid="button-send-chat"
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="font-medium">Send Message</p>
                    <p className="text-zinc-400">Or press Enter</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center justify-between">
                {input.length > MAX_CHAT_LENGTH * 0.8 ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`text-xs flex items-center gap-1 ${input.length >= MAX_CHAT_LENGTH ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {input.length >= MAX_CHAT_LENGTH && <AlertTriangle className="h-3 w-3" />}
                        {input.length}/{MAX_CHAT_LENGTH}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{input.length >= MAX_CHAT_LENGTH ? "Character limit reached!" : `${MAX_CHAT_LENGTH - input.length} characters remaining`}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : <div />}
                {!wsConnected && (
                  <div className="text-xs text-yellow-500 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Reconnecting...
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

const TIER_DESCRIPTIONS: Record<string, string> = {
  bronze: "Starting tier. Keep practicing to climb!",
  silver: "You're improving! Aim for Gold next.",
  gold: "Solid skills! Top 50% of players.",
  platinum: "Excellent typing speed! Top 25%.",
  diamond: "Elite typist! Top 10% of all players.",
  master: "Exceptional! Top 5% of players.",
  grandmaster: "Legendary status! Top 1% of all typists.",
};

function RatingChangeDisplay({ ratingInfo, position }: { ratingInfo: RatingInfo | null; position: number | null }) {
  if (!ratingInfo) return null;

  const isPositive = (ratingInfo.ratingChange || 0) >= 0;
  const tierColor = ratingInfo.tierInfo?.color || "gray";
  const tierDescription = TIER_DESCRIPTIONS[ratingInfo.tier.toLowerCase()] || "Keep racing to improve!";

  return (
    <TooltipProvider delayDuration={300}>
      <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
        <div className="flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-help">
                <Award className="h-5 w-5 text-primary" />
                <span className="font-medium">Your Rating</span>
                <Info className="h-3 w-3 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="font-medium">ELO Skill Rating</p>
              <p className="text-zinc-400">
                Your competitive rating based on race performance. 
                Win against higher-rated players to gain more points.
              </p>
              <p className="text-zinc-400 mt-1">
                <span className="text-primary">Range:</span> 100 - 3000
              </p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className="capitalize cursor-help"
                style={{ borderColor: tierColor, color: tierColor }}
              >
                {ratingInfo.tierInfo?.name || ratingInfo.tier}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="font-medium capitalize" style={{ color: tierColor }}>
                {ratingInfo.tierInfo?.name || ratingInfo.tier} Tier
              </p>
              <p className="text-zinc-400">{tierDescription}</p>
              {ratingInfo.tierInfo?.minRating && (
                <p className="text-zinc-400 mt-1">
                  <span className="text-primary">Min rating:</span> {ratingInfo.tierInfo.minRating}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-2xl font-bold cursor-help">{ratingInfo.rating}</div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-medium">Current Rating: {ratingInfo.rating}</p>
              <p className="text-zinc-400">Your skill level compared to other players</p>
            </TooltipContent>
          </Tooltip>
          {ratingInfo.ratingChange !== undefined && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-1 text-sm font-medium cursor-help ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {isPositive ? '+' : ''}{ratingInfo.ratingChange}
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="font-medium">
                  {isPositive ? 'Rating Gained' : 'Rating Lost'}
                </p>
                <p className="text-zinc-400">
                  {isPositive 
                    ? `Great race! You gained ${ratingInfo.ratingChange} points.`
                    : `You lost ${Math.abs(ratingInfo.ratingChange)} points. Keep practicing!`}
                </p>
                {position !== null && (
                  <p className="text-zinc-400 mt-1">
                    <span className="text-primary">Finish position:</span> #{position}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

function RaceFinishBanner({ 
  position, 
  totalPlayers, 
  wpm, 
  accuracy, 
  isWinner,
  onDismiss 
}: { 
  position: number | null; 
  totalPlayers: number;
  wpm: number;
  accuracy: number;
  isWinner: boolean;
  onDismiss: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
    setTimeout(() => setShowStats(true), 800);
    
    if (isWinner) {
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      
      const runConfetti = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFD700', '#FFA500', '#FF6347']
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFD700', '#FFA500', '#FF6347']
        });
        
        if (Date.now() < animationEnd) {
          requestAnimationFrame(runConfetti);
        }
      };
      runConfetti();
    }
  }, [isWinner]);

  const getPositionDisplay = () => {
    if (!position) return { emoji: '🏁', text: 'Race Complete!', color: 'text-blue-400' };
    switch (position) {
      case 1: return { emoji: '🏆', text: '1st Place!', color: 'text-yellow-400' };
      case 2: return { emoji: '🥈', text: '2nd Place!', color: 'text-gray-300' };
      case 3: return { emoji: '🥉', text: '3rd Place!', color: 'text-amber-600' };
      default: return { emoji: '🏁', text: `#${position} of ${totalPlayers}`, color: 'text-blue-400' };
    }
  };

  const positionInfo = getPositionDisplay();

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={onDismiss}
      data-testid="race-finish-banner"
    >
      <div 
        className={`text-center transform transition-all duration-700 ${isVisible ? 'scale-100 translate-y-0' : 'scale-75 translate-y-10'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`text-8xl mb-4 animate-bounce`}>
          {positionInfo.emoji}
        </div>
        
        <h1 className={`text-5xl md:text-6xl font-bold ${positionInfo.color} mb-2 drop-shadow-lg`}>
          {positionInfo.text}
        </h1>
        
        {isWinner && (
          <p className="text-xl text-yellow-300 mb-4 animate-pulse">
            ✨ Congratulations, Champion! ✨
          </p>
        )}
        
        <div className={`mt-6 transition-all duration-500 ${showStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center justify-center gap-8 text-white">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">{wpm}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1 justify-center">
                <Gauge className="h-4 w-4" />
                WPM
              </div>
            </div>
            <div className="w-px h-12 bg-muted-foreground/30" />
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400">{accuracy}%</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1 justify-center">
                <Target className="h-4 w-4" />
                Accuracy
              </div>
            </div>
          </div>
        </div>
        
        <div className={`mt-8 transition-all duration-500 delay-300 ${showStats ? 'opacity-100' : 'opacity-0'}`}>
          <Button 
            size="lg" 
            onClick={onDismiss}
            className="px-8 py-3 text-lg bg-primary hover:bg-primary/90"
            data-testid="button-view-results"
          >
            <Trophy className="h-5 w-5 mr-2" />
            View Results
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function RacePage() {
  const [, params] = useRoute("/race/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { isOnline, wasOffline } = useNetwork();
  
  const [race, setRace] = useState<Race | null>(null);
  const raceRef = useRef<Race | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myParticipant, setMyParticipant] = useState<Participant | null>(null);
  const myParticipantRef = useRef<Participant | null>(null);
  const [hostParticipantId, setHostParticipantId] = useState<number | null>(null);
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
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
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
  const timedFinishSentRef = useRef(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [ratingInfo, setRatingInfo] = useState<RatingInfo | null>(null);
  const [showFinishBanner, setShowFinishBanner] = useState(false);
  const finishBannerDismissedRef = useRef(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState("");
  const [finishBannerData, setFinishBannerData] = useState<{
    position: number | null;
    totalPlayers: number;
    wpm: number;
    accuracy: number;
  } | null>(null);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [readyStates, setReadyStates] = useState<Map<number, boolean>>(new Map());
  const [isRoomLocked, setIsRoomLocked] = useState(false);
  const [rematchInfo, setRematchInfo] = useState<{
    newRaceId: number;
    roomCode: string;
    createdBy: string;
  } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [certificateImageCopied, setCertificateImageCopied] = useState(false);
  const [isSharingCertificate, setIsSharingCertificate] = useState(false);
  const [lastResultSnapshot, setLastResultSnapshot] = useState<{
    wpm: number;
    accuracy: number;
    consistency: number;
    placement: number;
    totalParticipants: number;
    characters: number;
    errors: number;
    duration: number;
  } | null>(null);

  useEffect(() => {
    raceRef.current = race;
  }, [race]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    errorsRef.current = errors;
  }, [errors]);

  useEffect(() => {
    myParticipantRef.current = myParticipant;
  }, [myParticipant]);

  useEffect(() => {
    if (!params?.id) return;

    // Reset state for new race
    finishBannerDismissedRef.current = false;
    setShowFinishBanner(false);
    setFinishBannerData(null);
    
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
      
      // Update time remaining for timed races
      if (race?.raceType === "timed" && race.timeLimitSeconds) {
        const remaining = Math.max(0, race.timeLimitSeconds - elapsed);
        setTimeRemaining(remaining);
        
        // Handle time running out - only send once
        if (remaining <= 0 && myParticipant && !myParticipant.isFinished && !timedFinishSentRef.current) {
          timedFinishSentRef.current = true;
          // Send finish message via WebSocket when time runs out
          sendWsMessage({
            type: "timed_finish",
            raceId: race.id,
            participantId: myParticipant.id,
            progress: idx,
            wpm: wpm,
            accuracy: accuracy,
            errors: errs
          });
        }
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [isRacing, startTime, race?.raceType, race?.timeLimitSeconds, race?.id, myParticipant]);

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

  // Handle case where race is already finished when loaded (e.g., after reconnect or page refresh)
  useEffect(() => {
    // Don't show banner again if user already dismissed it
    if (finishBannerDismissedRef.current) return;
    
    if (race?.status === "finished" && !showFinishBanner) {
      console.log("[Race Debug] Detected finished race from API/state");
      
      // If participants are empty, refetch race data to get results
      if (participants.length === 0) {
        console.log("[Race Debug] No participants loaded, refetching race data");
        fetchRaceData();
        return;
      }
      
      console.log("[Race Debug] Showing finish banner with", participants.length, "participants");
      const sortedParticipants = [...participants].sort((a, b) => (a.finishPosition || 999) - (b.finishPosition || 999));
      
      // Try to find my result, or use the first participant if myParticipant is null
      const myResult = myParticipant 
        ? sortedParticipants.find(p => p.id === myParticipant.id)
        : sortedParticipants[0]; // Fallback for when myParticipant isn't loaded
      
      if (myResult) {
        const chars = (myResult as any).characters || myResult.wpm * 5;
        const consistency = Math.max(0, Math.min(100, Math.round(100 - ((chars - myResult.wpm * 5) / chars) * 100)));
        
        setFinishBannerData({
          position: myResult.finishPosition || null,
          totalPlayers: participants.length,
          wpm: myResult.wpm,
          accuracy: myResult.accuracy,
        });
        
        setLastResultSnapshot({
          wpm: myResult.wpm,
          accuracy: myResult.accuracy,
          consistency: consistency || 85,
          placement: myResult.finishPosition || participants.length,
          totalParticipants: participants.length,
          characters: chars,
          errors: Math.round(chars * (1 - myResult.accuracy / 100)),
          duration: (race as any)?.duration || 60,
        });
        
        setShowFinishBanner(true);
        setIsRacing(false);
      }
    }
  }, [race?.status, myParticipant, participants, showFinishBanner]);

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
        if (message.hostParticipantId) {
          setHostParticipantId(message.hostParticipantId);
        }
        if (message.participants) {
          message.participants.forEach((p: Participant) => {
            seenParticipantJoinsRef.current.add(p.id);
          });
        }
        // Handle joining a race that's already in progress
        if (message.race.status === "racing") {
          setIsRacing(true);
          setStartTime(message.race.startedAt ? new Date(message.race.startedAt).getTime() : Date.now());
          setCurrentIndex(0);
          setErrors(0);
          currentIndexRef.current = 0;
          errorsRef.current = 0;
          if (message.race.paragraphContent) {
            setCharStates(new Array(message.race.paragraphContent.length).fill('pending'));
          }
        } else if (message.race.status === "countdown") {
          setCountdown(3);
        }
        break;
      case "participant_joined":
        setParticipants(message.participants);
        if (message.hostParticipantId) {
          setHostParticipantId(message.hostParticipantId);
        }
        if (message.participant && !seenParticipantJoinsRef.current.has(message.participant.id)) {
          seenParticipantJoinsRef.current.add(message.participant.id);
          toast.success(`${message.participant.username} joined the race!`);
        }
        break;
      case "participants_sync":
        setParticipants(message.participants);
        if (message.hostParticipantId) {
          setHostParticipantId(message.hostParticipantId);
        }
        break;
      case "bots_added":
        fetchRaceData();
        toast.info("More players joined!", { duration: 2000 });
        break;
      case "countdown_start":
        setIsStarting(false);
        setIsTransitioning(false);
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
        if (raceRef.current) {
          setRace({ ...raceRef.current, status: "racing" });
          setCharStates(new Array(raceRef.current.paragraphContent.length).fill('pending'));
        }
        toast.success("Race started! Type as fast as you can!");
        break;
      case "paragraph_extended":
        if (raceRef.current) {
          const newContent = raceRef.current.paragraphContent + " " + message.additionalContent;
          setRace({ ...raceRef.current, paragraphContent: newContent });
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
        if (raceRef.current) {
          setRace({ ...raceRef.current, status: "finished" });
        }
        // Use ref to get current participant ID (avoids stale closure issues)
        const currentParticipant = myParticipantRef.current;
        const myResult = message.results.find((p: Participant) => p.id === currentParticipant?.id);
        
        // If myResult found, use server values; otherwise default to 100% accuracy for no typing
        const finalWpm = myResult?.wpm ?? 0;
        const finalAccuracy = myResult?.accuracy ?? 100;
        const finalCharacters = myResult?.characters || finalWpm * 5;
        const finalConsistency = Math.max(0, Math.min(100, Math.round(100 - ((finalCharacters - finalWpm * 5) / finalCharacters) * 100))) || 85;
        
        setFinishBannerData({
          position: myResult?.finishPosition || null,
          totalPlayers: message.results.length,
          wpm: finalWpm,
          accuracy: finalAccuracy,
        });
        
        setLastResultSnapshot({
          wpm: finalWpm,
          accuracy: finalAccuracy,
          consistency: finalConsistency,
          placement: myResult?.finishPosition || message.results.length,
          totalParticipants: message.results.length,
          characters: finalCharacters,
          errors: Math.round(finalCharacters * (1 - finalAccuracy / 100)),
          duration: (raceRef.current as any)?.duration || 60,
        });
        
        setShowFinishBanner(true);
        
        if (user) {
          fetch("/api/ratings/me")
            .then(res => res.json())
            .then(data => {
              if (data.rating) {
                setRatingInfo(data.rating);
              }
            })
            .catch(err => console.error("Failed to fetch rating:", err));
        }
        break;
      case "participant_left":
        setParticipants(prev => prev.filter(p => p.id !== message.participantId));
        break;
      case "participant_dnf":
        // Mark participant as DNF (Did Not Finish)
        setParticipants(prev => prev.map(p => 
          p.id === message.participantId 
            ? { ...p, isFinished: 1, finishPosition: 999 }
            : p
        ));
        toast.info(`${message.username} left the race (DNF)`, { duration: 2000 });
        break;
      case "chat_message":
        const chatData = message.message || message;
        setChatMessages(prev => [...prev, {
          id: chatData.id || Date.now(),
          username: chatData.username,
          avatarColor: chatData.avatarColor,
          message: chatData.content || chatData.message,
          isSystem: chatData.isSystem || false,
          createdAt: chatData.createdAt || new Date().toISOString(),
        }]);
        break;
      case "rating_update":
        if (message.userId === user?.id) {
          setRatingInfo({
            rating: message.newRating,
            tier: message.tier,
            tierInfo: message.tierInfo,
            ratingChange: message.ratingChange,
          });
        }
        break;
      case "ready_state_update":
        // Update ready states for all participants
        if (message.readyStates) {
          const newReadyStates = new Map<number, boolean>();
          for (const { participantId, isReady: ready } of message.readyStates) {
            newReadyStates.set(participantId, ready);
          }
          setReadyStates(newReadyStates);
          // Update our own ready state if it changed
          if (myParticipantRef.current && message.participantId === myParticipantRef.current.id) {
            setIsReady(message.isReady);
          }
        }
        break;
      case "player_kicked":
        // Remove kicked player from participants
        setParticipants(prev => prev.filter(p => p.id !== message.participantId));
        setReadyStates(prev => {
          const newStates = new Map(prev);
          newStates.delete(message.participantId);
          return newStates;
        });
        toast.info(`${message.username} was kicked from the room`, { duration: 3000 });
        break;
      case "kicked":
        // We were kicked from the room
        toast.error(message.message || "You have been kicked from the room", { duration: 5000 });
        setLocation("/multiplayer");
        break;
      case "room_lock_changed":
        setIsRoomLocked(message.isLocked);
        toast.info(message.isLocked ? "Room is now locked" : "Room is now unlocked", { duration: 2000 });
        break;
      case "rematch_available":
        setRematchInfo({
          newRaceId: message.newRaceId,
          roomCode: message.roomCode,
          createdBy: message.createdBy,
        });
        toast.success(`Rematch created! Room code: ${message.roomCode}`, { 
          duration: 10000,
          action: {
            label: "Join",
            onClick: () => setLocation(`/race/${message.newRaceId}?code=${message.roomCode}`)
          }
        });
        break;
      case "error":
        // Handle server-side errors with typed error codes
        switch (message.code) {
          case "CHAT_RATE_LIMITED":
            toast.error("Slow down!", { 
              description: message.message || "Please wait before sending another message",
              duration: 2000
            });
            break;
          case "NOT_HOST":
            toast.error("Permission denied", { 
              description: message.message || "Only the host can do this",
              duration: 3000
            });
            break;
          case "NOT_ENOUGH_PLAYERS":
            toast.warning("Not enough players", { 
              description: message.message || "Need at least 2 players to start",
              duration: 4000
            });
            break;
          case "PLAYERS_NOT_READY":
            toast.warning("Players not ready", { 
              description: message.message || "All players must be ready to start",
              duration: 4000
            });
            break;
          case "ROOM_LOCKED":
            toast.error("Room locked", { 
              description: message.message || "This room is not accepting new players",
              duration: 3000
            });
            break;
          case "KICKED":
            toast.error("Kicked", { 
              description: message.message || "You have been kicked from the room",
              duration: 5000
            });
            setLocation("/multiplayer");
            break;
          default:
            if (message.message) {
              toast.error(message.message, { duration: 3000 });
            }
            console.warn("Server error:", message.code, message.message);
        }
        break;
      case "countdown_cancelled":
        // Countdown was cancelled (player left during countdown)
        setCountdown(null);
        setIsStarting(false);
        toast.warning("Race cancelled", { 
          description: message.reason || "Not enough players to start",
          duration: 4000
        });
        break;
      case "host_changed":
        // Host was transferred to another player
        if (message.newHostParticipantId) {
          setHostParticipantId(message.newHostParticipantId);
          if (myParticipantRef.current?.id === message.newHostParticipantId) {
            toast.success("You are now the host!", { duration: 3000 });
          } else {
            toast.info(message.message || `${message.newHostUsername || 'A player'} is now the host`, { duration: 3000 });
          }
        }
        break;
      case "participant_disconnected":
        // A player disconnected (may reconnect)
        setParticipants(prev => prev.map(p => 
          p.id === message.participantId 
            ? { ...p, isDisconnected: true } 
            : p
        ));
        if (message.username) {
          toast.warning(`${message.username} disconnected`, { 
            description: "They may reconnect...",
            duration: 3000
          });
        }
        break;
      case "participant_reconnected":
        // A player reconnected after disconnection
        setParticipants(prev => prev.map(p => 
          p.id === message.participantId 
            ? { ...p, isDisconnected: false } 
            : p
        ));
        if (message.username) {
          toast.success(`${message.username} reconnected!`, { duration: 3000 });
        }
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

  function copyShareLink() {
    if (race) {
      const shareUrl = `${window.location.origin}/race/${race.id}?code=${race.roomCode}`;
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Invite link copied! Share it with friends.");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function startRace() {
    if (!participants.length || isStarting || isTransitioning) return;
    
    // Only the host can start the race
    if (hostParticipantId && myParticipant?.id !== hostParticipantId) {
      toast.error("Only the room host can start the race");
      return;
    }
    
    setIsStarting(true);
    setIsTransitioning(true);
    setTransitionMessage("Preparing race...");
    sendWsMessage({
      type: "ready",
      raceId: race?.id,
      participantId: myParticipant?.id,
    });
  }

  function handleLeaveClick() {
    // Show confirmation dialog if race is active (racing or countdown)
    if (race && (race.status === "racing" || race.status === "countdown" || isRacing)) {
      setShowLeaveConfirmation(true);
    } else {
      // For waiting or finished races, leave immediately
      confirmLeaveRace();
    }
  }
  
  function confirmLeaveRace() {
    setIsLeaving(true);
    setShowLeaveConfirmation(false);
    
    try {
      if (myParticipant && race) {
        // Send leave with current progress for DNF tracking
        sendWsMessage({
          type: "leave",
          raceId: race.id,
          participantId: myParticipant.id,
          isRacing: isRacing || race.status === "racing",
          progress: currentIndex,
          wpm: liveWpm,
          accuracy: liveAccuracy,
        });
        
        // Clean up local storage
        localStorage.removeItem(`race_${race.id}_participant`);
        localStorage.removeItem(`race_${race.roomCode}_participant`);
        
        toast.info("You left the race", { duration: 2000 });
      } else {
        // Edge case: race or participant data missing
        console.warn("[Leave Race] Missing race or participant data");
        toast.warning("Leaving race...", { duration: 1500 });
      }
    } catch (error) {
      console.error("[Leave Race] Error leaving race:", error);
      toast.error("Failed to leave race properly. Redirecting...", { duration: 2000 });
    } finally {
      // Always redirect to multiplayer, even if there was an error
      setTimeout(() => {
        setLocation("/multiplayer");
      }, 100);
    }
  }
  
  function cancelLeaveRace() {
    setShowLeaveConfirmation(false);
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

  // Handle transition state (starting race) - but not if countdown has started
  if (isTransitioning && countdown === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="h-20 w-20 mx-auto rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className="h-8 w-8 text-primary animate-pulse" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold">{transitionMessage}</p>
            <p className="text-muted-foreground mt-2">Get ready to type!</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle countdown state - check this BEFORE waiting room
  if (countdown !== null || race.status === "countdown") {
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
              {countdown === 0 ? "GO!" : countdown ?? "..."}
            </div>
            
            {/* Dynamic instruction */}
            {countdown === null || countdown > 0 ? (
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
                    onClick={handleLeaveClick}
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
                          <p className="text-zinc-400">Share your room code with friends to invite them to race!</p>
                        </TooltipContent>
                      </Tooltip>
                    </CardTitle>
                    <CardDescription>Share the room code with friends</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
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
                </div>
                
                {/* Room Settings Display */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Timer className="h-4 w-4" />
                    <span>{race.timeLimitSeconds ? `${race.timeLimitSeconds}s race` : 'Untimed'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{race.maxPlayers} players max</span>
                  </div>
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
                    {participants.length === 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-center py-6 text-muted-foreground cursor-help border-2 border-dashed border-muted rounded-lg">
                            <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm font-medium">Waiting for players to join...</p>
                            <p className="text-xs mt-1 opacity-70">Share the room code to invite friends</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="font-medium">Invite Players</p>
                          <p className="text-zinc-400">
                            Share the room code with friends to invite them.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      participants.map((p) => {
                        const playerReady = readyStates.get(p.id) ?? (p.id === hostParticipantId);
                        return (
                          <div
                            key={p.id}
                            className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                              p.id === myParticipant?.id ? 'border-primary/50 bg-primary/5' : ''
                            } ${p.id === hostParticipantId ? 'border-yellow-500/50' : ''
                            } ${playerReady ? 'bg-green-500/5' : ''}`}
                            data-testid={`participant-${p.id}`}
                          >
                            <div className={`h-10 w-10 rounded-full ${p.avatarColor || 'bg-primary'} flex items-center justify-center text-white font-medium relative`}>
                              {p.username[0].toUpperCase()}
                              {p.id === hostParticipantId && (
                                <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-0.5">
                                  <Trophy className="h-3 w-3 text-white" />
                                </div>
                              )}
                              {playerReady && p.id !== hostParticipantId && (
                                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium flex items-center gap-2 flex-wrap">
                                <span className="truncate">{p.username}</span>
                                {p.id === hostParticipantId && (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0 border-yellow-500 text-yellow-500 shrink-0">
                                    Host
                                  </Badge>
                                )}
                                {playerReady && (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0 border-green-500 text-green-500 shrink-0">
                                    Ready
                                  </Badge>
                                )}
                              </div>
                              {p.id === myParticipant?.id && (
                                <div className="text-xs text-primary flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  You
                                </div>
                              )}
                            </div>
                            {/* Kick button - only visible to host for other players */}
                            {myParticipant?.id === hostParticipantId && p.id !== myParticipant?.id && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    onClick={() => {
                                      sendWsMessage({
                                        type: "kick_player",
                                        raceId: race.id,
                                        participantId: myParticipant.id,
                                        targetParticipantId: p.id,
                                      });
                                    }}
                                    data-testid={`kick-player-${p.id}`}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Kick {p.username}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {myParticipant && (
                  <RaceChat
                    raceId={race.id}
                    participantId={myParticipant.id}
                    username={myParticipant.username}
                    avatarColor={myParticipant.avatarColor}
                    sendWsMessage={sendWsMessage}
                    messages={chatMessages}
                    isEnabled={true}
                    wsConnected={wsConnected}
                  />
                )}

                {/* Host controls: Lock room toggle */}
                {myParticipant?.id === hostParticipantId && (
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 text-sm cursor-help">
                          <Lock className="h-4 w-4" />
                          <span>Lock Room</span>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px]">
                        <p>When locked, no new players can join the room. Use this once all your friends have joined to prevent strangers from entering.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Button
                      variant={isRoomLocked ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        sendWsMessage({
                          type: "lock_room",
                          raceId: race.id,
                          participantId: myParticipant.id,
                          locked: !isRoomLocked,
                        });
                      }}
                      data-testid="button-lock-room"
                    >
                      {isRoomLocked ? "Unlock" : "Lock"}
                    </Button>
                  </div>
                )}

                {/* Show Start Race button only for the host, or show waiting message for others */}
                {/* Minimum 2 players required - like TypeRacer and other real typing race sites */}
                {(!hostParticipantId || myParticipant?.id === hostParticipantId) ? (
                  <div className="space-y-2">
                    {participants.length < 2 && (
                      <div className="flex items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>Waiting for at least 1 more player to join...</span>
                      </div>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={startRace}
                          disabled={participants.length < 2 || isStarting}
                          size="lg"
                          className="w-full"
                          data-testid="button-start-race"
                        >
                          {isStarting ? (
                            <>
                              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              Starting...
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              {participants.length < 2 
                                ? `Start Race (Need ${2 - participants.length} more)` 
                                : 'Start Race'}
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        {participants.length < 2 ? (
                          <>
                            <p className="font-medium">Need more players</p>
                            <p className="text-zinc-400">Share the room code with friends to start racing!</p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium">Begin the race</p>
                            <p className="text-zinc-400">A countdown will start and the race begins!</p>
                          </>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ) : (
                  <div className="w-full py-3 px-4 bg-muted/50 rounded-lg text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Waiting for host to start the race...</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  if (race.status === "racing" || isRacing) {
    return (
      <TooltipProvider delayDuration={300}>
        {/* Leave Race Confirmation Dialog */}
        <AlertDialog open={showLeaveConfirmation} onOpenChange={setShowLeaveConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Are you sure you want to leave?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>You're in the middle of an active race. If you leave now:</p>
                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                    <li>You'll be marked as <strong>DNF</strong> (Did Not Finish)</li>
                    <li>Your current progress won't be saved</li>
                    <li>Any rating changes will be forfeited</li>
                  </ul>
                  <p className="text-sm font-medium text-muted-foreground mt-2">
                    Current progress: {currentIndex} characters typed
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelLeaveRace}>
                Keep Racing
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmLeaveRace}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, Leave Race
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
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
                    variant="outline"
                    size="sm"
                    onClick={handleLeaveClick}
                    disabled={isLeaving}
                    className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                    data-testid="button-leave-race"
                  >
                    {isLeaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Leaving...
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4 mr-2" />
                        Leave Race
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="font-medium">Click to leave race</p>
                  <p className="text-zinc-400 text-xs">You'll be asked to confirm. Leaving marks you as DNF (Did Not Finish).</p>
                </TooltipContent>
              </Tooltip>
              
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flag className="h-5 w-5 text-primary" />
                      {race.raceType === "timed" ? "Timed Race" : "Live Race Progress"}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p className="font-medium">Real-time Leaderboard</p>
                          <p className="text-zinc-400">
                            {race.raceType === "timed" 
                              ? "Type as much as you can before time runs out!" 
                              : "Track all racers' progress, speed, and accuracy as they type"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    {race.raceType === "timed" && timeRemaining !== null && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg cursor-help ${
                            timeRemaining <= 10 
                              ? 'bg-red-500/20 text-red-400 animate-pulse' 
                              : timeRemaining <= 30 
                                ? 'bg-yellow-500/20 text-yellow-400' 
                                : 'bg-primary/20 text-primary'
                          }`}>
                            <Timer className="h-5 w-5" />
                            <span data-testid="time-remaining">
                              {Math.floor(timeRemaining / 60)}:{String(Math.floor(timeRemaining % 60)).padStart(2, '0')}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="font-medium">Time Remaining</p>
                          <p className="text-zinc-400">
                            {timeRemaining <= 10 
                              ? "Hurry! Almost out of time!" 
                              : "Keep typing to maximize your WPM!"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
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
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    <p className="font-medium">{p.username}</p>
                                    <p className="text-zinc-400">{p.id === myParticipant?.id ? "You" : "Racer"}</p>
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
                    className="absolute inset-0 opacity-0 w-full h-full cursor-text"
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
              
              {/* Chat is hidden during active racing to minimize distractions */}
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
        {showFinishBanner && finishBannerData && (
          <RaceFinishBanner
            position={finishBannerData.position}
            totalPlayers={finishBannerData.totalPlayers}
            wpm={finishBannerData.wpm}
            accuracy={finishBannerData.accuracy}
            isWinner={finishBannerData.position === 1}
            onDismiss={() => {
              finishBannerDismissedRef.current = true;
              setShowFinishBanner(false);
            }}
          />
        )}
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
                      <div className="pt-2 border-t border-zinc-700 mt-2">
                        <p className="text-xs font-medium text-zinc-300">Tie-breaking rules:</p>
                        <ol className="text-xs text-zinc-400 list-decimal list-inside">
                          <li>Higher WPM wins</li>
                          <li>If tied: Higher accuracy wins</li>
                          <li>If still tied: More characters typed wins</li>
                          <li>Final tie: Who joined first wins</li>
                        </ol>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {myResult && lastResultSnapshot && (
                  <div className="flex justify-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => setShareDialogOpen(true)}
                          className="gap-2"
                          data-testid="button-share-race-results"
                        >
                          <Share2 className="w-4 h-4" />
                          Share Race Certificate
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs">Share your race achievement with professional certificate</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
                
                <div className="space-y-3">
                  {sortedParticipants.map((p, idx) => {
                    const isParticipantBot = p.isBot === 1 || p.isBot === true;
                    const tierColor = p.tierInfo?.color || 'gray';
                    return (
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
                            <div className={`h-12 w-12 rounded-full ${p.avatarColor || 'bg-primary'} flex items-center justify-center text-white font-medium`}>
                              {p.username[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium flex items-center gap-2 flex-wrap">
                                <span className="truncate">{p.username}</span>
                                {!isParticipantBot && p.tier && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 capitalize"
                                    style={{ borderColor: tierColor, color: tierColor }}
                                    data-testid={`tier-badge-${p.id}`}
                                  >
                                    {p.tierInfo?.name || p.tier}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                                {p.id === myParticipant?.id && (
                                  <span className="text-primary flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    You
                                  </span>
                                )}
                                {!isParticipantBot && p.rating !== null && p.rating !== undefined && (
                                  <span data-testid={`rating-${p.id}`} className="flex items-center gap-1">
                                    <Award className="h-3 w-3" />
                                    {p.rating}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold flex items-center justify-end gap-1">
                                <Gauge className="h-4 w-4 text-muted-foreground" />
                                {p.wpm} WPM
                                {/* Show tie indicator if same WPM as adjacent player */}
                                {(
                                  (idx > 0 && sortedParticipants[idx - 1].wpm === p.wpm) ||
                                  (idx < sortedParticipants.length - 1 && sortedParticipants[idx + 1].wpm === p.wpm)
                                ) && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-xs text-yellow-500 ml-1 cursor-help">⚡</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="max-w-[200px]">
                                      <p className="text-xs">Tie decided by: accuracy → characters typed → join order</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
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
                              {p.id === myParticipant?.id ? "Your result" : "Racer"}
                            </p>
                            <div className="pt-1 border-t border-zinc-700 mt-1">
                              <p className="text-zinc-300">Speed: {p.wpm} words per minute</p>
                              <p className="text-zinc-300">Accuracy: {p.accuracy}% correct</p>
                              <p className="text-zinc-300">Characters typed: {p.progress}</p>
                              {p.errors > 0 && <p className="text-zinc-400">Errors: {p.errors}</p>}
                              {!isParticipantBot && p.rating !== null && p.rating !== undefined && (
                                <p className="text-zinc-300 mt-1">
                                  Rating: {p.rating} ({p.tierInfo?.name || p.tier})
                                </p>
                              )}
                            </div>
                            {/* Show tie-breaking info if there's a tie with adjacent player */}
                            {idx > 0 && sortedParticipants[idx - 1].wpm === p.wpm && (
                              <div className="pt-1 border-t border-zinc-700 mt-1">
                                <p className="text-xs text-yellow-400">
                                  ⚡ Tie-breaker: {
                                    sortedParticipants[idx - 1].accuracy !== p.accuracy 
                                      ? "Lower accuracy" 
                                      : sortedParticipants[idx - 1].progress !== p.progress 
                                        ? "Fewer characters typed"
                                        : "Joined later"
                                  }
                                </p>
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>

                {/* Rating Section */}
                {user ? (
                  ratingInfo ? (
                    <RatingChangeDisplay ratingInfo={ratingInfo} position={myPosition} />
                  ) : (
                    <div className="p-3 border rounded-lg bg-muted/30 flex items-center gap-2 text-muted-foreground" data-testid="rating-loading">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading your rating...</span>
                    </div>
                  )
                ) : (
                  <div className="p-3 border rounded-lg bg-muted/30 text-center" data-testid="rating-guest">
                    <p className="text-muted-foreground text-sm">
                      Sign in to track your competitive rating and tier
                    </p>
                  </div>
                )}

                {/* Rematch Notification */}
                {rematchInfo && (
                  <div className="p-4 border border-green-500/30 rounded-lg bg-green-500/10 flex items-center justify-between" data-testid="rematch-notification">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium text-green-500">Rematch Available!</p>
                        <p className="text-sm text-muted-foreground">Room Code: {rematchInfo.roomCode}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setLocation(`/race/${rematchInfo.newRaceId}?code=${rematchInfo.roomCode}`)}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="button-join-rematch"
                    >
                      Join Rematch
                    </Button>
                  </div>
                )}

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
                        onClick={() => {
                          if (ws && ws.readyState === WebSocket.OPEN && myParticipant) {
                            ws.send(JSON.stringify({
                              type: "rematch",
                              raceId: race?.id,
                              participantId: myParticipant.id,
                              username: myParticipant.username,
                            }));
                            toast.info("Creating rematch room...", { duration: 2000 });
                          }
                        }}
                        className="flex-1"
                        data-testid="button-rematch"
                        disabled={!!rematchInfo}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        {rematchInfo ? "Rematch Created" : "Create Rematch"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="font-medium">{rematchInfo ? "Rematch already created" : "Create rematch room"}</p>
                      <p className="text-zinc-400">
                        {rematchInfo 
                          ? "Click 'Join Rematch' above to continue" 
                          : "Create a new room with same settings for all players"
                        }
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Share Dialog with Race Certificate */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Share Your Race Result
              </DialogTitle>
              <DialogDescription>
                Share your multiplayer race achievement with others!
              </DialogDescription>
            </DialogHeader>
            
            {lastResultSnapshot && (
              <Tabs defaultValue="certificate" className="w-full">
                <TabsList className="grid w-full grid-cols-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger value="certificate" className="gap-2" data-testid="tab-race-certificate">
                        <Award className="w-4 h-4" />
                        Certificate
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Professional 1200×675 certificate with verification ID</p>
                    </TooltipContent>
                  </Tooltip>
                </TabsList>
                
                <TabsContent value="certificate" className="space-y-4">
                  <div className="text-center space-y-2 mb-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/30 mb-2">
                      <Award className="w-8 h-8 text-yellow-400" />
                    </div>
                    <h3 className="text-lg font-bold">Share Your Certificate</h3>
                    <p className="text-sm text-muted-foreground">
                      Show off your official Race Typing Certificate - #{lastResultSnapshot.placement} of {lastResultSnapshot.totalParticipants}!
                    </p>
                  </div>

                  {/* Certificate Stats Preview */}
                  <div className="p-4 bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-purple-500/10 rounded-xl border border-yellow-500/20">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Typing Speed</p>
                        <p className="text-2xl font-bold text-primary">{lastResultSnapshot.wpm} WPM</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
                        <p className="text-2xl font-bold text-green-400">{lastResultSnapshot.accuracy}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Placement</p>
                        <p className="text-sm font-bold text-yellow-400">#{lastResultSnapshot.placement} of {lastResultSnapshot.totalParticipants}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Performance</p>
                        <p className="text-sm font-bold">{getTypingPerformanceRating(lastResultSnapshot.wpm, lastResultSnapshot.accuracy).badge}</p>
                      </div>
                    </div>
                  </div>

                  {/* Hidden pre-rendered certificate for sharing */}
                  <div className="absolute -z-50 w-0 h-0 overflow-hidden opacity-0 pointer-events-none" aria-hidden="true">
                    <RaceCertificate
                      wpm={lastResultSnapshot.wpm}
                      accuracy={lastResultSnapshot.accuracy}
                      consistency={lastResultSnapshot.consistency}
                      placement={lastResultSnapshot.placement}
                      totalParticipants={lastResultSnapshot.totalParticipants}
                      characters={lastResultSnapshot.characters}
                      errors={lastResultSnapshot.errors}
                      duration={lastResultSnapshot.duration}
                      username={user?.username}
                      raceId={race?.id?.toString()}
                    />
                  </div>

                  {/* View & Share Certificate Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowCertificate(true)}
                      className="py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
                    >
                      <Award className="w-5 h-5" />
                      View Certificate
                    </button>
                    <button
                      onClick={async () => {
                        const certCanvas = document.querySelector('[data-testid="certificate-canvas"]') as HTMLCanvasElement;
                        if (!certCanvas) {
                          toast({ title: "Certificate not ready", description: "Please try again.", variant: "destructive" });
                          return;
                        }
                        try {
                          const blob = await new Promise<Blob>((resolve, reject) => {
                            certCanvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Failed")), "image/png");
                          });
                          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
                          setCertificateImageCopied(true);
                          setTimeout(() => setCertificateImageCopied(false), 2000);
                          toast({ title: "Certificate Copied!", description: "Paste directly into Twitter, Discord, or LinkedIn!" });
                        } catch {
                          toast({ title: "Copy Failed", description: "Please download instead.", variant: "destructive" });
                        }
                      }}
                      className="py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-green-500/25"
                    >
                      {certificateImageCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      {certificateImageCopied ? "Copied!" : "Copy Image"}
                    </button>
                  </div>

                  {/* Share Certificate with Image Button */}
                  {'share' in navigator && (
                    <button
                      onClick={async () => {
                        const certCanvas = document.querySelector('[data-testid="certificate-canvas"]') as HTMLCanvasElement;
                        if (!certCanvas) {
                          toast({ title: "Certificate not ready", description: "Please try again.", variant: "destructive" });
                          return;
                        }
                        setIsSharingCertificate(true);
                        try {
                          const blob = await new Promise<Blob>((resolve, reject) => {
                            certCanvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Failed")), "image/png");
                          });
                          const file = new File([blob], `TypeMasterAI_Race_Certificate_${lastResultSnapshot.wpm}WPM.png`, { type: "image/png" });
                          if (navigator.canShare?.({ files: [file] })) {
                            const rating = getTypingPerformanceRating(lastResultSnapshot.wpm, lastResultSnapshot.accuracy);
                            await navigator.share({
                              title: `TypeMasterAI Race Certificate - ${lastResultSnapshot.wpm} WPM`,
                              text: `🏆 I finished #${lastResultSnapshot.placement} of ${lastResultSnapshot.totalParticipants} in a TypeMasterAI Race!\n\n⚡ ${lastResultSnapshot.wpm} WPM | ✨ ${lastResultSnapshot.accuracy}% Accuracy\n🎖️ ${rating.badge} Badge\n\n🔗 typemasterai.com/race`,
                              files: [file],
                            });
                            toast({ title: "Certificate Shared!", description: "Your achievement is on its way!" });
                          }
                        } catch (error: any) {
                          if (error.name !== 'AbortError') {
                            toast({ title: "Share failed", description: "Please try Copy Image instead.", variant: "destructive" });
                          }
                        } finally {
                          setIsSharingCertificate(false);
                        }
                      }}
                      disabled={isSharingCertificate}
                      className="w-full py-4 bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Share2 className="w-5 h-5" />
                      {isSharingCertificate ? "Preparing..." : "Share Certificate with Image"}
                    </button>
                  )}

                  {/* Certificate Share Message Preview */}
                  <div className="relative">
                    <div className="absolute -top-2 left-3 px-2 bg-background text-xs font-medium text-muted-foreground">
                      Certificate Share Message
                    </div>
                    <div className="p-4 bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-xl border border-yellow-500/20 text-sm leading-relaxed">
                      <div className="space-y-2">
                        <p className="text-base font-medium">
                          🏆 <span className="text-yellow-400 font-bold">RACE CERTIFIED: #{lastResultSnapshot.placement} Place!</span>
                        </p>
                        <p className="text-muted-foreground">
                          ⚡ Speed: <span className="text-foreground font-semibold">{lastResultSnapshot.wpm} WPM</span>
                        </p>
                        <p className="text-muted-foreground">
                          ✨ Accuracy: <span className="text-foreground font-semibold">{lastResultSnapshot.accuracy}%</span>
                        </p>
                        <p className="text-muted-foreground">
                          🎖️ Result: <span className="text-foreground font-semibold">#{lastResultSnapshot.placement} of {lastResultSnapshot.totalParticipants}</span>
                        </p>
                        <p className="text-muted-foreground">
                          🏆 Level: <span className="text-yellow-400 font-semibold">{getTypingPerformanceRating(lastResultSnapshot.wpm, lastResultSnapshot.accuracy).title}</span>
                        </p>
                        <p className="text-primary/80 text-xs mt-3 font-medium">
                          Official race certificate earned! 🏎️
                        </p>
                        <p className="text-xs text-primary mt-2 font-medium">
                          🔗 https://typemasterai.com/race
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const rating = getTypingPerformanceRating(lastResultSnapshot.wpm, lastResultSnapshot.accuracy);
                        const text = `🏆 Just earned my TypeMasterAI Race Certificate! #${lastResultSnapshot.placement} of ${lastResultSnapshot.totalParticipants} 🏎️

⚡ ${lastResultSnapshot.wpm} WPM | ✨ ${lastResultSnapshot.accuracy}% Accuracy
🎖️ ${rating.title}

🔗 https://typemasterai.com/race

#TypeMasterAI #TypingRace`;
                        navigator.clipboard.writeText(text);
                        toast({ title: "Certificate Message Copied!", description: "Paste into your social media post" });
                      }}
                      className="absolute top-3 right-3 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/50 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Certificate Social Share Buttons */}
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-center text-muted-foreground uppercase tracking-wide">
                      Share Certificate On
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          const text = encodeURIComponent(`🏆 Just earned my TypeMasterAI Race Certificate! #${lastResultSnapshot.placement} of ${lastResultSnapshot.totalParticipants} with ${lastResultSnapshot.wpm} WPM! 🏎️

#TypeMasterAI #TypingRace`);
                          window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent('https://typemasterai.com/race')}`, '_blank', 'width=600,height=400');
                        }}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/25 border border-[#1DA1F2]/20 transition-all"
                      >
                        <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                        <span className="text-xs font-medium">X (Twitter)</span>
                      </button>
                      <button
                        onClick={() => {
                          const text = encodeURIComponent(`🏆 I just earned my official TypeMasterAI Race Certificate!

Finished #${lastResultSnapshot.placement} of ${lastResultSnapshot.totalParticipants} with ${lastResultSnapshot.wpm} WPM and ${lastResultSnapshot.accuracy}% accuracy! 🏎️`);
                          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://typemasterai.com/race')}&quote=${text}`, '_blank', 'width=600,height=400');
                        }}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/25 border border-[#1877F2]/20 transition-all"
                      >
                        <Facebook className="w-4 h-4 text-[#1877F2]" />
                        <span className="text-xs font-medium">Facebook</span>
                      </button>
                      <button
                        onClick={() => {
                          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://typemasterai.com/race')}`, '_blank', 'width=600,height=400');
                        }}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0A66C2]/10 hover:bg-[#0A66C2]/25 border border-[#0A66C2]/20 transition-all"
                      >
                        <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                        <span className="text-xs font-medium">LinkedIn</span>
                      </button>
                      <button
                        onClick={() => {
                          const rating = getTypingPerformanceRating(lastResultSnapshot.wpm, lastResultSnapshot.accuracy);
                          const waText = `*TypeMasterAI Race Certificate*\n\nPlacement: *#${lastResultSnapshot.placement} of ${lastResultSnapshot.totalParticipants}*\nSpeed: *${lastResultSnapshot.wpm} WPM*\nAccuracy: *${lastResultSnapshot.accuracy}%*\nLevel: ${rating.title}\n\nJoin the race: https://typemasterai.com/race`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank', 'width=600,height=400');
                        }}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/25 border border-[#25D366]/20 transition-all"
                      >
                        <MessageCircle className="w-4 h-4 text-[#25D366]" />
                        <span className="text-xs font-medium">WhatsApp</span>
                      </button>
                      <button
                        onClick={() => {
                          const rating = getTypingPerformanceRating(lastResultSnapshot.wpm, lastResultSnapshot.accuracy);
                          const text = `🏆 RACE CERTIFIED!\n\n🏎️ #${lastResultSnapshot.placement} of ${lastResultSnapshot.totalParticipants}\n⚡ ${lastResultSnapshot.wpm} WPM | ✨ ${lastResultSnapshot.accuracy}%\n🎖️ ${rating.title}`;
                          window.open(`https://t.me/share/url?url=${encodeURIComponent('https://typemasterai.com/race')}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
                        }}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/25 border border-[#0088cc]/20 transition-all"
                      >
                        <Send className="w-4 h-4 text-[#0088cc]" />
                        <span className="text-xs font-medium">Telegram</span>
                      </button>
                      <button
                        onClick={() => {
                          const rating = getTypingPerformanceRating(lastResultSnapshot.wpm, lastResultSnapshot.accuracy);
                          const subject = encodeURIComponent(`🏆 TypeMasterAI Race Certificate - #${lastResultSnapshot.placement} Place!`);
                          const body = encodeURIComponent(`Hello!\n\nI earned a TypeMasterAI Race Certificate!\n\n🏎️ Placement: #${lastResultSnapshot.placement} of ${lastResultSnapshot.totalParticipants}\n⚡ Speed: ${lastResultSnapshot.wpm} WPM\n✨ Accuracy: ${lastResultSnapshot.accuracy}%\n🎖️ Level: ${rating.title}\n\n👉 Join: https://typemasterai.com/race`);
                          window.open(`mailto:?subject=${subject}&body=${body}`);
                        }}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-500/10 hover:bg-gray-500/25 border border-gray-500/20 transition-all"
                      >
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-medium">Email</span>
                      </button>
                    </div>
                  </div>

                  {/* Certificate Sharing Tips */}
                  <div className="space-y-2">
                    <div className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                      <p className="text-xs text-center text-muted-foreground">
                        📱 <span className="font-medium text-foreground">Mobile:</span> Use "Share Certificate with Image" to attach the certificate directly!
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
                      <p className="text-xs text-center text-muted-foreground">
                        💻 <span className="font-medium text-foreground">Desktop:</span> Use "Copy Image" then paste directly into Twitter, LinkedIn, Discord, or any social media!
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* View Certificate Dialog */}
                {showCertificate && user && lastResultSnapshot && (
                  <Dialog open={showCertificate} onOpenChange={setShowCertificate}>
                    <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-yellow-400" />
                          Your Race Certificate
                        </DialogTitle>
                      </DialogHeader>
                      <RaceCertificate
                        wpm={lastResultSnapshot.wpm}
                        accuracy={lastResultSnapshot.accuracy}
                        consistency={lastResultSnapshot.consistency}
                        placement={lastResultSnapshot.placement}
                        totalParticipants={lastResultSnapshot.totalParticipants}
                        characters={lastResultSnapshot.characters}
                        errors={lastResultSnapshot.errors}
                        duration={lastResultSnapshot.duration}
                        username={user?.username}
                        raceId={race?.id?.toString()}
                        minimal={true}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    );
  }

  return null;
}
