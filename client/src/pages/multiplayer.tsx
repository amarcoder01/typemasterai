import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useNetwork } from "@/lib/network-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Zap, Users, Lock, Trophy, Loader2, Info, WifiOff, AlertTriangle, CheckCircle2, Timer, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

// Error codes for specific error handling
type MultiplayerErrorCode = "NETWORK_ERROR" | "ROOM_FULL" | "ROOM_NOT_FOUND" | "ROOM_STARTED" | "INVALID_CODE" | "SERVER_ERROR";

interface MultiplayerError {
  code: MultiplayerErrorCode;
  message: string;
}

// Helper to parse error responses
function parseErrorResponse(response: Response, data: { message?: string; code?: string }): MultiplayerError {
  if (!navigator.onLine) {
    return { code: "NETWORK_ERROR", message: "You appear to be offline. Please check your internet connection." };
  }
  
  if (response.status === 404) {
    return { code: "ROOM_NOT_FOUND", message: data.message || "Room not found. Check the code and try again." };
  }
  
  if (response.status === 409) {
    if (data.code === "RACE_FULL") {
      return { code: "ROOM_FULL", message: "This room is full. Try another room or create your own." };
    }
    if (data.code === "RACE_STARTED") {
      return { code: "ROOM_STARTED", message: "This race has already started. Try joining another room." };
    }
  }
  
  if (response.status >= 500) {
    return { code: "SERVER_ERROR", message: "Server is temporarily unavailable. Please try again in a moment." };
  }
  
  return { code: "SERVER_ERROR", message: data.message || "Something went wrong. Please try again." };
}

// Get user-friendly error icon
function getErrorIcon(code: MultiplayerErrorCode) {
  switch (code) {
    case "NETWORK_ERROR": return <WifiOff className="h-4 w-4" />;
    case "ROOM_FULL": return <Users className="h-4 w-4" />;
    case "ROOM_NOT_FOUND": return <AlertTriangle className="h-4 w-4" />;
    default: return <AlertTriangle className="h-4 w-4" />;
  }
}

interface Participant {
  id: number;
  raceId: number;
  username: string;
  avatarColor: string | null;
  progress: number;
  wpm: number;
  accuracy: number;
  isFinished: number;
}

