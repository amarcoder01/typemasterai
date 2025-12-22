import React, { useEffect, useRef, useState } from 'react';
import { Volume2, Mic, Check, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface DictationAudioPlayerProps {
  isSpeaking: boolean;
  isReady: boolean; // Ready for user to type (audio finished)
  isLoading: boolean;
  showHint?: boolean;
  hintText?: string;
}

/**
 * Audio player visualization component
 * Shows speaking animation, ready state, or loading state
 */
export function DictationAudioPlayer({
  isSpeaking,
  isReady,
  isLoading,
  showHint = false,
  hintText,
}: DictationAudioPlayerProps) {
  // Audio visualization bars
  const [visualizerBars, setVisualizerBars] = useState<number[]>([0.3, 0.5, 0.7, 0.5, 0.3]);
  const animationFrameRef = useRef<number | null>(null);
  
  // Animate visualizer when speaking
  useEffect(() => {
    if (isSpeaking) {
      let frame = 0;
      const animate = (): void => {
        frame++;
        const bars = Array.from({ length: 5 }, (_, i) => {
          const base = Math.sin(frame * 0.1 + i * 0.5) * 0.3 + 0.5;
          const random = Math.random() * 0.2;
          return Math.max(0.2, Math.min(1, base + random));
        });
        setVisualizerBars(bars);
        animationFrameRef.current = window.requestAnimationFrame(animate);
      };
      animationFrameRef.current = window.requestAnimationFrame(animate);
      
      return () => {
        if (animationFrameRef.current !== null) {
          window.cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    } else {
      setVisualizerBars([0.3, 0.5, 0.7, 0.5, 0.3]);
    }
  }, [isSpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);
  
  if (isLoading) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex flex-col items-center justify-center cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-2xl p-6"
            tabIndex={0}
            role="status"
            aria-label="Loading next sentence"
            aria-live="polite"
          >
            <div className="relative mb-6">
              <div className="bg-gradient-to-br from-muted to-muted/50 p-6 rounded-full border-4 border-muted-foreground/20">
                <Loader2 className="w-16 h-16 text-muted-foreground animate-spin" />
              </div>
            </div>
            <div className="space-y-2 text-center">
              <p className="text-xl font-semibold text-muted-foreground">Preparing...</p>
              <p className="text-sm text-muted-foreground/70">Getting your next sentence ready</p>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Loading the next sentence...</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  if (isSpeaking) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex flex-col items-center justify-center cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-2xl p-6"
            tabIndex={0}
            role="status"
            aria-label="Audio is playing"
            aria-live="polite"
          >
            <div className="relative mb-6">
              {/* Animated rings */}
              <div
                className="absolute inset-0 bg-primary/20 rounded-full animate-ping"
                style={{ animationDuration: '1.5s' }}
              />
              <div
                className="absolute inset-0 bg-primary/10 rounded-full animate-pulse"
                style={{ animationDuration: '1s' }}
              />
              
              {/* Main icon */}
              <div className="relative bg-gradient-to-br from-primary/30 to-primary/10 p-8 rounded-full border-4 border-primary/50 shadow-lg shadow-primary/20">
                <Mic className="w-20 h-20 text-primary" />
              </div>
              
              {/* Audio visualizer bars */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-end gap-1">
                {visualizerBars.map((height, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-primary rounded-full transition-all duration-100"
                    style={{ height: `${height * 24}px` }}
                  />
                ))}
              </div>
            </div>
            
            <div className="space-y-2 text-center">
              <p className="text-2xl font-bold text-primary" data-testid="text-speaking">
                Listening...
              </p>
              <p className="text-base text-muted-foreground">
                Pay attention to what's being said
              </p>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-medium mb-1">Audio Playing</p>
          <p className="text-xs opacity-90">
            Listen carefully to the sentence. You can replay it after it finishes.
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  if (isReady) {
    return (
      <div className="flex flex-col items-center justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="flex flex-col items-center cursor-default focus:outline-none focus:ring-2 focus:ring-green-500/50 rounded-2xl p-6"
              tabIndex={0}
              role="status"
              aria-label="Ready to type"
            >
              <div className="relative mb-6">
                <div className="bg-gradient-to-br from-green-500/30 to-green-500/10 p-6 rounded-full border-4 border-green-500/50 shadow-lg shadow-green-500/20">
                  <Volume2 className="w-16 h-16 text-green-500" />
                </div>
                <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1.5">
                  <Check className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-2 text-center">
                <p className="text-2xl font-bold text-green-500" data-testid="text-ready">
                  Ready to Type!
                </p>
                <p className="text-base text-muted-foreground">
                  Type what you heard in the box below
                </p>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-medium mb-1">Ready to Type</p>
            <p className="text-xs opacity-90">
              The audio has finished. Type what you heard in the text area below.
            </p>
          </TooltipContent>
        </Tooltip>
        
        {/* Hint display */}
        {showHint && hintText && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="mt-6 p-5 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl max-w-2xl cursor-help focus:outline-none focus:ring-2 focus:ring-primary/50 border border-primary/20"
                tabIndex={0}
                role="note"
                aria-label="Hint showing the target sentence"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <p className="text-sm font-semibold text-primary">Hint</p>
                </div>
                <p
                  className="text-lg font-mono text-foreground leading-relaxed"
                  data-testid="text-hint"
                >
                  {hintText}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-medium mb-1">Sentence Hint</p>
              <p className="text-xs opacity-90">
                This is the actual sentence. Using hints may affect your practice score.
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  }
  
  // Default loading state
  return (
    <div
      className="flex flex-col items-center justify-center p-6"
      role="status"
      aria-label="Waiting for audio"
    >
      <div className="bg-gradient-to-br from-muted to-muted/50 p-6 rounded-full border-4 border-muted-foreground/20">
        <Volume2 className="w-16 h-16 text-muted-foreground" />
      </div>
      <p className="mt-4 text-muted-foreground">Waiting...</p>
    </div>
  );
}
