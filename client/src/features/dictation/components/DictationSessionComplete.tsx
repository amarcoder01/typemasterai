import React, { useState, useMemo } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft,
  Award,
  Share2,
  Flame,
  Zap,
  Trophy,
  Target,
  X,
  Clock,
  RotateCcw,
  BarChart2,
  List,
  Twitter,
  Facebook,
  Linkedin,
  MessageCircle,
  Send,
  Mail,
  Copy,
  Check,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { DictationCertificate } from '@/components/DictationCertificate';
import type { SessionStats, SessionHistoryItem, Achievement } from '../types';
import { SESSION_LENGTH_OPTIONS } from '../types';
import { calculateAchievements } from '../utils/scoring';
import { getSpeedLevelName } from '@shared/dictation-utils';
import { useToast } from '@/hooks/use-toast';

interface DictationSessionCompleteProps {
  sessionStats: SessionStats;
  sessionHistory: SessionHistoryItem[];
  sessionLength: number;
  speedLevel: string;
  username?: string;
  certificateData?: {
    wpm: number;
    accuracy: number;
    consistency: number;
    speedLevel: string;
    sentencesCompleted: number;
    totalWords: number;
    duration: number;
    username: string;
    verificationId?: string;
  } | null;
  onNewSession: () => void;
  onShare: () => void;
  onSessionLengthChange: (length: number) => void;
}

const ACHIEVEMENT_ICONS: Record<string, React.ReactNode> = {
  speed_demon: <Zap className="w-4 h-4" />,
  perfectionist: <Trophy className="w-4 h-4" />,
  accuracy_ace: <Target className="w-4 h-4" />,
  marathon: <Flame className="w-4 h-4" />,
};

