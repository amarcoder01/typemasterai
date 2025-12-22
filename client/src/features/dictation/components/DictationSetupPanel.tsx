import React from 'react';
import { 
  Settings2, 
  Play, 
  Volume2, 
  Clock, 
  Target, 
  Hash, 
  RotateCcw,
  Languages,
  Mic
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { 
  DifficultyLevel, 
  AdaptiveDifficultyConfig 
} from '../types';
import { 
  CATEGORIES, 
  getDifficultyEmoji 
} from '../types';

interface DictationSetupPanelProps {
  // Current settings
  difficulty: DifficultyLevel;
  speedLevel: string;
  category: string;
  sessionLength: number;
  currentOpenAIVoice: string;
  openAIVoices: { id: string; name: string }[];
  currentRate: number;
  adaptiveDifficulty: AdaptiveDifficultyConfig;
  
  // Callbacks
  onDifficultyChange: (difficulty: DifficultyLevel) => void;
  onSpeedLevelChange: (speed: string) => void;
  onCategoryChange: (category: string) => void;
  onSessionLengthChange: (length: number) => void;
  onOpenAIVoiceChange: (voice: string) => void;
  onAdaptiveDifficultyToggle: () => void;
  
  // Actions
  onStartSession: () => void;
  onChangeMode: () => void;
  
  // State
  isLoading?: boolean;
}

/**
 * Comprehensive setup panel shown before starting a dictation session.
 * Allows users to configure all aspects of their practice session.
 */
export function DictationSetupPanel({
  difficulty,
  speedLevel,
  category,
  sessionLength,
  currentOpenAIVoice,
  openAIVoices,
  currentRate,
  adaptiveDifficulty,
  onDifficultyChange,
  onSpeedLevelChange,
  onCategoryChange,
  onSessionLengthChange,
  onOpenAIVoiceChange,
  onAdaptiveDifficultyToggle,
  onStartSession,
  onChangeMode,
  isLoading = false,
}: DictationSetupPanelProps) {
  
  // Calculate estimated duration based on session length and speed
  // Assuming avg sentence is 10 words, avg WPM is 40
  const estimatedMinutes = Math.ceil((sessionLength * 10) / 40);

  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
      {/* Main Configuration Card */}
      <Card className="lg:col-span-2 border-primary/20 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Session Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Content Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Content</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Difficulty Level</Label>
                <Select 
                  value={difficulty} 
                  onValueChange={(val) => onDifficultyChange(val as DifficultyLevel)}
                  disabled={adaptiveDifficulty.enabled}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">{getDifficultyEmoji('easy')} Easy</SelectItem>
                    <SelectItem value="medium">{getDifficultyEmoji('medium')} Medium</SelectItem>
                    <SelectItem value="hard">{getDifficultyEmoji('hard')} Hard</SelectItem>
                  </SelectContent>
                </Select>
                {adaptiveDifficulty.enabled && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Target className="w-3 h-3" /> Managed by Adaptive Mode
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Topic</Label>
                <Select value={category} onValueChange={onCategoryChange}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Audio Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Audio Experience</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Voice Style</Label>
                <Select value={currentOpenAIVoice} onValueChange={onOpenAIVoiceChange}>
                  <SelectTrigger className="h-11">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-muted-foreground" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {openAIVoices.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Speech Speed</Label>
                  <Badge variant="outline" className="font-mono">
                    {currentRate.toFixed(1)}x
                  </Badge>
                </div>
                <Slider
                  value={[parseFloat(speedLevel) || 1.0]}
                  onValueChange={(value) => onSpeedLevelChange(value[0].toString())}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Slow</span>
                  <span>Normal</span>
                  <span>Fast</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Session Length */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Duration</h3>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> ~{estimatedMinutes} min
              </Badge>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Number of Sentences</Label>
                <span className="text-lg font-bold text-primary">{sessionLength}</span>
              </div>
              <Slider
                value={[sessionLength]}
                onValueChange={(val) => onSessionLengthChange(val[0])}
                min={1}
                max={20}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Quick (1)</span>
                <span>Standard (10)</span>
                <span>Marathon (20)</span>
              </div>
            </div>
          </div>

        </CardContent>
        <CardFooter className="bg-muted/20 border-t p-6 flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={onChangeMode} 
            className="border-primary/20 hover:bg-primary/5 hover:text-primary"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Change Mode
          </Button>
          <Button size="lg" onClick={onStartSession} disabled={isLoading} className="px-8 shadow-lg shadow-primary/20">
            {isLoading ? (
              'Loading...'
            ) : (
              <>
                <Play className="w-4 h-4 mr-2 fill-current" />
                Start Session
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Side Panel: Advanced & Info */}
      <div className="space-y-6">
        {/* Adaptive Mode Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              Adaptive Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-x-4">
              <div className="space-y-1">
                <Label htmlFor="adaptive-mode" className="cursor-pointer">Auto-adjust difficulty</Label>
                <p className="text-xs text-muted-foreground">
                  Increases challenge as you improve
                </p>
              </div>
              <Switch
                id="adaptive-mode"
                checked={adaptiveDifficulty.enabled}
                onCheckedChange={onAdaptiveDifficultyToggle}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Tips Card */}
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Hash className="w-4 h-4 text-primary" />
              Session Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sentences:</span>
              <span className="font-medium">{sessionLength}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Base Difficulty:</span>
              <span className="font-medium capitalize">{difficulty}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Voice Speed:</span>
              <span className="font-medium">{currentRate}x</span>
            </div>
            <Separator className="bg-primary/10" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Listen carefully to each sentence. Use <kbd className="bg-background px-1 rounded border">R</kbd> to replay audio and <kbd className="bg-background px-1 rounded border">H</kbd> for a visual hint if you get stuck.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
