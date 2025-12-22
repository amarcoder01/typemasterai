/**
 * Scene Navigation Controls
 * 
 * UI components for navigating between scenes in book chapters.
 * Includes: scene selector, progress bar, skip buttons, auto-advance option.
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, SkipForward, BookOpen, Target } from 'lucide-react';
import type { Scene } from '@/lib/book-scene-detector';
import { cn } from '@/lib/utils';

interface SceneNavigationControlsProps {
  scenes: Scene[];
  currentSceneIndex: number;
  currentSceneProgress: number; // 0-100
  totalProgress: number; // 0-100
  onSceneChange: (sceneIndex: number) => void;
  onPrevScene: () => void;
  onNextScene: () => void;
  autoAdvance?: boolean;
  onAutoAdvanceChange?: (enabled: boolean) => void;
  isTyping?: boolean;
  disabled?: boolean;
}

export function SceneNavigationControls({
  scenes,
  currentSceneIndex,
  currentSceneProgress,
  totalProgress,
  onSceneChange,
  onPrevScene,
  onNextScene,
  autoAdvance = false,
  onAutoAdvanceChange,
  isTyping = false,
  disabled = false,
}: SceneNavigationControlsProps) {
  const currentScene = scenes[currentSceneIndex];
  const hasPrevScene = currentSceneIndex > 0;
  const hasNextScene = currentSceneIndex < scenes.length - 1;

  if (!currentScene) return null;

  return (
    <TooltipProvider>
      <Card className="p-4 mb-6 bg-muted/30 border-primary/20">
        <div className="space-y-4">
          {/* Header: Scene Info & Selector */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Current Scene</p>
                <p className="text-lg font-semibold">{currentScene.title}</p>
              </div>
            </div>

            {/* Scene Selector Dropdown */}
            {scenes.length > 1 && (
              <Select
                value={currentSceneIndex.toString()}
                onValueChange={(value) => onSceneChange(parseInt(value))}
                disabled={disabled || isTyping}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Jump to a different scene</p>
                  </TooltipContent>
                </Tooltip>
                <SelectContent>
                  {scenes.map((scene, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{scene.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {scene.wordCount} words
                        </Badge>
                        {idx === currentSceneIndex && (
                          <Target className="w-3 h-3 text-primary" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Progress Bars */}
          <div className="space-y-3">
            {/* Current Scene Progress */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Scene Progress
                </span>
                <span className="text-xs font-mono font-semibold">
                  {Math.round(currentSceneProgress)}%
                </span>
              </div>
              <Progress value={currentSceneProgress} className="h-2" />
            </div>

            {/* Total Chapter Progress */}
            {scenes.length > 1 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Chapter Progress
                  </span>
                  <span className="text-xs font-mono font-semibold">
                    Scene {currentSceneIndex + 1} of {scenes.length} • {Math.round(totalProgress)}%
                  </span>
                </div>
                <Progress value={totalProgress} className="h-2 bg-primary/10" />
              </div>
            )}
          </div>

          {/* Navigation Buttons & Options */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Previous/Next Buttons */}
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onPrevScene}
                      disabled={!hasPrevScene || disabled || isTyping}
                      className="gap-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Prev Scene
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {!hasPrevScene
                      ? 'Already at first scene'
                      : isTyping
                      ? 'Finish typing current scene first'
                      : 'Go to previous scene'}
                  </p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onNextScene}
                      disabled={!hasNextScene || disabled}
                      className="gap-1"
                    >
                      Next Scene
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {!hasNextScene
                      ? 'Already at last scene'
                      : 'Go to next scene (or press Tab when finished)'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Auto-Advance Toggle */}
            {onAutoAdvanceChange && scenes.length > 1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="auto-advance"
                      checked={autoAdvance}
                      onCheckedChange={onAutoAdvanceChange}
                      disabled={disabled}
                    />
                    <Label htmlFor="auto-advance" className="text-sm cursor-pointer">
                      Auto-advance
                    </Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Automatically move to next scene when finished typing</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Scene Info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1.5">
              <span className="font-medium">Type:</span>
              <Badge variant="secondary" className="text-xs capitalize">
                {currentScene.type === 'auto' ? 'Section' : currentScene.type}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium">Words:</span>
              <span className="font-mono">{currentScene.wordCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium">Paragraphs:</span>
              <span className="font-mono">{currentScene.paragraphs.length}</span>
            </div>
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
}

/**
 * Compact Scene Progress Indicator
 * Minimal version for use in header/footer
 */
interface SceneProgressCompactProps {
  scenes: Scene[];
  currentSceneIndex: number;
  className?: string;
}

export function SceneProgressCompact({
  scenes,
  currentSceneIndex,
  className,
}: SceneProgressCompactProps) {
  if (scenes.length <= 1) return null;

  return (
    <div className={cn('flex gap-1', className)}>
      {scenes.map((scene, idx) => {
        const isCompleted = idx < currentSceneIndex;
        const isCurrent = idx === currentSceneIndex;
        const isUpcoming = idx > currentSceneIndex;

        return (
          <TooltipProvider key={idx}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'h-2 flex-1 rounded-full transition-all duration-300',
                    isCompleted && 'bg-green-500',
                    isCurrent && 'bg-primary animate-pulse',
                    isUpcoming && 'bg-muted'
                  )}
                  style={{ minWidth: '20px' }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{scene.title}</p>
                <p className="text-xs text-muted-foreground">
                  {scene.wordCount} words • {scene.paragraphs.length} paragraphs
                </p>
                {isCompleted && <p className="text-xs text-green-500">✓ Completed</p>}
                {isCurrent && <p className="text-xs text-primary">→ Current</p>}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

/**
 * Scene Completion Celebration
 * Shows when user completes a scene
 */
interface SceneCompletionProps {
  scene: Scene;
  sceneNumber: number;
  totalScenes: number;
  wpm: number;
  accuracy: number;
  onContinue: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

export function SceneCompletion({
  scene,
  sceneNumber,
  totalScenes,
  wpm,
  accuracy,
  onContinue,
  onSkip,
  showSkip = false,
}: SceneCompletionProps) {
  const isLastScene = sceneNumber >= totalScenes;

  return (
    <div className="text-center py-6 space-y-4">
      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-primary">Scene Complete! 🎉</h3>
        <p className="text-muted-foreground">
          {scene.title} • {scene.wordCount} words
        </p>
      </div>

      <div className="flex justify-center gap-6">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Speed</p>
          <p className="text-2xl font-bold text-yellow-500">{wpm} WPM</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
          <p className="text-2xl font-bold text-green-500">{accuracy}%</p>
        </div>
      </div>

      <div className="flex gap-3 justify-center">
        <Button onClick={onContinue} size="lg" className="gap-2">
          {isLastScene ? (
            <>
              <BookOpen className="w-5 h-5" />
              Complete Chapter
            </>
          ) : (
            <>
              <ArrowRight className="w-5 h-5" />
              Next Scene
            </>
          )}
        </Button>

        {showSkip && onSkip && !isLastScene && (
          <Button onClick={onSkip} variant="outline" size="lg" className="gap-2">
            <SkipForward className="w-5 h-5" />
            Skip Scene
          </Button>
        )}
      </div>

      {!isLastScene && (
        <p className="text-xs text-muted-foreground">
          Press Tab to continue • {totalScenes - sceneNumber} scenes remaining
        </p>
      )}
    </div>
  );
}
