import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Users, Lock, Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const [, setLocation] = useLocation();
  const [roomCode, setRoomCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeRaces, setActiveRaces] = useState<(Race & { participantCount: number })[]>([]);

  useEffect(() => {
    fetchActiveRaces();
    const interval = setInterval(fetchActiveRaces, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchActiveRaces() {
    try {
      const response = await fetch("/api/races/active");
      if (response.ok) {
        const races = await response.json();
        setActiveRaces(races);
      }
    } catch (error) {
      console.error("Failed to fetch active races:", error);
    }
  }

  async function quickMatch() {
    setLoading(true);
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
        setLocation(`/race/${race.id}`);
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to find match");
      }
    } catch (error) {
      toast.error("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }

  async function createRoom() {
    setLoading(true);
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
        setLocation(`/race/${race.id}`);
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to create room");
      }
    } catch (error) {
      toast.error("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }

  async function joinRoom(code?: string) {
    const codeToUse = code || roomCode;
    if (!codeToUse.trim()) {
      toast.error("Please enter a room code");
      return;
    }

    setLoading(true);
    try {
      const guestId = user ? undefined : getOrCreateGuestId();
      const response = await fetch(`/api/races/join/${codeToUse.trim().toUpperCase()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId }),
      });

      if (response.ok) {
        const { race, participant } = await response.json();
        localStorage.setItem(`race_${race.id}_participant`, JSON.stringify(participant));
        setLocation(`/race/${race.id}`);
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to join room");
      }
    } catch (error) {
      toast.error("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold">Multiplayer Racing</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Compete against others in real-time typing races
          </p>
        </div>

        <Tabs defaultValue="quick" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="quick" data-testid="tab-quick-match">
              <Zap className="h-4 w-4 mr-2" />
              Quick Match
            </TabsTrigger>
            <TabsTrigger value="create" data-testid="tab-create-room">
              <Users className="h-4 w-4 mr-2" />
              Create Room
            </TabsTrigger>
            <TabsTrigger value="join" data-testid="tab-join-room">
              <Lock className="h-4 w-4 mr-2" />
              Join Room
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quick">
            <Card>
              <CardHeader>
                <CardTitle>Quick Match</CardTitle>
                <CardDescription>
                  Join an available race or start a new one instantly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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

                {activeRaces.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-3">Active Public Races</h3>
                    <div className="space-y-2">
                      {activeRaces
                        .filter(r => r.isPrivate === 0)
                        .map(race => (
                          <div
                            key={race.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div>
                              <div className="font-medium">Room {race.roomCode}</div>
                              <div className="text-sm text-muted-foreground">
                                {race.participantCount}/{race.maxPlayers} players • {race.status}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => joinRoom(race.roomCode)}
                            >
                              Join
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Create Private Room</CardTitle>
                <CardDescription>
                  Set up a custom race and invite your friends
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Players</label>
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

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="private"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="h-4 w-4"
                      data-testid="checkbox-private"
                    />
                    <label htmlFor="private" className="text-sm font-medium cursor-pointer">
                      Make room private (requires code to join)
                    </label>
                  </div>
                </div>

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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="join">
            <Card>
              <CardHeader>
                <CardTitle>Join with Code</CardTitle>
                <CardDescription>
                  Enter a room code to join a private race
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Room Code</label>
                  <Input
                    type="text"
                    placeholder="Enter 6-character code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="w-full text-lg tracking-wider"
                    data-testid="input-room-code"
                  />
                </div>

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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