function getOrCreateGuestId(): string {
  const GUEST_ID_KEY = "multiplayer_guest_id";
  let guestId = localStorage.getItem(GUEST_ID_KEY);
  
  if (!guestId) {
    guestId = Math.random().toString(36).substring(2, 8);
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }
  
  return guestId;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes}min`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

export default function MultiplayerPage() {
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const [, setLocation] = useLocation();
  const [roomCode, setRoomCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [textSource, setTextSource] = useState("general");
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"quickMatch" | "createRoom" | "joinRoom" | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const quickMatchTriggeredRef = useRef(false);

  // Auto-trigger quick match if coming from "New Race" button
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('quickmatch') === 'true' && !quickMatchTriggeredRef.current && isOnline) {
      quickMatchTriggeredRef.current = true;
      // Clear the URL parameter
      window.history.replaceState({}, '', '/multiplayer');
      // Trigger quick match after a short delay to ensure component is ready
      setTimeout(() => {
        quickMatch();
      }, 100);
    }
  }, [isOnline]);

  async function quickMatch() {
    if (!isOnline) {
      toast.error("You're offline. Please check your internet connection.", {
        icon: <WifiOff className="h-4 w-4" />,
      });
      return;
    }
    
    setLoading(true);
    setLoadingAction("quickMatch");
    try {
      const guestId = user ? undefined : getOrCreateGuestId();
      const response = await fetch("/api/races/quick-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          guestId,
          raceType: "timed",
          timeLimitSeconds: selectedDuration
        }),
      });

      if (response.ok) {
        const { race, participant } = await response.json();
        localStorage.setItem(`race_${race.id}_participant`, JSON.stringify(participant));
        toast.success(`Match found! ${formatDuration(selectedDuration)} race starting...`, {
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        });
        setLocation(`/race/${race.id}`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const error = parseErrorResponse(response, errorData);
        toast.error(error.message, {
          icon: getErrorIcon(error.code),
          description: error.code === "SERVER_ERROR" ? "Try again in a few seconds" : undefined,
        });
      }
    } catch (error) {
      toast.error("Unable to connect to the game server", {
        icon: <WifiOff className="h-4 w-4" />,
        description: "Please check your connection and try again",
      });
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  }

  async function createRoom() {
    if (!isOnline) {
      toast.error("You're offline. Please check your internet connection.", {
        icon: <WifiOff className="h-4 w-4" />,
      });
      return;
    }
    
    setLoading(true);
    setLoadingAction("createRoom");
    try {
      const guestId = user ? undefined : getOrCreateGuestId();
      const response = await fetch("/api/races/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          isPrivate: true, 
          maxPlayers, 
          guestId,
          timeLimitSeconds: selectedDuration,
          textSource,
        }),
      });

      if (response.ok) {
        const { race, participant } = await response.json();
        localStorage.setItem(`race_${race.id}_participant`, JSON.stringify(participant));
        toast.success(`Room created! ${formatDuration(selectedDuration)} race`, {
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
          description: `Share code: ${race.roomCode}`,
        });
        setLocation(`/race/${race.id}`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const error = parseErrorResponse(response, errorData);
        toast.error(error.message, {
          icon: getErrorIcon(error.code),
        });
      }
    } catch (error) {
      toast.error("Unable to connect to the game server", {
        icon: <WifiOff className="h-4 w-4" />,
        description: "Please check your connection and try again",
      });
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  }

  async function joinRoom(code?: string) {
    const codeToUse = code || roomCode;
    
    if (!codeToUse.trim()) {
      toast.error("Please enter a room code", {
        icon: <AlertTriangle className="h-4 w-4" />,
      });
      return;
    }
    
    // Validate room code format
    const cleanCode = codeToUse.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      toast.error("Room code must be exactly 6 characters", {
        icon: <AlertTriangle className="h-4 w-4" />,
        description: "Check the code and try again",
      });
      return;
    }
    
    if (!isOnline) {
      toast.error("You're offline. Please check your internet connection.", {
        icon: <WifiOff className="h-4 w-4" />,
      });
      return;
    }

    setLoading(true);
    setLoadingAction("joinRoom");
    try {
      const guestId = user ? undefined : getOrCreateGuestId();
      const response = await fetch(`/api/races/join/${cleanCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId }),
      });

      if (response.ok) {
        const { race, participant } = await response.json();
        localStorage.setItem(`race_${race.id}_participant`, JSON.stringify(participant));
        toast.success("Joined room! Waiting for race to start...", {
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        });
        setLocation(`/race/${race.id}`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const error = parseErrorResponse(response, errorData);
        toast.error(error.message, {
          icon: getErrorIcon(error.code),
          description: error.code === "ROOM_NOT_FOUND" ? "Double-check the room code" : undefined,
        });
      }
    } catch (error) {
      toast.error("Unable to connect to the game server", {
        icon: <WifiOff className="h-4 w-4" />,
        description: "Please check your connection and try again",
      });
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-background">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          {/* Network offline banner */}
          {!isOnline && (
            <Alert variant="destructive" className="mb-6 border-yellow-500/50 bg-yellow-500/10">
              <WifiOff className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                You're Offline
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium">No Internet Connection</p>
                    <p className="text-zinc-400">Multiplayer features require an active internet connection. Check your network and try again.</p>
                  </TooltipContent>
                </Tooltip>
              </AlertTitle>
              <AlertDescription>
                Please check your internet connection to use multiplayer features.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Trophy className="h-12 w-12 text-primary cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-medium">Multiplayer Racing Mode</p>
                  <p className="text-zinc-400">Compete with real players in real-time typing races</p>
                </TooltipContent>
              </Tooltip>
              <h1 className="text-4xl font-bold">Multiplayer Racing</h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Compete against others in real-time typing races
            </p>
          </div>

          <Tabs defaultValue="quick" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="quick" data-testid="tab-quick-match">
                    <Zap className="h-4 w-4 mr-2" />
                    Quick Match
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-medium">Instant Matchmaking</p>
                  <p className="text-zinc-400">Join an open race or start a new public one instantly</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="create" data-testid="tab-create-room">
                    <Users className="h-4 w-4 mr-2" />
                    Create Room
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-medium">Create Custom Room</p>
                  <p className="text-zinc-400">Set up a private or public race with custom settings</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="join" data-testid="tab-join-room">
                    <Lock className="h-4 w-4 mr-2" />
                    Join Room
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-medium">Join by Code</p>
                  <p className="text-zinc-400">Enter a 6-character room code to join a private race</p>
                </TooltipContent>
              </Tooltip>
            </TabsList>

            <TabsContent value="quick">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Quick Match
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="font-medium">How Quick Match Works</p>
                        <p className="text-zinc-400">System finds an open race or creates a new public one. AI racers may join to fill empty slots.</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  <CardDescription>
                    Join an available race or start a new one instantly
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-primary" />
                      <label className="text-sm font-medium">Race Duration</label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="font-medium">How long the race lasts</p>
                          <p className="text-zinc-400">Type as much as you can before time runs out!</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={selectedDuration.toString()}
                      onValueChange={(value) => setSelectedDuration(parseInt(value))}
                    >
                      <SelectTrigger className="w-full" data-testid="select-duration">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">1 minute</SelectItem>
                        <SelectItem value="90">90 seconds</SelectItem>
                        <SelectItem value="120">2 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={quickMatch}
                        disabled={loading}
                        size="lg"
                        className="w-full text-lg h-14"
                        data-testid="button-quick-match"
                      >
                        {loading && loadingAction === "quickMatch" ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Finding match...
                          </>
                        ) : (
                          <>
                            <Zap className="mr-2 h-5 w-5" />
                            Find Match • {formatDuration(selectedDuration)}
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Click to instantly join or create a {selectedDuration}s race</p>
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="create">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Create Room
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="font-medium">Host Your Own Room</p>
                        <p className="text-zinc-400">Create a waiting room and share the code with friends. You'll configure the race settings once everyone joins.</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  <CardDescription>
                    Create a waiting room and invite friends with the room code
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Max Players */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <label className="text-sm font-medium">Room Size</label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="font-medium">Maximum Players</p>
                          <p className="text-zinc-400">How many players can join this room (2-10)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={maxPlayers.toString()}
                      onValueChange={(value) => setMaxPlayers(parseInt(value))}
                    >
                      <SelectTrigger className="w-full" data-testid="select-max-players">
                        <SelectValue placeholder="Select room size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 players</SelectItem>
                        <SelectItem value="3">3 players</SelectItem>
                        <SelectItem value="4">4 players</SelectItem>
                        <SelectItem value="5">5 players</SelectItem>
                        <SelectItem value="6">6 players</SelectItem>
                        <SelectItem value="8">8 players</SelectItem>
                        <SelectItem value="10">10 players</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Race Duration */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <label className="text-sm font-medium">Race Duration</label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="font-medium">Time Limit</p>
                          <p className="text-zinc-400">How long the race will last</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={selectedDuration.toString()}
                      onValueChange={(value) => setSelectedDuration(parseInt(value))}
                    >
                      <SelectTrigger className="w-full" data-testid="select-create-duration">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 seconds - Sprint</SelectItem>
                        <SelectItem value="60">1 minute - Standard</SelectItem>
                        <SelectItem value="90">90 seconds - Extended</SelectItem>
                        <SelectItem value="120">2 minutes - Marathon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Text Source */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <label className="text-sm font-medium">Text Type</label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="font-medium">Race Text Category</p>
                          <p className="text-zinc-400">Choose what type of text you'll be typing</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={textSource}
                      onValueChange={(value) => setTextSource(value)}
                    >
                      <SelectTrigger className="w-full" data-testid="select-text-source">
                        <SelectValue placeholder="Select text type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Topics (Most Content)</SelectItem>
                        <SelectItem value="quotes">Quotes & Proverbs</SelectItem>
                        <SelectItem value="programming">Programming Content</SelectItem>
                        <SelectItem value="technical">Technical Writing</SelectItem>
                        <SelectItem value="news">News Articles</SelectItem>
                        <SelectItem value="entertainment">Entertainment & Fun</SelectItem>
                        <SelectItem value="random">Random Mix (All Categories)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Room Summary */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Room Settings</p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">{maxPlayers} players max</span>
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">{formatDuration(selectedDuration)}</span>
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded capitalize">{textSource === "random" ? "Random Text" : textSource}</span>
                    </div>
                  </div>

                  {/* Create Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={createRoom}
                        disabled={loading || loadingAction !== null}
                        size="lg"
                        className="w-full text-lg h-14"
                        data-testid="button-create-room"
                      >
                        {loading && loadingAction === "createRoom" ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Creating Room...
                          </>
                        ) : (
                          <>
                            <Users className="mr-2 h-5 w-5" />
                            Create Room
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Create a waiting room for up to {maxPlayers} players</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* How it works */}
                  <div className="text-xs text-center text-muted-foreground space-y-1">
                    <p className="font-medium">How it works:</p>
                    <p>1. Create room → 2. Share code with friends → 3. Start when ready</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="join">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Join with Code
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="font-medium">Room Code Entry</p>
                        <p className="text-zinc-400">Enter the 6-character code shared by the room creator to join their race.</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  <CardDescription>
                    Enter a room code to join a private race
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Room Code</label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="font-medium">6-Character Code</p>
                          <p className="text-zinc-400">Example: ABC123, XYZ789</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      type="text"
                      placeholder="Enter 6-character code"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="w-full text-lg tracking-wider font-mono"
                      data-testid="input-room-code"
                    />
                    {roomCode.length > 0 && roomCode.length < 6 && (
                      <p className="text-xs text-muted-foreground">
                        {6 - roomCode.length} more character{6 - roomCode.length !== 1 ? 's' : ''} needed
                      </p>
                    )}
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => { void joinRoom(); }}
                        disabled={loading || roomCode.length !== 6}
                        size="lg"
                        className="w-full text-lg h-14"
                        data-testid="button-join-room"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Joining...
                          </>
                        ) : (
                          <>
                            <Lock className="mr-2 h-5 w-5" />
                            Join Room
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {roomCode.length !== 6 
                        ? <p>Enter a complete 6-character room code</p>
                        : <p>Click to join the race room</p>
                      }
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}
