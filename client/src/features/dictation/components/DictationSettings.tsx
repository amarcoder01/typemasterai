import React from 'react';
import {
  Settings2,
  Volume2,
  TrendingUp,
  Flame,
  Maximize2,
  X,
  Waves,
  Leaf,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { 
  PracticeMode, 
  DifficultyLevel, 
  ZenTheme, 
  AdaptiveDifficultyConfig,
  StreakData,
} from '../types';
import { 
  PRACTICE_MODES, 
  ZEN_THEMES, 
  CATEGORIES, 
  getDifficultyEmoji,
  ADAPTIVE_THRESHOLDS,
} from '../types';

const ZEN_THEME_ICONS: Record<ZenTheme, React.ReactNode> = {
  ocean: <Waves className="w-4 h-4" />,
  forest: <Leaf className="w-4 h-4" />,
  sunset: <Sun className="w-4 h-4" />,
  night: <Moon className="w-4 h-4" />,
};

interface DictationSettingsProps {
  // Core settings
  practiceMode: PracticeMode;
  difficulty: DifficultyLevel;
  speedLevel: string;
  category: string;
  
  // Voice settings
  currentOpenAIVoice: string;
  openAIVoices: { id: string; name: string }[];
  currentRate: number;
  
  // Adaptive difficulty
  adaptiveDifficulty: AdaptiveDifficultyConfig;
  
  // Zen mode
  zenTheme: ZenTheme;
  
  // Streak
  streakData: StreakData;
  
  // Callbacks
  onSpeedLevelChange: (speed: string) => void;
  onDifficultyChange: (difficulty: DifficultyLevel) => void;
  onCategoryChange: (category: string) => void;
  onOpenAIVoiceChange: (voice: string) => void;
  onZenThemeChange: (theme: ZenTheme) => void;
  onAdaptiveDifficultyToggle: () => void;
  onEnterZenMode: () => void;
  onClose: () => void;
  
  // State
  isLoading?: boolean;
  isSpeaking?: boolean;
}

/**
 * Settings panel for dictation mode
 */
export function DictationSettings({
  practiceMode,
  difficulty,
  speedLevel,
  category,
  currentOpenAIVoice,
  openAIVoices,
  currentRate,
  adaptiveDifficulty,
  zenTheme,
  streakData,
  onSpeedLevelChange,
  onDifficultyChange,
  onCategoryChange,
  onOpenAIVoiceChange,
  onZenThemeChange,
  onAdaptiveDifficultyToggle,
  onEnterZenMode,
  onClose,
  isLoading = false,
  isSpeaking = false,
}: DictationSettingsProps) {
  const modeConfig = PRACTICE_MODES[practiceMode];
  const disabled = isLoading || isSpeaking;
  
  return (
    <Card className="mb-6 animate-in slide-in-from-top-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Settings
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Voice Style */}
          <div>
            <label className="text-sm font-medium mb-2 block">Voice Style</label>
            <Select value={currentOpenAIVoice} onValueChange={onOpenAIVoiceChange}>
              <SelectTrigger data-testid="select-voice-style">
                <SelectValue placeholder="Select voice style" />
              </SelectTrigger>
              <SelectContent>
                {openAIVoices.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Choose your preferred voice style</p>
          </div>
          
          {/* Speech Speed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                Speech Speed
              </span>
              <Badge variant="secondary" className="font-mono text-base px-3 py-1">
                {currentRate.toFixed(1)}x
              </Badge>
            </div>
            <Slider
              value={[parseFloat(speedLevel) || 1.0]}
              onValueChange={(value) => onSpeedLevelChange(value[0].toString())}
              min={0.5}
              max={2.0}
              step={0.1}
              disabled={disabled}
              className="w-full"
              data-testid="slider-speed"
              aria-label="Adjust speech speed from 0.5x to 2.0x"
            />
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>Slower</span>
              <span>Normal</span>
              <span>Faster</span>
            </div>
          </div>
          
          {/* Difficulty */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              Difficulty
              {adaptiveDifficulty.enabled && (
                <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded-full font-medium">
                  AUTO
                </span>
              )}
            </label>
            <Select
              value={difficulty}
              onValueChange={(val) => onDifficultyChange(val as DifficultyLevel)}
              disabled={disabled}
            >
              <SelectTrigger data-testid="select-difficulty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">{getDifficultyEmoji('easy')} Easy</SelectItem>
                <SelectItem value="medium">{getDifficultyEmoji('medium')} Medium</SelectItem>
                <SelectItem value="hard">{getDifficultyEmoji('hard')} Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Category */}
          <div>
            <label className="text-sm font-medium mb-2 block">Topic</label>
            <Select value={category} onValueChange={onCategoryChange} disabled={disabled}>
              <SelectTrigger data-testid="select-category">
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
          
          {/* Zen Mode Theme (Focus mode only) */}
          {practiceMode === 'focus' && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-primary" />
                Zen Mode Theme
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.entries(ZEN_THEMES) as [ZenTheme, typeof ZEN_THEMES[ZenTheme]][]).map(
                  ([key, theme]) => (
                    <button
                      key={key}
                      onClick={() => onZenThemeChange(key)}
                      className={`p-3 rounded-lg text-center transition-all ${
                        zenTheme === key
                          ? 'ring-2 ring-primary scale-105'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ background: theme.gradient }}
                      data-testid={`settings-zen-theme-${key}`}
                    >
                      <div className="flex items-center justify-center gap-2 text-white">
                        {ZEN_THEME_ICONS[key]}
                        <span className="text-xs font-medium">{theme.name}</span>
                      </div>
                    </button>
                  )
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-muted-foreground">
                  Choose your calming background for Zen Mode
                </p>
                <Button
                  size="sm"
                  onClick={onEnterZenMode}
                  className="gap-2"
                  data-testid="settings-button-enter-zen"
                >
                  <Maximize2 className="w-3 h-3" />
                  Enter Zen
                </Button>
              </div>
            </div>
          )}
          
          {/* Adaptive Difficulty */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Adaptive Difficulty
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically adjust difficulty based on your performance
                </p>
              </div>
              <Button
                variant={adaptiveDifficulty.enabled ? 'default' : 'outline'}
                size="sm"
                onClick={onAdaptiveDifficultyToggle}
                data-testid="button-toggle-adaptive"
              >
                {adaptiveDifficulty.enabled ? 'On' : 'Off'}
              </Button>
            </div>
            {adaptiveDifficulty.enabled && (
              <div className="mt-3 p-3 bg-primary/5 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current Level:</span>
                  <span className="font-medium flex items-center gap-1">
                    {getDifficultyEmoji(adaptiveDifficulty.currentLevel)}
                    {adaptiveDifficulty.currentLevel.charAt(0).toUpperCase() +
                      adaptiveDifficulty.currentLevel.slice(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Progress to upgrade:</span>
                  <span className="font-medium">
                    {adaptiveDifficulty.consecutiveHighScores}/{ADAPTIVE_THRESHOLDS.upgradeConsecutive}{' '}
                    high scores
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Score 90%+ accuracy with 30+ WPM {ADAPTIVE_THRESHOLDS.upgradeConsecutive}x to level up
                </p>
              </div>
            )}
          </div>
          
          {/* Streak Stats */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Streak Stats
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-orange-500/10 rounded-lg">
                <div className="text-xl font-bold text-orange-500">{streakData.currentStreak}</div>
                <div className="text-xs text-muted-foreground">Current</div>
              </div>
              <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
                <div className="text-xl font-bold text-yellow-600">{streakData.longestStreak}</div>
                <div className="text-xs text-muted-foreground">Best</div>
              </div>
              <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                <div className="text-xl font-bold text-blue-500">{streakData.totalSessions}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </div>
          
          {/* Keyboard Shortcuts */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Keyboard Shortcuts</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">R</kbd>
                <span className="text-muted-foreground">Replay audio</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">H</kbd>
                <span className="text-muted-foreground">Toggle hint</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">N</kbd>
                <span className="text-muted-foreground">Next sentence</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl+Enter</kbd>
                <span className="text-muted-foreground">Submit</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