const getDictationPerformanceRating = (wpm: number, accuracy: number) => {
  if (wpm >= 100 && accuracy >= 98) return { title: 'Dictation Master', badge: '🏆', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
  if (wpm >= 80 && accuracy >= 95) return { title: 'Expert Scribe', badge: '⚡', color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
  if (wpm >= 60 && accuracy >= 92) return { title: 'Professional', badge: '🔥', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
  if (wpm >= 40) return { title: 'Intermediate', badge: '✨', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' };
  return { title: 'Novice', badge: '🌱', color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20' };
};

/**
 * Session complete screen with stats, achievements, and certificate
 * Refactored to match production standard of Code Mode
 */
export function DictationSessionComplete({
  sessionStats,
  sessionHistory,
  sessionLength,
  speedLevel,
  username,
  certificateData,
  onNewSession,
  onShare,
  onSessionLengthChange,
}: DictationSessionCompleteProps) {
  const { toast } = useToast();
  const [showCustomLength, setShowCustomLength] = useState(false);
  const [customLengthInput, setCustomLengthInput] = useState('');
  
  const avgWpm = sessionStats.count > 0 ? Math.round(sessionStats.totalWpm / sessionStats.count) : 0;
  const avgAccuracy = sessionStats.count > 0 ? Math.round(sessionStats.totalAccuracy / sessionStats.count) : 0;
  
  const rating = getDictationPerformanceRating(avgWpm, avgAccuracy);
  
  const achievements = useMemo(
    () => calculateAchievements(sessionStats, sessionHistory),
    [sessionStats, sessionHistory]
  );
  
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);
  
  const handleSessionLengthChange = (value: string) => {
    const numValue = parseInt(value);
    if (numValue === 0) {
      setShowCustomLength(true);
    } else {
      onSessionLengthChange(numValue);
      setShowCustomLength(false);
    }
  };
  
  const handleCustomLengthSubmit = () => {
    const value = parseInt(customLengthInput);
    if (value >= 1 && value <= 500) {
      onSessionLengthChange(value);
      setShowCustomLength(false);
      setCustomLengthInput('');
    }
  };

  const handleCopyChallenge = () => {
    const text = `🎯 DICTATION CHALLENGE!\n\nCan you beat my score?\n\n${rating.badge} My Score: ${avgWpm} WPM\n✨ Accuracy: ${avgAccuracy}%\n\n🏅 Beat me to claim the ${rating.title} Badge!\n\n🔗 Accept the challenge: https://typemasterai.com/dictation`;
    navigator.clipboard.writeText(text);
    toast({ title: "Challenge Copied!", description: "Send it to your friends!" });
  };
  
  return (
    <TooltipProvider delayDuration={300}>
      <div className="container max-w-5xl mx-auto p-4 sm:p-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Return to home page</p>
            </TooltipContent>
          </Tooltip>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1 bg-background/50 backdrop-blur">
              {getSpeedLevelName(parseFloat(speedLevel))} Speed
            </Badge>
          </div>
        </div>
        
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500 inline-block">
            Session Complete!
          </h1>
          <p className="text-muted-foreground">
            You've successfully completed {sessionLength} sentences
          </p>
        </div>
        
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart2 className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-2">
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Analysis</span>
            </TabsTrigger>
            <TabsTrigger value="certificate" className="gap-2">
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Certificate</span>
            </TabsTrigger>
            <TabsTrigger value="challenge" className="gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Challenge</span>
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            {/* Hero Stats Card */}
            <Card className="border-primary/20 shadow-lg bg-gradient-to-br from-background to-muted/20">
              <CardContent className="pt-8 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                  {/* WPM */}
                  <div className="text-center space-y-2">
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" /> Speed
                    </div>
                    <div className="text-5xl md:text-6xl font-bold text-primary tabular-nums">
                      {avgWpm}
                    </div>
                    <div className="text-sm text-muted-foreground">Words Per Minute</div>
                  </div>

                  {/* Rating Badge */}
                  <div className="text-center flex flex-col items-center justify-center py-4 md:py-0 border-y md:border-y-0 md:border-x border-border/50">
                    <div className={`w-20 h-20 rounded-full ${rating.bg} ${rating.border} border-2 flex items-center justify-center text-4xl mb-3 shadow-lg`}>
                      {rating.badge}
                    </div>
                    <div className={`text-xl font-bold ${rating.color}`}>{rating.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">Performance Rating</div>
                  </div>

                  {/* Accuracy */}
                  <div className="text-center space-y-2">
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-2">
                      <Target className="w-4 h-4 text-green-500" /> Accuracy
                    </div>
                    <div className="text-5xl md:text-6xl font-bold text-green-500 tabular-nums">
                      {Math.round(avgAccuracy)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Precision Rate</div>
                  </div>
                </div>

                {/* Fun Stat */}
                <div className="mt-8 text-center">
                   <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground">
                    <TrendingUp className="w-4 h-4" />
                    {avgWpm >= 80 ? "You're faster than 98% of users!" : 
                     avgWpm >= 60 ? "You're faster than 85% of users!" : 
                     avgWpm >= 40 ? "You're typing at an above-average speed!" : 
                     "Consistent practice is the key to mastery!"}
                   </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Secondary Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-primary" />
                    Session Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/10 rounded-md">
                        <AlertCircleIcon className="w-4 h-4 text-orange-500" />
                      </div>
                      <span className="text-sm font-medium">Total Errors</span>
                    </div>
                    <span className="text-xl font-bold text-orange-500">{sessionStats.totalErrors}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-md">
                        <Clock className="w-4 h-4 text-blue-500" />
                      </div>
                      <span className="text-sm font-medium">Sentences</span>
                    </div>
                    <span className="text-xl font-bold">{sessionStats.count}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                     <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-md">
                        <Flame className="w-4 h-4 text-purple-500" />
                      </div>
                      <span className="text-sm font-medium">Consistency</span>
                    </div>
                    <span className="text-xl font-bold">{certificateData?.consistency || 100}%</span>
                  </div>
                </CardContent>
              </Card>

              {/* Achievements */}
              <Card>
                 <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {unlockedAchievements.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {unlockedAchievements.map((achievement) => (
                        <Tooltip key={achievement.id}>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="default"
                              className="bg-yellow-500/20 text-yellow-600 border-yellow-500/50 px-3 py-1.5 cursor-help"
                            >
                              <span className="mr-1">{ACHIEVEMENT_ICONS[achievement.id]}</span>
                              {achievement.name}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{achievement.name}</p>
                            <p className="text-xs opacity-90">{achievement.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-4">No new achievements this session.</p>
                  )}
                  
                  {lockedAchievements.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Next Goals</p>
                      <div className="flex flex-wrap gap-2">
                        {lockedAchievements.slice(0, 3).map((achievement) => (
                           <div key={achievement.id} className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full text-xs text-muted-foreground border border-border/50">
                              <span className="opacity-50">{ACHIEVEMENT_ICONS[achievement.id]}</span>
                              <span>{achievement.name}</span>
                              {achievement.progress !== undefined && achievement.target && (
                                <span className="opacity-70 ml-1">
                                  ({Math.round(achievement.progress)}/{achievement.target})
                                </span>
                              )}
                           </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 border-t border-border/50">
               {/* Session Length Selector */}
               <div className="flex items-center gap-2 mr-0 sm:mr-auto">
                  <span className="text-sm text-muted-foreground">Next Session:</span>
                   {showCustomLength ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={customLengthInput}
                          onChange={(e) => setCustomLengthInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCustomLengthSubmit()}
                          placeholder="#"
                          className="w-16 px-2 py-1 text-sm border rounded-md bg-background"
                          autoFocus
                        />
                        <Button size="sm" onClick={handleCustomLengthSubmit} className="h-8">Set</Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowCustomLength(false)} className="h-8"><X className="w-3 h-3" /></Button>
                      </div>
                    ) : (
                      <Select
                        value={SESSION_LENGTH_OPTIONS.find((o) => o.value === sessionLength) ? sessionLength.toString() : '0'}
                        onValueChange={handleSessionLengthChange}
                      >
                        <SelectTrigger className="w-[180px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SESSION_LENGTH_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value.toString()}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
               </div>

               <div className="flex gap-3 w-full sm:w-auto">
                 <Button onClick={onNewSession} size="lg" className="flex-1 sm:flex-none shadow-lg shadow-primary/20">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Start New Session
                 </Button>
                 <Button onClick={onShare} variant="secondary" size="lg" className="flex-1 sm:flex-none">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                 </Button>
               </div>
            </div>
          </TabsContent>

          {/* ANALYSIS TAB */}
          <TabsContent value="analysis">
            <Card>
              <CardHeader>
                <CardTitle>Sentence Breakdown</CardTitle>
                <CardDescription>
                  Detailed analysis of each sentence in this session.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sessionHistory.map((item, index) => (
                    <div key={index} className="p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                       <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-sm text-muted-foreground">Sentence {index + 1}</div>
                          <div className="flex gap-3 text-sm">
                             <span className={`font-bold ${item.wpm >= 60 ? 'text-green-500' : 'text-primary'}`}>
                               {Math.round(item.wpm)} WPM
                             </span>
                             <span className={`font-bold ${item.accuracy >= 95 ? 'text-green-500' : 'text-orange-500'}`}>
                               {Math.round(item.accuracy)}% Acc
                             </span>
                          </div>
                       </div>
                       <p className="text-base font-medium mb-1">{item.sentence}</p>
                       <div className="text-sm text-muted-foreground">
                          Errors: <span className={item.errors > 0 ? 'text-red-500 font-bold' : 'text-green-500'}>{item.errors}</span>
                       </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CERTIFICATE TAB */}
          <TabsContent value="certificate">
             <Card className="border-none shadow-none bg-transparent">
               <CardContent className="p-0 space-y-6">
                 {certificateData ? (
                   <>
                     <div className="rounded-xl overflow-hidden border border-border shadow-2xl">
                       <DictationCertificate {...certificateData} />
                     </div>
                     
                     <div className="bg-muted/30 rounded-xl p-6 border border-border/50">
                        <h3 className="text-center font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
                          Share Your Achievement
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                           <Button variant="outline" className="w-full gap-2" onClick={() => {
                             const text = `🎓 Just earned my Dictation Certificate! ${avgWpm} WPM with ${avgAccuracy}% accuracy! 🎯 #TypeMasterAI`;
                             window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://typemasterai.com')}`, '_blank');
                           }}>
                              <Twitter className="w-4 h-4 text-[#1DA1F2]" /> Twitter
                           </Button>
                           <Button variant="outline" className="w-full gap-2" onClick={() => {
                              window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://typemasterai.com')}`, '_blank');
                           }}>
                              <Linkedin className="w-4 h-4 text-[#0A66C2]" /> LinkedIn
                           </Button>
                           <Button variant="outline" className="w-full gap-2" onClick={() => {
                              const text = `*TypeMasterAI Certificate*\n\nDictation Speed: *${avgWpm} WPM*\nAccuracy: *${avgAccuracy}%*\n\nGet yours: https://typemasterai.com`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                           }}>
                              <MessageCircle className="w-4 h-4 text-[#25D366]" /> WhatsApp
                           </Button>
                           <Button variant="outline" className="w-full gap-2" onClick={() => {
                             // Assuming download function is available or handled by certificate component
                             // For now, we trigger the print dialog or generic share
                             if (navigator.share) {
                               navigator.share({
                                 title: 'My Dictation Certificate',
                                 text: `I scored ${avgWpm} WPM!`,
                                 url: 'https://typemasterai.com'
                               });
                             } else {
                               toast({ title: "Info", description: "Use browser print to save as PDF" });
                               window.print();
                             }
                           }}>
                              <Share2 className="w-4 h-4" /> Native Share
                           </Button>
                        </div>
                     </div>
                   </>
                 ) : (
                   <div className="text-center py-12">
                     <p>Certificate data not available.</p>
                   </div>
                 )}
               </CardContent>
             </Card>
          </TabsContent>

          {/* CHALLENGE TAB */}
          <TabsContent value="challenge">
            <Card className="bg-gradient-to-br from-orange-500/5 to-red-500/5 border-orange-500/20">
               <CardHeader className="text-center pb-2">
                 <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4">
                    <Zap className="w-8 h-8 text-orange-500" />
                 </div>
                 <CardTitle className="text-2xl">Challenge Your Friends</CardTitle>
                 <CardDescription>
                    Think you're fast? Send a challenge and see if they can beat your {avgWpm} WPM!
                 </CardDescription>
               </CardHeader>
               <CardContent className="space-y-6">
                  <div className="p-6 bg-background/50 backdrop-blur border border-border/50 rounded-xl text-center space-y-4">
                     <div className="text-sm font-medium text-muted-foreground">SCORE TO BEAT</div>
                     <div className="flex justify-center items-end gap-2">
                        <span className="text-5xl font-bold text-primary">{avgWpm}</span>
                        <span className="text-xl font-medium text-muted-foreground mb-1">WPM</span>
                     </div>
                     <Badge variant="outline" className={`${rating.color} ${rating.bg} ${rating.border} px-3 py-1`}>
                        {rating.badge} {rating.title} Level
                     </Badge>
                  </div>

                  <div className="space-y-3">
                     <p className="text-center text-sm font-medium">Share Challenge Link</p>
                     <div className="flex gap-2">
                        <Input value={`https://typemasterai.com/dictation?challenge=${avgWpm}`} readOnly className="text-center font-mono text-sm" />
                        <Button onClick={handleCopyChallenge} size="icon" className="shrink-0">
                           <Copy className="w-4 h-4" />
                        </Button>
                     </div>
                     <Button onClick={handleCopyChallenge} className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0">
                        <Zap className="w-4 h-4 mr-2 fill-current" />
                        Copy Challenge Message
                     </Button>
                  </div>
               </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </TooltipProvider>
  );
}

// Helper icon component
function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}
