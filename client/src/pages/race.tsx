import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Trophy, Copy, Check, Loader2, Home, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

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
  errors: number;
  isFinished: number;
  finishPosition: number | null;
}

export default function RacePage() {
  const [, params] = useRoute("/race/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const [race, setRace] = useState<Race | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myParticipant, setMyParticipant] = useState<Participant | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRacing, setIsRacing] = useState(false);
  const [input, setInput] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errors, setErrors] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!params?.id) return;

    const raceId = parseInt(params.id);
    const savedParticipant = localStorage.getItem(`race_${raceId}_participant`);
    
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
    if (ws && myParticipant && params?.id && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "join",
        raceId: parseInt(params.id),
        participantId: myParticipant.id,
        username: myParticipant.username,
      }));
    }
  }, [ws, myParticipant, params?.id]);

  useEffect(() => {
    if (isRacing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isRacing]);

  useEffect(() => {
    if (race && myParticipant && currentIndex >= race.paragraphContent.length && !myParticipant.isFinished) {
      finishRace();
    }
  }, [currentIndex, race, myParticipant]);

  async function fetchRaceData() {
    try {
      const response = await fetch(`/api/races/${params?.id}`);
      if (response.ok) {
        const data = await response.json();
        setRace(data.race);
        setParticipants(data.participants);
        
        if (myParticipant) {
          const updatedParticipant = data.participants.find((p: Participant) => p.id === myParticipant.id);
          if (updatedParticipant) {
            setMyParticipant(updatedParticipant);
          }
        }
      } else {
        toast.error("Race not found");
        setLocation("/multiplayer");
      }
    } catch (error) {
      toast.error("Failed to load race");
    }
  }

  function connectWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/race`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected");
      setWs(socket);
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast.error("Connection error");
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };
  }

  function handleWebSocketMessage(message: any) {
    switch (message.type) {
      case "joined":
        setRace(message.race);
        setParticipants(message.participants);
        break;
      case "participant_joined":
        setParticipants(message.participants);
        toast.success(`${message.participant.username} joined the race!`);
        break;
      case "countdown_start":
      case "countdown":
        setCountdown(message.countdown);
        break;
      case "race_start":
        setCountdown(null);
        setIsRacing(true);
        setStartTime(Date.now());
        if (race) {
          setRace({ ...race, status: "racing" });
        }
        toast.success("Race started! Type as fast as you can!");
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
        }
        break;
      case "participant_left":
        setParticipants(prev => prev.filter(p => p.id !== message.participantId));
        break;
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (!isRacing || !race) return;

    const value = e.target.value;
    const expected = race.paragraphContent.substring(currentIndex, currentIndex + value.length);

    if (value === expected) {
      setInput(value);
      
      if (value.length === 1 && value === race.paragraphContent[currentIndex]) {
        const newIndex = currentIndex + 1;
        setCurrentIndex(newIndex);
        setInput("");
        
        updateProgress(newIndex);
      }
    } else {
      const newErrors = errors + 1;
      setErrors(newErrors);
      updateProgress(currentIndex, newErrors);
    }
  }

  function updateProgress(progress: number, errorCount = errors) {
    if (!myParticipant || !startTime || !race) return;

    const elapsedMinutes = (Date.now() - startTime) / 60000;
    const wordsTyped = progress / 5;
    const wpm = Math.round(wordsTyped / elapsedMinutes);
    const accuracy = progress > 0 ? Math.round(((progress - errorCount) / progress) * 100) : 100;

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "progress",
        participantId: myParticipant.id,
        progress,
        wpm: wpm || 0,
        accuracy,
        errors: errorCount,
      }));
    }

    setMyParticipant(prev => prev ? { ...prev, progress, wpm: wpm || 0, accuracy, errors: errorCount } : null);
  }

  function finishRace() {
    if (!myParticipant || !ws) return;

    setIsRacing(false);
    ws.send(JSON.stringify({
      type: "finish",
      raceId: race?.id,
      participantId: myParticipant.id,
    }));

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
    if (!ws || !participants.length) return;
    
    ws.send(JSON.stringify({
      type: "ready",
      raceId: race?.id,
    }));
  }

  if (!race) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (race.status === "waiting") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Waiting for Players</CardTitle>
                  <CardDescription>Share the room code with friends</CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={copyRoomCode}
                  data-testid="button-copy-code"
                >
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {race.roomCode}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-3">
                  Players ({participants.length}/{race.maxPlayers})
                </h3>
                <div className="grid gap-2">
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                      data-testid={`participant-${p.id}`}
                    >
                      <div className={`h-10 w-10 rounded-full ${p.avatarColor || 'bg-primary'} flex items-center justify-center text-white font-medium`}>
                        {p.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{p.username}</div>
                        {p.id === myParticipant?.id && (
                          <div className="text-xs text-muted-foreground">You</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={startRace}
                disabled={participants.length < 2}
                size="lg"
                className="w-full"
                data-testid="button-start-race"
              >
                {participants.length < 2 ? "Waiting for more players..." : "Start Race"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (countdown !== null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-9xl font-bold text-primary animate-pulse" data-testid="countdown-number">
            {countdown === 0 ? "GO!" : countdown}
          </div>
        </div>
      </div>
    );
  }

  if (race.status === "racing" || isRacing) {
    const textBefore = race.paragraphContent.substring(0, currentIndex);
    const textCurrent = race.paragraphContent.substring(currentIndex, currentIndex + input.length + 1);
    const textAfter = race.paragraphContent.substring(currentIndex + input.length + 1);

    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Race Progress</CardTitle>
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
                              <div className={`h-6 w-6 rounded-full ${p.avatarColor || 'bg-primary'} flex items-center justify-center text-white text-xs`}>
                                {p.username[0].toUpperCase()}
                              </div>
                              <span className="font-medium">{p.username}</span>
                              {p.id === myParticipant?.id && (
                                <span className="text-xs text-primary">(You)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <span>{p.wpm} WPM</span>
                              <span>{p.accuracy}% Accuracy</span>
                            </div>
                          </div>
                          <Progress value={progressPercent} className="h-3" />
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl leading-relaxed mb-6 font-mono">
                  <span className="text-muted-foreground">{textBefore}</span>
                  <span className="bg-primary/20">{textCurrent}</span>
                  <span>{textAfter}</span>
                </div>

                <Input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={handleInput}
                  disabled={!isRacing}
                  className="text-lg"
                  autoFocus
                  data-testid="input-typing"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (race.status === "finished") {
    const sortedParticipants = [...participants].sort((a, b) => (a.finishPosition || 999) - (b.finishPosition || 999));

    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                Race Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {sortedParticipants.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-4 p-4 border rounded-lg ${
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
                    <div className="flex-1">
                      <div className="font-medium">{p.username}</div>
                      {p.id === myParticipant?.id && (
                        <div className="text-xs text-primary">You</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">{p.wpm} WPM</div>
                      <div className="text-sm text-muted-foreground">{p.accuracy}% Accuracy</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setLocation("/multiplayer")}
                  className="flex-1"
                  data-testid="button-back"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Back to Lobby
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="flex-1"
                  data-testid="button-rematch"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  New Race
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
