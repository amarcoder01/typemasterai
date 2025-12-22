import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface DictationProgressBarProps {
  current: number;
  total: number;
}

/**
 * Progress bar showing session completion
 */
export function DictationProgressBar({ current, total }: DictationProgressBarProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  
  return (
    <Card className="mb-6">
      <CardContent className="pt-6 pb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium flex items-center gap-1">
            Progress
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex cursor-help focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full"
                  tabIndex={0}
                  role="button"
                  aria-label="Progress information"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Complete {total} dictation tests to finish the session</p>
              </TooltipContent>
            </Tooltip>
          </span>
          <span className="text-sm text-muted-foreground" data-testid="text-progress">
            {current} / {total}
          </span>
        </div>
        <Progress value={percentage} className="h-2" />
      </CardContent>
    </Card>
  );
}
