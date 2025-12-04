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
import { Zap, Users, Lock, Trophy, Loader2, Info, Shield, WifiOff, AlertTriangle, CheckCircle2, Timer, Clock } from "lucide-react";
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

export default function MultiplayerPage() {
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const [, setLocation] = useLocation();
  const [roomCode, setRoomCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"quickMatch" | "createRoom" | "joinRoom" | "timedRace" | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(60);

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
        body: JSON.stringify({ guestId }),
      });

      if (response.ok) {
        const { race, participant } = await response.json();
        localStorage.setItem(`race_${race.id}_participant`, JSON.stringify(participant));
        toast.success("Match found! Joining race...", {
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
        body: JSON.stringify({ isPrivate, maxPlayers, guestId }),
      });

      if (response.ok) {
        const { race, participant } = await response.json();
        localStorage.setItem(`race_${race.id}_participant`, JSON.stringify(participant));
        toast.success("Room created! Waiting for players...", {
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
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

  async function startTimedRace() {
    if (!isOnline) {
      toast.error("You're offline. Please check your internet connection.", {
        icon: <WifiOff className="h-4 w-4" />,
      });
      return;
    }
    
    setLoading(true);
    setLoadingAction("timedRace");
    try {
      const guestId = user ? undefined : getOrCreateGuestId();
      const response = await fetch("/api/races/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          isPrivate: 0, 
          maxPlayers: 4, 
          guestId,
          raceType: "timed",
          timeLimitSeconds: selectedDuration
        }),
      });

      if (response.ok) {
        const { race, participant } = await response.json();
        localStorage.setItem(`race_${race.id}_participant`, JSON.stringify(participant));
        toast.success(`${selectedDuration}s timed race starting!`, {
          icon: <Timer className="h-4 w-4 text-green-500" />,
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
            <TabsList className="grid w-full grid-cols-4 mb-8">
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
                  <TabsTrigger value="timed" data-testid="tab-timed-race">
                    <Timer className="h-4 w-4 mr-2" />
                    Timed Race
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-medium">Timed Race Mode</p>
                  <p className="text-zinc-400">Race for a set duration - see who types the most!</p>
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={quickMatch}
                        disabled={loading}
                        size="lg"
                        className="w-full text-lg h-14"
                        data-testid="button-quick-match"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Finding match...
                          </>
                        ) : (
                          <>
                            <Zap className="mr-2 h-5 w-5" />
                            Find Match
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Click to instantly join or create a race</p>
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timed">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Timed Race
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="font-medium">How Timed Races Work</p>
                        <p className="text-zinc-400">Race against the clock! Type as many words as you can before time runs out. Highest WPM wins!</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  <CardDescription>
                    Race for a set duration - see who types the most!
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Select Duration</label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p className="font-medium">Race Duration</p>
                            <p className="text-zinc-400">Choose how long the race lasts</p>
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
                          <SelectItem value="15">15 seconds</SelectItem>
                          <SelectItem value="30">30 seconds</SelectItem>
                          <SelectItem value="60">1 minute</SelectItem>
                          <SelectItem value="120">2 minutes</SelectItem>
                          <SelectItem value="180">3 minutes</SelectItem>
                          <SelectItem value="300">5 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Timer className="h-4 w-4 text-primary" />
                      <span className="font-medium">Race Mode: Timed</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Type continuously for {selectedDuration >= 60 ? `${Math.floor(selectedDuration / 60)} minute${selectedDuration >= 120 ? 's' : ''}` : `${selectedDuration} seconds`}. The player with the highest WPM wins!
                    </p>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={startTimedRace}
                        disabled={loading && loadingAction === "timedRace"}
                        size="lg"
                        className="w-full text-lg h-14"
                        data-testid="button-start-timed-race"
                      >
                        {loading && loadingAction === "timedRace" ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Starting race...
                          </>
                        ) : (
                          <>
                            <Timer className="mr-2 h-5 w-5" />
                            Start {selectedDuration >= 60 ? `${Math.floor(selectedDuration / 60)}min` : `${selectedDuration}s`} Race
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Start a {selectedDuration >= 60 ? `${Math.floor(selectedDuration / 60)} minute` : `${selectedDuration} second`} timed race</p>
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="create">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Create Private Room
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="font-medium">Custom Room Setup</p>
                        <p className="text-zinc-400">Create a room with your own settings. Share the room code with friends to race together.</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  <CardDescription>
                    Set up a custom race and invite your friends
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Max Players</label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p className="font-medium">Player Limit</p>
                            <p className="text-zinc-400">Set between 2-10 players per race</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        type="number"
                        min={2}
                        max={10}
                        value={maxPlayers}
                        onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 4)}
                        className="w-full"
                        data-testid="input-max-players"
                      />
                    </div>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            id="private"
                            checked={isPrivate}
                            onChange={(e) => setIsPrivate(e.target.checked)}
                            className="h-4 w-4"
                            data-testid="checkbox-private"
                          />
                          <label htmlFor="private" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            Make room private (requires code to join)
                          </label>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="font-medium">Private Room</p>
                        <p className="text-zinc-400">When enabled, only players with the room code can join. Public rooms appear in the active races list.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={createRoom}
                        disabled={loading}
                        size="lg"
                        className="w-full text-lg h-14"
                        data-testid="button-create-room"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Creating...
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
                      <p>Create a new race room with your settings</p>
                    </TooltipContent>
                  </Tooltip>
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
